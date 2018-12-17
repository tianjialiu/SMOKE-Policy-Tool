/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var IDNprovS = ee.FeatureCollection("users/smokepolicytool/IDN_adm/IDN_adm1_simplified"),
    emiRateLULCtr = ee.ImageCollection("users/smokepolicytool/Cocktail_LULC/emiRateLULCtr_kg_per_m2"),
    areaLULCtr = ee.ImageCollection("users/smokepolicytool/Cocktail_LULC/areaLULCtr_m2"),
    gcArea = ee.Image("users/smokepolicytool/area_m2/GC_grid"),
    gfedArea = ee.Image("users/smokepolicytool/area_m2/GFEDv4s_grid"),
    brgGrid = ee.FeatureCollection("users/smokepolicytool/IDN_conservation/BRG_sites_gfedGrid");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ===============================
// Calculate OC+BC Emissions and
// Monthly Smoke PM2.5
// ===============================
var outputRegion = ee.Geometry.Rectangle([95,-11,141,6],'EPSG:4326',false);
var adjointFolder = 'users/smokepolicytool/GC_adjoint_sensitivities/';
var adjointFolder_ds = 'users/smokepolicytool/GC_adjoint_sensitivities_0p25deg/';

var crsLatLon = 'EPSG:4326';
var ds_gridRes = [0.008333333333333333,0,95,0,-0.008333333333333333,6];
var gfed_gridRes = [0.25,0,95,0,-0.25,6.75];
var sens_gridRes = [0.6666666666666667,0,69.66666666666667,0,-0.5,55.25];

var sMonth = 7; var eMonth = 10; // Fire season (Jul-Oct)

// Margono + Hansen derived LULC transitions
var LULCtr = ['IN2IN_NP', 'IN2DG_NP', 'IN2NF_NP', 'IN2PL_NP',
  'DG2DG_NP', 'DG2NF_NP', 'DG2PL_NP', 'NF2NF_NP', 'PL2PL_NP',
  'IN2IN_P', 'IN2DG_P', 'IN2NF_P', 'IN2PL_P' ,'DG2DG_P',
  'DG2NF_P', 'DG2PL_P', 'NF2NF_P', 'PL2PL_P'];

// OC and BC emissions factors from GFEDv4s (g OC, BC/ kg DM)
// 1. SAVA, 2. BORF, 3. TEMF 4. DEFO, 5. Peat, 6. AGRI
// 7. SAVA-DEFO weighted avg.
var oc_ef = [2.62, 9.6, 9.6, 4.71, 6.02, 2.3, 4.07]; // g OC per kg DM
var bc_ef = [0.37, 0.5, 0.5, 0.52, 0.04, 0.75, 0.47]; // g BC per kg DM

// Match Margono + Hansen LULC transitions to GFEDv4s LULC
// to apply emissions factors on DM emissions
var gfed_index = [3, 3, 3, 3, 3, 3, 3, 0, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4];

// Format OC and BC emissions factors to the emissions rates layers
var oc_ef_LULCtr = ee.Image([]); var bc_ef_LULCtr = ee.Image([]);
for (var i = 0; i < 18; i++) {
  oc_ef_LULCtr = oc_ef_LULCtr.addBands(ee.Image(oc_ef[gfed_index[i]]));
  bc_ef_LULCtr = bc_ef_LULCtr.addBands(ee.Image(bc_ef[gfed_index[i]]));
}
var oc_ef_LULCtr = oc_ef_LULCtr.rename(LULCtr);
var bc_ef_LULCtr = bc_ef_LULCtr.rename(LULCtr);

// Conversion factors
var sf_timeSteps = 24 * 3; // number of physical time steps in adjoint (20 min time steps),
var sf_smokePMtracer = 24; // molecular mass of OC + BC adjoint tracer, conversion to smoke PM2.5
var sf_timeDay = 24 * 60 * 60; // seconds per day

// Receptors (population-weighted)
var receptorList = ['Singapore','Indonesia','Malaysia'];
var receptorCodeList = ['SGP','IDN','MYS'];

// Index 3-letter code to find full name of receptor
var getReceptorCode = function(receptor) {
  var receptorIdx = receptorList.indexOf(receptor);
  return receptorCodeList[receptorIdx];
};

// Retrieve adjoint sensitivities for input receptor
var getSensitivity = function(receptor,inAdjointFolder) {
  return ee.ImageCollection(inAdjointFolder + getReceptorCode(receptor) + '_adjointSens_monthly');
};

