/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var ds_grid = ee.Image("projects/IndonesiaPolicyTool/IDN_adm/dsGFEDgrid"),
    grid = ee.FeatureCollection("projects/IndonesiaPolicyTool/IDN_adm/GFEDgrid"),
    emiRate = ee.ImageCollection("projects/IndonesiaPolicyTool/Cocktail_LULC/emiRateLULCtr_kg_per_m2"),
    frp = ee.ImageCollection("projects/IndonesiaPolicyTool/Cocktail_LULC/MxD14A1_C6_FRP_MW"),
    brg_sites = ee.Image("projects/IndonesiaPolicyTool/IDN_masks_0p25deg/BRG_sites"),
    indoMask = ee.Image("projects/IndonesiaPolicyTool/IDN_masks_0p25deg/indoMask"),
    conservation = ee.Image("projects/IndonesiaPolicyTool/IDN_masks/IDN_conservation_areas"),
    logging = ee.Image("projects/IndonesiaPolicyTool/IDN_masks/IDN_logging"),
    oilpalm = ee.Image("projects/IndonesiaPolicyTool/IDN_masks/IDN_oilpalm"),
    peat = ee.Image("projects/IndonesiaPolicyTool/IDN_masks/IDN_peat"),
    timber = ee.Image("projects/IndonesiaPolicyTool/IDN_masks/IDN_timber");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ==================================
// Export masks for custom scenarios
// ==================================
// Input Params:
var outputRegion = ee.Geometry.Rectangle([95,-11,141,6],'EPSG:4326',false);
var folderStr = 'projects/IndonesiaPolicyTool/Cocktail_LULC/blockingFires_masks/';

var sYear = 2005; var eYear = 2009;
var crsLatLon = 'EPSG:4326';
var ds_gridRes = [0.008333333333333333,0,95,0,-0.008333333333333333,6];
var gfed_gridRes = [0.25,0,95,0,-0.25,6.75];

// -------------
// Combinations
// -------------
var getCombo = function(masks) {
  return ee.ImageCollection(masks).max().selfMask()
      .reproject({crs: crsLatLon, crsTransform: ds_gridRes});
};

var OP_TM = getCombo([oilpalm,timber]);
var OP_LG = getCombo([oilpalm,logging]);
var OP_PT = getCombo([oilpalm,peat]);
var OP_CA = getCombo([oilpalm,conservation]);
var TM_LG = getCombo([timber,logging]);
var TM_PT = getCombo([timber,peat]);
var TM_CA = getCombo([timber,conservation]);
var LG_PT = getCombo([logging,peat]);
var LG_CA = getCombo([logging,conservation]);
var PT_CA = getCombo([peat,conservation]);

var OP_TM_LG = getCombo([oilpalm,timber,logging]);
var OP_TM_PT = getCombo([oilpalm,timber,peat]);
var OP_TM_CA = getCombo([oilpalm,timber,conservation]);
var OP_LG_PT = getCombo([oilpalm,logging,peat]);
var OP_LG_CA = getCombo([oilpalm,logging,conservation]);
var OP_PT_CA = getCombo([oilpalm,peat,conservation]);
var TM_LG_PT = getCombo([timber,logging,peat]);
var TM_LG_CA = getCombo([timber,logging,conservation]);
var TM_PT_CA = getCombo([timber,peat,conservation]);
var LG_PT_CA = getCombo([logging,peat,conservation]);

var OP_TM_LG_PT = getCombo([oilpalm,timber,logging,peat]);
var OP_TM_LG_CA = getCombo([oilpalm,timber,logging,conservation]);
var OP_TM_PT_CA = getCombo([oilpalm,timber,peat,conservation]);
var OP_LG_PT_CA = getCombo([oilpalm,logging,peat,conservation]);
var TM_LG_PT_CA = getCombo([timber,logging,peat,conservation]);

var OP_TM_LG_PT_CA = getCombo([oilpalm,timber,logging,peat,conservation]);


var getReducedFRP = function(frp_dsGrid, frp_gfedGrid, mask) {
  var frpGrid = frp_dsGrid.updateMask(mask).reduceRegions({
    collection: grid,
    reducer: ee.Reducer.sum().unweighted(),
    crs: crsLatLon,
    crsTransform: ds_gridRes,
  });
      
  var frpSumGrid = frpGrid.reduceToImage(['sum'], 'mean')
    .reproject({crs: crsLatLon, crsTransform: ds_gridRes})
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
  
  return frpSumGrid.divide(frp_gfedGrid).clamp(0,1).updateMask(indoMask)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
};

var peatNames = ['IN2IN_P', 'IN2DG_P', 'IN2NF_P', 'IN2PL_P' ,'DG2DG_P',
  'DG2NF_P', 'DG2PL_P', 'NF2NF_P', 'PL2PL_P'];

var getPeatRatio = function(emiRateMonthly) {
  var peatEmiRate = emiRateMonthly.select(peatNames).reduce(ee.Reducer.sum());
  var totalEmiRate = emiRateMonthly.reduce(ee.Reducer.sum());
  return peatEmiRate.divide(totalEmiRate).clamp(0,1).updateMask(indoMask)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
};

var maxPeatRatio = function(peatRatio, comboPeatRatio) {
  return ee.ImageCollection([peatRatio, comboPeatRatio]).max()
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
};

