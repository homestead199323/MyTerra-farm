/* REGIONAL OVERRIDES — LDB_RO (livestock month-by-month calendars).
   Layered on top of the Western Europe base in livestock-calendar.js; read through
   getRegionalCalendar() in lib/regional-detail.js. Split from regional-overrides.js 2026-11-14. */

export const LDB_RO = {
  mediterranean: {
    Goat: {
      Jan: "KIDDING SEASON begins. Warmer Med winters bring earlier kidding. Supplies ready: towels, iodine, molasses water.",
      Feb: "Kidding continues. Colostrum within 1hr. Disbud kids at 3-7 days. Mild winters help newborn survival.",
      Mar: "Kids weaning at 8-12wk. Pasture quality already excellent. Reduce grain for does.",
      Apr: "Full pasture early. Hoof trim. Fecal egg count.",
      Jun: "Heat onset (>32°C common). Shade mandatory. Fly management critical.",
      Jul: "Extreme heat (>38°C possible). Parasites peak. FAMACHA scoring. Reduce midday handling.",
      Aug: "Continue heat + parasite management. Breeding prep: check body condition.",
      Sep: "BREEDING SEASON. Buck introduced (some Med farms breed Aug for January kids).",
      Nov: "Remove buck. Dry off does 8 weeks before kidding. Fecal egg count. Hoof trim.",
      Dec: "Late pregnancy — kidding next month. Increase feed. Mild Med winter — minimal shelter needed. Copper bolus if deficient area.",
    },
    Chicken: {
      Jun: "Peak laying. Watch for heat stress (>35°C): shade, cold water, electrolytes.",
      Jul: "Heat management critical. Collect eggs 2x daily (heat spoils). Parasites peak.",
      Dec: "Shortest days = lowest laying. Mild Med winter — minimal additional shelter.",
    },
    Bee: {
      Feb: "Early spring activity. First inspections possible when >15°C. Queen laying increases.",
      Aug: "HARVEST HONEY. Leave 15kg minimum for mild Med winter. Remove supers.",
      Nov: "Minimal winterization needed in coastal Med zones.",
    },
    Sheep: {
      Feb: "LAMBING begins. Mild Med winters allow Feb lambing. Supplies ready: towels, iodine.",
      Dec: "Feed hay if snow/poor pasture. Body condition score — should be 3-3.5/5.",
    },
  },
  northern_europe: {
    Goat: {
      Jan: "Late pregnancy. Heavy winter feeding. Selenium critical (deficient soils across N.Europe).",
      Feb: "Pre-kidding prep. Cold winter still — heat lamp ready, deep straw bedding.",
      Mar: "Late winter in colder zones. Pre-kidding feeding intense. Snow shelter critical.",
      Apr: "KIDDING SEASON begins. Heat lamp essential — barns can be near-freezing at night.",
      May: "Kidding continues. Spring grass finally arriving — restrict to prevent founder.",
      Jun: "Full pasture starts. Hoof trim. Fecal egg count.",
      Sep: "BREEDING SEASON. Buck in earlier than US-Cold to ensure kids born before deepest spring cold.",
      Dec: "Early pregnancy. Severe winter — shelter at -15°C critical. Heavy feeding.",
    },
    Bee: {
      Mar: "Late winter still. Wait for sustained >15°C before first inspection.",
      Apr: "First spring inspection when weather permits. Check queen, brood, stores.",
      Aug: "HARVEST HONEY. Leave 20-22kg minimum for long, cold northern winter.",
      Nov: "Winterization essential. Wrap hives, reduce entrances, ensure ventilation.",
    },
  },
  us_warm: {
    Goat: {
      Jan: "KIDDING SEASON begins. Mild winters allow Jan-Feb kidding. Supplies ready.",
      Feb: "Kidding continues. Colostrum within 1hr. Disbud kids at 3-7 days.",
      Mar: "Kids weaning at 8-12wk. Reduce grain for does. Pasture green-up underway.",
      Apr: "Full pasture. Hoof trim. Fecal egg count.",
      Jun: "Heat onset. Shade and water mandatory. Watch barberpole worm — humid heat amplifies it.",
      Jul: "Extreme heat (>38°C in TX/SW). Parasites at peak — FAMACHA every 2wk.",
      Aug: "Continue heat + parasite management. Check body condition before breeding.",
      Sep: "BREEDING SEASON. Buck in.",
      Nov: "Remove buck. Dry off does 8 weeks before kidding. Fecal egg count. Hoof trim.",
      Dec: "Late pregnancy — kidding next month. Increase grain. Selenium/vitamin E 1 month before kidding. Kidding supplies ready.",
    },
    Bee: {
      Feb: "Early nectar flows begin in warmer zones. Check stores and brood.",
      Aug: "HARVEST HONEY. Leave 15-18kg for mild southern winter. Hurricane prep if coastal.",
    },
  },
  us_cold: {
    Goat: {
      Jan: "Late pregnancy. Heavy winter feeding. Heated water bowls. Selenium supplement (deficient region).",
      Feb: "Pre-kidding prep. Heat lamp ready. Deep straw, draught-free shelter (-20°C nights).",
      Mar: "Late winter still. Pre-kidding nutrition intense. Mud season approaching.",
      Apr: "KIDDING SEASON begins. Heat lamps essential. Mud + cold = pneumonia risk for kids.",
      May: "Kidding finishes. Spring grass arriving — restrict to prevent founder.",
      Jun: "Full pasture begins. Hoof trim. Fecal egg count.",
      Sep: "BREEDING SEASON. Buck in slightly later than N.Europe (less photoperiod stress).",
      Dec: "Early pregnancy. Severe winter (-25°C+). Heated water, deep bedding, draught-free shelter mandatory.",
    },
    Bee: {
      Apr: "Late winter. Wait for sustained warmth before first inspection.",
      Aug: "HARVEST HONEY. Leave 20-22kg for severe northern winter. Winterization prep.",
      Oct: "Essential winterization. Wrap hives, mouse guards, ensure ventilation but not drafts.",
    },
  },
};