// Reduces and converts an image to a feature
var imageToFeature = function(inImage,inRegion) {
  var inImageCol = inImage.reduceRegions({
      collection: inRegion,
      reducer: ee.Reducer.sum().unweighted(),
      crs: crsLatLon,
      crsTransform: gfed_gridRes
    }).toList(1,0).get(0);
  return ee.Feature(inImageCol);
};

// Monthly average OC + BC emissions (μg/m2/s)
var getEmissMon = function(inMonth,inYear,inSens,inArea,inAreaSum,inMask) {
  var filterYr = ee.Filter.calendarRange(inYear,inYear,'year');
  var filterMon = ee.Filter.calendarRange(inMonth,inMonth,'month');
  
  // Design Scenario Mask, fractional (0-1), where 0 = fully masked
  var maskMon = ee.Image(inMask.filter(filterYr).filter(filterMon).first());
  
  // Emissions Rate x Area = Emissions (kg DM)
  var emissMon = ee.Image(emiRateLULCtr.filter(filterYr).filter(filterMon).first())
    .multiply(inArea).reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
  
  // Sensitivity, monthly accumulation
  var sensMon = ee.Image(inSens.filter(filterYr).filter(filterMon).first());
  var nDays = ee.Number(sensMon.get('ndays'));
  
  // Calculate OC, BC (g) from DM (kg)
  var oc_emiss = emissMon.multiply(oc_ef_LULCtr).reduce(ee.Reducer.sum()); 
  var bc_emiss = emissMon.multiply(bc_ef_LULCtr).reduce(ee.Reducer.sum());
  
  // OC + BC conversion from (g/grid cell/month) to (μg/m2/s)
  var emissMonTotal = oc_emiss.add(bc_emiss).multiply(maskMon)
    .divide(inAreaSum).multiply(1e6).divide(nDays).divide(sf_timeDay)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});

  return emissMonTotal;
};

// Smoke PM2.5 exposure (μg/m3), monthly [Emissions Rate x Sensitivity]
var getEmissReceptorMon = function(inMonth,inYear,inSens,inArea,inAreaSum,inMask) {
  var filterYr = ee.Filter.calendarRange(inYear,inYear,'year');
  var filterMon = ee.Filter.calendarRange(inMonth,inMonth,'month');
   
  // Design Scenario Mask, fractional (0-1), where 0 = fully masked
  var maskMon = ee.Image(inMask.filter(filterYr).filter(filterMon).first());

  // Emissions Rate x Area = Emissions (kg DM)
  var emissMon = ee.Image(emiRateLULCtr.filter(filterYr).filter(filterMon).first())
    .multiply(inArea);
      
  // Sensitivity, monthly
  var sensMon = ee.Image(inSens.filter(filterYr).filter(filterMon).first());
  var nDays = ee.Number(sensMon.get('ndays'));
    
  // Calculate OC, BC from DM (g)
  var oc_emiss = emissMon.multiply(oc_ef_LULCtr).reduce(ee.Reducer.sum()); 
  var bc_emiss = emissMon.multiply(bc_ef_LULCtr).reduce(ee.Reducer.sum());

  // Split into GEOS-Chem hydrophobic and hydrophilic fractions
  var oc_phobic = oc_emiss.multiply(0.5 * 2.1);
  var oc_philic = oc_emiss.multiply(0.5 * 2.1);

  var bc_phobic = bc_emiss.multiply(0.8);
  var bc_philic = bc_emiss.multiply(0.2);
    
  var emiss_philic = oc_philic.add(bc_philic).rename('b1');
  var emiss_phobic = oc_phobic.add(bc_phobic).rename('b2');
  
  // 1. Convert OC + BC emissions from g/grid cell/month to μg/m2/day
  var emissPart = emiss_philic.addBands(emiss_phobic)
    .multiply(1e6).divide(inAreaSum).divide(nDays)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
    
  // 2. Convert downscaled accumulated monthly sensitivity (0.25deg) from
  // (μg/m3)/(kg/grid cell/timestep) to (μg/m3)/(μg/m2/day)
  var sensPart = sensMon.multiply(gfedArea).multiply(1e-9)
    .divide(sf_timeSteps).divide(sf_smokePMtracer).divide(nDays)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
    
  // 3. Multiply OC + BC emissions rate by sensitivity
  // for smoke PM2.5 concentrations (μg m-3)
  var emissReceptorMon = emissPart.multiply(sensPart).reduce(ee.Reducer.sum())
    .multiply(maskMon).reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
  
  return emissReceptorMon;
};

