/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var dsGrid = ee.Image("projects/IndonesiaPolicyTool/IDN_adm/dsGFEDgrid"),
    marHanS2005 = ee.Image("projects/IndonesiaPolicyTool/marHanS_LULC/marHanS2005"),
    marHanS2010 = ee.Image("projects/IndonesiaPolicyTool/marHanS_LULC/marHanS2010"),
    marHanSfuture = ee.ImageCollection("projects/IndonesiaPolicyTool/marHanS_LULC/marHanS_future"),
    peatMask = ee.Image("projects/IndonesiaPolicyTool/IDN_masks/IDN_peat"),
    IDN_adm1_masks = ee.Image("projects/IndonesiaPolicyTool/IDN_masks_0p25deg/IDN_adm1"),
    IDN_masks = ee.ImageCollection("projects/IndonesiaPolicyTool/Cocktail_LULC/blockingFires_masks");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ===============================
// Margono + Hansen LULC maps and
// masks for blocking fires
// ===============================
var crsLatLon = 'EPSG:4326';
var ds_gridRes = [0.008333333333333333,0,95,0,-0.008333333333333333,6];
var gfed_gridRes = [0.25,0,95,0,-0.25,6.75];

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
exports.getMask = function(csn_csvList, provList, metYear) {
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
        .clamp(0,1).rename('Custom')
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
        .clamp(0,1).rename('Custom')
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
    
    masksYr = ee.List.sequence(0,11,1).map(function(iMonth) {
      var masksMon = ee.Image(prevMasks.get(iMonth));
      return masksMon.subtract(PROV).clamp(0,1).rename('Custom')
        .set('system:time_start',masksMon.get('system:time_start'));
    });
  }
  return ee.ImageCollection(masksYr);
};

exports.IDN_adm1_masks_names = IDN_adm1_masks.bandNames();

// =============
// Display Maps
// =============
// LULC, 5-year chunks
exports.getLULCmaps = function(inputYear) {
  var filterYr = ee.Filter.calendarRange(inputYear-4,inputYear+5,'year');
  return lulc.filter(filterYr);
};

// Stable and Transitions, peat and non-peat
// derived from the two input LULC time steps 
exports.getStableTrans = function(lulcTS1, lulcTS2) {
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
exports.lulc_ramp = lulc_ramp;
exports.lulc_pal = {palette: lulc_ramp, min: 1, max: 4};
exports.lulc_rampReorder = ['#000000','#DDDDDD','#FDB751','#FF0000'];

// LULC Stable/Transitions - 1 = Stable (Non-Peat), 2 - Stable (Peat),
// 3 = Transitions (Non-Peat), 4 = Transitions (Peat)
var lulcTrans_ramp = ['#018571','#A6611A','#80CDC1','#DFC27D'];
exports.lulcTrans_ramp = lulcTrans_ramp;
exports.lulcTrans_pal = {palette: lulcTrans_ramp, min: 1, max: 4};
exports.lulcTrans_rampReorder = ['#018571','#80CDC1','#A6611A','#DFC27D'];
