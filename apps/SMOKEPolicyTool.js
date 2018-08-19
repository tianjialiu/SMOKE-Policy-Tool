// *****************************************************************
// =================================================================
// ------------- Instructions for SMOKE Policy Tool ------------- ||
// =================================================================
// *****************************************************************

// Documentation: https://github.com/tianjialiu/SMOKE-Policy-Tool
// Author: Tianjia Liu
// Last updated: August 19, 2018

// Purpose: model and project the impact of Indonesian fires
// on public health in Equatorial Asia for 2005-2029 based on
// land cover/ land use (LULC) classification, GFEDv4s fire emissions,
// and meteorology

// -----------
//  - Code - |
// -----------
// * SMOKE policy tool Javascript code was adapted from 
//   Python code developed by Karen Yu (https://github.com/kyu0110/policy-tool)
// * UI functions were adapted and modified from LandTrendr-GEE UI (https://emapr.github.io/LT-GEE/index.html)

// ==========================================================
// *****************   --    Modules    --   ****************
// ==========================================================
// Global params:
var crsLatLon = 'EPSG:4326';
var ds_gridRes = [0.008333333333333333,0,95,0,-0.008333333333333333,6];
var gfed_gridRes = [0.25,0,95,0,-0.25,6.75];
var sens_gridRes = [0.6666666666666667,0,69.66666666666667,0,-0.5,55.25];
var assetsFolder = 'users/smokepolicytool/';

// --------------------------------------
// - - - - - - smokeLULC.js - - - - - - |
// --------------------------------------
// ===============================
// Margono + Hansen LULC maps and
// masks for blocking fires
// ===============================
// Imports:
var marHanS2005 = ee.Image(assetsFolder + 'marHanS_LULC/marHanS2005');
var marHanS2010 = ee.Image(assetsFolder + 'marHanS_LULC/marHanS2010');
var marHanSfuture = ee.ImageCollection(assetsFolder + 'marHanS_LULC/marHanS_future');
var peatMask = ee.Image(assetsFolder + 'IDN_masks/IDN_peat');
var dsGrid = ee.Image(assetsFolder + 'IDN_adm/dsGFEDgrid');
var IDN_adm1_masks = ee.Image(assetsFolder + 'IDN_masks_0p25deg/IDN_adm1');
var IDN_masks = ee.ImageCollection(assetsFolder + 'Cocktail_LULC/blockingFires_masks');

// --------------------
// LULC, 5-year chunks
// --------------------
var lulc = ee.ImageCollection([marHanS2005,marHanS2010])
  .merge(marHanSfuture.toList(5,1));
  
// -----------------------
// Make Reverse Peat Mask
// -----------------------
var getRevMask = function(mask) {
  return mask.subtract(ee.Image(1)).multiply(ee.Image(-1))
    .reproject({crs: crsLatLon, crsTransform: ds_gridRes});
};

var revPeatMask = getRevMask(peatMask);

// --------------------------------
// Make Masks for Custom Scenarios
// --------------------------------
var provIds = ee.List.sequence(0,33,1)
  .map(function(x) {return ee.Number(x).format('%01d')});

