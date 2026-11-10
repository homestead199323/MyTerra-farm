/* ═══════════════════════════════════════════
   CITY DATABASE — maps cities to climate regions
   Extracted from App.jsx (Phase A.7, 2026-05-09)
   ═══════════════════════════════════════════ */
export const CITY_DB = [
  // Mediterranean
  {city:"Tirana",country:"Albania",region:"mediterranean"},{city:"Durres",country:"Albania",region:"mediterranean"},{city:"Vlore",country:"Albania",region:"mediterranean"},{city:"Sarande",country:"Albania",region:"mediterranean"},{city:"Berat",country:"Albania",region:"mediterranean"},{city:"Korce",country:"Albania",region:"mediterranean"},{city:"Shkoder",country:"Albania",region:"mediterranean"},{city:"Elbasan",country:"Albania",region:"mediterranean"},
  {city:"Athens",country:"Greece",region:"mediterranean"},{city:"Thessaloniki",country:"Greece",region:"mediterranean"},{city:"Crete",country:"Greece",region:"mediterranean"},{city:"Patras",country:"Greece",region:"mediterranean"},
  {city:"Rome",country:"Italy",region:"mediterranean"},{city:"Naples",country:"Italy",region:"mediterranean"},{city:"Palermo",country:"Italy",region:"mediterranean"},{city:"Florence",country:"Italy",region:"mediterranean"},{city:"Bari",country:"Italy",region:"mediterranean"},{city:"Catania",country:"Italy",region:"mediterranean"},
  {city:"Barcelona",country:"Spain",region:"mediterranean"},{city:"Valencia",country:"Spain",region:"mediterranean"},{city:"Malaga",country:"Spain",region:"mediterranean"},{city:"Seville",country:"Spain",region:"mediterranean"},{city:"Madrid",country:"Spain",region:"mediterranean"},{city:"Alicante",country:"Spain",region:"mediterranean"},
  {city:"Lisbon",country:"Portugal",region:"mediterranean"},{city:"Porto",country:"Portugal",region:"mediterranean"},{city:"Faro",country:"Portugal",region:"mediterranean"},
  {city:"Dubrovnik",country:"Croatia",region:"mediterranean"},{city:"Split",country:"Croatia",region:"mediterranean"},{city:"Antalya",country:"Turkey",region:"mediterranean"},{city:"Izmir",country:"Turkey",region:"mediterranean"},{city:"Marseille",country:"France",region:"mediterranean"},{city:"Nice",country:"France",region:"mediterranean"},{city:"Montpellier",country:"France",region:"mediterranean"},
  // Western Europe
  {city:"London",country:"UK",region:"western_europe"},{city:"Manchester",country:"UK",region:"western_europe"},{city:"Birmingham",country:"UK",region:"western_europe"},{city:"Edinburgh",country:"UK",region:"western_europe"},{city:"Bristol",country:"UK",region:"western_europe"},{city:"Cardiff",country:"UK",region:"western_europe"},{city:"Leeds",country:"UK",region:"western_europe"},{city:"Liverpool",country:"UK",region:"western_europe"},{city:"Glasgow",country:"UK",region:"western_europe"},{city:"Belfast",country:"UK",region:"western_europe"},{city:"Cornwall",country:"UK",region:"western_europe"},{city:"Devon",country:"UK",region:"western_europe"},{city:"Kent",country:"UK",region:"western_europe"},{city:"Surrey",country:"UK",region:"western_europe"},
  {city:"Dublin",country:"Ireland",region:"western_europe"},{city:"Cork",country:"Ireland",region:"western_europe"},{city:"Galway",country:"Ireland",region:"western_europe"},
  {city:"Amsterdam",country:"Netherlands",region:"western_europe"},{city:"Rotterdam",country:"Netherlands",region:"western_europe"},{city:"Utrecht",country:"Netherlands",region:"western_europe"},{city:"The Hague",country:"Netherlands",region:"western_europe"},{city:"Eindhoven",country:"Netherlands",region:"western_europe"},{city:"Groningen",country:"Netherlands",region:"western_europe"},
  {city:"Brussels",country:"Belgium",region:"western_europe"},{city:"Antwerp",country:"Belgium",region:"western_europe"},{city:"Ghent",country:"Belgium",region:"western_europe"},{city:"Bruges",country:"Belgium",region:"western_europe"},
  {city:"Paris",country:"France",region:"western_europe"},{city:"Lyon",country:"France",region:"western_europe"},{city:"Bordeaux",country:"France",region:"western_europe"},{city:"Nantes",country:"France",region:"western_europe"},{city:"Rennes",country:"France",region:"western_europe"},{city:"Lille",country:"France",region:"western_europe"},
  {city:"Luxembourg",country:"Luxembourg",region:"western_europe"},
  // Northern Europe
  {city:"Berlin",country:"Germany",region:"northern_europe"},{city:"Munich",country:"Germany",region:"northern_europe"},{city:"Hamburg",country:"Germany",region:"northern_europe"},{city:"Frankfurt",country:"Germany",region:"northern_europe"},{city:"Cologne",country:"Germany",region:"northern_europe"},{city:"Stuttgart",country:"Germany",region:"northern_europe"},{city:"Dresden",country:"Germany",region:"northern_europe"},{city:"Leipzig",country:"Germany",region:"northern_europe"},{city:"Dusseldorf",country:"Germany",region:"northern_europe"},{city:"Hannover",country:"Germany",region:"northern_europe"},
  {city:"Copenhagen",country:"Denmark",region:"northern_europe"},{city:"Aarhus",country:"Denmark",region:"northern_europe"},
  {city:"Stockholm",country:"Sweden",region:"northern_europe"},{city:"Gothenburg",country:"Sweden",region:"northern_europe"},{city:"Malmo",country:"Sweden",region:"northern_europe"},
  {city:"Oslo",country:"Norway",region:"northern_europe"},{city:"Bergen",country:"Norway",region:"northern_europe"},
  {city:"Helsinki",country:"Finland",region:"northern_europe"},
  {city:"Tallinn",country:"Estonia",region:"northern_europe"},{city:"Riga",country:"Latvia",region:"northern_europe"},{city:"Vilnius",country:"Lithuania",region:"northern_europe"},{city:"Kaunas",country:"Lithuania",region:"northern_europe"},
  {city:"Warsaw",country:"Poland",region:"northern_europe"},{city:"Krakow",country:"Poland",region:"northern_europe"},{city:"Gdansk",country:"Poland",region:"northern_europe"},{city:"Wroclaw",country:"Poland",region:"northern_europe"},{city:"Poznan",country:"Poland",region:"northern_europe"},
  {city:"Prague",country:"Czechia",region:"northern_europe"},{city:"Brno",country:"Czechia",region:"northern_europe"},
  {city:"Vienna",country:"Austria",region:"northern_europe"},{city:"Zurich",country:"Switzerland",region:"northern_europe"},{city:"Bern",country:"Switzerland",region:"northern_europe"},{city:"Geneva",country:"Switzerland",region:"northern_europe"},
  {city:"Budapest",country:"Hungary",region:"northern_europe"},{city:"Bratislava",country:"Slovakia",region:"northern_europe"},
  // US/Canada Warm
  {city:"Los Angeles",country:"US",region:"us_warm"},{city:"San Francisco",country:"US",region:"us_warm"},{city:"San Diego",country:"US",region:"us_warm"},{city:"Sacramento",country:"US",region:"us_warm"},{city:"Portland",country:"US",region:"western_europe"},{city:"Seattle",country:"US",region:"western_europe"},
  {city:"Houston",country:"US",region:"us_warm"},{city:"Dallas",country:"US",region:"us_warm"},{city:"Austin",country:"US",region:"us_warm"},{city:"San Antonio",country:"US",region:"us_warm"},
  {city:"Miami",country:"US",region:"us_warm"},{city:"Tampa",country:"US",region:"us_warm"},{city:"Orlando",country:"US",region:"us_warm"},{city:"Jacksonville",country:"US",region:"us_warm"},
  {city:"Atlanta",country:"US",region:"us_warm"},{city:"Nashville",country:"US",region:"us_warm"},{city:"Charlotte",country:"US",region:"us_warm"},{city:"Raleigh",country:"US",region:"us_warm"},
  {city:"Phoenix",country:"US",region:"us_warm"},{city:"Tucson",country:"US",region:"us_warm"},{city:"Las Vegas",country:"US",region:"us_warm"},{city:"Albuquerque",country:"US",region:"us_warm"},
  {city:"New Orleans",country:"US",region:"us_warm"},{city:"Memphis",country:"US",region:"us_warm"},{city:"Charleston",country:"US",region:"us_warm"},{city:"Savannah",country:"US",region:"us_warm"},
  {city:"Vancouver",country:"Canada",region:"western_europe"},{city:"Victoria",country:"Canada",region:"western_europe"},
  // US/Canada Cold
  {city:"Boston",country:"US",region:"us_cold"},{city:"Philadelphia",country:"US",region:"us_cold"},{city:"Baltimore",country:"US",region:"us_cold"},{city:"Pittsburgh",country:"US",region:"us_cold"},
  {city:"Chicago",country:"US",region:"us_cold"},{city:"Detroit",country:"US",region:"us_cold"},{city:"Milwaukee",country:"US",region:"us_cold"},{city:"Minneapolis",country:"US",region:"us_cold"},{city:"Indianapolis",country:"US",region:"us_cold"},{city:"Columbus",country:"US",region:"us_cold"},{city:"Cleveland",country:"US",region:"us_cold"},{city:"St Louis",country:"US",region:"us_cold"},{city:"Kansas City",country:"US",region:"us_cold"},
  {city:"Denver",country:"US",region:"us_cold"},{city:"Salt Lake City",country:"US",region:"us_cold"},{city:"Boise",country:"US",region:"us_cold"},
  {city:"Toronto",country:"Canada",region:"us_cold"},{city:"Montreal",country:"Canada",region:"us_cold"},{city:"Ottawa",country:"Canada",region:"us_cold"},{city:"Calgary",country:"Canada",region:"us_cold"},{city:"Edmonton",country:"Canada",region:"us_cold"},{city:"Winnipeg",country:"Canada",region:"us_cold"},{city:"Halifax",country:"Canada",region:"us_cold"},{city:"Quebec City",country:"Canada",region:"us_cold"},

  // ── US states / Canadian provinces (state-level region detection) ──
  // us_warm states (USDA 7-10)
  {city:"Alabama",country:"US",region:"us_warm",abbr:"AL"},
  {city:"Arizona",country:"US",region:"us_warm",abbr:"AZ"},
  {city:"Arkansas",country:"US",region:"us_warm",abbr:"AR"},
  {city:"California",country:"US",region:"us_warm",abbr:"CA"},
  {city:"Delaware",country:"US",region:"us_cold",abbr:"DE"},
  {city:"Florida",country:"US",region:"us_warm",abbr:"FL"},
  {city:"Georgia",country:"US",region:"us_warm",abbr:"GA"},
  {city:"Hawaii",country:"US",region:"us_warm",abbr:"HI"},
  {city:"Kentucky",country:"US",region:"us_cold",abbr:"KY"},
  {city:"Louisiana",country:"US",region:"us_warm",abbr:"LA"},
  {city:"Maryland",country:"US",region:"us_cold",abbr:"MD"},
  {city:"Mississippi",country:"US",region:"us_warm",abbr:"MS"},
  {city:"Nevada",country:"US",region:"us_warm",abbr:"NV"},
  {city:"New Mexico",country:"US",region:"us_warm",abbr:"NM"},
  {city:"North Carolina",country:"US",region:"us_warm",abbr:"NC"},
  {city:"Oklahoma",country:"US",region:"us_warm",abbr:"OK"},
  {city:"Oregon",country:"US",region:"western_europe",abbr:"OR"},
  {city:"South Carolina",country:"US",region:"us_warm",abbr:"SC"},
  {city:"Tennessee",country:"US",region:"us_warm",abbr:"TN"},
  {city:"Texas",country:"US",region:"us_warm",abbr:"TX"},
  {city:"Virginia",country:"US",region:"us_cold",abbr:"VA"},
  {city:"Washington",country:"US",region:"western_europe",abbr:"WA"},
  {city:"Washington DC",country:"US",region:"us_cold",abbr:"DC"},
  // us_cold states (USDA 3-6)
  {city:"Alaska",country:"US",region:"us_cold",abbr:"AK"},
  {city:"Colorado",country:"US",region:"us_cold",abbr:"CO"},
  {city:"Connecticut",country:"US",region:"us_cold",abbr:"CT"},
  {city:"Idaho",country:"US",region:"us_cold",abbr:"ID"},
  {city:"Illinois",country:"US",region:"us_cold",abbr:"IL"},
  {city:"Indiana",country:"US",region:"us_cold",abbr:"IN"},
  {city:"Iowa",country:"US",region:"us_cold",abbr:"IA"},
  {city:"Kansas",country:"US",region:"us_cold",abbr:"KS"},
  {city:"Maine",country:"US",region:"us_cold",abbr:"ME"},
  {city:"Massachusetts",country:"US",region:"us_cold",abbr:"MA"},
  {city:"Michigan",country:"US",region:"us_cold",abbr:"MI"},
  {city:"Minnesota",country:"US",region:"us_cold",abbr:"MN"},
  {city:"Missouri",country:"US",region:"us_cold",abbr:"MO"},
  {city:"Montana",country:"US",region:"us_cold",abbr:"MT"},
  {city:"Nebraska",country:"US",region:"us_cold",abbr:"NE"},
  {city:"New Hampshire",country:"US",region:"us_cold",abbr:"NH"},
  {city:"New Jersey",country:"US",region:"us_cold",abbr:"NJ"},
  {city:"New York",country:"US",region:"us_cold",abbr:"NY"},
  {city:"North Dakota",country:"US",region:"us_cold",abbr:"ND"},
  {city:"Ohio",country:"US",region:"us_cold",abbr:"OH"},
  {city:"Pennsylvania",country:"US",region:"us_cold",abbr:"PA"},
  {city:"Rhode Island",country:"US",region:"us_cold",abbr:"RI"},
  {city:"South Dakota",country:"US",region:"us_cold",abbr:"SD"},
  {city:"Utah",country:"US",region:"us_cold",abbr:"UT"},
  {city:"Vermont",country:"US",region:"us_cold",abbr:"VT"},
  {city:"West Virginia",country:"US",region:"us_cold",abbr:"WV"},
  {city:"Wisconsin",country:"US",region:"us_cold",abbr:"WI"},
  {city:"Wyoming",country:"US",region:"us_cold",abbr:"WY"},
  // Canadian provinces - us_warm (coastal BC)
  {city:"British Columbia",country:"Canada",region:"western_europe",abbr:"BC"},
  // Canadian provinces - us_cold
  {city:"Alberta",country:"Canada",region:"us_cold",abbr:"AB"},
  {city:"Saskatchewan",country:"Canada",region:"us_cold",abbr:"SK"},
  {city:"Manitoba",country:"Canada",region:"us_cold",abbr:"MB"},
  {city:"Ontario",country:"Canada",region:"us_cold",abbr:"ON"},
  {city:"Quebec",country:"Canada",region:"us_cold",abbr:"QC"},
  {city:"New Brunswick",country:"Canada",region:"us_cold",abbr:"NB"},
  {city:"Nova Scotia",country:"Canada",region:"us_cold",abbr:"NS"},
  {city:"Prince Edward Island",country:"Canada",region:"us_cold",abbr:"PE"},
  {city:"Newfoundland and Labrador",country:"Canada",region:"us_cold",abbr:"NL"},
  {city:"Yukon",country:"Canada",region:"us_cold",abbr:"YT"},
  {city:"Northwest Territories",country:"Canada",region:"us_cold",abbr:"NT"},
  {city:"Nunavut",country:"Canada",region:"us_cold",abbr:"NU"},
];

export function searchCity(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const exact = [];
  const starts = [];
  const contains = [];
  for (let i = 0; i < CITY_DB.length; i++) {
    const c = CITY_DB[i];
    const cn = c.city.toLowerCase();
    const co = c.country.toLowerCase();
    const ab = c.abbr ? c.abbr.toLowerCase() : "";
    if (cn === q || co === q || ab === q) exact.push(c);
    else if (cn.startsWith(q) || co.startsWith(q) || (ab && ab.startsWith(q))) starts.push(c);
    else if (cn.includes(q) || co.includes(q)) contains.push(c);
  }
  return exact.concat(starts, contains).slice(0, 8);
}
