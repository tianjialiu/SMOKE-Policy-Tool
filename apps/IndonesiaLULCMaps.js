// *****************************************************************
// =================================================================
// ---------------- Map Visualizer for Indonesia ---------------- ||
// --- Land Cover/ Land Use, Concessions & Conservation Areas --- ||
// =================================================================
// *****************************************************************

// Author: Tianjia Liu
// Last updated: August 19, 2018

// Indonesia LULC Maps UI adapted and modified from code by Gennadii Donchyts
// (https://code.earthengine.google.com/f0011ae8554cf924176fd7a931a38add)

// ==========================================================
// *****************   --    Modules    --   ****************
// ==========================================================
// --------------------------------------
// - - - - - - smokeLULC.js - - - - - - |
// --------------------------------------
// ===============================
// Margono + Hansen LULC maps and
// masks for blocking fires
// ===============================
// Imports:
var assetsFolder = 'users/smokepolicytool/';
var marHanS2005 = ee.Image(assetsFolder + 'marHanS_LULC/marHanS2005');
var marHanS2010 = ee.Image(assetsFolder + 'marHanS_LULC/marHanS2010');
var peatMask = ee.Image(assetsFolder + 'IDN_masks/IDN_peat');

// =============
// Display Maps
// =============
// Stable and Transitions, peat and non-peat
// derived from the two input LULC time steps 
var getStableTrans = function(lulcTS1, lulcTS2) {
  var stable = lulcTS1.eq(1).multiply(lulcTS2.eq(1))
    .add(lulcTS1.eq(2).multiply(lulcTS2.eq(2)))
    .add(lulcTS1.eq(3).multiply(lulcTS2.eq(3)))
    .add(lulcTS1.eq(4).multiply(lulcTS2.eq(4)));

  var transitions = lulcTS1.eq(1).multiply(lulcTS2.neq(1))
    .add(lulcTS1.eq(2).multiply(lulcTS2.neq(2)))
    .add(lulcTS1.eq(3).multiply(lulcTS2.neq(3)))
    .add(lulcTS1.eq(4).multiply(lulcTS2.neq(4))).multiply(3);

  var stableP = stable.gt(0).multiply(peatMask);
  var transitionsP = transitions.gt(0).multiply(peatMask);
  var stableTrans = stable.add(stableP).add(transitions).add(transitionsP);
  
  return stableTrans.rename('stableTrans');
};

// Palettes
// LULC Classification - 1 = Degraded, 2 = Intact, 3 = Non-Forest,
// 4 = Plantation + Secondary Forest
var lulc_ramp = ['#DDDDDD','#000000','#FDB751','#FF0000'];
var lulc_pal = {palette: lulc_ramp, min: 1, max: 4};
var lulc_rampReorder = ['#000000','#DDDDDD','#FDB751','#FF0000'];

// LULC Stable/Transitions - 1 = Stable (Non-Peat), 2 - Stable (Peat),
// 3 = Transitions (Non-Peat), 4 = Transitions (Peat)
var lulcTrans_ramp = ['#018571','#A6611A','#80CDC1','#DFC27D'];
var lulcTrans_pal = {palette: lulcTrans_ramp, min: 1, max: 4};
var lulcTrans_rampReorder = ['#018571','#80CDC1','#A6611A','#DFC27D'];

