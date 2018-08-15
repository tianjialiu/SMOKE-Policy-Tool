# SMOKE-Policy-Tool
SMOKE Policy Tool in Google Earth Engine

## Public Apps
1. [**Smoke Policy Tool UI**](https://smokepolicytool.users.earthengine.app/view/smoke-policy-tool): main tool to model and project the impact of Indonesian fires on public health in Equatorial Asia for 2005-2029 based on land cover/ land use (LULC) classification, Global Fire Emissions Database, version 4s (GFEDv4s) fire emissions, and meteorology
2. [**Indonesia LULC Maps UI**](https://smokepolicytool.users.earthengine.app/view/indonesia-lulc-maps): ancillary tool to visualize land use/ land cover (LULC) classification and locations of concessions and conservation areas

### Step 1: Scenario Year (*2025-2029*)

### Step 2: Meteorology Year (*2005-2009*)

### Step 3: Select Receptor (*Indonesia, Singapore, or Malaysia*)

### Step 4. (Optional) Build a custom scenario by blocking fire emissions in select regions
In custom scenarios, fire activity can be blocked in a combination of concessions (Oil Palm, Timber, Logging), other regions/ conservation areas (Peatlands, Conservation Areas, and BRG Sites), and Indonesia provinces.

| ID | Sumatra | ID | Kalimantan | ID | Rest of Indonesia |
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


## Google Earth Engine Code Editor
### Step 1: Sign up for a free Google Earth Engine account (*For new Google Earth Engine users*)
Google Earth Engine ([GEE](https://earthengine.google.com/)) is a powerful cloud-computing platform for geospatial analysis and capable of computations with petabyte-scale datasets. To sign up, simply fill out a [form](https://signup.earthengine.google.com/) and wait for an email. GEE works best with the Google Chrome browser.

### Step 2: The SMOKE Policy Tool repository
Copy and paste the following link in a tab in Google Chrome to enter the [GEE Javascript playground](https://code.earthengine.google.com/) and add the SMOKE Policy Tool public repository to your account under the read-only permissions folder in one step:
```
https://code.earthengine.google.com/?accept_repo=users/smokepolicytool/public
```
The repository should then appear in the top-left panel under 'Reader' as 'users/smokepolicytool/public'. The GEE Javascript playground is a code editor with a map and console to display or print results.

### Step 3: Diving into the GUI
Click the 'UI_SMOKEPolicyTool' script in the 'users/smokepolicytool/public' repository. The script should appear in the code editor. Click 'Run' in the top-right corner of the code editor to activate the UI.


## Publications
1. Marlier, M.E., T. Liu, K. Yu, J.J. Buonocore, S.N. Koplitz, R.S. DeFries, L.J. Mickley, D.J. Jacob, J.Schwartz, B.S. Wardhana, and S. S. Myers (in prep). Fires, Smoke Exposure, and Public Health: An Integrative Framework to Maximize Health Benefits from Peatland Restoration.

2. Koplitz, S.N., L.J. Mickley, M.E. Marlier, J.J. Buonocore, P.S. Kim, T. Liu, M.P. Sulprizio, R.S. DeFries, D.J. Jacob, J. Schwartz, and S.S. Myers (2016). Public health impacts of the severe haze in Equatorial Asia in September–October 2015: demonstration of a new framework for informing fire management strategies to reduce downwind smoke exposure. *Environ. Res. Lett.* 11(9), 094023. https://doi.org/10.1088/1748-9326/11/9/094023

3. Kim, P.S., D.J. Jacob, L.J. Mickley, S.N. Koplitz, M.E. Marlier, R.S. DeFries, S.S. Myers, B.N. Chew, Y.H. Mao (2015). Sensitivity of population smoke exposure to fire locations in Equatorial Asia. *Atmos. Environ.* 102, 11-17. https://doi.org/10.1016/j.atmosenv.2014.09.045
