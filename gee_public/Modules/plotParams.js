// ===============
// || UI Panels ||
// ===============
// Imports:
var smokeLULC = require('users/smokepolicytool/public:Modules/smokeLULC.js');
var smokePM = require('users/smokepolicytool/public:Modules/smokePM.js');
var smokeHealth = require('users/smokepolicytool/public:Modules/smokeHealth.js');

// ------------
// Year Panel
// ------------
exports.yearPanel = function() {
  var policyToolLabel = ui.Label('SMOKE Policy Tool', {margin: '12px 0px 0px 8px', fontWeight: 'bold', fontSize: '24px', border: '1px solid black', padding: '3px 3px 3px 3px'});
  
  var infoLabel = ui.Label('The SMOKE Policy Tool models and projects the impact of Indonesian fires on public health in Equatorial Asia for 2005-2029 based on land use/ land cover classification, GFEDv4s fire emissions, and meteorology.',
    {margin: '8px 20px 2px 8px', fontSize: '12px', color: '#777'});
  var websiteLabel = ui.Label('[Website]', {margin: '0px 0px 5px 8px', fontSize: '12.5px', color: '#5886E8'}, 'https://sites.google.com/view/smokepolicytool/home');
  var paperLabel = ui.Label('Citation: Marlier et al. (2019, GeoHealth)', {margin: '5px 0px 5px 8px', fontSize: '12.5px', color: '#5886E8'}, 'https://doi.org/10.1029/2019GH000191');
  var githubRepoLabel = ui.Label('GitHub: Code/Info', {margin: '0px 0px 5px 8px', fontSize: '12.5px', color: '#5886E8'}, 'https://github.com/tianjialiu/SMOKE-Policy-Tool');

  var headDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '10px 0px 5px 0px',height:'1.25px',border:'0.75px solid black',stretch:'horizontal'});
  
  var inputYearSectionLabel = ui.Label('Design Scenario', {margin: '8px 8px 5px 8px', fontWeight: 'bold', fontSize: '20px'});
  var inputYearLabel = ui.Label('1) Scenario Year:', {fontSize: '14.5px'});
  var inputYearSlider = ui.Slider({min: 2005, max: 2029, value: 2006, step: 1});
  inputYearSlider.style().set('stretch', 'horizontal');
  
  inputYearSlider.onChange(function(slideYear) {
    return metYearSlider.setValue(smokePM.closestMetYear[slideYear]);
  });
  
  var metYearLabel = ui.Label('2) Meteorology Year:', {fontSize: '14.5px'});
  var metYearSlider = ui.Slider({min: 2005, max: 2009, value: 2006, step: 1});
  metYearSlider.style().set('stretch', 'horizontal');
  
  var metYearMessage = ui.Label('If you select a scenario year from 2005-2022, the meteorology year moves to the most closely-matched meteorology year (from 2005-2009) based on the average Jul-Oct rainfall rate.',
    {margin: '2px 8px 6px 15px', color: '#888', fontSize: '12px'});
  var metYearDescription = ui.Label('Jul-Oct Rainfall Rank: 0 (driest) - 10 (wettest)',
    {margin: '1px 0px 0px 25px', color: '#888', fontSize: '13.8px', fontWeight:'410'});
  var metYearRanking = ui.Label('2005: [7], 2006: [1.5], 2007: [6.5], 2008: [9], 2009: [3.5]',
    {margin: '3px 0px 8px 12px', color: '#999', fontSize: '13.5px'});
    
  return ui.Panel([
      policyToolLabel, ui.Panel([ui.Panel([infoLabel, websiteLabel],ui.Panel.Layout.Flow('vertical')),
        paperLabel, githubRepoLabel, headDivider],
        ui.Panel.Layout.Flow('vertical'), {stretch: 'horizontal'}),
      inputYearSectionLabel, ui.Panel([inputYearLabel, inputYearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
      ui.Panel([metYearLabel, metYearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
      metYearMessage, metYearDescription, metYearRanking
    ]);
};

exports.getYears = function(yearPanel) {
  return {
    inputYear:yearPanel.widgets().get(3).widgets().get(1).getValue(),
    metYear:yearPanel.widgets().get(4).widgets().get(1).getValue()
  };
};

// -----------------
// Receptor Panel
// -----------------
exports.receptorSelectPanel = function() {
  var receptorLabel = ui.Label('3) Select Receptor:', {padding: '5px 0px 0px 0px', fontSize: '14.5px'});
  var receptorList = ['Singapore','Indonesia','Malaysia'];
  var receptorSelect = ui.Select({items: receptorList, value: 'Singapore', style: {stretch: 'horizontal'}});
  return ui.Panel([receptorLabel, receptorSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
};

exports.getReceptor = function(receptorSelectPanel) {
  return receptorSelectPanel.widgets().get(1).getValue();
};

// --------------------------------
// Remove Emissions From... Panels
// --------------------------------
exports.csn_csvPanel = function(csn_csvBox, controlPanel) {
  controlPanel.add(ui.Label('4) (Optional) Remove Emissions From:', {fontWeight: 400, color: 'red', fontSize: '14.5px'}));
  
  controlPanel.add(ui.Label('Concessions:', {margin: '-2px 0px -2px 8px', stretch: 'horizontal', color: '#5886E8'},
    'https://smokepolicytool.users.earthengine.app/view/indonesia-lulc-maps'));
    
  controlPanel.add(ui.Panel([
    ui.Panel([csn_csvBox[0]], null, {margin: '-2px -10px 2px 5px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[1]], null, {margin: '-2px -10px -2px 2px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[2]], null, {margin: '-2px 0px -2px 18px', stretch: 'horizontal'}),
  ],
  ui.Panel.Layout.Flow('horizontal'), {margin: '2px 0px 4px 0px', stretch: 'horizontal'}));
  
  controlPanel.add(ui.Label('Other Regions/Conservation:', {margin: '-1px 0px 4px 8px', stretch: 'horizontal', color: '#5886E8'},
    'https://smokepolicytool.users.earthengine.app/view/indonesia-lulc-maps'));

  controlPanel.add(ui.Panel([
    ui.Panel([csn_csvBox[3]], null, {margin: '-2px -10px -2px 5px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[4]], null, {margin: '-10px -10px -2px 2px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[5]], null, {margin: '-2px 0px -2px 18px', stretch: 'horizontal'}),
  ],
  ui.Panel.Layout.Flow('horizontal'), {margin: '2px 0px -4px 0px', stretch: 'horizontal'}));
};

exports.getChecked = function(box, list) {
  var checkedList = [];
    box.forEach(function(name, index) {
      var isChecked = box[index].getValue();
      if (isChecked) {checkedList.push([list[index][1]]);}
    });
  return ee.List(checkedList).flatten();
};

exports.provPanel = function(provBox) {
  var provLabel = ui.Label('By IDs: ', {margin: '8px 6px 8px 8px', stretch: 'vertical', color: '#5886E8'},
    'https://sites.google.com/view/smokepolicytool/apps/step-by-step#h.p_j-FbQd21XtjU');
  return ui.Panel([provLabel,provBox], ui.Panel.Layout.Flow('horizontal'), {margin: '-5px 8px 0px 8px', stretch: 'horizontal'});
};

exports.provOptionsPanel = function() {
  var provOptLabel = ui.Label('Indonesian provinces:', {padding: '5px 0px 0px 0px'});
  var provOptList = ['Block all fires','Target conservation efforts'];
  var provOptSelect = ui.Select({items: provOptList, value: 'Block all fires', style: {stretch: 'horizontal'}});
  return ui.Panel([provOptLabel, provOptSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
};

exports.getProvOptions = function(provOptionsPanel) {
  return provOptionsPanel.widgets().get(1).getValue();
};

// -----------------
// Submit Button
// -----------------
exports.submitButton = function() {
  return ui.Button({label: 'Submit Scenario',  style: {stretch: 'horizontal'}});
};

exports.waitMessage = ui.Label(' * Computations will take a few seconds to be completed * ', {margin: '-4px 8px 12px 8px', fontSize: '11.6px', textAlign: 'center', stretch: 'horizontal'});

// --------
// Legend
// --------
var getLayerCheck = function(map, label, value, layerPos, opacity, layerMode) {
  var checkLayer = ui.Checkbox({label: label, value: value,  
    style: {fontWeight: 'bold', fontSize: '16px', margin: '2px 0 5px 8px'}});
  
  if (layerMode == 'nested') {
    checkLayer = ui.Checkbox({label: label, value: value,  
      style: {fontSize: '15px', margin: '3px 0 5px 8px'}});
  }
  
  checkLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setShown(checked);
  });
  
  var opacityLayer = ui.Slider({min: 0, max: 1, value: opacity, step: 0.01,
    style: {margin: '3px 3px 0px 10px'}
  });
  
  opacityLayer.onChange(function(value) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setOpacity(value);
  });

  return ui.Panel([checkLayer, opacityLayer], ui.Panel.Layout.flow('horizontal'));
};

var discreteLegend = function(map, title, labels, colPal, showValue,
  layerPos, opacity, layerMode) {
  var discreteLegendPanel = ui.Panel({
    style: {
      padding: '0px 0px 5px 0px'
    }
  });
   
  var legendTitle = getLayerCheck(map, title, showValue, layerPos, opacity, layerMode);
  discreteLegendPanel.add(legendTitle);
  
  var makeRow = function(colPal, labels) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: colPal,
        padding: '8px',
        margin: '0 0 4px 10px'
      }
    });

    var description = ui.Label({value: labels, style: {margin: '0 0 5px 6px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  }; 
  
  for (var i = 0; i < labels.length; i++) {
    discreteLegendPanel.add(makeRow(colPal[i], labels[i]));
  }
  
  return discreteLegendPanel;
};

var continuousLegend = function(map, title, colPal, minVal,
  maxVal, units, stretchFactor, maxValPos, showValue, layerPos, opacity, layerMode) {
  var continuousLegendPanel = ui.Panel({
    style: {
      padding: '0px 0px 5px 0px'
    }
  });
  
  var legendTitle = getLayerCheck(map, title, showValue, layerPos, opacity, layerMode);
  continuousLegendPanel.add(legendTitle);
  continuousLegendPanel.add(ui.Label(units,{margin: '-2px 0 6px 8px'}));

  var makeRow = function(colPal) {
    var colorBox = ui.Label('', {
        backgroundColor: colPal,
        padding: '8px' + ' ' + stretchFactor + 'px',
        margin: '0 0 4px 0px',
    });
    return ui.Panel({widgets: [colorBox], layout: ui.Panel.Layout.Flow('vertical')});
  };
  
  var colPalWidget = []; var labelWidget = [];
  for (var i = 0; i < colPal.length; i++) {
    colPalWidget[i] = makeRow(colPal[i]);
  }
  
  continuousLegendPanel.add(ui.Panel({widgets: colPalWidget, layout: ui.Panel.Layout.Flow('horizontal'),
    style: {margin: '0 0 6px 8px'}}));
  continuousLegendPanel.add(ui.Label(minVal,{margin: '-6px 0px 0px 8px'}));
  continuousLegendPanel.add(ui.Label(maxVal,{margin: '-17px 5px 0px ' + maxValPos + 'px', textAlign: 'right'}));
  
  return continuousLegendPanel;
};

exports.legendPanel = function(map, TS1Label, TS2Label) {
  var footDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '0px 0px 18px 0px',height:'1.25px',border:'0.75px solid black',stretch:'horizontal'});
  var legendLabel = ui.Label('Legend', {fontWeight: 'bold', fontSize: '20px', margin: '-3px 8px 8px 8px'});

  return ui.Panel([
    footDivider,
    legendLabel,
    ui.Label('Land Use/ Land Cover', {fontWeight: 'bold', fontSize: '17px', margin: '2px 0 5px 8px'}),
    getLayerCheck(map, 'LULC ' + TS1Label, true, 0, 1, 'nested'),
    discreteLegend(map, 'LULC ' + TS2Label,
      ['Intact Forest','Degraded Forest','Non-Forest','Plantations + Secondary Forest'],
      smokeLULC.lulc_rampReorder, false, 1, 1, 'nested'),
    discreteLegend(map, 'LULC Stable & Transitions',
      ['Stable (Non-Peat)','Transitions (Non-Peat)','Stable (Peat)','Transitions (Peat)'],
      smokeLULC.lulcTrans_rampReorder, false, 2, 1, 'main'),
    ui.Label('', {margin: '0 0 4px 0px'}),
    continuousLegend(map, 'GEOS-Chem Adjoint Sensitivity',
      smokePM.sensColRamp, 0, '> 10⁵',
      'Jul-Oct Average, (μg m⁻³) / (g m⁻² s⁻¹)', 15, 305, true, 3, 0.4, 'main'),
    continuousLegend(map, 'Smoke PM2.5 Contribution',
      smokePM.PMRamp, 0, '> 20',
      'Jul-Oct Average, μg m⁻³, scaled by 100', 20.625, 308, true, 4, 1, 'main'),
    continuousLegend(map, 'OC + BC Emissions',
      smokePM.emissColRamp, 0, '> 5',
      'Jul-Oct Average, μg m⁻² s⁻¹', 20.625, 315, false, 5, 1, 'main'),
    continuousLegend(map, 'Population Density, 2005',
      smokeHealth.popColRamp, 0, '> 1000',
      'people km⁻²', 20.625, 294, false, 6, 1, 'main'),
    continuousLegend(map, 'Design Scenario Mask',
      smokePM.scenarioColRamp.reverse(), 0, 1,
      'fraction of fire emissions reduced', 20.625, 328, false, 7, 0.4, 'main'),
    ui.Label('', {margin: '0 0 5px 0px'})
  ]);
};

exports.brgLegend = function(map) {
  var colPal = ['#00BFFF', '#000000'];
  var labels = ['Top 5 Priority', 'Other'];
  
  var brgLegendPanel = ui.Panel({
    style: {
      padding: '2px 10px 2px 9px',
      position: 'bottom-left'
    }
  });
   
  var BRGcheckLayer = ui.Checkbox({label: 'BRG Sites', value: true,  
    style: {fontWeight: 'bold', fontSize: '18px', margin: '8px 8px 10px 0px'}});
  
  BRGcheckLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(8);
    mapLayer.setShown(checked);
  });
  
  brgLegendPanel.add(BRGcheckLayer);
  
  var makeRow = function(colPal, labels) {
    var colorBox = ui.Label({
      style: {
        border: 'solid 2px ' + colPal,
        padding: '8px',
        margin: '0px 0 9px 0',
        fontSize: '16px',
      }
    });

    var description = ui.Label({value: labels, style: {margin: '2px 1px 4px 6px', fontSize: '15.5px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  };
  
  for (var i = 0; i < labels.length; i++) {
    brgLegendPanel.add(makeRow(colPal[i], labels[i]));
  }
  
  return brgLegendPanel;
};

exports.discreteLegendMap = function(title, labels, colPal) {
  var discreteLegendPanel = ui.Panel({
    style: {
      padding: '0 9px 2px 9px',
      position: 'bottom-left'
    }
  });
   
  var legendTitle = ui.Label(title, {fontWeight: 'bold', fontSize: '18.5px', margin: '6px 0 4px 0'});
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

    var description = ui.Label({value: labels, style: {margin: '0 0 4px 6px', fontSize: '13.5px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  };
  
  for (var i = 0; i < labels.length; i++) {
    discreteLegendPanel.add(makeRow(colPal[i], labels[i]));
  }
  return discreteLegendPanel;
};

// -----------
// Plot Panel
// -----------
exports.plotPanelLabel = ui.Label('Public Health Impacts', {fontWeight: 'bold', fontSize: '20px', margin: '12px 8px 3px 22px'});