// ---------------------------------------
// - - - - - - plotParams.js - - - - - - |
// ---------------------------------------
// ===============
// || UI Panels ||
// ===============
// --------
// Legends
// --------
var discreteLegendMap = function(title, labels, colPal) {
  var discreteLegendPanel = ui.Panel({
    style: {
      padding: '0 9px 2px 9px',
      position: 'bottom-left'
    }
  });
   
  var legendTitle = ui.Label(title, {fontWeight: 'bold', fontSize: '18px', margin: '6px 0 4px 0'});
  discreteLegendPanel.add(legendTitle);
  
  var makeRow = function(colPal, labels) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: colPal,
        padding: '8px',
        margin: '0 0 6px 0',
        fontSize: '14px',
      }
    });

    var description = ui.Label({value: labels, style: {margin: '0 0 4px 6px', fontSize: '14px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  };
  
  for (var i = 0; i < labels.length; i++) {
    discreteLegendPanel.add(makeRow(colPal[i], labels[i]));
  }
  return discreteLegendPanel;
};

// =================================================================
// *****************   --    User Interface    --   ****************
// =================================================================
var panelNames = [
  'LULC Classification',
  'LULC Transitions',
  'Concessions',
  'Conservation Areas'
];

// Map 1: LULC Classification (2005, 2010 timesteps)
var lulcMapTS1 = marHanS2005.rename('lulc_start_timestep');
var lulcMapTS2 = marHanS2010.rename('lulc_end_timestep');

// Map 2: LULC Stable & Transitions (2005-2009)
var stableTrans = getStableTrans(lulcMapTS1,lulcMapTS2);

// Map 3: Concessions
var oilpalm = ee.Image(assetsFolder + 'IDN_masks/IDN_oilpalm');
var timber = ee.Image(assetsFolder + 'IDN_masks/IDN_timber');
var logging = ee.Image(assetsFolder + 'IDN_masks/IDN_logging');
var concessions_ramp = ['#FF0000','#FDB751','#000000'];

// Map 4: Conservation
var conservation = ee.Image(assetsFolder + 'IDN_masks/IDN_conservation_areas');
var brg_sites = ee.Image(assetsFolder + 'IDN_masks_0p25deg/BRG_sites');
var conservation_ramp = ['#800080','#000000'];

// Create a map for each visualization option.
var maps = [];
panelNames.forEach(function(name, index) {
  var map = ui.Map();
  map.setControlVisibility({layerList: false, fullscreenControl: false, mapTypeControl: false});
  
  if (index === 0) {
    map.addLayer(lulcMapTS1.selfMask(),lulc_pal,'LULC, 2005');
    map.addLayer(lulcMapTS2.selfMask(),lulc_pal,'LULC, 2010',false);
    map.add(discreteLegendMap('Land Use/ Land Cover',
      ['Intact Forest','Degraded Forest','Non-Forest','Plantations + Secondary Forest'],
      lulc_rampReorder));
    map.setControlVisibility({layerList: true});
  }
  if (index == 1) {
    map.addLayer(stableTrans.selfMask(),lulcTrans_pal,'LULC Stable/Transitions');
    map.add(discreteLegendMap('LULC Stable & Transitions',
      ['Stable (Non-Peat)','Transitions (Non-Peat)','Stable (Peat)','Transitions (Peat)'],
      lulcTrans_rampReorder));
  }
  if (index == 2) {
    map.addLayer(oilpalm.selfMask(),{palette:[concessions_ramp[0]],opacity:0.8},'Oil Palm');
    map.addLayer(timber.selfMask(),{palette:[concessions_ramp[1]],opacity:0.8},'Timber');
    map.addLayer(logging.selfMask(),{palette:[concessions_ramp[2]],opacity:0.8},'Logging');
    map.add(discreteLegendMap('Concessions',
      ['Oil Palm','Timber','Logging'],concessions_ramp));
  }
  if (index == 3) {
    map.addLayer(conservation.selfMask(),{palette:[conservation_ramp[0]],opacity:0.8},'Conservation Areas');
    map.addLayer(brg_sites.selfMask(),{palette:[conservation_ramp[1]],opacity:0.8},'Conservation Areas');
    map.add(discreteLegendMap('Conservation',
      ['Conservation Areas','BRG Sites'],conservation_ramp));
  }
  maps.push(map);
});

var linker = ui.Map.Linker(maps);

// Main title
var title = ui.Label('Indonesia Land Use/ Land Cover, Concessions & Conservation Areas', {
  stretch: 'horizontal',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '24px'
});

// Map grid of 2x2 sub panels
var mapGrid = ui.Panel(
  [
    ui.Panel([maps[0], maps[1]], null, {stretch: 'both'}),
    ui.Panel([maps[2], maps[3]], null, {stretch: 'both'})
  ],
  ui.Panel.Layout.Flow('horizontal'), {stretch: 'both'}
);

// Add the maps and title to the ui.root
ui.root.widgets().reset([title, mapGrid]);
ui.root.setLayout(ui.Panel.Layout.Flow('vertical'));

// Center the maps in Indonesia
maps[0].setCenter(105,-2,5);
