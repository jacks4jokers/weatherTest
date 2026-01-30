/**
 * Historical accuracy validation script
 * PRD-017: Create historical accuracy validation script
 *
 * Fetches historical forecast vs actual data from Open-Meteo
 * for 200+ US cities and calculates accuracy metrics:
 * - Temperature MAE (target: < 3°F)
 * - Precipitation timing accuracy (target: within 10 minutes)
 * - Generates accuracy report by region
 *
 * Usage: npx tsx scripts/validateAccuracy.ts
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface City {
  name: string;
  state: string;
  lat: number;
  lon: number;
  region: string;
}

interface HourlyHistoricalData {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  weather_code: number[];
}

interface HourlyForecastData {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  weather_code: number[];
}

interface CityResult {
  city: City;
  temperatureMAE: number;
  precipitationTimingErrorMinutes: number | null;
  hoursCompared: number;
  error?: string;
}

interface RegionReport {
  region: string;
  cityCount: number;
  avgTemperatureMAE: number;
  avgPrecipTimingError: number | null;
  citiesWithPrecipData: number;
  passesTemperatureThreshold: boolean;
  passesPrecipTimingThreshold: boolean;
}

interface AccuracyReport {
  generatedAt: string;
  dateRange: { start: string; end: string };
  overall: {
    totalCities: number;
    successfulCities: number;
    failedCities: number;
    avgTemperatureMAE: number;
    avgPrecipTimingErrorMinutes: number | null;
    citiesWithPrecipData: number;
    passesTemperatureThreshold: boolean;
    passesPrecipTimingThreshold: boolean;
  };
  byRegion: RegionReport[];
  cityResults: CityResult[];
}

// ---------------------------------------------------------------------------
// 200+ US Cities with coordinates and regions
// ---------------------------------------------------------------------------

const US_CITIES: City[] = [
  // Northeast (40 cities)
  { name: "New York", state: "NY", lat: 40.7128, lon: -74.006, region: "Northeast" },
  { name: "Philadelphia", state: "PA", lat: 39.9526, lon: -75.1652, region: "Northeast" },
  { name: "Boston", state: "MA", lat: 42.3601, lon: -71.0589, region: "Northeast" },
  { name: "Pittsburgh", state: "PA", lat: 40.4406, lon: -79.9959, region: "Northeast" },
  { name: "Newark", state: "NJ", lat: 40.7357, lon: -74.1724, region: "Northeast" },
  { name: "Buffalo", state: "NY", lat: 42.8864, lon: -78.8784, region: "Northeast" },
  { name: "Rochester", state: "NY", lat: 43.1566, lon: -77.6088, region: "Northeast" },
  { name: "Hartford", state: "CT", lat: 41.7658, lon: -72.6734, region: "Northeast" },
  { name: "Providence", state: "RI", lat: 41.824, lon: -71.4128, region: "Northeast" },
  { name: "Albany", state: "NY", lat: 42.6526, lon: -73.7562, region: "Northeast" },
  { name: "Syracuse", state: "NY", lat: 43.0481, lon: -76.1474, region: "Northeast" },
  { name: "Worcester", state: "MA", lat: 42.2626, lon: -71.8023, region: "Northeast" },
  { name: "Springfield", state: "MA", lat: 42.1015, lon: -72.5898, region: "Northeast" },
  { name: "Bridgeport", state: "CT", lat: 41.1865, lon: -73.1952, region: "Northeast" },
  { name: "New Haven", state: "CT", lat: 41.3083, lon: -72.9279, region: "Northeast" },
  { name: "Stamford", state: "CT", lat: 41.0534, lon: -73.5387, region: "Northeast" },
  { name: "Portland", state: "ME", lat: 43.6591, lon: -70.2568, region: "Northeast" },
  { name: "Manchester", state: "NH", lat: 42.9956, lon: -71.4548, region: "Northeast" },
  { name: "Burlington", state: "VT", lat: 44.4759, lon: -73.2121, region: "Northeast" },
  { name: "Scranton", state: "PA", lat: 41.4090, lon: -75.6624, region: "Northeast" },
  { name: "Allentown", state: "PA", lat: 40.6084, lon: -75.4902, region: "Northeast" },
  { name: "Erie", state: "PA", lat: 42.1292, lon: -80.0851, region: "Northeast" },
  { name: "Trenton", state: "NJ", lat: 40.2171, lon: -74.7429, region: "Northeast" },
  { name: "Camden", state: "NJ", lat: 39.9259, lon: -75.1196, region: "Northeast" },
  { name: "Bangor", state: "ME", lat: 44.8012, lon: -68.7778, region: "Northeast" },
  { name: "Concord", state: "NH", lat: 43.2081, lon: -71.5376, region: "Northeast" },
  { name: "Montpelier", state: "VT", lat: 44.2601, lon: -72.5754, region: "Northeast" },
  { name: "Ithaca", state: "NY", lat: 42.4440, lon: -76.5019, region: "Northeast" },
  { name: "Binghamton", state: "NY", lat: 42.0987, lon: -75.9180, region: "Northeast" },
  { name: "Utica", state: "NY", lat: 43.1009, lon: -75.2327, region: "Northeast" },
  // Southeast (40 cities)
  { name: "Washington", state: "DC", lat: 38.9072, lon: -77.0369, region: "Southeast" },
  { name: "Charlotte", state: "NC", lat: 35.2271, lon: -80.8431, region: "Southeast" },
  { name: "Jacksonville", state: "FL", lat: 30.3322, lon: -81.6557, region: "Southeast" },
  { name: "Nashville", state: "TN", lat: 36.1627, lon: -86.7816, region: "Southeast" },
  { name: "Memphis", state: "TN", lat: 35.1495, lon: -90.049, region: "Southeast" },
  { name: "Baltimore", state: "MD", lat: 39.2904, lon: -76.6122, region: "Southeast" },
  { name: "Louisville", state: "KY", lat: 38.2527, lon: -85.7585, region: "Southeast" },
  { name: "Richmond", state: "VA", lat: 37.5407, lon: -77.436, region: "Southeast" },
  { name: "Atlanta", state: "GA", lat: 33.749, lon: -84.388, region: "Southeast" },
  { name: "Miami", state: "FL", lat: 25.7617, lon: -80.1918, region: "Southeast" },
  { name: "Tampa", state: "FL", lat: 27.9506, lon: -82.4572, region: "Southeast" },
  { name: "Orlando", state: "FL", lat: 28.5383, lon: -81.3792, region: "Southeast" },
  { name: "Raleigh", state: "NC", lat: 35.7796, lon: -78.6382, region: "Southeast" },
  { name: "Virginia Beach", state: "VA", lat: 36.8529, lon: -75.978, region: "Southeast" },
  { name: "Norfolk", state: "VA", lat: 36.8508, lon: -76.2859, region: "Southeast" },
  { name: "Greensboro", state: "NC", lat: 36.0726, lon: -79.792, region: "Southeast" },
  { name: "Columbia", state: "SC", lat: 34.0007, lon: -81.0348, region: "Southeast" },
  { name: "Charleston", state: "SC", lat: 32.7765, lon: -79.9311, region: "Southeast" },
  { name: "Savannah", state: "GA", lat: 32.0809, lon: -81.0912, region: "Southeast" },
  { name: "Knoxville", state: "TN", lat: 35.9606, lon: -83.9207, region: "Southeast" },
  { name: "Chattanooga", state: "TN", lat: 35.0456, lon: -85.3097, region: "Southeast" },
  { name: "Birmingham", state: "AL", lat: 33.5207, lon: -86.8025, region: "Southeast" },
  { name: "Montgomery", state: "AL", lat: 32.3792, lon: -86.3077, region: "Southeast" },
  { name: "Huntsville", state: "AL", lat: 34.7304, lon: -86.5861, region: "Southeast" },
  { name: "Mobile", state: "AL", lat: 30.6954, lon: -88.0399, region: "Southeast" },
  { name: "Lexington", state: "KY", lat: 38.0406, lon: -84.5037, region: "Southeast" },
  { name: "Fort Lauderdale", state: "FL", lat: 26.1224, lon: -80.1373, region: "Southeast" },
  { name: "St. Petersburg", state: "FL", lat: 27.7676, lon: -82.6403, region: "Southeast" },
  { name: "Tallahassee", state: "FL", lat: 30.4383, lon: -84.2807, region: "Southeast" },
  { name: "Pensacola", state: "FL", lat: 30.4213, lon: -87.2169, region: "Southeast" },
  { name: "Wilmington", state: "NC", lat: 34.2257, lon: -77.9447, region: "Southeast" },
  { name: "Durham", state: "NC", lat: 35.994, lon: -78.8986, region: "Southeast" },
  { name: "Fayetteville", state: "NC", lat: 35.0527, lon: -78.8784, region: "Southeast" },
  { name: "Myrtle Beach", state: "SC", lat: 33.6891, lon: -78.8867, region: "Southeast" },
  { name: "Augusta", state: "GA", lat: 33.4735, lon: -81.9748, region: "Southeast" },
  { name: "Macon", state: "GA", lat: 32.8407, lon: -83.6324, region: "Southeast" },
  { name: "Jackson", state: "MS", lat: 32.2988, lon: -90.1848, region: "Southeast" },
  { name: "Biloxi", state: "MS", lat: 30.3960, lon: -88.8853, region: "Southeast" },
  { name: "Asheville", state: "NC", lat: 35.5951, lon: -82.5515, region: "Southeast" },
  { name: "Greenville", state: "SC", lat: 34.8526, lon: -82.3940, region: "Southeast" },
  // Midwest (40 cities)
  { name: "Chicago", state: "IL", lat: 41.8781, lon: -87.6298, region: "Midwest" },
  { name: "Columbus", state: "OH", lat: 39.9612, lon: -82.9988, region: "Midwest" },
  { name: "Indianapolis", state: "IN", lat: 39.7684, lon: -86.1581, region: "Midwest" },
  { name: "Detroit", state: "MI", lat: 42.3314, lon: -83.0458, region: "Midwest" },
  { name: "Milwaukee", state: "WI", lat: 43.0389, lon: -87.9065, region: "Midwest" },
  { name: "Kansas City", state: "MO", lat: 39.0997, lon: -94.5786, region: "Midwest" },
  { name: "St. Louis", state: "MO", lat: 38.627, lon: -90.1994, region: "Midwest" },
  { name: "Minneapolis", state: "MN", lat: 44.9778, lon: -93.265, region: "Midwest" },
  { name: "Cleveland", state: "OH", lat: 41.4993, lon: -81.6944, region: "Midwest" },
  { name: "Cincinnati", state: "OH", lat: 39.1031, lon: -84.512, region: "Midwest" },
  { name: "Omaha", state: "NE", lat: 41.2565, lon: -95.9345, region: "Midwest" },
  { name: "Madison", state: "WI", lat: 43.0731, lon: -89.4012, region: "Midwest" },
  { name: "Des Moines", state: "IA", lat: 41.5868, lon: -93.625, region: "Midwest" },
  { name: "Wichita", state: "KS", lat: 37.6872, lon: -97.3301, region: "Midwest" },
  { name: "Grand Rapids", state: "MI", lat: 42.9634, lon: -85.6681, region: "Midwest" },
  { name: "Toledo", state: "OH", lat: 41.6528, lon: -83.5379, region: "Midwest" },
  { name: "Akron", state: "OH", lat: 41.0814, lon: -81.519, region: "Midwest" },
  { name: "Dayton", state: "OH", lat: 39.7589, lon: -84.1916, region: "Midwest" },
  { name: "Fort Wayne", state: "IN", lat: 41.0793, lon: -85.1394, region: "Midwest" },
  { name: "Lansing", state: "MI", lat: 42.7325, lon: -84.5555, region: "Midwest" },
  { name: "Ann Arbor", state: "MI", lat: 42.2808, lon: -83.7430, region: "Midwest" },
  { name: "Lincoln", state: "NE", lat: 40.8136, lon: -96.7026, region: "Midwest" },
  { name: "Cedar Rapids", state: "IA", lat: 41.9779, lon: -91.6656, region: "Midwest" },
  { name: "Topeka", state: "KS", lat: 39.0489, lon: -95.6780, region: "Midwest" },
  { name: "Sioux Falls", state: "SD", lat: 43.5446, lon: -96.7311, region: "Midwest" },
  { name: "Fargo", state: "ND", lat: 46.8772, lon: -96.7898, region: "Midwest" },
  { name: "Springfield", state: "IL", lat: 39.7817, lon: -89.6502, region: "Midwest" },
  { name: "Peoria", state: "IL", lat: 40.6936, lon: -89.5890, region: "Midwest" },
  { name: "Rockford", state: "IL", lat: 42.2711, lon: -89.0940, region: "Midwest" },
  { name: "Green Bay", state: "WI", lat: 44.5133, lon: -88.0133, region: "Midwest" },
  { name: "Duluth", state: "MN", lat: 46.7867, lon: -92.1005, region: "Midwest" },
  { name: "St. Paul", state: "MN", lat: 44.9537, lon: -93.0900, region: "Midwest" },
  { name: "Rochester", state: "MN", lat: 44.0121, lon: -92.4802, region: "Midwest" },
  { name: "Evansville", state: "IN", lat: 37.9716, lon: -87.5711, region: "Midwest" },
  { name: "South Bend", state: "IN", lat: 41.6764, lon: -86.2520, region: "Midwest" },
  { name: "Youngstown", state: "OH", lat: 41.0998, lon: -80.6495, region: "Midwest" },
  { name: "Springfield", state: "MO", lat: 37.2090, lon: -93.2923, region: "Midwest" },
  { name: "Columbia", state: "MO", lat: 38.9517, lon: -92.3341, region: "Midwest" },
  { name: "Bismarck", state: "ND", lat: 46.8083, lon: -100.7837, region: "Midwest" },
  { name: "Rapid City", state: "SD", lat: 44.0805, lon: -103.2310, region: "Midwest" },
  // Southwest (35 cities)
  { name: "Phoenix", state: "AZ", lat: 33.4484, lon: -112.074, region: "Southwest" },
  { name: "San Antonio", state: "TX", lat: 29.4241, lon: -98.4936, region: "Southwest" },
  { name: "Dallas", state: "TX", lat: 32.7767, lon: -96.797, region: "Southwest" },
  { name: "Austin", state: "TX", lat: 30.2672, lon: -97.7431, region: "Southwest" },
  { name: "Houston", state: "TX", lat: 29.7604, lon: -95.3698, region: "Southwest" },
  { name: "Fort Worth", state: "TX", lat: 32.7555, lon: -97.3308, region: "Southwest" },
  { name: "El Paso", state: "TX", lat: 31.7619, lon: -106.485, region: "Southwest" },
  { name: "Tucson", state: "AZ", lat: 32.2226, lon: -110.9747, region: "Southwest" },
  { name: "Albuquerque", state: "NM", lat: 35.0844, lon: -106.6504, region: "Southwest" },
  { name: "Oklahoma City", state: "OK", lat: 35.4676, lon: -97.5164, region: "Southwest" },
  { name: "Tulsa", state: "OK", lat: 36.154, lon: -95.9928, region: "Southwest" },
  { name: "Mesa", state: "AZ", lat: 33.4152, lon: -111.8315, region: "Southwest" },
  { name: "Las Vegas", state: "NV", lat: 36.1699, lon: -115.1398, region: "Southwest" },
  { name: "Lubbock", state: "TX", lat: 33.5779, lon: -101.8552, region: "Southwest" },
  { name: "Corpus Christi", state: "TX", lat: 27.8006, lon: -97.3964, region: "Southwest" },
  { name: "Laredo", state: "TX", lat: 27.5036, lon: -99.5076, region: "Southwest" },
  { name: "Amarillo", state: "TX", lat: 35.222, lon: -101.8313, region: "Southwest" },
  { name: "Santa Fe", state: "NM", lat: 35.687, lon: -105.9378, region: "Southwest" },
  { name: "Las Cruces", state: "NM", lat: 32.3199, lon: -106.7637, region: "Southwest" },
  { name: "Scottsdale", state: "AZ", lat: 33.4942, lon: -111.9261, region: "Southwest" },
  { name: "Chandler", state: "AZ", lat: 33.3062, lon: -111.8413, region: "Southwest" },
  { name: "Gilbert", state: "AZ", lat: 33.3528, lon: -111.7890, region: "Southwest" },
  { name: "Tempe", state: "AZ", lat: 33.4255, lon: -111.9400, region: "Southwest" },
  { name: "Flagstaff", state: "AZ", lat: 35.1983, lon: -111.6513, region: "Southwest" },
  { name: "Henderson", state: "NV", lat: 36.0395, lon: -114.9817, region: "Southwest" },
  { name: "Reno", state: "NV", lat: 39.5296, lon: -119.8138, region: "Southwest" },
  { name: "Midland", state: "TX", lat: 31.9973, lon: -102.0779, region: "Southwest" },
  { name: "Odessa", state: "TX", lat: 31.8457, lon: -102.3676, region: "Southwest" },
  { name: "Waco", state: "TX", lat: 31.5493, lon: -97.1467, region: "Southwest" },
  { name: "McAllen", state: "TX", lat: 26.2034, lon: -98.2300, region: "Southwest" },
  { name: "Brownsville", state: "TX", lat: 25.9017, lon: -97.4975, region: "Southwest" },
  { name: "Abilene", state: "TX", lat: 32.4487, lon: -99.7331, region: "Southwest" },
  { name: "Tyler", state: "TX", lat: 32.3513, lon: -95.3011, region: "Southwest" },
  { name: "Norman", state: "OK", lat: 35.2226, lon: -97.4395, region: "Southwest" },
  { name: "Broken Arrow", state: "OK", lat: 36.0526, lon: -95.7908, region: "Southwest" },
  // West (35 cities)
  { name: "Los Angeles", state: "CA", lat: 34.0522, lon: -118.2437, region: "West" },
  { name: "San Francisco", state: "CA", lat: 37.7749, lon: -122.4194, region: "West" },
  { name: "San Diego", state: "CA", lat: 32.7157, lon: -117.1611, region: "West" },
  { name: "San Jose", state: "CA", lat: 37.3382, lon: -121.8863, region: "West" },
  { name: "Seattle", state: "WA", lat: 47.6062, lon: -122.3321, region: "West" },
  { name: "Denver", state: "CO", lat: 39.7392, lon: -104.9903, region: "West" },
  { name: "Portland", state: "OR", lat: 45.5051, lon: -122.675, region: "West" },
  { name: "Sacramento", state: "CA", lat: 38.5816, lon: -121.4944, region: "West" },
  { name: "Fresno", state: "CA", lat: 36.7378, lon: -119.7871, region: "West" },
  { name: "Salt Lake City", state: "UT", lat: 40.7608, lon: -111.891, region: "West" },
  { name: "Long Beach", state: "CA", lat: 33.7701, lon: -118.1937, region: "West" },
  { name: "Oakland", state: "CA", lat: 37.8044, lon: -122.2712, region: "West" },
  { name: "Bakersfield", state: "CA", lat: 35.3733, lon: -119.0187, region: "West" },
  { name: "Riverside", state: "CA", lat: 33.9806, lon: -117.3755, region: "West" },
  { name: "Stockton", state: "CA", lat: 37.9577, lon: -121.2908, region: "West" },
  { name: "Boise", state: "ID", lat: 43.615, lon: -116.2023, region: "West" },
  { name: "Spokane", state: "WA", lat: 47.6588, lon: -117.426, region: "West" },
  { name: "Tacoma", state: "WA", lat: 47.2529, lon: -122.4443, region: "West" },
  { name: "Colorado Springs", state: "CO", lat: 38.8339, lon: -104.8214, region: "West" },
  { name: "Aurora", state: "CO", lat: 39.7294, lon: -104.8319, region: "West" },
  { name: "Honolulu", state: "HI", lat: 21.3069, lon: -157.8583, region: "West" },
  { name: "Anchorage", state: "AK", lat: 61.2181, lon: -149.9003, region: "West" },
  { name: "Eugene", state: "OR", lat: 44.0521, lon: -123.0868, region: "West" },
  { name: "Salem", state: "OR", lat: 44.9429, lon: -123.0351, region: "West" },
  { name: "Provo", state: "UT", lat: 40.2338, lon: -111.6585, region: "West" },
  { name: "Ogden", state: "UT", lat: 41.2230, lon: -111.9738, region: "West" },
  { name: "Fort Collins", state: "CO", lat: 40.5853, lon: -105.0844, region: "West" },
  { name: "Pueblo", state: "CO", lat: 38.2544, lon: -104.6091, region: "West" },
  { name: "Redding", state: "CA", lat: 40.5865, lon: -122.3917, region: "West" },
  { name: "Modesto", state: "CA", lat: 37.6391, lon: -120.9969, region: "West" },
  { name: "Santa Rosa", state: "CA", lat: 38.4404, lon: -122.7141, region: "West" },
  { name: "Medford", state: "OR", lat: 42.3265, lon: -122.8756, region: "West" },
  { name: "Bellingham", state: "WA", lat: 48.7519, lon: -122.4787, region: "West" },
  { name: "Missoula", state: "MT", lat: 46.8721, lon: -114.0001, region: "West" },
  { name: "Billings", state: "MT", lat: 45.7833, lon: -108.5007, region: "West" },
  // South Central (20 cities)
  { name: "New Orleans", state: "LA", lat: 29.9511, lon: -90.0715, region: "South Central" },
  { name: "Baton Rouge", state: "LA", lat: 30.4515, lon: -91.1871, region: "South Central" },
  { name: "Shreveport", state: "LA", lat: 32.5252, lon: -93.7502, region: "South Central" },
  { name: "Little Rock", state: "AR", lat: 34.7465, lon: -92.2896, region: "South Central" },
  { name: "Fayetteville", state: "AR", lat: 36.0822, lon: -94.1719, region: "South Central" },
  { name: "Fort Smith", state: "AR", lat: 35.3859, lon: -94.3985, region: "South Central" },
  { name: "Lafayette", state: "LA", lat: 30.2241, lon: -92.0198, region: "South Central" },
  { name: "Lake Charles", state: "LA", lat: 30.2266, lon: -93.2174, region: "South Central" },
  { name: "Monroe", state: "LA", lat: 32.5093, lon: -92.1193, region: "South Central" },
  { name: "Alexandria", state: "LA", lat: 31.3113, lon: -92.4451, region: "South Central" },
  { name: "Jonesboro", state: "AR", lat: 35.8423, lon: -90.7043, region: "South Central" },
  { name: "Pine Bluff", state: "AR", lat: 34.2284, lon: -92.0032, region: "South Central" },
  { name: "Hot Springs", state: "AR", lat: 34.5037, lon: -93.0552, region: "South Central" },
  { name: "Texarkana", state: "AR", lat: 33.4418, lon: -94.0377, region: "South Central" },
  { name: "Houma", state: "LA", lat: 29.5958, lon: -90.7195, region: "South Central" },
  { name: "Beaumont", state: "TX", lat: 30.0802, lon: -94.1266, region: "South Central" },
  { name: "Port Arthur", state: "TX", lat: 29.8850, lon: -93.9400, region: "South Central" },
  { name: "Hattiesburg", state: "MS", lat: 31.3271, lon: -89.2903, region: "South Central" },
  { name: "Meridian", state: "MS", lat: 32.3643, lon: -88.7037, region: "South Central" },
  { name: "Tupelo", state: "MS", lat: 34.2576, lon: -88.7034, region: "South Central" },
  { name: "Ruston", state: "LA", lat: 32.5232, lon: -92.6379, region: "South Central" },
  { name: "Conway", state: "AR", lat: 35.0887, lon: -92.4421, region: "South Central" },
  { name: "Natchez", state: "MS", lat: 31.5604, lon: -91.4032, region: "South Central" },
  { name: "Vicksburg", state: "MS", lat: 32.3526, lon: -90.8779, region: "South Central" },
  { name: "Texarkana", state: "TX", lat: 33.4254, lon: -94.0477, region: "South Central" },
];

// ---------------------------------------------------------------------------
// Open-Meteo Historical API
// ---------------------------------------------------------------------------

const OPEN_METEO_HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

async function fetchHistoricalData(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<HourlyHistoricalData | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: startDate,
    end_date: endDate,
    hourly: "temperature_2m,precipitation,weather_code",
    temperature_unit: "celsius",
    timezone: "auto",
  });

  try {
    const response = await fetch(`${OPEN_METEO_HISTORICAL_URL}?${params}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.hourly as HourlyHistoricalData;
  } catch {
    return null;
  }
}

async function fetchForecastData(
  lat: number,
  lon: number,
  pastHours: number
): Promise<HourlyForecastData | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "temperature_2m,precipitation_probability,weather_code",
    past_hours: pastHours.toString(),
    forecast_hours: "48",
    temperature_unit: "celsius",
    timezone: "auto",
  });

  try {
    const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.hourly as HourlyForecastData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Accuracy Calculations
// ---------------------------------------------------------------------------

function calculateTemperatureMAE(
  forecastTemps: number[],
  actualTemps: number[]
): { mae: number; count: number } {
  let totalError = 0;
  let count = 0;

  for (let i = 0; i < Math.min(forecastTemps.length, actualTemps.length); i++) {
    if (forecastTemps[i] != null && actualTemps[i] != null) {
      // Convert both to Fahrenheit for MAE comparison
      const forecastF = celsiusToFahrenheit(forecastTemps[i]);
      const actualF = celsiusToFahrenheit(actualTemps[i]);
      totalError += Math.abs(forecastF - actualF);
      count++;
    }
  }

  return { mae: count > 0 ? totalError / count : 0, count };
}

const PRECIP_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
]);

function isPrecipCode(code: number): boolean {
  return PRECIP_CODES.has(code);
}

function calculatePrecipTimingError(
  forecastCodes: number[],
  actualCodes: number[],
  forecastTimes: string[],
  actualTimes: string[]
): number | null {
  // Find first precipitation event in actual data
  const actualPrecipIndex = actualCodes.findIndex((c) => isPrecipCode(c));
  if (actualPrecipIndex === -1) {
    // No actual precipitation to compare
    return null;
  }

  // Find first precipitation event in forecast data
  const forecastPrecipIndex = forecastCodes.findIndex((c) => isPrecipCode(c));
  if (forecastPrecipIndex === -1) {
    // Forecast missed precipitation entirely - large error
    return 120; // 2 hours max error for missed events
  }

  const actualTime = new Date(actualTimes[actualPrecipIndex]).getTime();
  const forecastTime = new Date(forecastTimes[forecastPrecipIndex]).getTime();
  const diffMinutes = Math.abs(forecastTime - actualTime) / (1000 * 60);

  return diffMinutes;
}

// ---------------------------------------------------------------------------
// Rate limiting helper
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

async function validateCity(city: City): Promise<CityResult> {
  try {
    // Use yesterday as the comparison date for historical data
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(now);
    dayBefore.setDate(dayBefore.getDate() - 2);

    const startDate = dayBefore.toISOString().split("T")[0];
    const endDate = yesterday.toISOString().split("T")[0];

    // Fetch historical (actual) data and current forecast with past hours
    const [historical, forecast] = await Promise.all([
      fetchHistoricalData(city.lat, city.lon, startDate, endDate),
      fetchForecastData(city.lat, city.lon, 48),
    ]);

    if (!historical || !forecast) {
      return {
        city,
        temperatureMAE: 0,
        precipitationTimingErrorMinutes: null,
        hoursCompared: 0,
        error: "Failed to fetch data",
      };
    }

    // Compare overlapping hours between forecast past data and historical data
    const historicalTimeMap = new Map<string, number>();
    for (let i = 0; i < historical.time.length; i++) {
      historicalTimeMap.set(historical.time[i], i);
    }

    const matchedForecastTemps: number[] = [];
    const matchedActualTemps: number[] = [];
    const matchedForecastCodes: number[] = [];
    const matchedActualCodes: number[] = [];
    const matchedForecastTimes: string[] = [];
    const matchedActualTimes: string[] = [];

    for (let i = 0; i < forecast.time.length; i++) {
      const forecastTime = forecast.time[i];
      const histIndex = historicalTimeMap.get(forecastTime);
      if (histIndex !== undefined) {
        matchedForecastTemps.push(forecast.temperature_2m[i]);
        matchedActualTemps.push(historical.temperature_2m[histIndex]);
        matchedForecastCodes.push(forecast.weather_code[i]);
        matchedActualCodes.push(historical.weather_code[histIndex]);
        matchedForecastTimes.push(forecastTime);
        matchedActualTimes.push(historical.time[histIndex]);
      }
    }

    if (matchedForecastTemps.length === 0) {
      return {
        city,
        temperatureMAE: 0,
        precipitationTimingErrorMinutes: null,
        hoursCompared: 0,
        error: "No overlapping time periods found",
      };
    }

    const { mae, count } = calculateTemperatureMAE(matchedForecastTemps, matchedActualTemps);

    const precipTimingError = calculatePrecipTimingError(
      matchedForecastCodes,
      matchedActualCodes,
      matchedForecastTimes,
      matchedActualTimes
    );

    return {
      city,
      temperatureMAE: Math.round(mae * 100) / 100,
      precipitationTimingErrorMinutes: precipTimingError !== null ? Math.round(precipTimingError) : null,
      hoursCompared: count,
    };
  } catch (err) {
    return {
      city,
      temperatureMAE: 0,
      precipitationTimingErrorMinutes: null,
      hoursCompared: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function generateRegionReport(results: CityResult[]): RegionReport[] {
  const regionMap = new Map<string, CityResult[]>();

  for (const result of results) {
    if (result.error) continue;
    const region = result.city.region;
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }
    regionMap.get(region)!.push(result);
  }

  const reports: RegionReport[] = [];

  for (const [region, cityResults] of regionMap) {
    const tempMAEs = cityResults.map((r) => r.temperatureMAE);
    const precipErrors = cityResults
      .map((r) => r.precipitationTimingErrorMinutes)
      .filter((e): e is number => e !== null);

    const avgTempMAE = tempMAEs.reduce((a, b) => a + b, 0) / tempMAEs.length;
    const avgPrecipError =
      precipErrors.length > 0
        ? precipErrors.reduce((a, b) => a + b, 0) / precipErrors.length
        : null;

    reports.push({
      region,
      cityCount: cityResults.length,
      avgTemperatureMAE: Math.round(avgTempMAE * 100) / 100,
      avgPrecipTimingError: avgPrecipError !== null ? Math.round(avgPrecipError) : null,
      citiesWithPrecipData: precipErrors.length,
      passesTemperatureThreshold: avgTempMAE < 3,
      passesPrecipTimingThreshold: avgPrecipError === null || avgPrecipError <= 10,
    });
  }

  return reports.sort((a, b) => a.region.localeCompare(b.region));
}

async function main(): Promise<void> {
  console.log("=== Weather Forecast Accuracy Validation ===");
  console.log(`Cities to validate: ${US_CITIES.length}`);
  console.log("");

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(now);
  dayBefore.setDate(dayBefore.getDate() - 2);

  console.log(`Date range: ${dayBefore.toISOString().split("T")[0]} to ${yesterday.toISOString().split("T")[0]}`);
  console.log("");

  const results: CityResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < US_CITIES.length; i += batchSize) {
    const batch = US_CITIES.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(US_CITIES.length / batchSize);

    process.stdout.write(`\rProcessing batch ${batchNum}/${totalBatches} (${i + batch.length}/${US_CITIES.length} cities)...`);

    const batchResults = await Promise.all(batch.map((city) => validateCity(city)));
    results.push(...batchResults);

    // Rate limit: small delay between batches to respect API limits
    if (i + batchSize < US_CITIES.length) {
      await delay(500);
    }
  }

  console.log("\n");

  // Generate report
  const successResults = results.filter((r) => !r.error);
  const failedResults = results.filter((r) => r.error);

  const allTempMAEs = successResults.map((r) => r.temperatureMAE);
  const allPrecipErrors = successResults
    .map((r) => r.precipitationTimingErrorMinutes)
    .filter((e): e is number => e !== null);

  const overallTempMAE =
    allTempMAEs.length > 0
      ? allTempMAEs.reduce((a, b) => a + b, 0) / allTempMAEs.length
      : 0;
  const overallPrecipError =
    allPrecipErrors.length > 0
      ? allPrecipErrors.reduce((a, b) => a + b, 0) / allPrecipErrors.length
      : null;

  const regionReports = generateRegionReport(results);

  const report: AccuracyReport = {
    generatedAt: now.toISOString(),
    dateRange: {
      start: dayBefore.toISOString().split("T")[0],
      end: yesterday.toISOString().split("T")[0],
    },
    overall: {
      totalCities: US_CITIES.length,
      successfulCities: successResults.length,
      failedCities: failedResults.length,
      avgTemperatureMAE: Math.round(overallTempMAE * 100) / 100,
      avgPrecipTimingErrorMinutes:
        overallPrecipError !== null ? Math.round(overallPrecipError) : null,
      citiesWithPrecipData: allPrecipErrors.length,
      passesTemperatureThreshold: overallTempMAE < 3,
      passesPrecipTimingThreshold: overallPrecipError === null || overallPrecipError <= 10,
    },
    byRegion: regionReports,
    cityResults: results,
  };

  // Print summary
  console.log("=== OVERALL RESULTS ===");
  console.log(`Total cities: ${report.overall.totalCities}`);
  console.log(`Successful: ${report.overall.successfulCities}`);
  console.log(`Failed: ${report.overall.failedCities}`);
  console.log("");
  console.log(`Temperature MAE: ${report.overall.avgTemperatureMAE}°F (target: < 3°F) ${report.overall.passesTemperatureThreshold ? "✓ PASS" : "✗ FAIL"}`);
  if (report.overall.avgPrecipTimingErrorMinutes !== null) {
    console.log(`Precip Timing Error: ${report.overall.avgPrecipTimingErrorMinutes} min (target: ≤ 10 min) ${report.overall.passesPrecipTimingThreshold ? "✓ PASS" : "✗ FAIL"}`);
  } else {
    console.log("Precip Timing Error: No precipitation data available for comparison");
  }
  console.log(`Cities with precip data: ${report.overall.citiesWithPrecipData}`);
  console.log("");

  console.log("=== RESULTS BY REGION ===");
  for (const region of report.byRegion) {
    console.log(`\n--- ${region.region} (${region.cityCount} cities) ---`);
    console.log(`  Temp MAE: ${region.avgTemperatureMAE}°F ${region.passesTemperatureThreshold ? "✓" : "✗"}`);
    if (region.avgPrecipTimingError !== null) {
      console.log(`  Precip Timing: ${region.avgPrecipTimingError} min ${region.passesPrecipTimingThreshold ? "✓" : "✗"}`);
    } else {
      console.log("  Precip Timing: No data");
    }
    console.log(`  Cities with precip: ${region.citiesWithPrecipData}`);
  }

  // List failed cities
  if (failedResults.length > 0) {
    console.log("\n=== FAILED CITIES ===");
    for (const result of failedResults) {
      console.log(`  ${result.city.name}, ${result.city.state}: ${result.error}`);
    }
  }

  // List cities with worst accuracy
  const worstTemp = [...successResults].sort((a, b) => b.temperatureMAE - a.temperatureMAE).slice(0, 10);
  if (worstTemp.length > 0) {
    console.log("\n=== HIGHEST TEMPERATURE MAE (worst 10) ===");
    for (const result of worstTemp) {
      console.log(`  ${result.city.name}, ${result.city.state}: ${result.temperatureMAE}°F MAE (${result.hoursCompared} hours compared)`);
    }
  }

  // Write full JSON report to file
  const reportPath = "scripts/accuracy-report.json";
  const fs = await import("fs");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
