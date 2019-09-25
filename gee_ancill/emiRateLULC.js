/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var ds_grid = ee.Image("projects/IndonesiaPolicyTool/dsGFEDgrid"),
    grid = ee.FeatureCollection("projects/IndonesiaPolicyTool/GFEDgrid"),
    gfedv4s = ee.ImageCollection("projects/IndonesiaPolicyTool/GFEDv4s"),
    areaLULCtr = ee.Image("projects/IndonesiaPolicyTool/Cocktail_LULC/areaLULCtr_m2/areaLULCtr_2005_2009");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ===================================
// Emissions Rate, LULC Transitions,
// 0.25deg, kg per sq. m
// ===================================
// Imports:
var maps = require('users/tl2581/SMOKEPolicyTool:marHanS_params');
var marHanS2005 = maps.marHanS2005;
var marHanS2010 = maps.marHanS2010;
var LULC = maps.LULC_transitions;
var peatMask = maps.peatMask;
var revPeatMask = maps.revPeatMask;

// Input Params:
var outputRegion = ee.Geometry.Rectangle([95,-11,141,6],'EPSG:4326',false);
var folderStr = 'projects/IndonesiaPolicyTool/emiRateLULCtr_kg_per_m2/';

var sYear = 2005; var eYear = 2009;

var modisScale = ee.Image(ee.ImageCollection('MODIS/006/MOD14A1').first()).projection();
var dsgrid_scale = ds_grid.projection();
var grid_scale = ee.Image(gfedv4s.first()).projection();

// Get Area Ratio
var areaSum = areaLULCtr.reduce(ee.Reducer.sum());
var lulcRatio = areaLULCtr.divide(areaSum);

var getEmiRate = function(inputDM,lulc_sel,mask,newName) {
  var inLULC = areaLULCtr.select(newName);
  var dm_1km_lulc = inputDM.updateMask(LULC.select([lulc_sel]))
    .multiply(mask);
  
  // Upscale LULC transitions to 0.25deg
  var dm_grid = dm_1km_lulc.selfMask()
    .updateMask(inLULC.gt(0)).reduceRegions({
      collection: grid,
      reducer: ee.Reducer.sum().unweighted(),
      crs: dsgrid_scale,
      scale: dsgrid_scale.nominalScale(),
    });
  
  var dm_upscale = dm_grid.reduceToImage(['sum'], 'mean')
    .reproject({crs: dsgrid_scale, scale: dsgrid_scale.nominalScale()})
    .reproject({crs: grid_scale, scale: grid_scale.nominalScale()})
    .divide(inLULC).rename(newName);
  
  return dm_upscale;
};

