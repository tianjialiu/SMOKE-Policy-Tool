/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var hansen = ee.Image("UMD/hansen/global_forest_change_2016_v1_4"),
    ds_grid = ee.Image("projects/IndonesiaPolicyTool/dsGFEDgrid"),
    change = ee.Image("projects/IndonesiaPolicyTool/margono_change_geog"),
    indo = ee.FeatureCollection("projects/IndonesiaPolicyTool/IDN_adm1");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// -------------------------------
// Process Margono Change Dataset
// -------------------------------
// Code: IN = 2, DG = 1, NF = 3
// Margono Change input was reprojected to
// geographic lat/lon (0.00025 deg x 0.00025 deg)
// before uploading to GEE

// Margono 2005
var IN2005 = change.eq([2,5,6,8,9,15]).reduce(ee.Reducer.max()).multiply(2);
var DG2005 = change.eq([1,7,11,12,13,14]).reduce(ee.Reducer.max()).multiply(1);
var NF2005 = change.eq([3,4,10]).reduce(ee.Reducer.max()).multiply(3);

var change2005 = IN2005.add(DG2005).add(NF2005);

// Margono 2010
var IN2010 = change.eq([2,6,9]).reduce(ee.Reducer.max()).multiply(2);
var DG2010 = change.eq([1,7,8,12,14,15]).reduce(ee.Reducer.max()).multiply(1);
var NF2010 = change.eq([3,4,5,10,11,13]).reduce(ee.Reducer.max()).multiply(3);

var change2010 = IN2010.add(DG2010).add(NF2010);

// --------------------------
// Merge Margono and Hansen
// --------------------------
// Code: IN = 2, DG = 1, NF = 3, PL = 4

var loss = hansen.select('lossyear');
var forest = hansen.select('treecover2000').gt(30);
var hanGain = hansen.select('gain').eq(1);

var marHanS = function(changeYr,inYear) {
  var lossYr = loss.gt(0).multiply(loss.lte(inYear-2000));
  var forestYr = forest.multiply(lossYr.eq(0));
  
  // Hansen forest (> 30% cover) & Margono Non-Forest where there
  // is no loss from 2000 to the input year
  var PLforest = changeYr.eq(3).updateMask(forestYr).multiply(4)
  .reproject({crs: changeYr.projection()});
  
  // Hansen forest gain & Margono Non-Forest
  var PLgain = changeYr.eq(3).updateMask(hanGain).multiply(4)
  .reproject({crs: changeYr.projection()});
  
  var marHanYr = ee.ImageCollection([changeYr,PLforest,PLgain]).max()
  .reproject({crs: changeYr.projection()});
  
  return(marHanYr);
};

var marHanS2005 = marHanS(change2005,2005);
// Force plantations in 2005 to also be plantations in 2010
var marHanS2010 = ee.ImageCollection([marHanS(change2010,2010),marHanS2005.eq(4).multiply(4)]).max();

var IN2IN = marHanS2005.eq(2).multiply(marHanS2010.eq(2)).multiply(1).rename('IN2IN');
var IN2DG = marHanS2005.eq(2).multiply(marHanS2010.eq(1)).multiply(2).rename('IN2DG');
var IN2NF = marHanS2005.eq(2).multiply(marHanS2010.eq(3)).multiply(3).rename('IN2NF');
var IN2PL = marHanS2005.eq(2).multiply(marHanS2010.eq(4)).multiply(4).rename('IN2PL');

var DG2DG = marHanS2005.eq(1).multiply(marHanS2010.eq(1)).multiply(5).rename('DG2DG');
var DG2NF = marHanS2005.eq(1).multiply(marHanS2010.eq(3)).multiply(6).rename('DG2NF');
var DG2PL = marHanS2005.eq(1).multiply(marHanS2010.eq(4)).multiply(7).rename('DG2PL');

var NF2NF = marHanS2005.eq(3).multiply(marHanS2010.eq(3)).multiply(8).rename('NF2NF');

var PL2PL = marHanS2005.eq(4).multiply(marHanS2010.eq(4)).multiply(9).rename('PL2PL');

var LULC_transitions = IN2IN.add(IN2DG).add(IN2NF).add(IN2PL)
  .add(DG2DG).add(DG2NF).add(DG2PL).add(NF2NF).add(PL2PL)
  .reproject({crs: change2005.projection()})
  .reduceResolution({
    reducer: ee.Reducer.mode(),
    maxPixels: 2048,
  }).reproject({crs: ds_grid.projection()}).rename('LULC');

// Resampled Base Maps
// Margono 2005
var IN2005re = LULC_transitions.eq([1,2,3,4]).reduce(ee.Reducer.max()).multiply(2);
var DG2005re = LULC_transitions.eq([5,6,7]).reduce(ee.Reducer.max()).multiply(1);
var NF2005re = LULC_transitions.eq(8).multiply(3);
var PL2005re = LULC_transitions.eq(9).multiply(4);

var marHanS2005re = IN2005re.add(DG2005re).add(NF2005re).add(PL2005re);

// Margono 2010
var IN2010re = LULC_transitions.eq(1).multiply(2);
var DG2010re = LULC_transitions.eq([2,5]).reduce(ee.Reducer.max()).multiply(1);
var NF2010re = LULC_transitions.eq([3,6,8]).reduce(ee.Reducer.max()).multiply(3);
var PL2010re = LULC_transitions.eq([4,7,9]).reduce(ee.Reducer.max()).multiply(4);

var marHanS2010re = IN2010re.add(DG2010re).add(NF2010re).add(PL2010re);

// Change pyramiding policy to mode
var outputRegion = ee.Geometry.Rectangle([95,-11,141,6]);
Export.image.toAsset({
  image: marHanS2005re,
  description: 'marHanS2005',
  assetId: 'marHanS2005',
  scale: 927.6624232772797,
  crs: 'EPSG:4326',
  region: outputRegion
});

Export.image.toAsset({
  image: marHanS2010re,
  description: 'marHanS2010',
  assetId: 'marHanS2010',
  scale: 927.6624232772797,
  crs: 'EPSG:4326',
  region: outputRegion
});