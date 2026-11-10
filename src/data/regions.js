/* CLIMATE REGIONS + lookup map. Phase A Commit 3, 2026-05-07 */
// frost: typical average last spring / first autumn frost (MM-DD) for the region's main growing areas.
// Sources: RHS (UK: last air frost 2-4 weeks before the late-May planting-out window), Eisheiligen
// mid-May (DE), PlantMaps Albania (Tirana Mar 11-20), Garden Design USDA zone table (zones 3-6 / 7-9).
// Growers can override these per farm; mountains and coasts differ by weeks.

export const REGIONS = [
  {id:"western_europe",frost:{last:"05-01",first:"10-31"},name:"Western Europe",emoji:"🌧️",desc:"Mild maritime climate, cool summers, rain year-round (USDA 7-9)",examples:"UK, Ireland, Belgium, Netherlands, NW France, Pacific Northwest coast"},
  {id:"mediterranean",frost:{last:"03-15",first:"11-25"},name:"Mediterranean",emoji:"🫒",desc:"Hot dry summers, mild wet winters (USDA 8b-10a)",examples:"Albania, S. Italy, Greece, Spain, Portugal"},
  {id:"northern_europe",frost:{last:"05-12",first:"10-01"},name:"Northern Europe",emoji:"❄️",desc:"Cold winters, shorter growing season (USDA 5-7)",examples:"Germany, Scandinavia, Baltics, Poland, Czechia"},
  {id:"us_warm",frost:{last:"03-25",first:"11-10"},name:"Southern & Western US",emoji:"☀️",desc:"Long warm summers, mild winters (USDA 7-10)",examples:"CA, TX, FL, AZ, GA, NC, TN"},
  {id:"us_cold",frost:{last:"05-01",first:"10-05"},name:"Northern US & Canada",emoji:"🏔️",desc:"Harsh winters, warm short summers (USDA 3-6)",examples:"NY, MA, IL, MI, MN, CO, mid-Atlantic, most of Canada"},
];
export const REGION_MAP = new Map(REGIONS.map(r => [r.id, r]));
