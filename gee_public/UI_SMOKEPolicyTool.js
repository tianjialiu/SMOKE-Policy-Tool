// *****************************************************************
// =================================================================
// ------------- Instructions for SMOKE Policy Tool ------------- ||
// =================================================================
// *****************************************************************
/*
// Documentation: https://github.com/tianjialiu/SMOKE-Policy-Tool
// Author: Tianjia Liu
// Last updated: August 16, 2018

// Purpose: model and project the impact of Indonesian fires
// on public health in Equatorial Asia for 2005-2029 based on
// land cover/ land use (LULC) classification, GFEDv4s fire emissions,
// and meteorology

// To start: click 'Run' above the code editor to initialize the
// user interface

// Business-As-Usual (BAU) scenarios (Steps 1-3):
// ||Step 1|| Choose an input year: 2005-2029
// ||Step 2|| Choose an emissions + meteorology year: 2005-2009
// (e.g. El Niño conditions: 2006)
// ||Step 3|| Choose a receptor (population-weighted): Singapore, Indonesia, Malaysia

// ||Step 4|| *Optional* Build custom scenarios by selecting concessions,
   conservation regions, and administrative areas to reduce fires:

// 1. Oil Palm, 2. Timber, 3. Logging (Concessions)
// 4. Peatlands, 5. Conservation Areas, 6. BRG Sites (Other Regions/Conservation)
// * 'UI LULC Maps' can be used to visualize the locations of
// land use/ land cover, concessions, and conservation areas *

// 7. Indonesian Provinces (see console for list of ID codes with
// province names after UI loads)

// ||Step 5|| Submit Scenario: the script will freeze for ~5-10 seconds
// as Google Earth Engine makes the necessary computations:
// map layers will display in the center panel;
// legends will display below 'Submit Scenario' in the left panel;
// public health charts will display in the right panel

// Last updated: August 16, 2018

// -----------
//  - Code - |
// -----------
// * SMOKE policy tool Javascript code was adapted from 
//   Python code developed by Karen Yu (https://github.com/kyu0110/policy-tool)
// * UI functions were adapted and modified from LandTrendr-GEE UI (https://emapr.github.io/LT-GEE/index.html)

// ------------------
// - Publications - |
// ------------------
// 1. Marlier, M.E. et al. (in prep). Fires, Smoke Exposure, and Public Health:
// An Integrative Framework to Maximize Health Benefits from Peatland Restoration

// 2. Koplitz, S.N. et al. (2016). Public health impacts of the severe haze in
// Equatorial Asia in September–October 2015: demonstration of a new framework for
// informing fire management strategies to reduce downwind smoke exposure.
// Environ. Res. Lett. 11(9), 094023. https://doi.org/10.1088/1748-9326/11/9/094023

// 3. Kim, P.S. et al. (2015). Sensitivity of population smoke exposure to fire
// locations in Equatorial Asia. Atmos. Environ. 102, 11-17. https://doi.org/10.1016/j.atmosenv.2014.09.045

// ------------------------
//  - Contact/Questions - |
// ------------------------
// Help with SMOKE policy tool, technical questions & report bugs:
// Tianjia Liu (tianjialiu@g.harvard.edu)

// General science questions:
// Miriam Marlier (mmarlier@rand.org)
// Ruth DeFries (rd2402@columbia.edu)
// Loretta Mickley (mickley@fas.harvard.edu)
*/
// =================================================================
// *****************   --    User Interface    --   ****************
// =================================================================
// ----------------
// Import Modules |
// ----------------
var plotParams = require('users/smokepolicytool/public:Modules/plotParams.js');
var smokeLULC = require('users/smokepolicytool/public:Modules/smokeLULC.js');
var smokePM = require('users/smokepolicytool/public:Modules/smokePM.js');
var smokeHealth = require('users/smokepolicytool/public:Modules/smokeHealth.js');

// -----------------------------------
// - - - - - - UI PANELS - - - - - - |
// -----------------------------------
// Control panel
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '335px'}
});

// Plot panel
var plotPanel = ui.Panel(null, null, {stretch: 'horizontal'});
var plotPanelParent = ui.Panel([plotParams.plotPanelLabel, plotPanel], null, {width: '400px'});

// Map panel
var map = ui.Map();
map.style().set({cursor:'crosshair'});
map.setCenter(110,-2,5);
map.setControlVisibility({mapTypeControl: false, fullscreenControl: false});

var csn_csvList = [['Oil Palm','OP'], ['Timber','TM'], ['Logging','LG'],
  ['Peatlands','PT'], ['Conservation Areas','CA'], ['BRG Sites','BRG']];
var csn_csvBox = [];
csn_csvList.forEach(function(name, index) {
  var checkBox = ui.Checkbox(name[0]);
  csn_csvBox.push(checkBox);
});

var provBox = ui.Textbox("See console, valid IDs 0-33: e.g., 1,3");
provBox.style().set('stretch', 'horizontal');