// Smoke PM2.5 exposure (μg/m3), monthly time series
exports.getPM = function(inputYear,metYear,receptor,inMask) {
  var inArea = ee.Image(areaLULCtr.filter(ee.Filter.calendarRange(inputYear-4,inputYear,'year')).first());
  var areaSum = inArea.reduce(ee.Reducer.sum());
  var inSens = getSensitivity(receptor,adjointFolder_ds);

  var emissReceptor = ee.List.sequence(1,12,1).map(function(iMonth) {
    var emissReceptorMon = getEmissReceptorMon(iMonth,metYear,inSens,
      inArea,areaSum,inMask);
    
    return imageToFeature(emissReceptorMon,outputRegion)
      .select(['sum'],['Smoke_PM2p5'])
      .set('system:time_start',ee.Date.fromYMD(inputYear,iMonth,1).millis());
  });
  return(ee.FeatureCollection(emissReceptor));
};

// =============
// Display Maps
// =============
// Sensitivity, hydrophilic only, Jul-Oct average (μg m-3/g m-2 s-1)
// Adjoint hydrophilic and hydrophobic sensitivities have similar spatial variability
exports.getSensMap = function(metYear,receptor) {
  var inSens = getSensitivity(receptor,adjointFolder);
  var filterYr = ee.Filter.calendarRange(metYear,metYear,'year');
  var filterMon = ee.Filter.calendarRange(sMonth,eMonth,'month');
  
  var sensFilter = inSens.filter(filterYr).filter(filterMon);
  
  var sensAvg = sensFilter.map(function(sensMon) {
      var nDays = ee.Number(sensMon.get('ndays'));
      return sensMon.multiply(gcArea).divide(nDays).multiply(1e-3)
        .divide(sf_timeSteps).divide(sf_smokePMtracer).multiply(sf_timeDay)
        .reproject({crs: crsLatLon, crsTransform: sens_gridRes});
    });
  
  return ee.ImageCollection(sensAvg).mean().rename(['hydrophilic','hydrophobic']).select('hydrophilic')
    .reproject({crs: crsLatLon, crsTransform: sens_gridRes});
};

exports.sensColRamp = ['#FFFFFF','#C7E6F8','#8DBEE2','#5990BB','#64A96C','#A9CB65',
  '#F4D46A','#E58143','#D14D36','#B1322E','#872723'];

// PM2.5 exposure, Jul-Oct average (μg m-3)
exports.getPMmap = function(inputYear,metYear,receptor,inMask) {
  var inArea = ee.Image(areaLULCtr.filter(ee.Filter.calendarRange(inputYear-4,inputYear,'year')).first());
  var areaSum = inArea.reduce(ee.Reducer.sum());
  var inSens = getSensitivity(receptor,adjointFolder_ds);
  
  var emissReceptor = ee.List.sequence(sMonth,eMonth,1).map(function(iMonth) {
    var emissReceptorMon = getEmissReceptorMon(iMonth,metYear,inSens,inArea,
      areaSum,inMask);
      
    return emissReceptorMon.rename('smoke_PM2p5')
      .set('system:time_start',ee.Date.fromYMD(inputYear,iMonth,1).millis());
  });

  return(ee.ImageCollection(emissReceptor).mean()
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes}));
};

exports.PMRamp = ['#FFFFFF','#FBC127','#F67D15','#D44842',
  '#9F2963','#65146E','#280B54','#000000'];

// BRG Sites: Top 5 priority grid cells for reducing emissions
exports.getBRGmap = function(PMmap) {
  var PMbrg = PMmap.reduceRegions({
    collection: brgGrid,
    reducer: 'max',
    crs: crsLatLon,
    crsTransform: gfed_gridRes
  }).sort('max',false);
  
  return ee.Image().byte().rename('BRG_Sites')
    .paint(ee.FeatureCollection(PMbrg.toList(100,5)), 0, 2)
    .paint(ee.FeatureCollection(PMbrg.toList(5,0)), 1, 2);
};

// OC + BC Emissions, Jul-Oct average (μg m-2 s-1)
exports.getEmissMap = function(inputYear,metYear,receptor,inMask) {
  var inArea = ee.Image(areaLULCtr.filter(ee.Filter.calendarRange(inputYear-4,inputYear,'year')).first());
  var areaSum = inArea.reduce(ee.Reducer.sum());
  var inSens = getSensitivity(receptor,adjointFolder);
  
  var emiss = ee.List.sequence(sMonth,eMonth,1).map(function(iMonth) {
    var emissMon = getEmissMon(iMonth,metYear,inSens,inArea,
      areaSum,inMask);
      
    return emissMon.rename('oc_bc_emiss')
      .set('system:time_start',ee.Date.fromYMD(inputYear,iMonth,1).millis());
  });

  return(ee.ImageCollection(emiss).mean()
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes}));
};

