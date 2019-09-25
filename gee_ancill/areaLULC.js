/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var peatMask = ee.Image("projects/IndonesiaPolicyTool/IDN_masks/IDN_peat"),
    ds_grid = ee.Image("projects/IndonesiaPolicyTool/IDN_adm/dsGFEDgrid"),
    grid = ee.FeatureCollection("projects/IndonesiaPolicyTool/IDN_adm/GFEDgrid"),
    gfedv4s = ee.ImageCollection("projects/IndonesiaPolicyTool/GFEDv4s"),
    marHanS2005 = ee.Image("projects/IndonesiaPolicyTool/marHanS_LULC/marHanS2005"),
    marHanS2010 = ee.Image("projects/IndonesiaPolicyTool/marHanS_LULC/marHanS2010");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// =======================================
// Area, LULC Transitions, 0.25deg, sq. m
// =======================================
// Choose 5-year chunk starting year (2005, 2010, 2015, 2020, 2025)
var stYear = 2005;
var endYear = stYear+4;

// Input Params:
if (stYear == 2005) {
  var stLULCmap = marHanS2005;
  var endLULCmap = marHanS2010;
}

if (stYear >= 2010) {
  var timeStep = (stYear-2010)/5;
  var futImgStr = 'projects/IndonesiaPolicyTool/marHanS_LULC/marHanS_';
  var stLULCmap = ee.Image([futImgStr + stYear]);
  var endLULCmap = ee.Image([futImgStr + (endYear+1)]);
}

var outputRegion = ee.Geometry.Rectangle([95,-11,141,6],'EPSG:4326',false);
var folderStr = 'projects/IndonesiaPolicyTool/Cocktail_LULC/areaLULCtr_m2/';
var dsgrid_scale = ds_grid.projection();
var grid_scale = ee.Image(gfedv4s.first()).projection();
var revPeatMask = peatMask.subtract(ee.Image(1)).multiply(ee.Image(-1));

// ------------------
// LULC Transitions
// ------------------
var getLULC = function(stcat, endcat, mask, newName) {
  var lulc_map = stLULCmap.eq(stcat)
    .multiply(endLULCmap.eq(endcat))
    .multiply(mask);
  
  // Upscale LULC transitions to 0.25deg
  var lulc_grid = lulc_map.selfMask()
    .multiply(ee.Image.pixelArea()).reduceRegions({
      collection: grid,
      reducer: ee.Reducer.sum().unweighted(),
      crs: dsgrid_scale,
      scale: dsgrid_scale.nominalScale(),
    });
  
  var lulc_map_upscale = lulc_grid.reduceToImage(['sum'], 'mean')
    .reproject({crs: dsgrid_scale, scale: dsgrid_scale.nominalScale()})
    .reproject({crs: grid_scale, scale: grid_scale.nominalScale()})
    .set('system:time_start',ee.Date.fromYMD(stYear,1,1).millis())
    .rename(newName);
  
  return lulc_map_upscale;
};

// Non-Peat LULC
var IN2IN_NP = getLULC(2,2,revPeatMask,'IN2IN_NP');
var IN2DG_NP = getLULC(2,1,revPeatMask,'IN2DG_NP');
var IN2NF_NP = getLULC(2,3,revPeatMask,'IN2NF_NP');
var IN2PL_NP = getLULC(2,4,revPeatMask,'IN2PL_NP');
var DG2DG_NP = getLULC(1,1,revPeatMask,'DG2DG_NP');
var DG2NF_NP = getLULC(1,3,revPeatMask,'DG2NF_NP');
var DG2PL_NP = getLULC(1,4,revPeatMask,'DG2PL_NP');
var NF2NF_NP = getLULC(3,3,revPeatMask,'NF2NF_NP');
var PL2PL_NP = getLULC(4,4,revPeatMask,'PL2PL_NP');

// Non-Peat LULC
var IN2IN_P = getLULC(2,2,peatMask,'IN2IN_P');
var IN2DG_P = getLULC(2,1,peatMask,'IN2DG_P');
var IN2NF_P = getLULC(2,3,peatMask,'IN2NF_P');
var IN2PL_P = getLULC(2,4,peatMask,'IN2PL_P');
var DG2DG_P = getLULC(1,1,peatMask,'DG2DG_P');
var DG2NF_P = getLULC(1,3,peatMask,'DG2NF_P');
var DG2PL_P = getLULC(1,4,peatMask,'DG2PL_P');
var NF2NF_P = getLULC(3,3,peatMask,'NF2NF_P');
var PL2PL_P = getLULC(4,4,peatMask,'PL2PL_P');

// Combine LULC transitions
var LULCtr = IN2IN_NP.addBands(IN2DG_NP).addBands(IN2NF_NP)
  .addBands(IN2PL_NP).addBands(DG2DG_NP).addBands(DG2NF_NP)
  .addBands(DG2PL_NP).addBands(NF2NF_NP).addBands(PL2PL_NP)
  .addBands(IN2IN_P).addBands(IN2DG_P).addBands(IN2NF_P)
  .addBands(IN2PL_P).addBands(DG2DG_P).addBands(DG2NF_P)
  .addBands(DG2PL_P).addBands(NF2NF_P).addBands(PL2PL_P);

// Export LULC map
Export.image.toAsset({
  image: LULCtr,
  assetId: folderStr + 'areaLULCtr_' + stYear + '_' + endYear,
  description: 'areaLULCtr_' + stYear + '_' + endYear,
  crs: 'EPSG:4326',
  scale: [0.25,0,95,0,-0.25,6.75],
  region: outputRegion,
  maxPixels: 10e12
});