var submitButton = plotParams.submitButton();
var yearPanel = plotParams.yearPanel();
var receptorSelectPanel = plotParams.receptorSelectPanel();
var provPanel = plotParams.provPanel(provBox);
var clickCounter = 0;

if (clickCounter === 0) {
  print('Indonesian Provinces'); print(smokeLULC.IDN_adm1_masks_names);
}

// Display Panels
controlPanel.add(yearPanel);
controlPanel.add(receptorSelectPanel);
plotParams.csn_csvPanel(csn_csvBox,controlPanel);
controlPanel.add(provPanel);
controlPanel.add(submitButton);
controlPanel.add(plotParams.waitMessage);
ui.root.clear(); ui.root.add(controlPanel);
ui.root.add(map); ui.root.add(plotPanelParent);

// Run calculations, linked to submit button
submitButton.onClick(function() {
  clickCounter = clickCounter + 1;
  if (clickCounter == 1) {plotParams.legendPanel(controlPanel)}
  
  // Scenario Parameters:
  var inputYear = plotParams.getYears(yearPanel).inputYear;
  var metYear = plotParams.getYears(yearPanel).metYear;
  var receptor = plotParams.getReceptor(receptorSelectPanel);
  
  // BAU or Custom Scenario:
  var allChecked = plotParams.getChecked(csn_csvBox,csn_csvList);
  var provSelected = provBox.getValue(); if (provSelected === '') {provSelected = undefined}

  var inMask = smokeLULC.getMask(allChecked,provSelected,metYear);
  var bauMask = smokeLULC.getMask([],undefined,metYear);

  // Display Maps:
  var lulcMap = smokeLULC.getLULCmaps(inputYear).toList(2,0);
  var lulcMapTS1 = ee.Image(lulcMap.get(0)).rename('lulc_start_timestep');
  var lulcMapTS2 = ee.Image(lulcMap.get(1)).rename('lulc_end_timestep');
  var stableTrans = smokeLULC.getStableTrans(lulcMapTS1,lulcMapTS2);
  var sensitivityMap = smokePM.getSensMap(metYear,receptor);
  var PMExposureMap = smokePM.getPMmap(inputYear,metYear,receptor,inMask);
  var emissMap = smokePM.getEmissMap(inputYear,metYear,receptor,inMask);
  
  map.clear(); map.setCenter(110,-2,5);
  map.addLayer(lulcMapTS1.selfMask(),smokeLULC.lulc_pal,'LULC Classification ' + lulcMapTS1.get('timestep').getInfo());
  map.addLayer(lulcMapTS2.selfMask(),smokeLULC.lulc_pal,'LULC Classification ' + lulcMapTS2.get('timestep').getInfo(), false);
  map.addLayer(stableTrans.selfMask(),smokeLULC.lulcTrans_pal,'LULC Stable/Transitions', false);
  map.addLayer(sensitivityMap.updateMask(sensitivityMap.gt(1e4)),
    {palette: smokePM.sensColRamp, max: 1e5, opacity: 0.4},'GEOS-Chem Adjoint Sensitivity (Jul-Oct)',true);
  map.addLayer(PMExposureMap.multiply(100).selfMask(),
    {palette: smokePM.PMRamp, max: 20},'PM2.5 Exposure (Jul-Oct), scaled by 100', false);
  map.addLayer(emissMap.selfMask(),
    {palette: smokePM.emissColRamp, max: 5},'OC+BC Emissions (Jul-Oct)', false);
  map.addLayer(smokeHealth.populationDensity.selfMask(),
    {palette: smokeHealth.popColRamp, max: 1e3},'Population Density 2005', false);
  map.addLayer(smokeHealth.baselineMortality.multiply(1e3).selfMask(),
    {palette: smokeHealth.mortalityColRamp, max: 10},'Baseline Mortality 2005', false);
  map.addLayer(inMask.mean(),{palette: ['#000000','#FFFFFF'],
    min: 0, max: 1, opacity: 0.4},'Design Scenario Mask', false);
  map.setControlVisibility({mapTypeControl: false, fullscreenControl: false});

  // Display Charts:
  var PMts = smokePM.getPM(inputYear,metYear,receptor,inMask);
  var PMts_BAU = smokePM.getPM(inputYear,metYear,receptor,bauMask);
  var PMavg = smokePM.getPMavg(inputYear,metYear,receptor,inMask);
  var OCtot = smokePM.getEmissTotal(inputYear,metYear,'OC',inMask);
  var BCtot = smokePM.getEmissTotal(inputYear,metYear,'BC',inMask);
  smokePM.getPMchart(PMts,PMavg,OCtot,BCtot,plotPanel);
  smokePM.getPMContrByProvChart(PMExposureMap,plotPanel);
  smokeHealth.getMortalityChart(PMts,PMts_BAU,receptor,plotPanel);
});