exports.emissColRamp = ['#FFFFFF','#FFFFB2','#FED976','#FEB24C','#FD8D3C',
  '#FC4E2A','#E31A1C','#B10026'];

// ===============
// Display Charts
// ===============
// Smoke PM2.5 (μg m-3) time series, monthly average
exports.getPMchart = function(PMts,PMavg,OCtot,BCtot,plotPanel) {
  plotPanel = plotPanel.clear();
  var PMchart = ui.Chart.feature.byFeature(PMts,'system:time_start','Smoke_PM2p5')
    .setOptions({
      title: 'Population-Weighted Smoke PM2.5 Exposure',
      hAxis: {'format':'MMM'},
      vAxis: {title: 'Smoke PM2.5 (μg/m³)'},
      legend: 'none',
      lineWidth: 2,
      pointSize: 5,
    });
  plotPanel.add(PMchart);

  plotPanel.add(ui.Label('Jul-Oct Mean PM2.5: ' + PMavg.getInfo() + ' μg/m³',
    {margin: '-10px 0px -5px 25px', padding: '0px 0px 8px 0px', stretch: 'horizontal'}));
  plotPanel.add(ui.Label('Jul-Oct Total OC: ' + OCtot.getInfo() + ' Tg | Total BC: ' + BCtot.getInfo() + ' Tg',
    {margin: '0px 0px -5px 25px', padding: '0px 0px 10px 0px', stretch: 'horizontal'}));
};

// Contribution of PM2.5 exposure by Indonesian province
exports.getPMContrByProvChart = function(PMmap,plotPanel) {
  var PMprov = PMmap.reduceRegions({
    collection: IDNprovS,
    reducer: ee.Reducer.sum().unweighted(),
    crs: crsLatLon,
    crsTransform: gfed_gridRes
  });

  var PMProvChart = ui.Chart.feature.byFeature(
    PMprov.sort('sum',false),'NAME','sum')
    .setChartType('PieChart')
    .setOptions({
      title: 'Smoke PM2.5 Contribution by Province',
      legend: 'NAME_1',
    });
  plotPanel.add(PMProvChart);
};

// =============
// Display Text
// =============
// Jul-Oct average PM2.5 exposure (μg m-3)
exports.getPMavg = function(inputYear,metYear,receptor,inMask) {
  var inArea = ee.Image(areaLULCtr.filter(ee.Filter.calendarRange(inputYear-4,inputYear,'year')).first());
  var areaSum = inArea.reduce(ee.Reducer.sum());
  var inSens = getSensitivity(receptor,adjointFolder_ds);

  var emissReceptor = ee.List.sequence(sMonth,eMonth,1).map(function(iMonth) {
    var emissReceptorMon = getEmissReceptorMon(iMonth,metYear,inSens,inArea,
      areaSum,inMask);
      
    return imageToFeature(emissReceptorMon,outputRegion);
  });
  return ee.Number(ee.FeatureCollection(emissReceptor)
    .aggregate_mean('sum')).format('%.2f');
};

// Jul-Oct total OC & BC emissions (Tg)
exports.getEmissTotal = function(inputYear,metYear,inSpecies,inMask) {
  var inArea = ee.Image(areaLULCtr.filter(ee.Filter.calendarRange(inputYear-4,inputYear,'year')).first());
  var filterYr = ee.Filter.calendarRange(metYear,metYear,'year');
  
  var emissPartTotal = ee.List.sequence(sMonth,eMonth,1)
    .map(function(iMonth) {
      var filterMon = ee.Filter.calendarRange(iMonth,iMonth,'month');
      
      // Design Scenario Mask, fractional (0-1), where 0 = fully masked
      var maskMon = ee.Image(inMask.filter(filterYr).filter(filterMon).first());
    
      // Emissions Rate x Area = Emissions (kg DM)
      var emissMon = ee.Image(emiRateLULCtr.filter(filterYr).filter(filterMon).first())
        .multiply(inArea);
      
      // Calculate OC, BC (g) from DM (kg)
      var oc_emiss = emissMon.multiply(oc_ef_LULCtr).reduce(ee.Reducer.sum()).rename('OC'); 
      var bc_emiss = emissMon.multiply(bc_ef_LULCtr).reduce(ee.Reducer.sum()).rename('BC');
      
      // Convert OC, BC from g to Tg
      var oc_bc_emiss = oc_emiss.addBands(bc_emiss)
        .select(inSpecies).multiply(maskMon).multiply(1e-12)
        .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});

      return imageToFeature(oc_bc_emiss,outputRegion);
    });
   
  return ee.Number(ee.FeatureCollection(emissPartTotal)
    .aggregate_sum('sum')).format('%.2f');
};
