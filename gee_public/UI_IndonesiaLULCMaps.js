// *****************************************************************
// =================================================================
// ---------------- Map Visualizer for Indonesia ---------------- ||
// --- Land Cover/ Land Use, Concessions & Conservation Areas --- ||
// =================================================================
// *****************************************************************

// UI LULC Maps adapted and modified from code by Gennadii Donchyts
// (https://code.earthengine.google.com/f0011ae8554cf924176fd7a931a38add)

// ----------------
// Import Modules |
// ----------------
var plotParams = require('users/smokepolicytool/public:Modules/plotParams.js');
var smokeLULC = require('users/smokepolicytool/public:Modules/smokeLULC.js');

var panelNames = [
  'LULC Classification',
  'LULC Transitions',
  'Concessions',
  'Conservation Areas'
];

// Map 1: LULC Classification (2005, 2010 timesteps)
var lulcMap = smokeLULC.getLULCmaps(2005).toList(2,0);
var lulcMapTS1 = ee.Image(lulcMap.get(0)).rename('lulc_start_timestep');
var lulcMapTS2 = ee.Image(lulcMap.get(1)).rename('lulc_end_timestep');

// Map 2: LULC Stable & Transitions (2005-2009)
var stableTrans = smokeLULC.getStableTrans(lulcMapTS1,lulcMapTS2);

// Map 3: Concessions
var projFolder = 'projects/IndonesiaPolicyTool/';
var oilpalm = ee.Image(projFolder + 'IDN_masks/IDN_oilpalm');
var timber = ee.Image(projFolder + 'IDN_masks/IDN_timber');
var logging = ee.Image(projFolder + 'IDN_masks/IDN_logging');
var concessions_ramp = ['#FF0000','#FDB751','#000000'];

// Map 4: Conservation
var conservation = ee.Image(projFolder + 'IDN_masks/IDN_conservation_areas');
var brg_sites = ee.Image(projFolder + 'IDN_masks_0p25deg/BRG_sites');
var conservation_ramp = ['#800080','#000000'];

// Create a map for each visualization option.
var maps = [];
panelNames.forEach(function(name, index) {
  var map = ui.Map();

  if (index === 0) {
    map.addLayer(lulcMapTS1.selfMask(),smokeLULC.lulc_pal,'LULC, 2005');
    map.addLayer(lulcMapTS2.selfMask(),smokeLULC.lulc_pal,'LULC, 2010');
    map.add(plotParams.discreteLegendMap('Land Use/ Land Cover',
      ['Intact Forest','Degraded Forest','Non-Forest','Plantations + Secondary Forest'],
      smokeLULC.lulc_rampReorder));
  }
  if (index == 1) {
    map.addLayer(stableTrans.selfMask(),smokeLULC.lulcTrans_pal,'LULC Stable/Transitions');
    map.add(plotParams.discreteLegendMap('LULC Stable & Transitions',
      ['Stable (Non-Peat)','Transitions (Non-Peat)','Stable (Peat)','Transitions (Peat)'],
      smokeLULC.lulcTrans_rampReorder));
  }
  if (index == 2) {
    map.addLayer(oilpalm.selfMask(),{palette:[concessions_ramp[0]],opacity:0.8},'Oil Palm');
    map.addLayer(timber.selfMask(),{palette:[concessions_ramp[1]],opacity:0.8},'Timber');
    map.addLayer(logging.selfMask(),{palette:[concessions_ramp[2]],opacity:0.8},'Logging');
    map.add(plotParams.discreteLegendMap('Concessions',
      ['Oil Palm','Timber','Logging'],concessions_ramp));
  }
  if (index == 3) {
    map.addLayer(conservation.selfMask(),{palette:[conservation_ramp[0]],opacity:0.8},'Conservation Areas');
    map.addLayer(brg_sites.selfMask(),{palette:[conservation_ramp[1]],opacity:0.8},'Conservation Areas');
    map.add(plotParams.discreteLegendMap('Conservation',
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
