# SMOKE-Policy-Tool
SMOKE Policy Tool in Google Earth Engine

The [SMOKE Policy Tool](https://smokepolicytool.users.earthengine.app/view/smoke-policy-tool) estimates and projects the public health impacts in Equatorial Asia due to Indonesian fires and allows users to customize scenarios in which fire activity is reduced based on possible conservation efforts. Please see our [website](https://sites.google.com/view/smokepolicytool/home) for more information.

- *Note*: The SMOKE Policy Tool can be accessed from 1) Earth Engine Apps and 2) a read-only public repository in the Google Earth Engine (GEE) code editor. Earth Engine Apps is currently an experimental product (now released to the GEE community!) and does not support special characters and EE 'require' functions. Accessing the UI from the 'users/smokepolicytool/public' repository in the GEE code editor is more stable and interactive but requires a (free) GEE account.

## Public Apps
(*Earth Engine Apps, no Google Earth Engine account required*)
1. [**SMOKE Policy Tool UI**](https://smokepolicytool.users.earthengine.app/view/smoke-policy-tool): main tool for modeling and projecting the impact of Indonesian fires on public health in Equatorial Asia for 2005-2029 based on land use and land cover (LULC) classification, Global Fire Emissions Database, version 4s ([GFEDv4s](https://www.globalfiredata.org/)) fire emissions, and meteorology
<br><br>
![banner image](https://github.com/tianjialiu/SMOKE-Policy-Tool/blob/master/docs/imgs/SMOKEPolicyTool_EEApps.png)

2. [**Indonesia LULC Maps UI**](https://smokepolicytool.users.earthengine.app/view/indonesia-lulc-maps): ancillary tool for visualizing land use/ land cover (LULC) classification and locations of concessions and conservation areas
<br><br>
![banner image](https://github.com/tianjialiu/SMOKE-Policy-Tool/blob/master/docs/imgs/IndonesiaLULCMaps_EEApps.png)

### Step 1: Scenario Year
*Select a year from 2005-2029.* The scenario year is linked to projections of LULC transitions in 5-year intervals; for example, all scenarios using any input year from 2005-2009 involve the same LULC transitions. Because we use 2005 and 2010 as the base LULC timesteps of the 2005-2009 LULC transitions, we consider 2005-2009 as "present" and 2010-2029 as "future."

### Step 2: Meteorology Year
*Select a meteorology year from 2005-2009.* The rainfall ranks (0 = driest, 10 = wettest), which should guide your selection, are derived from mean [CHIRPS](http://chg.geog.ucsb.edu/data/chirps/) daily precipitation rates over Sumatra and Kalimantan during the fire season (July-October), from 1981-2018. Dry years, such as 2006 (strong El Niño year), are generally associated with more intense fire activity and haze. If the scenario year is from 2005-2009, the meteorology year should match the scenario year.

### Step 3: Receptor
*Select a population-weighted receptor: Indonesia, Singapore, or Malaysia.* A receptor is a location of interest that may be sensitive to pollutants upwind. In this case, the tool estimates and projects the public health impacts in Indonesia, Singapore, or Malaysia based on its respective sensitivity to upwind smoke from fires in Indonesia.

### Step 4. (Optional) Build a custom scenario by blocking fire emissions in select regions
In custom scenarios, fire activity can be blocked in a combination of concessions (Oil Palm, Timber, Logging), other regions/ conservation areas (Peatlands, Conservation Areas, and BRG Sites), and Indonesia provinces. Badan Restorasi Gambut (BRG) sites were recently established following the 2015 severe haze event to restore the hydrology of damaged peatlands in Sumatra, Kalimantan, and Papua over a five-year period (https://brg.go.id). Indonesia provinces must be selected by IDs; as an example, to select Aceh and Riau, write in the widget: 0,24. The default option for Indonesian provinces is 'Block all fires', but another option available is 'Target conservation efforts'. In the 'Target conservation efforts' mode, if a concession is selected with a province, fire emissions are only reduced in areas co-located with that concession within that province.

### Indonesia Provinces by IDs
| ID | Sumatera | ID | Kalimantan | ID | Rest of Indonesia |
| :---: | :--- | :---: | :--- | :---: | :--- |
| 0 | Aceh | 12 | Kalimantan Barat | 1 | Bali |
| 2 | Bangka-Belitung | 13 | Kalimantan Selatan | 3 | Banten |
| 8 | Jambi | 14 | Kalimantan Tengah | 4 | Bengkulu |
| 17 | Kepulauan Riau | 15 | Kalimantan Timur | 5 | Gorontalo |
| 18 | Lampung | 16 | Kalimantan Utara | 6 | Irian Jaya Barat |
| 24 | Riau |   |   | 7 | Jakarta Raya |
| 30 | Sumatera Barat |   |   | 9 | Jawa Barat |
| 31 | Sumatera Selatan |   |   | 10 | Jawa Tengah |
| 32 | Sumatera Utara |   |   | 11 | Jawa Timur |
|   |   |   |   | 19 | Maluku Utara |
|   |   |   |   | 20 | Maluku |
|   |   |   |   | 21 | Nusa Tenggara Barat |
|   |   |   |   | 22 | Nusa Tenggara Timur |
|   |   |   |   | 23 | Papua |
|   |   |   |   | 25 | Sulawesi Barat |
|   |   |   |   | 26 | Sulawesi Selatan |
|   |   |   |   | 27 | Sulawesi Tengah |
|   |   |   |   | 28 | Sulawesi Tenggara |
|   |   |   |   | 29 | Sulawesi Utara |
|   |   |   |   | 33 | Yogyakarta |

### Indonesia Provinces by IDs (English Names)
| ID | Sumatra | ID | Kalimantan | ID | Rest of Indonesia |
| :---: | :--- | :---: | :--- | :---: | :--- |
| 0 | Aceh | 12 | West Kalimantan | 1 | Bali |
| 2 | Bangka-Belitung | 13 | South Kalimantan | 3 | Banten |
| 8 | Jambi | 14 | Central Kalimantan| 4 | Bengkulu |
| 17 | Riau Islands | 15 | East Kalimantan | 5 | Gorontalo |
| 18 | Lampung | 16 | North Kalimantan | 6 | West Papua |
| 24 | Riau |   |   | 7 | Greater Jakarta |
| 30 | West Sumatra |   |   | 9 | West Java |
| 31 | South Sumatra |   |   | 10 | Central Java |
| 32 | North Sumatra |   |   | 11 | East Java |
|   |   |   |   | 19 | North Maluku |
|   |   |   |   | 20 | Maluku |
|   |   |   |   | 21 | West Nusa Tenggara |
|   |   |   |   | 22 | South Nusa Tenggara |
|   |   |   |   | 23 | Papua |
|   |   |   |   | 25 | West Sulawesi |
|   |   |   |   | 26 | South Sulawesi |
|   |   |   |   | 27 | Central Sulawesi |
|   |   |   |   | 28 | Southeast Sulawesi |
|   |   |   |   | 29 | North Sulawesi |
|   |   |   |   | 33 | Yogyakarta |

### Public Health Impacts
After submitting a scenario, please wait a few seconds (~a few seconds with fast internet speed). Legends will display in the left panel below the 'Submit Scenario' button, and map layers will display in the middle panel. Three charts will be generated and displayed in the right panel: 1. Timeseries of smoke PM<sub>2.5</sub> exposure at the receptor, 2. Pie chart of smoke PM<sub>2.5</sub> contribution by Indonesia province, and 3. Table of attributable mortality for the current and business-as-usual (BAU) scenarios. The tool also calculates the top 5 priority grid cells with BRG sites to reduce emissions; emissions in these grid cells contribute the highest fraction of smoke exposure to the receptor. Map layers can be turned on and off from the 'Layers' dropdown list.
<br><br>

## Google Earth Engine Code Editor GUI
(*Google Earth Engine account required*)
### Step 1: Sign up for a free Google Earth Engine account
Google Earth Engine ([GEE](https://earthengine.google.com/)) is a powerful cloud-computing platform for geospatial analysis and capable of computations with petabyte-scale datasets. To sign up, simply fill out a [form](https://signup.earthengine.google.com/) and wait for an email. GEE works best with the [Google Chrome web browser](https://www.google.com/chrome/).

### Step 2: The SMOKE Policy Tool repository
Copy and paste the following link in a tab in Google Chrome to enter the [GEE Javascript playground](https://code.earthengine.google.com/) and add the SMOKE Policy Tool public repository to your account under the read-only permissions folder in one step:
```
https://code.earthengine.google.com/?accept_repo=users/smokepolicytool/public
```
The repository should then appear in the top-left panel under 'Reader' as 'users/smokepolicytool/public'. The GEE Javascript playground is a code editor with a map and console to display or print results.

### Step 3: Diving into the GUI
Click the 'UI_SMOKEPolicyTool.js' script in the 'users/smokepolicytool/public' repository. The script should appear in the code editor. Click 'Run' in the top-right corner of the code editor to activate the UI.
<br><br>
![banner image](https://github.com/tianjialiu/SMOKE-Policy-Tool/blob/master/docs/imgs/SMOKEPolicyTool_GEE.png)

## Publications
1. Marlier, M.E., T. Liu, K. Yu, J.J. Buonocore, S.N. Koplitz, R.S. DeFries, L.J. Mickley, D.J. Jacob, J. Schwartz, B.S. Wardhana, and S.S. Myers (2019). Fires, Smoke Exposure, and Public Health: An Integrative Framework to Maximize Health Benefits from Peatland Restoration. *GeoHealth*, 3, 178-189. https://doi.org/10.1029/2019GH000191

2. Koplitz, S.N., L.J. Mickley, M.E. Marlier, J.J. Buonocore, P.S. Kim, T. Liu, M.P. Sulprizio, R.S. DeFries, D.J. Jacob, J. Schwartz, and S.S. Myers (2016). Public health impacts of the severe haze in Equatorial Asia in September–October 2015: demonstration of a new framework for informing fire management strategies to reduce downwind smoke exposure. *Environ. Res. Lett.* 11(9), 094023. https://doi.org/10.1088/1748-9326/11/9/094023

3. Kim, P.S., D.J. Jacob, L.J. Mickley, S.N. Koplitz, M.E. Marlier, R.S. DeFries, S.S. Myers, B.N. Chew, and Y.H. Mao (2015). Sensitivity of population smoke exposure to fire locations in Equatorial Asia. *Atmos. Environ.* 102, 11-17. https://doi.org/10.1016/j.atmosenv.2014.09.045

4. van der Werf, G.R., J.T. Randerson, L. Giglio, T.T. van Leeuwen, Y. Chen, B.M. Rogers, M. Mu, M.J.E. van Marle, D.C. Morton, G.J. Collatz, R.J. Yokelson, and P.S. Kasibhatla (2017). Global fire emissions estimates during 1997-2016. *Earth Syst. Sci. Data* 9, 697–720. https://doi.org/10.5194/essd-9-697-2017