// Make masks for user-designed scenarios using any checked
// concessions/conservation areas and selected provinces
var getMask = function(csn_csvList, provList, provOptions, metYear) {
  var filterYr = ee.Filter.calendarRange(metYear, metYear, 'year');
  var masksYrAll = IDN_masks.filter(filterYr);
  var masksYr = ee.ImageCollection(masksYrAll.select('BAU'));
  var prevMasks = masksYr.toList(12,0);
  
  csn_csvList = ee.List(csn_csvList);
  if (csn_csvList.contains('BRG').getInfo() === true) {
    var masksBRG = ee.ImageCollection(masksYrAll.select('BRG')).toList(12,0);
    masksYr = ee.List.sequence(0,11,1).map(function(iMonth) {
      var masksMon = ee.Image(prevMasks.get(iMonth));
      return masksMon.subtract(ee.Image(masksBRG.get(iMonth)))
        .clamp(0,1).rename('Custom').reproject({crs: crsLatLon, crsTransform: gfed_gridRes})
        .set('system:time_start',masksMon.get('system:time_start'));
    });
    masksYr = ee.ImageCollection(masksYr);
    prevMasks = masksYr.toList(12,0);
    csn_csvList = csn_csvList.remove('BRG');
  }
  
  var nChecked = csn_csvList.length().getInfo();
  if (nChecked > 0) {
    var csn_csvSelect = ee.String(csn_csvList.get(0));
    if (nChecked > 1) {
      for (var iChecked = 1; iChecked < nChecked; iChecked++) {
        csn_csvSelect = csn_csvSelect.cat('_').cat(csn_csvList.get(iChecked));
      }
    }

    var CSN_CSV = ee.ImageCollection(masksYrAll.select(csn_csvSelect)).toList(12,0);
    masksYr = ee.List.sequence(0,11,1).map(function(iMonth) {
      var masksMon = ee.Image(prevMasks.get(iMonth));
      return masksMon.subtract(ee.Image(CSN_CSV.get(iMonth)))
        .clamp(0,1).rename('Custom').reproject({crs: crsLatLon, crsTransform: gfed_gridRes})
        .set('system:time_start',masksMon.get('system:time_start'));
    });
    masksYr = ee.ImageCollection(masksYr);
    prevMasks = masksYr.toList(12,0);
  }
  
  if (provList !== undefined) {
    provList = provList.split(',')
      .map(function(x) {return ee.String(x)})
      .map(function(x) {return provIds.indexOf(x)});
    var PROV = IDN_adm1_masks.select(provList)
      .reduce(ee.Reducer.max()).clamp(0,1);
    var maskBounds = ee.Image(masksYrAll.first().select('BAU'));
    
    masksYr = ee.List.sequence(0,11,1).map(function(iMonth) {
      var masksMon = ee.Image(prevMasks.get(iMonth));
      if (provOptions === 'Block all fires') {
        return masksMon.subtract(PROV).clamp(0,1).rename('Custom')
          .reproject({crs: crsLatLon, crsTransform: gfed_gridRes})
          .set('system:time_start',masksMon.get('system:time_start'));
      }
      if (provOptions === 'Target conservation efforts') {
        return masksMon.multiply(PROV.selfMask())
          .unmask(1).updateMask(maskBounds).clamp(0,1).rename('Custom')
          .reproject({crs: crsLatLon, crsTransform: gfed_gridRes})
          .set('system:time_start',masksMon.get('system:time_start'));
      }
    });
  }
  return ee.ImageCollection(masksYr);
};

// =============
// Display Maps
// =============
// LULC, 5-year chunks
var getLULCmaps = function(inputYear) {
  var filterYr = ee.Filter.calendarRange(inputYear-4,inputYear+5,'year');
  return lulc.filter(filterYr);
};

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
var lulcTrans_ramp = lulcTrans_ramp;
var lulcTrans_pal = {palette: lulcTrans_ramp, min: 1, max: 4};
var lulcTrans_rampReorder = ['#018571','#80CDC1','#A6611A','#DFC27D'];

// ------------------------------------
// - - - - - - smokePM.js - - - - - - |
// ------------------------------------
// ===============================
// Calculate OC+BC Emissions and
// Monthly Smoke PM2.5
// ===============================
// Imports:
var IDNprovS = ee.FeatureCollection(assetsFolder + 'IDN_adm/IDN_adm1_simplified');
var emiRateLULCtr = ee.ImageCollection(assetsFolder + 'Cocktail_LULC/emiRateLULCtr_kg_per_m2');
var areaLULCtr = ee.ImageCollection(assetsFolder + 'Cocktail_LULC/areaLULCtr_m2');
var gcArea = ee.Image(assetsFolder + 'area_m2/GC_grid');
var gfedArea = ee.Image(assetsFolder + 'area_m2/GFEDv4s_grid');
var gfedGrid = ee.Image(assetsFolder + 'IDN_adm/IDN_gfedGrid');

var outputRegion = ee.Geometry.Rectangle([95,-11,141,6],'EPSG:4326',false);
var adjointFolder = assetsFolder + 'GC_adjoint_sensitivities/';
var adjointFolder_ds = assetsFolder + 'GC_adjoint_sensitivities_0p25deg/';

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

// Monthly average OC + BC emissions (ug/m2/s)
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
  
  // OC + BC conversion from (g/grid cell/month) to (ug/m2/s)
  var emissMonTotal = oc_emiss.add(bc_emiss).multiply(maskMon)
    .divide(inAreaSum).multiply(1e6).divide(nDays).divide(sf_timeDay)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});

  return emissMonTotal;
};

// Smoke PM2.5 exposure (ug/m3), monthly [Emissions Rate x Sensitivity]
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
  
  // 1. Convert OC + BC emissions from g/grid cell/month to ug/m2/day
  var emissPart = emiss_philic.addBands(emiss_phobic)
    .multiply(1e6).divide(inAreaSum).divide(nDays)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
    
  // 2. Convert downscaled accumulated monthly sensitivity (0.25deg) from
  // (ug/m3)/(kg/grid cell/timestep) to (ug/m3)/(ug/m2/day)
  var sensPart = sensMon.multiply(gfedArea).multiply(1e-9)
    .divide(sf_timeSteps).divide(sf_smokePMtracer).divide(nDays)
    .reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
    
  // 3. Multiply OC + BC emissions rate by sensitivity
  // for smoke PM2.5 concentrations (ug/m3)
  var emissReceptorMon = emissPart.multiply(sensPart).reduce(ee.Reducer.sum())
    .multiply(maskMon).reproject({crs: crsLatLon, crsTransform: gfed_gridRes});
  
  return emissReceptorMon;
};

