/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var ds_grid = ee.Image("projects/IndonesiaPolicyTool/IDN_adm/dsGFEDgrid"),
    grid = ee.FeatureCollection("projects/IndonesiaPolicyTool/IDN_adm/GFEDgrid");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ======================================
// Export Monthly MODIS MxD14A1 FRP, MW
// ======================================
// Input Params:
var outputRegion = ee.Geometry.Rectangle([95,-11,141,6],'EPSG:4326',false);
var folderStr = 'projects/IndonesiaPolicyTool/Cocktail_LULC/MxD14A1_C6_FRP_MW/';

var sYear = 2005; var eYear = 2009;
var crsLatLon = 'EPSG:4326';
var ds_gridRes = [0.008333333333333333,0,95,0,-0.008333333333333333,6];
var gfed_gridRes = [0.25,0,95,0,-0.25,6.75];

for(var iYear = sYear; iYear <= eYear; iYear++) {
  for(var iMonth = 1; iMonth <= 12; iMonth++) {

    var timeMon = ee.Date.fromYMD(iYear,iMonth,1).millis();
    var iMonthStr = ee.Number(iMonth).format('%02d').getInfo();
    
    var filterYr = ee.Filter.calendarRange(iYear,iYear,'year');
    var filterMon = ee.Filter.calendarRange(iMonth,iMonth,'month');

    // Terra, Aqua and Terra + Aqua FRP
    var terra = ee.Image(ee.ImageCollection('MODIS/006/MOD14A1')
      .filter(filterYr).filter(filterMon).select('MaxFRP')
      .sum()).multiply(0.1).reproject({crs: crsLatLon, crsTransform: ds_gridRes});
    
    var aqua = ee.Image(ee.ImageCollection('MODIS/006/MYD14A1')
      .filter(filterYr).filter(filterMon).select('MaxFRP')
      .sum()).multiply(0.1).reproject({crs: crsLatLon, crsTransform: ds_gridRes});
    
    var frpSum = ee.ImageCollection([terra,aqua]).sum()
      .reproject({crs: crsLatLon, crsTransform: ds_gridRes});

    // FRP sum per 0.25deg x 0.25deg grid cell
    var frpGrid = frpSum.reduceRegions({
      collection: grid,
      reducer: ee.Reducer.sum().unweighted(),
      crs: crsLatLon,
      crsTransform: ds_gridRes,
    });

    var frpSumGrid = frpGrid.reduceToImage(['sum'], 'mean')
      .reproject({crs: crsLatLon, crsTransform: ds_gridRes})
      .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
    
    var frpAll = terra.rename('TerraFRP').addBands(aqua.rename('AquaFRP'))
      .addBands(frpSum.rename('TotalFRP')).addBands(frpSumGrid.rename('TotalFRP_0-25deg'))
      .reproject({crs: crsLatLon, crsTransform: ds_gridRes})
      .set('system:time_start',timeMon);
    
    // Export FRP
    Export.image.toAsset({
      image: frpAll,
      assetId: folderStr + 'FRP_MW_' + iYear + '_' + iMonthStr,
      description: 'FRP_MW_' + iYear + '_' + iMonthStr,
      crs: 'EPSG:4326',
      crsTransform: [0.008333333333333333,0,95,0,-0.008333333333333333,6],
      region: outputRegion,
      maxPixels: 10e12
    });
  }
}