for(var iYear = sYear; iYear <= eYear; iYear++) {
  for(var iMonth = 1; iMonth <= 12; iMonth++) {

    var timeMon = ee.Date.fromYMD(iYear,iMonth,1).millis();
    var iMonthStr = ee.Number(iMonth).format('%02d').getInfo();
    
    var filterYr = ee.Filter.calendarRange(iYear,iYear,'year');
    var filterMon = ee.Filter.calendarRange(iMonth,iMonth,'month');
    
    var dm = ee.Image(gfedv4s.filter(filterYr)
      .filter(filterMon).first());
    
    // Ratio of FRP to grid, re-proportion dm based on frp
    var terra = ee.ImageCollection('MODIS/006/MOD14A1')
      .filter(filterYr).filter(filterMon).select('MaxFRP')
      .sum().reproject({crs: modisScale, scale: modisScale.nominalScale()});
    
    var aqua = ee.ImageCollection('MODIS/006/MYD14A1')
      .filter(filterYr).filter(filterMon).select('MaxFRP')
      .sum().reproject({crs: modisScale, scale: modisScale.nominalScale()});
    
    var frpSum = ee.ImageCollection([terra,aqua]).sum()
      .reproject({crs: dsgrid_scale, scale: dsgrid_scale.nominalScale()});
    
    // Number of pixels with fires, total fire counts
    var frpGrid = frpSum.reduceRegions({
      collection: grid,
      reducer: ee.Reducer.sum().unweighted(),
      crs: dsgrid_scale,
      scale: dsgrid_scale.nominalScale(),
    });

    var frpSumGrid = frpGrid.reduceToImage(['sum'], 'mean')
      .reproject({crs: dsgrid_scale, scale: dsgrid_scale.nominalScale()})
      .reproject({crs: grid_scale, scale: grid_scale.nominalScale()});

    // Ratio of pixels with fires to total land pixels
    var frpRatio = frpSum.divide(frpSumGrid)
      .reproject({crs: dsgrid_scale, scale: dsgrid_scale.nominalScale()});

    var dm_1km = frpRatio.multiply(dm)
      .reproject({crs: dsgrid_scale, scale: dsgrid_scale.nominalScale()});
    
    // Non-Peat LULC
    var IN2IN_NP = getEmiRate(dm_1km,0,revPeatMask,'IN2IN_NP');
    var IN2DG_NP = getEmiRate(dm_1km,1,revPeatMask,'IN2DG_NP');
    var IN2NF_NP = getEmiRate(dm_1km,2,revPeatMask,'IN2NF_NP');
    var IN2PL_NP = getEmiRate(dm_1km,3,revPeatMask,'IN2PL_NP');
    var DG2DG_NP = getEmiRate(dm_1km,4,revPeatMask,'DG2DG_NP');
    var DG2NF_NP = getEmiRate(dm_1km,5,revPeatMask,'DG2NF_NP');
    var DG2PL_NP = getEmiRate(dm_1km,6,revPeatMask,'DG2PL_NP');
    var NF2NF_NP = getEmiRate(dm_1km,7,revPeatMask,'NF2NF_NP');
    var PL2PL_NP = getEmiRate(dm_1km,8,revPeatMask,'PL2PL_NP');

    // Non-Peat LULC
    var IN2IN_P = getEmiRate(dm_1km,0,peatMask,'IN2IN_P');
    var IN2DG_P = getEmiRate(dm_1km,1,peatMask,'IN2DG_P');
    var IN2NF_P = getEmiRate(dm_1km,2,peatMask,'IN2NF_P');
    var IN2PL_P = getEmiRate(dm_1km,3,peatMask,'IN2PL_P');
    var DG2DG_P = getEmiRate(dm_1km,4,peatMask,'DG2DG_P');
    var DG2NF_P = getEmiRate(dm_1km,5,peatMask,'DG2NF_P');
    var DG2PL_P = getEmiRate(dm_1km,6,peatMask,'DG2PL_P');
    var NF2NF_P = getEmiRate(dm_1km,7,peatMask,'NF2NF_P');
    var PL2PL_P = getEmiRate(dm_1km,8,peatMask,'PL2PL_P');

    var emiRateLULCtr = IN2IN_NP.addBands(IN2DG_NP).addBands(IN2NF_NP)
      .addBands(IN2PL_NP).addBands(DG2DG_NP).addBands(DG2NF_NP)
      .addBands(DG2PL_NP).addBands(NF2NF_NP).addBands(PL2PL_NP)
      .addBands(IN2IN_P).addBands(IN2DG_P).addBands(IN2NF_P)
      .addBands(IN2PL_P).addBands(DG2DG_P).addBands(DG2NF_P)
      .addBands(DG2PL_P).addBands(NF2NF_P).addBands(PL2PL_P);
      
    // Compensate for additional difference in emissions
    // from grid cells that have no active fire detections
    // by adding emissions rates weighted by the
    // ratio of LULC transitions areas
    var gfedMon = ee.Image(gfedv4s.filter(filterYr)
      .filter(filterMon).first());
    
    var emiLULCtr = emiRateLULCtr.multiply(areaLULCtr);
    var emiSum = emiLULCtr.reduce(ee.Reducer.sum());
      
    var emiBias = gfedMon.subtract(emiSum)
      .multiply(frpSumGrid.eq(0));
    var emiBiasNonZero = emiBias.multiply(emiBias.gt(0));

    var emiRateReLULCtr = emiRateLULCtr.add(lulcRatio
      .multiply(emiBiasNonZero).divide(areaLULCtr))
      .set('system:time_start',timeMon);
      
    // Export LULC emissions rates
    Export.image.toAsset({
      image: emiRateReLULCtr,
      assetId: folderStr + 'emiRateLULCtr_' + iYear + '_' + iMonthStr,
      description: 'emiRateLULCtr_' + iYear + '_' + iMonthStr,
      scale: [0.25,0,95,0,-0.25,6.75],
      crs: 'EPSG:4326',
      region: outputRegion,
      maxPixels: 10e9
    });
  }
}