// Smoke PM2.5 exposure (ug/m3), monthly time series
var getPM = function(inputYear,metYear,receptor,inMask) {
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
// Sensitivity, hydrophilic only, Jul-Oct average (ug/m3)/(g/m2/s)
// Adjoint hydrophilic and hydrophobic sensitivities have similar spatial variability
var getSensMap = function(metYear,receptor) {
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

var sensColRamp = ['#FFFFFF','#C7E6F8','#8DBEE2','#5990BB','#64A96C','#A9CB65',
  '#F4D46A','#E58143','#D14D36','#B1322E','#872723'];
  
// PM2.5 exposure, Jul-Oct average (ug/m3)
var getPMmap = function(inputYear,metYear,receptor,inMask) {
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

var PMRamp = ['#FFFFFF','#F7F7F7','#D9D9D9','#BDBDBD',
  '#969696','#636363','#252525','#000000'];

// OC + BC Emissions, Jul-Oct average (ug/m2/s)
var getEmissMap = function(inputYear,metYear,receptor,inMask) {
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

var emissColRamp = ['#FFFFFF','#FFFFB2','#FED976','#FEB24C','#FD8D3C',
  '#FC4E2A','#E31A1C','#B10026'];

// ===============
// Display Charts
// ===============
// Smoke PM2.5 (ug/m3) time series, monthly average
var getPMchart = function(PMts,PMavg,OCtot,BCtot,plotPanel) {
  plotPanel = plotPanel.clear();
  var PMchart = ui.Chart.feature.byFeature(PMts,'system:time_start','Smoke_PM2p5')
    .setOptions({
      title: 'Population-Weighted Smoke PM2.5 Exposure',
      hAxis: {'format':'MMM'},
      vAxis: {title: 'Smoke PM2.5 (ug/m3)'},
      legend: 'none',
      lineWidth: 2,
      pointSize: 5,
    });
  plotPanel.add(PMchart);

  plotPanel.add(ui.Label('Jul-Oct Mean PM2.5: ' + PMavg.getInfo() + ' ug/m3',
    {margin: '-10px 0px -5px 25px', padding: '0px 0px 8px 0px', stretch: 'horizontal'}));
  plotPanel.add(ui.Label('Jul-Oct Total OC: ' + OCtot.getInfo() + ' Tg | Total BC: ' + BCtot.getInfo() + ' Tg',
    {margin: '0px 0px -5px 25px', padding: '0px 0px 10px 0px', stretch: 'horizontal'}));
};

// Contribution of PM2.5 exposure by Indonesian province
var getPMContrByProvChart = function(PMmap,plotPanel) {
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
      legend: 'NAME_1'
    });
  plotPanel.add(PMProvChart);
};

// =============
// Display Text
// =============
// Jul-Oct average PM2.5 exposure (ug/m3)
var getPMavg = function(inputYear,metYear,receptor,inMask) {
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
var getEmissTotal = function(inputYear,metYear,inSpecies,inMask) {
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

// ----------------------------------------
// - - - - - - smokeHealth.js - - - - - - |
// ----------------------------------------
// ==========================
// Calculate Health Impacts
// ==========================
// Imports:
var gpw2005 = ee.Image(assetsFolder + 'IDN_adm/GPW2005');

// Population, 2005, Gridded Population of the World (GPW) & UN-adjusted
var population = {
  'earlyneonatal': {'Indonesia': 9.263730e4, 'Malaysia': 8.895073e3, 'Singapore': 7.186277e2},
  'lateneonatal': {'Indonesia': 2.752874e5, 'Malaysia': 2.665513e4, 'Singapore': 2.153700e3}, 
  'postneonatal':  {'Indonesia': 4.347065e6, 'Malaysia': 4.303966e5, 'Singapore': 3.439537e4},
  '1-4': {'Indonesia': 1.792731e7, 'Malaysia': 1.973355e6, 'Singapore': 1.613114e5},
  'adult': {'Indonesia': 115498024.0, 'Malaysia': 12979736.0, 'Singapore': 2394994.0}
};

// Mortality Rate, 2005, from Global Burden of Disease project
var mortality_rate = {
  'earlyneonatal': {'Indonesia': 2449.447916, 'Malaysia': 307.822903, 'Singapore': 138.625514},
  'lateneonatal': {'Indonesia': 855.656908, 'Malaysia': 81.248922, 'Singapore': 78.940460},
  'postneonatal': {'Indonesia': 515.194821, 'Malaysia': 47.331711, 'Singapore': 21.578431},
  '1-4': {'Indonesia': 37.127353, 'Malaysia': 5.014201, 'Singapore': 3.114068},
  'adult': {'Indonesia': 1011.9828048701391, 'Malaysia': 815.8937975144682, 'Singapore': 655.2733557232674}
};

// Concentration response function transitions from linear to exponential at 50 ug/m3
var breakPt = 50;

// Adult (age 25+) attributable mortality calculated from annual smoke PM2.5
var getAttributableMortalityAdult = function(receptor, exposure) {
  
  var age = 'adult';
  var concentrationResponse = function(dExposure) {
    var FullLin25CI = function(x) {return ((0.0059 * 1.8) - (1.96 * 0.004)) * x};
    var FullLin = function(x) {return (0.0059 * 1.8) * x};
    var FullLin975CI = function(x) {return ((0.0059 * 1.8) + (1.96 * 0.004)) * x};

    var LinTo50 = function(x) {
      if (x > breakPt) {return FullLin(breakPt)} else {return FullLin(x)}
    };

    var Lin50HalfLin = function(x) {
      if (x <= breakPt) {return FullLin(x)} else {return (FullLin(x) + FullLin(breakPt)) * 0.5;}
    };

    var FullLog = function(x) {return 1 - (1 / Math.exp(0.00575 * 1.8 * x))};
    var FullLog225CI = function(x) {return 1 - (1 / Math.exp(((0.0059 * 1.8) - (1.96 * 0.004)) * x))};
    var FullLog2 = function(x) {return 1 - (1 / Math.exp(0.0059 * 1.8 * x))};
    var FullLog2975CI = function(x) {return 1 - (1 / Math.exp(((0.0059 * 1.8) + (1.96 * 0.004)) * x))};
   
    var Lin50Log = function(x) {
      if (x <= breakPt) {return FullLin(x)} else {
        return FullLin(breakPt) + FullLog(x) - FullLog(breakPt)}};

      if (dExposure <= breakPt) {
        var Lin50Log225CI = FullLin25CI(dExposure);
        var Lin50Log2 = FullLin(dExposure);
        var Lin50Log2975CI = FullLin975CI(dExposure);
      } else {
        var Lin50Log225CI = FullLin25CI(breakPt) + FullLog225CI(dExposure) - FullLog225CI(breakPt);
        var Lin50Log2 = FullLin(breakPt) + FullLog2(dExposure) - FullLog2(breakPt);
        var Lin50Log2975CI = FullLin975CI(breakPt) + FullLog2975CI(dExposure) - FullLog2975CI(breakPt);
      }
    return [Lin50Log225CI, Lin50Log2, Lin50Log2975CI];
  };
    
    var CRall = concentrationResponse(exposure);
    var CR_25 = CRall[0]; var CR = CRall[1]; var CR_97 = CRall[2];
    var total_deaths_25 = mortality_rate[age][receptor] * population[age][receptor] * CR_25 / 1e5; 
    var total_deaths = mortality_rate[age][receptor] * population[age][receptor] * CR / 1e5;
    var total_deaths_97 = mortality_rate[age][receptor] * population[age][receptor] * CR_97 / 1e5; 

    return [total_deaths_25, total_deaths, total_deaths_97];
};

// Children (age 0-4) attributable mortality calculated from smoke PM2.5
var getAttributableMortalityChild = function(receptor, exposure, age) {
    
  var concentrationResponse = function(dExposure) {
    var FullLin25CI = function(x) {return 0.003 * x};
    var FullLin = function(x) {return 0.012 * x};
    var FullLin975CI = function(x) {return 0.03 * x};
    var FullLog = function(x) {return 1 - (1/Math.exp(0.012 * x))};
    var FullLog25CI = function(x) {return 1 - (1/Math.exp(0.003 * x))};
    var FullLog975CI = function(x) {return 1 - (1/Math.exp(0.03 * x))};

    if (dExposure <= breakPt) {
      var Lin50Log25CI = FullLin25CI(dExposure);
      var Lin50Log = FullLin(dExposure);
      var Lin50Log975CI = FullLin975CI(dExposure);
    } else {
      var Lin50Log25CI = FullLin25CI(breakPt) + FullLog25CI(dExposure) - FullLog25CI(breakPt);
      var Lin50Log = FullLin(breakPt) + FullLog(dExposure) - FullLog(breakPt);
      var Lin50Log975CI = FullLin975CI(breakPt) + FullLog975CI(dExposure) - FullLog975CI(breakPt);
    }
    return [Lin50Log25CI, Lin50Log, Lin50Log975CI];
  };
    
    var CRall = concentrationResponse(exposure);
    var CR_25 = CRall[0]; var CR = CRall[1]; var CR_97 = CRall[2];
    var total_deaths_25 = mortality_rate[age][receptor] * population[age][receptor] * CR_25 / 1e5; 
    var total_deaths = mortality_rate[age][receptor] * population[age][receptor] * CR / 1e5;
    var total_deaths_97 = mortality_rate[age][receptor] * population[age][receptor] * CR_97 / 1e5; 

    return [total_deaths_25, total_deaths, total_deaths_97];
};

// =============
// Display Maps
// =============
var populationDensity = gpw2005.select('b1').rename('popDensity')
  .reproject({crs: 'EPSG:4326', crsTransform: ds_gridRes});
var baselineMortality = gpw2005.select('b13').rename('baselineMortality')
  .reproject({crs: 'EPSG:4326', crsTransform: ds_gridRes});

var mortalityColRamp = ['#FFFFFF','#EDF8E9','#C7E9C0','#A1D99B',
  '#74C476','#41AB5D','#238B45','#005A32'];
var popColRamp = ['#FFFFFF','#F2F0F7','#DADAEB','#BCBDDC',
  '#9E9AC8','#807DBA','#6A51A3','#4A1486'];

// =============
// Display Text
// =============
// Calculate attributable mortality by age group
// from mean monthly PM2.5 exposure for the scenario year
var calcAllMortality = function(PMts, receptor, scenario) {
  var PMtsVal = ee.Number(PMts.aggregate_mean('Smoke_PM2p5')).getInfo();
  
  var earlyNeonatal_mortality = getAttributableMortalityChild(receptor, PMtsVal, 'earlyneonatal');
  var lateNeonatal_mortality = getAttributableMortalityChild(receptor, PMtsVal, 'lateneonatal');
  var postNeonatal_mortality = getAttributableMortalityChild(receptor, PMtsVal, 'postneonatal');
  var age14_mortality = getAttributableMortalityChild(receptor, PMtsVal, '1-4');
  var adult_mortality = getAttributableMortalityAdult(receptor, PMtsVal, 'adult');
  
  var mortality = [earlyNeonatal_mortality, lateNeonatal_mortality, postNeonatal_mortality,
    age14_mortality, adult_mortality];

  var formatCI = function(CImean,CIlow,CIhigh) {
    var formatNum2Str = function(inNum) {
      return ee.Number(inNum).round().format('%.0f').getInfo();
    };
    return formatNum2Str(CImean) + ' (' + formatNum2Str(CIlow) + '-' + formatNum2Str(CIhigh) + ')';
  };

  var getSum_age0_1 = function(idx) {
    return mortality[0][idx] + mortality[1][idx] + mortality[2][idx];
  };
  
  var getSum_age0_4 = function(idx) {
    return mortality[0][idx] + mortality[1][idx] + mortality[2][idx] + mortality[3][idx];
  };
  
  var age0_1 = formatCI(getSum_age0_1(1),getSum_age0_1(0),getSum_age0_1(2));
  var age0_4 = formatCI(getSum_age0_4(1),getSum_age0_4(0),getSum_age0_4(2));
  var age1_4 = formatCI(mortality[3][1],mortality[3][0],mortality[3][2]);
  var age25 = formatCI(mortality[4][1],mortality[4][0],mortality[4][2]);

  return ee.Feature(null, {'Scenario': scenario,'Age 0-1': age0_1, 'Age 1-4': age1_4,
    'Age 0-4': age0_4, 'Age 25+': age25});
};

var getMortalityChart = function(PMts, PMts_BAU, receptor, plotPanel) {
  var mortalityCI = calcAllMortality(PMts, receptor, 'Current');
  var mortalityCI_BAU = calcAllMortality(PMts_BAU, receptor, 'BAU');
  var mortalityCI_all = ee.FeatureCollection([mortalityCI, mortalityCI_BAU]);
  
  plotPanel.add(ui.Label('Attributable Mortality (Deaths)',
    {margin: '-10px 0px -5px 25px', padding: '0px 0px 8px 0px', stretch: 'horizontal', fontSize: '15px', fontWeight: 'bold'}));
  
   var mortalityChart = ui.Chart.feature.byFeature(mortalityCI_all,'Scenario',['Age 0-1','Age 1-4','Age 25+'])
    .setChartType('Table');
  plotPanel.add(mortalityChart);
  
  plotPanel.add(ui.Label('Adults All-Cause: ' + mortalityCI.get('Age 25+').getInfo(),
    {margin: '-10px 0px -5px 25px', padding: '10px 0px 8px 0px', stretch: 'horizontal'}));
  plotPanel.add(ui.Label('Children Acute Lower Respiratory Infection (ALRI): ' + mortalityCI.get('Age 0-4').getInfo(),
    {margin: '0px 0px 8px 25px', padding: '0px 0px 8px 0px', stretch: 'horizontal'}));
};

// ---------------------------------------
// - - - - - - plotParams.js - - - - - - |
// ---------------------------------------
// ===============
// || UI Panels ||
// ===============
// ------------
// Year Panel
// ------------
var yearPanel = function() {
  var policyToolLabel = ui.Label('SMOKE Policy Tool', {margin: '12px 0px 0px 8px', fontWeight: 'bold', fontSize: '24px', border: '1px solid black', padding: '3px 3px 3px 3px'});
  var githubRepoLabel = ui.Label('Documentation: github.com/tianjialiu/SMOKE-Policy-Tool', {margin: '8px 8px 5px 8px', fontSize: '12.5px'});
  var inputYearSectionLabel = ui.Label('Design Scenario', {margin: '8px 8px 5px 8px', fontWeight: 'bold', fontSize: '20px'});
  
  var inputYearLabel = ui.Label('1) Scenario Year:', {fontSize: '14.5px'});
  var inputYearSlider = ui.Slider({min: 2005, max: 2029, value: 2006, step: 1});
  inputYearSlider.style().set('stretch', 'horizontal');
  
  var metYearLabel = ui.Label('2) Meteorology Year:', {fontSize: '14.5px'});
  var metYearSlider = ui.Slider({min: 2005, max: 2009, value: 2006, step: 1});
  metYearSlider.style().set('stretch', 'horizontal');
  
  var metYearDescription = ui.Label('Jul-Oct Rainfall Rank: 0 (driest) - 10 (wettest)',
    {margin: '1px 0px 0px 25px', color: '#888', fontSize: '13.8px', fontWeight:'410'});
  var metYearRanking = ui.Label('2005: [6.5], 2006: [1.5], 2007: [6], 2008: [9], 2009: [3]',
    {margin: '3px 0px 8px 12px', color: '#999', fontSize: '13.5px'});
    
  return ui.Panel([
      policyToolLabel, githubRepoLabel, inputYearSectionLabel,
      ui.Panel([inputYearLabel, inputYearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}), //
      ui.Panel([metYearLabel, metYearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
      metYearDescription, metYearRanking
    ]);
};

var getYears = function(yearPanel) {
  return {
    inputYear:yearPanel.widgets().get(3).widgets().get(1).getValue(),
    metYear:yearPanel.widgets().get(4).widgets().get(1).getValue()
  };
};

// -----------------
// Receptor Panel
// -----------------
var receptorSelectPanel = function() {
  var receptorLabel = ui.Label('3) Select Receptor:', {padding: '5px 0px 0px 0px', fontSize: '14.5px'});
  var receptorList = ['Singapore','Indonesia','Malaysia'];
  var receptorSelect = ui.Select({items: receptorList, value: 'Singapore', style: {stretch: 'horizontal'}});
  return ui.Panel([receptorLabel, receptorSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
};

var getReceptor = function(receptorSelectPanel){
  return receptorSelectPanel.widgets().get(1).getValue();
};

// --------------------------------
// Remove Emissions From... Panels
// --------------------------------
var csn_csvPanel = function(csn_csvBox, controlPanel) {
  controlPanel.add(ui.Label('4) (Optional) Remove Emissions From:', {fontWeight: 400, color: 'red', fontSize: '14.5px'}));
  
  controlPanel.add(ui.Label('Concessions:', {margin: '-2px 0px -2px 8px', stretch: 'horizontal'}));
  controlPanel.add(ui.Panel([
    ui.Panel([csn_csvBox[0]], null, {margin: '-2px -10px 2px 5px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[1]], null, {margin: '-2px -10px -2px 2px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[2]], null, {margin: '-2px 0px -2px 18px', stretch: 'horizontal'}),
  ],
  ui.Panel.Layout.Flow('horizontal'), {margin: '2px 0px 4px 0px', stretch: 'horizontal'}));
  
  controlPanel.add(ui.Label('Other Regions/Conservation:', {margin: '-1px 0px 4px 8px', stretch: 'horizontal'}));
  controlPanel.add(ui.Panel([
    ui.Panel([csn_csvBox[3]], null, {margin: '-2px -10px -2px 5px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[4]], null, {margin: '-11px -10px -2px 2px', stretch: 'horizontal'}),
    ui.Panel([csn_csvBox[5]], null, {margin: '-2px 0px -2px 18px', stretch: 'horizontal'}),
  ],
  ui.Panel.Layout.Flow('horizontal'), {margin: '2px 0px -4px 0px', stretch: 'horizontal'}));
};

var getChecked = function(box, list) {
  var checkedList = [];
    box.forEach(function(name, index) {
      var isChecked = box[index].getValue();
      if (isChecked) {checkedList.push([list[index][1]]);}
    });
  return ee.List(checkedList).flatten();
};

var provPanel = function(provBox) {
  var provLabel = ui.Label('By IDs: ', {margin: '8px 6px 8px 8px', stretch: 'vertical'});
  return ui.Panel([provLabel,provBox], ui.Panel.Layout.Flow('horizontal'), {margin: '-5px 8px 0px 8px', stretch: 'horizontal'});
};

var provOptionsPanel = function() {
  var provOptLabel = ui.Label('Indonesian provinces:', {padding: '5px 0px 0px 0px'});
  var provOptList = ['Block all fires','Target conservation efforts'];
  var provOptSelect = ui.Select({items: provOptList, value: 'Block all fires', style: {stretch: 'horizontal'}});
  return ui.Panel([provOptLabel, provOptSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
};

var getProvOptions = function(provOptionsPanel) {
  return provOptionsPanel.widgets().get(1).getValue();
};

// -----------------
// Submit Button
// -----------------
var submitButton = function() {
  return ui.Button({label: 'Submit Scenario',  style: {stretch: 'horizontal'}});
};

var waitMessage = ui.Label(' *** Computations will take a few seconds to be completed *** ', {margin: '-4px 8px 12px 8px', fontSize: '11.6px', textAlign: 'center', stretch: 'horizontal'});
  
// --------
// Legends
// --------
var discreteLegend = function(controlPanel, title, labels, colPal) {
  var discreteLegendPanel = ui.Panel({
    style: {
      padding: '0px 0px 5px 8px'
    }
  });
  controlPanel.add(discreteLegendPanel);
   
  var legendTitle = ui.Label(title, {fontWeight: 'bold', fontSize: '16px', margin: '0 0 6px 8px'});
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
};

var continuousLegend = function(controlPanel, title, colPal, minVal,
  maxVal, units, stretchFactor, maxValPos) {
  var continuousLegendPanel = ui.Panel({
    style: {
      padding: '0px 0px 5px 8px'
    }
  });
  controlPanel.add(continuousLegendPanel);
  
  var legendTitle = ui.Label(title, {fontWeight: 'bold', fontSize: '16px', margin: '0 0 6px 8px'});
  continuousLegendPanel.add(legendTitle);
  continuousLegendPanel.add(ui.Label(units,{margin: '-6px 0 6px 8px'}));

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
};

var legendPanel = function(controlPanel) {
  controlPanel.add(ui.Label('----------------------------------------------------------------------------------', {margin: '-10px 8px 12px 8px', stretch: 'horizontal'}));
  controlPanel.add(ui.Label('Legends', {fontWeight: 'bold', fontSize: '20px', margin: '-3px 8px 8px 8px'}));

  discreteLegend(controlPanel,'Land Use/ Land Cover',
    ['Intact Forest','Degraded Forest','Non-Forest','Plantations + Secondary Forest'],
    lulc_rampReorder);

  discreteLegend(controlPanel,'LULC Stable & Transitions',
    ['Stable (Non-Peat)','Transitions (Non-Peat)','Stable (Peat)','Transitions (Peat)'],
    lulcTrans_rampReorder);
  
  controlPanel.add(ui.Label('', {margin: '0px 0px 4px 0px'}));
  continuousLegend(controlPanel,'GEOS-Chem Adjoint Sensitivity',
    sensColRamp, 0, '1e5', 'Jul-Oct Average, (ug/m3) / (g/m2/s)', 13.8, 287);
  
  continuousLegend(controlPanel,'PM2.5 Exposure',
    PMRamp, 0, 20, 'Jul-Oct Average, ug/m3, scaled by 100', 18.975, 293);
    
  continuousLegend(controlPanel,'OC + BC Emissions',
    emissColRamp, 0, 5, 'Jul-Oct Average, ug/m2/s', 18.975, 300);
  
  continuousLegend(controlPanel,'Population Density, 2005',
    popColRamp, 0, 1000, 'people/km2', 18.975, 279);
  
  continuousLegend(controlPanel,'Baseline Mortality, 2005',
    mortalityColRamp, 0, 10, 'people in thousands', 18.975, 293);
};

// -----------
// Plot Panel
// -----------
var plotPanelLabel = ui.Label('Public Health Impacts', {fontWeight: 'bold', fontSize: '20px', margin: '12px 8px -3px 22px'});


// =================================================================
// *****************   --    User Interface    --   ****************
// =================================================================
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
var plotPanelParent = ui.Panel([plotPanelLabel, plotPanel], null, {width: '400px'});

// Map panel
var map = ui.Map();
map.style().set({cursor:'crosshair'});
map.setCenter(110,-2,5);
map.setControlVisibility({fullscreenControl: false});

var csn_csvList = [['Oil Palm','OP'], ['Timber','TM'], ['Logging','LG'],
  ['Peatlands','PT'], ['Conservation Areas','CA'], ['BRG Sites','BRG']];
var csn_csvBox = [];
csn_csvList.forEach(function(name, index) {
  var checkBox = ui.Checkbox(name[0]);
  csn_csvBox.push(checkBox);
});

var provBox = ui.Textbox("See GitHub repo, valid IDs 0-33: e.g., 1,3");
provBox.style().set('stretch', 'horizontal');

var submitButton = submitButton();
var yearPanel = yearPanel();
var receptorSelectPanel = receptorSelectPanel();
var provPanel = provPanel(provBox);
var provOptionsPanel = provOptionsPanel();
var clickCounter = 0;

// Display Panels
controlPanel.add(yearPanel);
controlPanel.add(receptorSelectPanel);
csn_csvPanel(csn_csvBox,controlPanel);
controlPanel.add(provOptionsPanel);
controlPanel.add(provPanel);
controlPanel.add(submitButton);
controlPanel.add(waitMessage);
ui.root.clear(); ui.root.add(controlPanel);
ui.root.add(map); ui.root.add(plotPanelParent);

// Run calculations, linked to submit button
submitButton.onClick(function() {
  clickCounter = clickCounter + 1;
  if (clickCounter == 1) {legendPanel(controlPanel)}
  
  // Scenario Parameters:
  var inputYear = getYears(yearPanel).inputYear;
  var metYear = getYears(yearPanel).metYear;
  var receptor = getReceptor(receptorSelectPanel);
  
  // BAU or Custom Scenario:
  var allChecked = getChecked(csn_csvBox,csn_csvList);
  var provSelected = provBox.getValue(); if (provSelected === '') {provSelected = undefined}
  var provOptions = getProvOptions(provOptionsPanel);

  var inMask = getMask(allChecked,provSelected,provOptions,metYear);
  var bauMask = getMask([],undefined,provOptions,metYear);

  // Display Maps:
  var lulcMap = getLULCmaps(inputYear).toList(2,0);
  var lulcMapTS1 = ee.Image(lulcMap.get(0)).rename('lulc_start_timestep');
  var lulcMapTS2 = ee.Image(lulcMap.get(1)).rename('lulc_end_timestep');
  var stableTrans = getStableTrans(lulcMapTS1,lulcMapTS2);
  var sensitivityMap = getSensMap(metYear,receptor);
  var PMExposureMap = getPMmap(inputYear,metYear,receptor,inMask);
  var emissMap = getEmissMap(inputYear,metYear,receptor,inMask);
  
  map.clear(); map.setCenter(110,-2,5);
  map.addLayer(lulcMapTS1.selfMask(),lulc_pal,'LULC Classification ' + lulcMapTS1.get('timestep').getInfo());
  map.addLayer(lulcMapTS2.selfMask(),lulc_pal,'LULC Classification ' + lulcMapTS2.get('timestep').getInfo(), false);
  map.addLayer(stableTrans.selfMask(),lulcTrans_pal,'LULC Stable/Transitions', false);
  map.addLayer(sensitivityMap.updateMask(sensitivityMap.gt(1e4)),
    {palette: sensColRamp, max: 1e5, opacity: 0.4},'GEOS-Chem Adjoint Sensitivity (Jul-Oct)',true);
  map.addLayer(PMExposureMap.multiply(100).selfMask(),
    {palette: PMRamp, max: 20},'PM2.5 Exposure (Jul-Oct), scaled by 100', false);
  map.addLayer(emissMap.selfMask(),
    {palette: emissColRamp, max: 5},'OC+BC Emissions (Jul-Oct)', false);
  map.addLayer(populationDensity.selfMask(),
    {palette: popColRamp, max: 1e3},'Population Density 2005', false);
  map.addLayer(baselineMortality.multiply(1e3).selfMask(),
    {palette: mortalityColRamp, max: 10},'Baseline Mortality 2005', false);
  map.addLayer(inMask.mean(),{palette: ['#000000','#FFFFFF'],
    min: 0, max: 1, opacity: 0.4},'Design Scenario Mask', false);
  map.setControlVisibility({fullscreenControl: false});

  // Display Charts:
  var PMts = getPM(inputYear,metYear,receptor,inMask);
  var PMts_BAU = getPM(inputYear,metYear,receptor,bauMask);
  var PMavg = getPMavg(inputYear,metYear,receptor,inMask);
  var OCtot = getEmissTotal(inputYear,metYear,'OC',inMask);
  var BCtot = getEmissTotal(inputYear,metYear,'BC',inMask);
  getPMchart(PMts,PMavg,OCtot,BCtot,plotPanel);
  getPMContrByProvChart(PMExposureMap,plotPanel);
  getMortalityChart(PMts,PMts_BAU,receptor,plotPanel);
});