for(var iYear = sYear; iYear <= eYear; iYear++) {
  for(var iMonth = 1; iMonth <= 12; iMonth++) {

    var timeMon = ee.Date.fromYMD(iYear,iMonth,1).millis();
    var iMonthStr = ee.Number(iMonth).format('%02d').getInfo();
    
    var filterYr = ee.Filter.calendarRange(iYear,iYear,'year');
    var filterMon = ee.Filter.calendarRange(iMonth,iMonth,'month');
    
    var emiRateMon = ee.Image(emiRate.filter(filterYr).filter(filterMon).first());

    var frpMon = ee.Image(frp.filter(filterYr).filter(filterMon).first());

    var frp_dsGrid = frpMon.select('TotalFRP');
    var frp_gfedGrid = frpMon.select('TotalFRP_0-25deg')
      .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
    
    // Individual Masks
    var bauMask = ee.Image(1).rename('BAU').updateMask(indoMask)
      .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
    
    // Select 1:
    var OP_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, oilpalm).rename('OP');
    var TM_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, timber).rename('TM');
    var LG_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, logging).rename('LG');
    var PT_Mask = getPeatRatio(emiRateMon).rename('PT');
    var CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, conservation).rename('CA');
    var BRG_Mask = brg_sites.updateMask(indoMask).rename('BRG');
    
    // Select 2: 
    var OP_TM_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM).rename('OP_TM');
    var OP_LG_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_LG).rename('OP_LG');
    var OP_PT_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_PT)).rename('OP_PT');
    var OP_CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_CA).rename('OP_CA');
    var TM_LG_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, TM_LG).rename('TM_LG');
    var TM_PT_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, TM_PT)).rename('TM_PT');
    var TM_CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, TM_CA).rename('TM_CA');
    var LG_PT_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, LG_PT)).rename('LG_PT');
    var LG_CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, LG_CA).rename('LG_CA');
    var PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, PT_CA)).rename('PT_CA');
    
    // Select 3:
    var OP_TM_LG_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM_LG).rename('OP_TM_LG');
    var OP_TM_PT_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM_PT)).rename('OP_TM_PT');
    var OP_TM_CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM_CA).rename('OP_TM_CA');
    var OP_LG_PT_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_LG_PT)).rename('OP_LG_PT');
    var OP_LG_CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_LG_CA).rename('OP_LG_CA');
    var OP_PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_PT_CA)).rename('OP_PT_CA');
    var TM_LG_PT_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, TM_LG_PT)).rename('TM_LG_PT');
    var TM_LG_CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, TM_LG_CA).rename('TM_LG_CA');
    var TM_PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, TM_PT_CA)).rename('TM_PT_CA');
    var LG_PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, LG_PT_CA)).rename('LG_PT_CA');
    
    // Select 4:
    var OP_TM_LG_PT_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM_LG_PT)).rename('OP_TM_LG_PT');
    var OP_TM_LG_CA_Mask = getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM_LG_CA).rename('OP_TM_LG_CA');
    var OP_TM_PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM_PT_CA)).rename('OP_TM_PT_CA');
    var OP_LG_PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_LG_PT_CA)).rename('OP_LG_PT_CA');
    var TM_LG_PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, TM_LG_PT_CA)).rename('TM_LG_PT_CA');

    // Select 5:
    var OP_TM_LG_PT_CA_Mask = maxPeatRatio(PT_Mask, getReducedFRP(frp_dsGrid, frp_gfedGrid, OP_TM_LG_PT_CA)).rename('OP_TM_LG_PT_CA');

    var masksAll = bauMask.addBands(OP_Mask).addBands(TM_Mask).addBands(LG_Mask)
      .addBands(PT_Mask).addBands(CA_Mask).addBands(BRG_Mask)
      .addBands(OP_TM_Mask).addBands(OP_LG_Mask).addBands(OP_PT_Mask).addBands(OP_CA_Mask)
      .addBands(TM_LG_Mask).addBands(TM_PT_Mask).addBands(TM_CA_Mask).addBands(LG_PT_Mask)
      .addBands(LG_CA_Mask).addBands(PT_CA_Mask)
      .addBands(OP_TM_LG_Mask).addBands(OP_TM_PT_Mask).addBands(OP_TM_CA_Mask)
      .addBands(OP_LG_PT_Mask).addBands(OP_LG_CA_Mask).addBands(OP_PT_CA_Mask)
      .addBands(TM_LG_PT_Mask).addBands(TM_LG_CA_Mask).addBands(TM_PT_CA_Mask)
      .addBands(LG_PT_CA_Mask)
      .addBands(OP_TM_LG_PT_Mask).addBands(OP_TM_LG_CA_Mask).addBands(OP_TM_PT_CA_Mask)
      .addBands(OP_LG_PT_CA_Mask).addBands(TM_LG_PT_CA_Mask)
      .addBands(OP_TM_LG_PT_CA_Mask)
      .reproject({crs: crsLatLon, crsTransform: gfed_gridRes})
      .set('system:time_start',timeMon);
      
    // Export Masks
    Export.image.toAsset({
      image: masksAll,
      assetId: folderStr + 'IDN_masks_' + iYear + '_' + iMonthStr,
      description: 'IDN_masks_' + iYear + '_' + iMonthStr,
      crs: 'EPSG:4326',
      crsTransform: [0.25,0,95,0,-0.25,6.75],
      region: outputRegion,
      maxPixels: 10e12
    });
  }
}
