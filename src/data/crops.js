/* CROPS database + lookup map + color palette. Phase A Commit 3, 2026-05-07 */

export const CROPS = [
  { name:"Tomato",pH:"6.0-7.0",fert:"NPK 5-10-10 at transplant. Side-dress 10-10-10 at 3wk. Switch to high-K liquid tomato feed weekly once trusses set.",emoji:"🍅",cat:"Vegetable",days:95,sowIn:"Feb-Apr",harvest:"Jul-Oct",spacing:50,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Consistent moisture. Greenhouse or polytunnel gives best results — ventilate well. Avoid wetting leaves: late blight is the #1 killer in wet summers.",color:"#e74c3c",yld:2,
    pests:[{n:"Tuta absoluta (tomato leaf miner)",t:"Tuta absoluta: pheromone traps, Bacillus thuringiensis (Bt) spray, remove infested leaves, netting"},{n:"Glasshouse whitefly (Trialeurodes vaporariorum)",t:"Whitefly: yellow sticky traps, neem oil 5ml/L, introduce Encarsia formosa parasitic wasp"},{n:"Aphids",t:"Aphids: soap spray (5ml dish soap per L water), ladybugs, nasturtium trap crop"},{n:"Late blight (Phytophthora)",t:"Late blight: copper hydroxide spray preventive every 10-14d in wet weather, never overhead water"},{n:"Blossom end rot (calcium deficiency)",t:"BER: caused by uneven watering, not a lack of calcium in the soil. Keep the compost evenly moist (twice a day in pots and growbags in hot spells). Eggshells and calcium sprays don't fix it"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍅"],
    steps:[{d:-14,l:"Prepare soil",t:"Compost 5-8cm, pH 6-7, 30cm deep. Add calcium."},{d:0,l:"Transplant",t:"Bury 2/3 of stem after last frost (late May). 2L water. Stake immediately."},{d:7,l:"Mulch",t:"Straw 5-8cm. Water at base only."},{d:14,l:"First feed",t:"Balanced fertiliser or compost tea."},{d:21,l:"Prune suckers",t:"Cordon types: remove side shoots. Tie to stakes."},{d:35,l:"K feed",t:"High-potassium liquid feed weekly."},{d:45,l:"Pest & blight check",t:"Aphids, whitefly. Copper spray preventive every 10-14d in wet weather."},{d:55,l:"Reduce water",t:"Fruit colouring — slightly less water concentrates flavour."},{d:70,l:"Harvest begins",t:"Pick coloured but firm. Never refrigerate."},{d:85,l:"Season end",t:"Pull plants before first frost. Rotate: no nightshades 3 yrs."}],
    storage:"Room temp 3-5d. Can 12mo+. Oven/dehydrator dry 6mo+. Freeze blanched 8mo."
  },
  { name:"Pepper (Sweet)",pH:"6.0-7.0",fert:"NPK 10-10-10 at transplant. High-K (0-0-50 potassium sulfate) when fruit sets. Compost tea biweekly.",emoji:"🫑",cat:"Vegetable",days:95,sowIn:"Feb-Apr",harvest:"Aug-Oct",spacing:45,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Greenhouse or very warm sheltered wall. Consistent moisture once flowering.",color:"#27ae60",yld:0.6,
    pests:[{n:"Aphids",t:"Aphids: soap spray, beneficial insects"},{n:"Red spider mite (under glass)",t:"Red spider mite: mist to raise humidity, ventilate, predatory mite Phytoseiulus persimilis"},{n:"Powdery mildew",t:"Powdery mildew: milk spray (1:9), good spacing, morning watering"},{n:"Bacterial spot",t:"Bacterial spot: copper spray, remove infected leaves, rotate 3yr"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🫑"],
    steps:[{d:0,l:"Transplant",t:"Warm soil 18°C+. 40-50cm apart."},{d:14,l:"Feed",t:"Balanced fertilizer. Mulch."},{d:30,l:"Stake",t:"Support heavy plants."},{d:50,l:"K feed",t:"High-potassium at fruit set."},{d:70,l:"Harvest",t:"Cut with scissors. Green=mild, colored=sweet."}],
    storage:"Fresh 2 weeks fridge. Roast+freeze 12mo. Pickle. Dry for paprika."
  },
  { name:"Potato",pH:"5.5-6.5",fert:"NPK 10-20-20 at planting. Side-dress 0-0-50 potassium at hilling. Avoid fresh manure (causes scab).",emoji:"🥔",cat:"Vegetable",days:100,sowIn:"Mar-May",harvest:"Jun-Oct",spacing:33,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"First earlies from March. Earth up regularly. Water during tuber swell.",color:"#d4a017",yld:0.7,
    pests:[{n:"Late blight (Phytophthora — #1 threat)",t:"Late blight: copper spray preventive, destroy infected plants, resistant varieties (Kennebec, Sarpo)"},{n:"Colorado beetle (continental Europe)",t:"Colorado beetle: hand-pick adults and orange egg masses, rotate. Not established in the UK or Ireland — it is a notifiable pest there, so report any sighting to the plant health authority (APHA in Britain)"},{n:"Wireworm",t:"Wireworm: trap with buried potato halves on sticks, rotate, avoid planting after grass"},{n:"Scab",t:"Scab: keep pH below 6.0, avoid lime, consistent watering, resistant varieties"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🥔"],
    steps:[{d:-7,l:"Chit",t:"Sprout 1-2cm in light, cool spot."},{d:0,l:"Plant",t:"Trench 10-15cm, 30cm apart, sprouts up."},{d:14,l:"Hill soil",t:"Mound around stems when 15cm tall."},{d:28,l:"Hill again",t:"Potassium feed. Keep hilling."},{d:42,l:"Flowering",t:"Critical water period."},{d:80,l:"Foliage dies",t:"Stop water. Wait 2 weeks."},{d:100,l:"Dig",t:"Fork carefully. Cure 2 weeks dark/cool."}],
    storage:"4-6 months at 4-7°C in the dark."
  },
  { name:"Onion",pH:"6.0-7.0",fert:"NPK 10-10-10 early. Switch to high-K at bulbing. Stop nitrogen 4wk before harvest.",emoji:"🧅",cat:"Vegetable",days:110,sowIn:"Feb-Mar, Sep",harvest:"Jul-Sep",spacing:12,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Sets in spring or overwintering varieties. Stop watering when tops fall.",color:"#d4a017",yld:0.1,
    pests:[{n:"Onion fly (Delia antiqua)",t:"Onion fly: companion plant with carrot (confuses both pests), fleece cover, rotate"},{n:"Downy mildew",t:"Downy mildew: copper spray, good spacing, avoid overhead watering"},{n:"White rot",t:"White rot: no cure — rotate 8+ years, never compost infected bulbs"},{n:"Thrips",t:"Thrips: blue sticky traps, neem oil, spinosad"}],
    stages:["🟤","🌱","🌿","🌿","🧅","🧅"],
    steps:[{d:0,l:"Plant sets",t:"Tips showing, 10-15cm apart."},{d:21,l:"Nitrogen feed",t:"Keep weed-free."},{d:60,l:"Bulb swelling",t:"Switch to K. Consistent water."},{d:90,l:"Tops fall",t:"Stop water."},{d:110,l:"Cure",t:"Sun 2-3d, then airy spot 2-3 weeks."}],
    storage:"Cured 3-6 months mesh bags."
  },
  { name:"Garlic",pH:"6.0-7.5",fert:"NPK 10-10-10 in early spring. No nitrogen after April. Potassium at scape stage.",emoji:"🧄",cat:"Vegetable",days:240,sowIn:"Oct-Nov",harvest:"Jun-Jul",spacing:12,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Rainfall usually sufficient. Stop watering 2-3wk pre-harvest. Hardneck varieties best for cold winters and wet conditions.",color:"#f1c40f",yld:0.04,
    pests:[{n:"White rot",t:"White rot: rotate 8+ years, plant in new ground, never compost infected"},{n:"Rust",t:"Rust: improve airflow, copper spray, remove worst leaves"},{n:"Nematodes",t:"Nematodes: rotate with brassicas, marigold trap crop"}],
    stages:["🟤","🌱","🌿","🌿","🧄","🧄"],
    steps:[{d:0,l:"Plant cloves",t:"Pointed up, tip about 2.5cm below the surface. Hardneck varieties for cold winters."},{d:14,l:"Mulch 10cm",t:"Straw for winter protection."},{d:120,l:"Spring feed",t:"Nitrogen. Remove scapes when curled."},{d:200,l:"Stop water",t:"Lower leaves browning — withhold water if dry."},{d:240,l:"Harvest",t:"Dig when 5-6 leaves brown. Cure 3-4wk in airy shed."}],
    storage:"6-8 months cured. Plait or hang in cool dry place."
  },
  { name:"Cabbage",pH:"6.5-7.5",fert:"Heavy feeder. NPK 20-10-10 at transplant. Side-dress nitrogen at 3wk. Boron supplement (borax 1g/m²).",emoji:"🥬",cat:"Vegetable",days:90,sowIn:"Feb-Apr, Jul-Aug",harvest:"Jun-Nov",spacing:45,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Thrives in cool moist UK climate. Heavy feeder. Net against cabbage white butterfly.",color:"#76d7c4",yld:0.8,
    pests:[{n:"Cabbage white butterfly (Pieris rapae)",t:"Cabbage white: fine mesh netting (best solution), Bt spray, hand-pick caterpillars"},{n:"Slugs",t:"Slugs: beer traps, copper tape, evening patrol, ducks for slug control"},{n:"Aphids",t:"Aphids: soap spray, lacewings"},{n:"Club root",t:"Club root: raise pH above 7.0 with lime, rotate 7+ years, resistant varieties"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],
    steps:[{d:0,l:"Transplant",t:"40-50cm. Slug protection."},{d:14,l:"Heavy feed",t:"Nitrogen rich. Mulch."},{d:45,l:"Heading",t:"Consistent water. Net for butterflies."},{d:80,l:"Harvest",t:"Cut firm head. Leave stalk for mini-heads."}],
    storage:"2-3mo root cellar. Ferment as sauerkraut/kimchi: 12+mo."
  },
  { name:"Bean (Dry)",pH:"6.0-7.0",fert:"NO nitrogen (they fix their own). Potash/phosphate feed only if the soil is poor. Inoculate with rhizobia if first time growing beans in that soil.",emoji:"🫘",cat:"Vegetable",days:100,sowIn:"May-Jun",harvest:"Sep-Oct",spacing:18,sun:"Full",waterFreq:"Every 3 days",waterNote:"Sow when soil is warm (15°C+). French and runner beans both reliable.",color:"#27ae60",yld:0.03,
    pests:[{n:"Bean weevil (storage)",t:"Bean weevil: freeze dried beans 48hr before storage, seal in airtight containers"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Rust",t:"Rust: resistant varieties, good spacing, avoid overhead watering"},{n:"Anthracnose",t:"Anthracnose: don't work wet plants, rotate 3yr, clean seed"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🫘"],
    steps:[{d:0,l:"Direct sow",t:"3cm deep, soil 15°C+."},{d:14,l:"Emerge",t:"No N fertilizer needed."},{d:35,l:"Flowering",t:"Increase water."},{d:70,l:"Pods drying",t:"Reduce water."},{d:95,l:"Harvest dry",t:"Shell when crispy."}],
    storage:"Dried: 5+ YEARS sealed."
  },
  { name:"Zucchini",pH:"6.0-7.5",fert:"NPK 10-10-10 at planting. Compost side-dress at 3wk. Liquid feed every 2wk during fruiting.",emoji:"🥒",cat:"Vegetable",days:55,sowIn:"May-Jun",harvest:"Jul-Sep",spacing:75,sun:"Full",waterFreq:"Every 2 days",waterNote:"Sow after last frost. Very productive even in cool summers. Pick small.",color:"#2ecc71",yld:2,
    pests:[{n:"Powdery mildew",t:"Powdery mildew: milk spray 1:9, baking soda 5g/L, good airflow"},{n:"Slugs and snails (young plants)",t:"Slugs: protect transplants for the first 2-3 weeks — evening patrols, beer traps, plant out sturdy plants"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Blossom end rot",t:"BER: keep watering even — it comes from irregular moisture, not from a lack of calcium in the soil"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🥒"],
    steps:[{d:0,l:"Sow on mound",t:"2 seeds, 2cm deep."},{d:14,l:"Thin + mulch",t:"Keep strongest."},{d:30,l:"Feed",t:"Compost side-dress."},{d:40,l:"Harvest",t:"Pick at 15-20cm DAILY."}],
    storage:"Fresh 1wk. Grate+freeze. Dehydrate."
  },
  { name:"Carrot",pH:"6.0-6.8",fert:"Low nitrogen (causes forking). NPK 5-10-10 worked in before sowing. No fresh manure.",emoji:"🥕",cat:"Vegetable",days:75,sowIn:"Mar-Jun, Aug-Sep",harvest:"Jun-Oct",spacing:4,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Succession sow every 2-3 weeks. Maincrop stores well in clamp or sand.",color:"#e67e22",yld:0.025,
    pests:[{n:"Carrot fly (Psila rosae)",t:"Carrot fly: companion plant with onion, 60cm barrier around bed (fly flies low), fleece"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Nematodes",t:"Nematodes: rotate, marigold interplant"}],
    stages:["🟤","🌱","🌿","🌿","🥕","🥕"],
    steps:[{d:0,l:"Sow thin",t:"1cm deep, loose stone-free soil."},{d:14,l:"Germinate",t:"14-21 days. Keep moist."},{d:28,l:"Thin",t:"3-5cm. Evening."},{d:70,l:"Harvest",t:"Can leave in ground."}],
    storage:"Damp sand 4-6mo. Freeze blanched."
  },
  { name:"Spinach",pH:"6.5-7.5",fert:"Nitrogen-rich. NPK 20-10-10 or compost tea. Quick crop, light feeder overall.",emoji:"🥬",cat:"Vegetable",days:40,sowIn:"Mar-May, Aug-Oct",harvest:"Apr-Nov",spacing:12,sun:"Partial",waterFreq:"Every 2 days",waterNote:"Loves cool maritime climate. Less bolting than warmer regions. Succession sow.",color:"#196f3d",yld:0.06,
    pests:[{n:"Downy mildew",t:"Downy mildew: resistant varieties, spacing, morning watering"},{n:"Leaf miners",t:"Leaf miners: remove affected leaves, fleece cover"},{n:"Bolting (heat stress)",t:"Bolting: shade cloth in summer, succession sow, use heat-tolerant varieties (Bloomsdale)"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],
    steps:[{d:0,l:"Sow",t:"2cm deep, cool weather."},{d:14,l:"Thin",t:"12cm apart."},{d:30,l:"Harvest leaves",t:"Outer leaves at 8-10cm."},{d:40,l:"Full cut",t:"Before bolting."}],
    storage:"Blanch+freeze."
  },
  { name:"Cucumber",pH:"6.0-7.0",fert:"NPK 10-10-10 at transplant. Liquid feed weekly during fruiting. Heavy feeder.",emoji:"🥒",cat:"Vegetable",days:60,sowIn:"May-Jun",harvest:"Jul-Sep",spacing:35,sun:"Full",waterFreq:"Daily",waterNote:"Greenhouse varieties best. Outdoor ridge types in sheltered sunny spots.",color:"#27ae60",yld:1.5,
    pests:[{n:"Powdery mildew",t:"Powdery mildew: milk spray, airflow, resistant varieties"},{n:"Downy mildew",t:"Downy mildew: copper spray, avoid wet leaves"},{n:"Glasshouse whitefly",t:"Whitefly: yellow sticky traps, Encarsia formosa parasitic wasp under glass"},{n:"Spider mites",t:"Spider mites: spray underside of leaves with water, neem oil"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🥒"],
    steps:[{d:0,l:"Sow",t:"Warm soil 18°C+. Trellis."},{d:14,l:"Train",t:"Guide vines."},{d:35,l:"Pick",t:"Regular picking=more fruit."},{d:50,l:"Peak",t:"Daily harvest."}],
    storage:"Pickle 12+mo."
  },
  { name:"Lettuce",pH:"6.0-7.0",fert:"Light feeder. Compost at planting sufficient. Liquid feed if yellowing.",emoji:"🥬",cat:"Vegetable",days:45,sowIn:"Mar-Sep",harvest:"May-Oct",spacing:25,sun:"Partial",waterFreq:"Every 1-2 days",waterNote:"Perfect crop for UK climate. Less bolting risk. Succession sow every 2-3 weeks.",color:"#82e0aa",yld:0.2,
    pests:[{n:"Aphids",t:"Aphids: soap spray, lacewings"},{n:"Slugs",t:"Slugs: beer traps, copper, evening patrol"},{n:"Bolting",t:"Bolting: shade cloth, succession sow every 2-3wk, heat-tolerant varieties (Romaine, Oak Leaf)"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],
    steps:[{d:0,l:"Sow",t:"20-25cm apart."},{d:10,l:"Thin",t:"Use thinnings."},{d:30,l:"Harvest",t:"Outer leaves."},{d:45,l:"Full head",t:"Before bolting."}],
    storage:"Fresh 5-7 days only."
  },
  { name:"Pumpkin",pH:"6.0-7.5",fert:"Very heavy feeder. Compost-rich mound at planting. NPK 10-10-10 every 2wk. High-K at fruit set.",emoji:"🎃",cat:"Vegetable",days:110,sowIn:"May-Jun",harvest:"Sep-Oct",spacing:120,sun:"Full",waterFreq:"Every 3 days",waterNote:"Start indoors May, plant out after frost. Heavy feeder. Curing improves storage.",color:"#e67e22",yld:3,
    pests:[{n:"Powdery mildew",t:"Powdery mildew: inevitable late season — milk spray delays onset"},{n:"Slugs and snails (young plants)",t:"Slugs: protect transplants for the first 2-3 weeks — evening patrols, beer traps"},{n:"Cucumber mosaic virus",t:"Mosaic virus: mottled, stunted leaves — remove and bin infected plants, control aphids (they spread it), wash hands and tools"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🎃"],
    steps:[{d:0,l:"Sow",t:"Rich mound. Much space."},{d:21,l:"Running",t:"Guide vines. Feed 2-weekly."},{d:50,l:"Fruit set",t:"Limit 2-3 per vine."},{d:90,l:"Cure",t:"Hard skin, dry stem. Sun 1-2wk."}],
    storage:"3-6mo at 10-15°C."
  },
  { name:"Beetroot",pH:"6.5-7.5",fert:"Light feeder. Compost at planting. Avoid high nitrogen (causes leafy growth, small roots). Add boron (borax 1g/m²).",emoji:"🟣",cat:"Vegetable",days:65,sowIn:"Apr-Jul",harvest:"Jul-Nov",spacing:10,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Reliable crop. Bolt-resistant varieties for early sowing. Multi-sow blocks work well.",color:"#922b21",yld:0.1,
    pests:[{n:"Leaf miners",t:"Leaf miners: remove affected leaves"},{n:"Cercospora leaf spot",t:"Cercospora: rotate, remove debris, copper spray"}],
    stages:["🟤","🌱","🌿","🌿","🟣","🟣"],
    steps:[{d:0,l:"Soak+sow",t:"24hr soak. 2cm deep."},{d:14,l:"Thin",t:"Strongest per cluster."},{d:40,l:"Check size",t:"Golf-tennis ball."},{d:60,l:"Harvest",t:"Twist leaves. 2cm stem."}],
    storage:"Pickle, damp sand months."
  },
  { name:"Broad Bean",pH:"6.5-7.5",fert:"NO nitrogen. Fixes own. Add potassium at flowering. Likes lime.",emoji:"🫘",cat:"Vegetable",days:150,sowIn:"Oct-Nov, Feb-Mar",harvest:"May-Jul",spacing:18,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Classic UK crop. Autumn sowing overwinters well. Pinch tops at flowering against blackfly.",color:"#1e8449",yld:0.2,
    pests:[{n:"Black bean aphid",t:"Black aphid: pinch out growing tips when first pods form (aphid hotspot), soap spray"},{n:"Chocolate spot",t:"Chocolate spot: spacing, airflow, don't overhead water"},{n:"Weevils",t:"Weevils: cosmetic damage, tolerate"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🫘"],
    steps:[{d:0,l:"Sow",t:"5cm deep. Autumn sowing suits mild areas; sow Feb-Mar where winters are hard."},{d:21,l:"Overwinter",t:"Slow growth."},{d:120,l:"Spring",t:"Potassium. Pinch tops."},{d:150,l:"Harvest",t:"Plump green pods."}],
    storage:"Shell+freeze. Dry for years."
  },
  { name:"Leek",pH:"6.0-7.0",fert:"Nitrogen-rich. NPK 20-10-10 at transplant. Side-dress compost monthly.",emoji:"🟢",cat:"Vegetable",days:130,sowIn:"Feb-Apr",harvest:"Sep-Mar",spacing:18,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Excellent winter crop. Harvest right through frost. King of the allotment.",color:"#28b463",yld:0.2,
    pests:[{n:"Leek moth",t:"Leek moth: fine mesh netting, Bt spray"},{n:"Rust",t:"Rust: remove worst leaves, spacing"},{n:"Allium leaf miner",t:"Allium leaf miner: fleece cover Oct-Nov and Mar-Apr"}],
    stages:["🟤","🌱","🌿","🌿","🟢","🟢"],
    steps:[{d:0,l:"Transplant deep",t:"15cm holes with dibber."},{d:30,l:"Hill",t:"Soil around stems."},{d:60,l:"Feed",t:"Compost."},{d:120,l:"Harvest",t:"Dig at 2-3cm dia."}],
    storage:"Leave in ground=living storage."
  },

// FRUITS
  { name:"Olive",pH:"7.0-8.5",fert:"Container: balanced NPK 10-10-10 monthly Apr-Sep. Foliar boron at flowering if any. Young trees: half-strength.",emoji:"🫒",cat:"Fruit Tree",days:365,sowIn:"Mar-May",harvest:"Oct-Nov",spacing:300,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Greenhouse, polytunnel or south-facing wall essential. Container-grown — water weekly Apr-Sep, sparingly Oct-Mar. Marginal outdoors except sheltered SW England, S Wales, S Ireland.",color:"#566573",yld:2,
    pests:[{n:"Olive fly (Bactrocera oleae — #1 threat)",t:"Olive fly: kaolin clay spray (Surround), mass trapping with McPhail traps, early harvest"},{n:"Olive moth",t:"Olive moth: Bt spray at egg hatch"},{n:"Scale insects",t:"Scale: horticultural oil winter spray"},{n:"Peacock spot",t:"Peacock spot: copper spray autumn and spring"}],
    stages:["🌳","🌳","🌳","🌳","🫒","🫒"],
    steps:[{d:0,l:"Plant",t:"Large container or against south-facing wall. Free-draining gritty mix."},{d:30,l:"Establish",t:"Water weekly first 2 years. Move under cover Nov-Mar in cold areas."}],
    storage:"Oil 2yr. Brine 12+mo."
  },
  { name:"Grape",pH:"6.0-7.5",fert:"NPK 10-10-10 in early spring. Potassium at veraison (color change). Avoid excess nitrogen (promotes disease).",emoji:"🍇",cat:"Fruit",days:365,sowIn:"Dec-Mar",harvest:"Aug-Oct",spacing:250,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Wine grapes possible in SE England, Belgium. Table grapes need wall or greenhouse.",color:"#6c3483",yld:3,
    pests:[{n:"Downy mildew",t:"Downy mildew: copper spray (Bordeaux mixture) preventive every 10-14d in wet spring"},{n:"Powdery mildew (Oidium)",t:"Oidium: sulfur spray, good airflow, leaf removal around clusters"},{n:"Grape moth",t:"Grape moth: pheromone traps, Bt"},{n:"Botrytis",t:"Botrytis: remove affected clusters, airflow, reduce humidity"}],
    stages:["🌿","🌿","🌿","🍃","🌸","🍇"],
    steps:[{d:0,l:"Plant cutting",t:"Strong trellis."},{d:30,l:"Train",t:"Main trunk year 1."}],
    storage:"Wine, juice, raisins."
  },
  { name:"Fig",pH:"6.0-8.0",fert:"Light feeder. Compost in spring. Excess nitrogen reduces fruiting.",emoji:"🤎",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Aug-Sep",spacing:500,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Fan-train against south-facing wall. Hardy varieties (Brown Turkey, Brunswick). Restrict root run for fruiting. Water during fruit swell.",color:"#784212",yld:3,
    pests:[{n:"Fig rust",t:"Fig rust: rake up fallen leaves, copper spray at bud break and after harvest"},{n:"Birds",t:"Birds: net when fruit begins to soften — main cause of lost crops"},{n:"Coral spot",t:"Coral spot: prune out dead wood promptly, seal large cuts, improve airflow"}],
    stages:["🌳","🌳","🌳","🌳","🤎","🤎"],
    steps:[{d:0,l:"Plant",t:"South wall. Sandy soil."},{d:30,l:"Establish",t:"Light pruning."}],
    storage:"Fresh days. Oven/dehydrator dry months. Jam."
  },
  { name:"Pomegranate",pH:"6.0-8.0",fert:"Container: balanced NPK 10-10-10 monthly Apr-Sep. Light feeder.",emoji:"🔴",cat:"Fruit Tree",days:365,sowIn:"Mar-May",harvest:"Sep-Nov",spacing:250,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Container-grown in conservatory or polytunnel. Marginal outdoors. Move under cover Nov-Mar.",color:"#c0392b",yld:1,
    pests:[{n:"Fruit fly",t:"Fruit fly: bag individual fruits, trapping"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Fruit cracking (from irregular watering)",t:"Cracking: consistent watering, harvest promptly"}],
    stages:["🌳","🌳","🌳","🌳","🌸","🔴"],
    steps:[{d:0,l:"Plant",t:"Full sun, any soil."},{d:30,l:"Establish",t:"Remove suckers."}],
    storage:"Whole 2-3mo. Molasses."
  },

// HERBS
  { name:"Basil",pH:"6.0-7.0",fert:"Light feeder. Compost at planting. Pinch flowers to prolong leaf production.",emoji:"🌿",cat:"Herb",days:35,sowIn:"May-Jun",harvest:"Jul-Sep",spacing:22,sun:"Full",waterFreq:"Every 1-2 days",waterNote:"Greenhouse or windowsill in most of region. Too cool for outdoor in average summers.",color:"#27ae60",yld:0.1,
    pests:[{n:"Fusarium wilt",t:"Fusarium: rotate, resistant varieties"},{n:"Downy mildew",t:"Downy mildew: spacing, morning water"},{n:"Aphids",t:"Aphids: soap spray"}],
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Plant",t:"After frost."},{d:14,l:"Pinch",t:"Remove tips+flowers."},{d:25,l:"Harvest",t:"Above leaf node."}],
    storage:"Pesto+freeze."
  },
  { name:"Oregano",pH:"6.0-8.0",fert:"NONE. Poor rocky soil = MORE flavor. Fertile soil makes weak-flavored plants.",emoji:"🌿",cat:"Herb",days:50,sowIn:"Apr-May",harvest:"Jun-Sep",spacing:28,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Hardy perennial once established. Free-draining soil essential.",color:"#1e8449",yld:0.1,
    pests:[{n:"Virtually pest-free",t:"Rarely needed"}],
    stages:["🟤","🌱","🌿","🌿","🌸","🌿"],
    steps:[{d:0,l:"Plant",t:"Poor rocky soil fine."},{d:30,l:"Harvest",t:"Cut at bud stage."}],
    storage:"Dry 1-2yr."
  },
  { name:"Rosemary",pH:"6.0-8.0",fert:"NONE. Hates rich soil. Well-drained, poor, alkaline soil ideal.",emoji:"🌿",cat:"Herb",days:90,sowIn:"Apr-May",harvest:"Year-round",spacing:75,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Hardy in mild areas. Protect from wet winters. Free-draining soil essential.",color:"#2874a6",yld:0.2,
    pests:[{n:"Root rot (from overwatering — main killer)",t:"Root rot: improve drainage, never overwater, raised bed"}],
    stages:["🌱","🌿","🌿","🌿","🌸","🌿"],
    steps:[{d:0,l:"Plant cutting",t:"Well-drained, full sun."},{d:60,l:"Established",t:"Prune to shape."}],
    storage:"Evergreen year-round."
  },
  { name:"Sage",pH:"6.0-8.0",fert:"NONE. Poor alkaline soil best.",emoji:"🌿",cat:"Herb",days:60,sowIn:"Apr-May",harvest:"Year-round",spacing:50,sun:"Full",waterFreq:"Every 7 days",waterNote:"Hardy. Good drainage essential. Protect from waterlogging in winter.",color:"#7dcea0",yld:0.15,
    pests:[{n:"Virtually pest-free",t:"Rarely needed"}],
    stages:["🌱","🌿","🌿","🌿","🌸","🌿"],
    steps:[{d:0,l:"Plant",t:"Alkaline soil."},{d:45,l:"Light harvest",t:"Max 1/3 first year."}],
    storage:"Dry 1-2yr."
  },
  { name:"Mint",pH:"6.0-7.0",fert:"Compost in spring. Moderate feeder. Rich moist soil.",emoji:"🌿",cat:"Herb",days:20,sowIn:"Mar-May",harvest:"Apr-Oct",spacing:35,sun:"Partial",waterFreq:"Every 2-3 days",waterNote:"Thrives in damp UK climate. ALWAYS in pots — very invasive.",color:"#17a589",yld:0.3,
    pests:[{n:"Rust",t:"Rust: cut back and destroy affected growth, replant in new spot"},{n:"Mint beetle",t:"Beetle: hand-pick"}],
    stages:["🌱","🌿","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Pot only!",t:"Rich moist soil."},{d:14,l:"Harvest",t:"Cut stems freely."}],
    storage:"Dry for tea."
  },
  { name:"Lavender",pH:"6.5-8.0",fert:"NONE. Thrives in poor, alkaline, free-draining soil. Feeding produces soft leggy growth and fewer flowers.",emoji:"💜",cat:"Herb",days:90,sowIn:"Mar-Apr",harvest:"Jul-Aug",spacing:40,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"English lavender hardiest. Must have free-draining soil. Hates wet winter feet.",color:"#8e44ad",yld:0.1,
    pests:[{n:"Root rot (overwatering)",t:"Root rot: drainage, never overwater"},{n:"Lavender shab (Phomopsis)",t:"Shab: remove affected branches, airflow"}],
    stages:["🌱","🌿","🌿","🌿","💜","💜"],
    steps:[{d:0,l:"Plant",t:"Fast-draining soil."},{d:60,l:"Harvest flowers",t:"Lower flowers open."}],
    storage:"Dry in bunches."
  },
  { name:"Wheat",pH:"6.0-7.5",fert:"NPK 20-10-10 at sowing. Side-dress nitrogen in early spring if weak.",emoji:"🌾",cat:"Grain",days:270,sowIn:"Oct-Nov",harvest:"Aug",spacing:3,sun:"Full",waterFreq:"Weekly",waterNote:"Winter wheat thrives in maritime climate. Combine in August.",color:"#d4a017",yld:0.002,
    pests:[{n:"Rust",t:"Rust: resistant varieties, fungicide if severe"},{n:"Fusarium head blight",t:"Fusarium: rotate, avoid planting after corn"},{n:"Aphids",t:"Aphids: generally tolerated in grain crops"}],
    stages:["🟤","🌱","🌿","🌾","🌾","🌾"],
    steps:[{d:0,l:"Broadcast",t:"About 20g of seed per sqm (15-25g). Rake in."},{d:120,l:"Spring",t:"N if weak."},{d:180,l:"Heading",t:"No water."},{d:210,l:"Harvest",t:"Thresh. Winnow."}],
    storage:"Whole berries: 30+ YEARS."
  },

// ── NEW VEGETABLES ──
  { name:"Pepper (Hot)",pH:"6.0-7.0",fert:"Low nitrogen. NPK 5-10-10. More K at flowering. Stress (dry) = hotter fruit.",emoji:"🌶️",cat:"Vegetable",days:100,sowIn:"Feb-Apr",harvest:"Aug-Oct",spacing:40,sun:"Full",waterFreq:"Every 3 days",waterNote:"Greenhouse essential. Start very early indoors. Smaller pods, concentrated heat.",color:"#e74c3c",yld:0.3,
    pests:[{n:"Same as sweet pepper",t:"Same as sweet pepper"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🌶️"],
    steps:[{d:0,l:"Transplant",t:"Warm soil 20°C+. 35-45cm apart."},{d:21,l:"Feed",t:"Low nitrogen. Potassium at flowering."},{d:60,l:"Harvest",t:"Pick at any stage. Riper = hotter."}],
    storage:"Dry strings 1yr+. Smoke. Pickle. Freeze."
  },
  { name:"Eggplant",pH:"6.0-7.0",fert:"NPK 10-10-10 at transplant. Compost tea biweekly. High-K at fruit set.",emoji:"🍆",cat:"Vegetable",days:90,sowIn:"Feb-Apr",harvest:"Aug-Sep",spacing:55,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Greenhouse only. Needs sustained heat. Start early indoors.",color:"#8e44ad",yld:1,
    pests:[{n:"Aphids",t:"Aphids: soap spray, check shoot tips and leaf undersides"},{n:"Glasshouse whitefly",t:"Whitefly: yellow sticky traps, Encarsia formosa parasitic wasp"},{n:"Spider mites",t:"Spider mites: mist undersides, neem"},{n:"Verticillium wilt",t:"Verticillium: rotate 4yr, resistant rootstocks, solarize soil"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍆"],
    steps:[{d:0,l:"Transplant",t:"Soil 20°C+. 50-60cm apart. Stake."},{d:14,l:"Mulch+feed",t:"Compost tea. Thick mulch."},{d:45,l:"Support",t:"Stake heavy fruit."},{d:65,l:"Harvest",t:"Glossy skin = ready. Dull = overripe."}],
    storage:"Fresh 3-5 days. Grill+freeze. Preserve in oil."
  },
  { name:"Watermelon",pH:"6.0-7.0",fert:"NPK 10-10-10 at planting. High-K at fruit set. Stop nitrogen after fruit forms.",emoji:"🍉",cat:"Vegetable",days:90,sowIn:"May-Jun",harvest:"Aug-Sep",spacing:100,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Greenhouse or polytunnel essential. Small/icebox varieties work best. Heavy water during fruit swell.",color:"#27ae60",yld:2.5,
    pests:[{n:"Fusarium wilt",t:"Fusarium: rotate 5+ years, resistant varieties, grafted seedlings"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Powdery mildew",t:"Powdery mildew: milk spray"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍉"],
    steps:[{d:0,l:"Sow",t:"Warm soil 21°C+. Mound planting."},{d:21,l:"Train",t:"Guide vines. Feed."},{d:50,l:"Fruit",t:"Board under fruit. Reduce water."},{d:75,l:"Ripeness",t:"Thump=hollow. Yellow belly."}],
    storage:"Whole 2-3wk. Pickle rind."
  },
  { name:"Melon",pH:"6.0-7.0",fert:"Same as watermelon. Reduce water near harvest for sweetness.",emoji:"🍈",cat:"Vegetable",days:90,sowIn:"May-Jun",harvest:"Aug-Sep",spacing:60,sun:"Full",waterFreq:"Every 2 days",waterNote:"Greenhouse essential. Charentais types do best. Hand-pollinate if needed.",color:"#f39c12",yld:1.5,
    pests:[{n:"Fusarium wilt",t:"Fusarium: rotate 5+ years, resistant/grafted seedlings, avoid waterlogging"},{n:"Powdery mildew",t:"Powdery mildew: milk spray 1:9, good airflow, resistant varieties, ventilate greenhouse"},{n:"Aphids",t:"Aphids: soap spray, remove infected plants fast — they spread cucumber mosaic virus"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍈"],
    steps:[{d:0,l:"Sow",t:"Warm soil. Black plastic mulch."},{d:21,l:"Train",t:"Guide vines. Hand-pollinate."},{d:60,l:"Ripen",t:"Slips from vine when ready."}],
    storage:"Fresh 1-2wk."
  },
  { name:"Corn",pH:"6.0-7.0",fert:"Very heavy nitrogen feeder. NPK 30-10-10 at planting. Side-dress nitrogen at knee-high. Again at tasseling.",emoji:"🌽",cat:"Vegetable",days:90,sowIn:"May-Jun",harvest:"Aug-Sep",spacing:28,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Choose early-maturing varieties. Start indoors. Plant in blocks for pollination. Needs warm sheltered spot.",color:"#f1c40f",yld:0.2,
    pests:[{n:"Birds, mice and badgers",t:"Birds and mice take seed and seedlings — start in modules and net young plants. Badgers and squirrels strip ripe cobs — sturdy fencing or netting"},{n:"Frit fly",t:"Frit fly: start under cover and plant out at the 5-6 leaf stage, or fleece direct sowings until then"},{n:"European corn borer (continental Europe)",t:"Corn borer: Bt, crop rotation, destroy stalks after harvest"},{n:"Smut",t:"Smut: cut off and bin the grey swollen galls before they burst, rotate"}],
    stages:["🟤","🌱","🌿","🌿","🌽","🌽"],
    steps:[{d:0,l:"Sow blocks",t:"Not rows. 25-30cm. Soil 15°C+."},{d:14,l:"Thin",t:"One plant/station. Nitrogen."},{d:40,l:"Tasseling",t:"Don't let water stress."},{d:80,l:"Harvest",t:"Silk brown+dry. Twist+pull."}],
    storage:"Eat immediately. Blanch+freeze. Dry for flour."
  },
  { name:"Okra",pH:"6.0-7.0",fert:"NPK 10-10-10 at planting. Light feeder. Monthly compost tea.",emoji:"🟢",cat:"Vegetable",days:70,sowIn:"Apr-May",harvest:"Aug-Sep",spacing:38,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Greenhouse or polytunnel essential. Consistent moisture during pod set. Pick young.",color:"#27ae60",yld:0.25,
    pests:[{n:"Aphids",t:"Aphids: soap spray"},{n:"Whitefly",t:"Whitefly: yellow sticky traps"},{n:"Root-knot nematode",t:"Nematode: rotate, marigold interplant"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🟢"],
    steps:[{d:0,l:"Soak+sow",t:"24hr soak. 2cm deep. Soil 18°C+."},{d:21,l:"Thin",t:"30-45cm. Monthly feed."},{d:50,l:"Harvest",t:"5-8cm EVERY 2 DAYS. Gloves."}],
    storage:"Fresh 2-3 days. Freeze. Pickle. Dehydrate."
  },
  { name:"Radish",pH:"6.0-7.0",fert:"None needed. Too much nitrogen = all leaf. Compost at planting sufficient.",emoji:"🔴",cat:"Vegetable",days:28,sowIn:"Mar-Sep",harvest:"Apr-Oct",spacing:4,sun:"Full",waterFreq:"Every 2 days",waterNote:"Fast and reliable. Succession sow every 2 weeks. Perfect beginner crop.",color:"#e74c3c",yld:0.015,
    pests:[{n:"Flea beetle",t:"Flea beetle: fleece cover"},{n:"Root maggot",t:"Root maggot: rotate, fleece"}],
    stages:["🟤","🌱","🌿","🔴","🔴","🔴"],
    steps:[{d:0,l:"Sow",t:"1cm deep. Very easy."},{d:14,l:"Thin",t:"3-5cm apart."},{d:25,l:"Harvest",t:"Pull when marble-sized."}],
    storage:"Fresh 1-2wk. Pickle."
  },
  { name:"Turnip",pH:"6.0-7.0",fert:"Light feeder. Compost at planting sufficient.",emoji:"🟡",cat:"Vegetable",days:50,sowIn:"Mar-Aug",harvest:"Jun-Oct",spacing:12,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Cool weather crop. Bolt-resistant for spring. Maincrop stores well.",color:"#f1c40f",yld:0.1,
    pests:[{n:"Flea beetle",t:"Flea beetle: fleece"},{n:"Cabbage root fly",t:"Root fly: fleece, rotate"}],
    stages:["🟤","🌱","🌿","🌿","🟡","🟡"],
    steps:[{d:0,l:"Sow",t:"1cm deep, 10-15cm."},{d:14,l:"Thin",t:"12cm apart."},{d:45,l:"Harvest",t:"Tennis ball size."}],
    storage:"Root cellar 2-3 months."
  },
  { name:"Celery",pH:"6.0-7.0",fert:"Very heavy feeder. Rich soil with compost. Liquid feed (fish emulsion) weekly. Needs constant moisture.",emoji:"🟢",cat:"Vegetable",days:120,sowIn:"Mar-May",harvest:"Aug-Nov",spacing:25,sun:"Partial",waterFreq:"Daily",waterNote:"Heavy water requirement throughout. Self-blanching types easier in UK.",color:"#82e0aa",yld:0.3,
    pests:[{n:"Celery fly",t:"Celery fly: fleece, remove affected leaves"},{n:"Septoria leaf spot",t:"Septoria: copper spray, remove debris, rotate"},{n:"Slugs",t:"Slugs: beer traps"}],
    stages:["🟤","🌱","🌿","🟢","🟢","🟢"],
    steps:[{d:0,l:"Transplant",t:"Rich, moist soil."},{d:30,l:"Feed",t:"Heavy feeder. Liquid feed weekly."},{d:80,l:"Blanch",t:"Hill soil or wrap stems."},{d:120,l:"Harvest",t:"Cut at base."}],
    storage:"Fresh 2wk. Freeze for cooking."
  },
  { name:"Swiss Chard",pH:"6.0-7.5",fert:"Moderate feeder. NPK 10-10-10 at planting. Compost tea monthly.",emoji:"🌿",cat:"Vegetable",days:55,sowIn:"Mar-Jul",harvest:"May-Nov",spacing:20,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Reliable cut-and-come-again crop. Hardy through winter in mild areas.",color:"#e74c3c",yld:0.2,
    pests:[{n:"Leaf miners",t:"Leaf miners: remove affected leaves"},{n:"Slugs",t:"Slugs: beer traps, copper"}],
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Sow",t:"2cm deep, 20-30cm."},{d:14,l:"Thin",t:"Keep strongest."},{d:40,l:"Harvest",t:"Outer leaves. Continuous."}],
    storage:"Blanch+freeze."
  },
  { name:"Kale",pH:"6.0-7.5",fert:"NPK 10-10-10 at planting. Nitrogen side-dress at 3wk.",emoji:"🥬",cat:"Vegetable",days:60,sowIn:"Apr-Jul",harvest:"Sep-Mar",spacing:35,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Excellent winter crop. Frost improves flavour. Net against cabbage white.",color:"#196f3d",yld:0.5,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: netting, Bt spray"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Whitefly",t:"Whitefly: yellow sticky traps"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],
    steps:[{d:0,l:"Sow/transplant",t:"30-45cm apart."},{d:14,l:"Feed",t:"Nitrogen."},{d:45,l:"Harvest",t:"Pick outer leaves."}],
    storage:"Blanch+freeze. Dehydrate for chips."
  },
  { name:"Asparagus",pH:"6.5-7.5",fert:"Heavy compost annually. NPK 10-10-10 in early spring. Likes salt (tolerates brackish areas).",emoji:"🌿",cat:"Vegetable",days:730,sowIn:"Mar-Apr",harvest:"Apr-Jun",spacing:38,sun:"Full",waterFreq:"Every 3 days",waterNote:"Permanent bed for 15-20 years. Mulch heavily annually. Cut spears at soil level.",color:"#27ae60",yld:0.25,
    pests:[{n:"Asparagus beetle",t:"Asparagus beetle: hand-pick, encourage parasitic wasps"},{n:"Fusarium crown rot",t:"Fusarium: well-drained soil, resistant varieties (Jersey series)"}],
    stages:["🌱","🌱","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Plant crowns",t:"Trench 20cm. Don't harvest 2yr."},{d:730,l:"First harvest yr3",t:"Cut spears at 15-20cm for 6wk."}],
    storage:"Blanch+freeze. Pickle."
  },
  { name:"Pea",pH:"6.0-7.0",fert:"NO nitrogen (fixes own). Potash/phosphate feed only if the soil is poor. Inoculate seeds.",emoji:"🟢",cat:"Vegetable",days:75,sowIn:"Feb-Jun",harvest:"May-Aug",spacing:6,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Cool weather crop. Sow direct from Mar. Heavy water at flowering and pod set.",color:"#27ae60",yld:0.03,
    pests:[{n:"Pea moth",t:"Pea moth: early sowing avoids peak moth flight, fleece"},{n:"Powdery mildew",t:"Powdery mildew: resistant varieties, spacing"},{n:"Aphids",t:"Aphids: soap spray"}],
    stages:["🟤","🌱","🌿","🌿","🌸","🟢"],
    steps:[{d:0,l:"Sow",t:"3cm deep, 5-8cm apart. Support."},{d:21,l:"Train",t:"Guide up support."},{d:45,l:"Flower",t:"Increase water."},{d:60,l:"Pick",t:"Regular = more pods."}],
    storage:"Shell+freeze. Dry for split peas."
  },

// ── NEW FRUITS ──
  { name:"Strawberry",pH:"5.5-6.5",fert:"NPK 10-20-20 at planting. Liquid feed every 2wk during fruiting. Avoid excess nitrogen (soft fruit, disease).",emoji:"🍓",cat:"Fruit",days:120,sowIn:"Mar-Apr, Sep",harvest:"Jun-Sep",spacing:28,sun:"Full",waterFreq:"Every 1-2 days",waterNote:"Excellent in maritime climate. Mulch with straw against slugs and rot. Renew beds every 3 years.",color:"#e74c3c",yld:0.3,
    pests:[{n:"Botrytis (grey mold)",t:"Botrytis: straw mulch under fruit, spacing, remove affected fruit"},{n:"Slugs",t:"Slugs: straw mulch, copper tape, beer traps"},{n:"Spider mites",t:"Spider mites: mist foliage, neem"},{n:"Birds",t:"Birds: netting"}],
    stages:["🌱","🌱","🌿","🌸","🍓","🍓"],
    steps:[{d:0,l:"Plant runners",t:"Crown at soil level. 25-30cm."},{d:30,l:"Remove flowers",t:"First year: remove for stronger plants."},{d:90,l:"Mulch straw",t:"Under fruit to keep clean."}],
    storage:"Fresh 2-3 days. Freeze for 12 months. Make jam."
  },
  { name:"Raspberry",pH:"5.5-6.5",fert:"Compost mulch annually. NPK 10-10-10 in spring. Likes acidic soil.",emoji:"🫐",cat:"Fruit",days:365,sowIn:"Nov-Mar",harvest:"Jul-Oct",spacing:45,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Loves cool moist UK climate. Summer-fruiting and autumn-fruiting types extend season.",color:"#c0392b",yld:0.7,
    pests:[{n:"Raspberry beetle",t:"Raspberry beetle: shake onto white cloth in early morning"},{n:"Cane diseases",t:"Cane diseases: remove fruited canes after harvest, thin for airflow"},{n:"Birds",t:"Birds: netting essential"}],
    stages:["🌱","🌿","🌿","🌿","🫐","🫐"],
    steps:[{d:0,l:"Plant canes",t:"40-50cm. Support system."},{d:365,l:"Yr 2 harvest",t:"Everbearing: two crops."}],
    storage:"Freeze. Jam. Very perishable fresh."
  },
  { name:"Apple",pH:"6.0-7.0",fert:"Mulch 5cm of compost or well-rotted manure each spring. Usually needs no other feed. If cropping is poor, a general granular fertiliser in early spring.",emoji:"🍎",cat:"Fruit Tree",days:365,sowIn:"Nov-Mar",harvest:"Aug-Oct",spacing:400,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"The easiest tree fruit for this climate. Water new trees in dry spells for the first two years; established trees rarely need it. Most varieties need a different variety nearby that flowers at the same time.",color:"#c44536",yld:15,
    pests:[{n:"Codling moth (maggoty apples)",t:"Codling moth: pheromone traps from May, pick up and remove fallen fruit"},{n:"Apple scab",t:"Scab: rake up fallen leaves in autumn, prune for an open airy crown, choose resistant varieties"},{n:"Apple canker",t:"Canker: cut affected branches back to healthy wood. Worst on wet, heavy soil"},{n:"Fruit aphids",t:"Aphids: curl young leaves in spring. Encourage ladybirds and hoverflies, squash small colonies"},{n:"Brown rot",t:"Brown rot: remove rotting and mummified fruit from the tree and the ground"},{n:"Bitter pit",t:"Bitter pit: dark sunken spots from a calcium shortage in the fruit, usually after dry spells. Water in dry weather and mulch"}],
    stages:["🌳","🌳","🌳","🌸","🍎","🍎"],
    steps:[{d:0,l:"Plant",t:"Bare-root tree while dormant (Nov-Mar). Stake at planting. Rootstock sets the size: M9 or M26 for small gardens and pots, MM106 for a medium tree up to 4m."},{d:30,l:"Establish",t:"Water in dry spells for two years. Remove all fruitlets the first year so the tree builds roots. Free-standing trees: prune once a year in winter. Trained trees: prune in late summer."}],
    storage:"Early varieties: eat within days. Late varieties keep for months somewhere cool, dark and frost-free, in single layers and not touching. Cooked apple freezes well. Juice, cider, dried rings."
  },
  { name:"Pear",pH:"6.0-7.0",fert:"Mulch 5cm of compost or well-rotted manure each spring. Usually needs no other feed. If cropping is poor, a general granular fertiliser in early spring.",emoji:"🍐",cat:"Fruit Tree",days:365,sowIn:"Nov-Mar",harvest:"Aug-Oct",spacing:400,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Wants a warmer, more sheltered spot than apples: it flowers earlier, so a late frost can take the crop. Water new trees in dry spells for two years. Most varieties need a second pear variety nearby.",color:"#a8b545",yld:10,
    pests:[{n:"Pear rust",t:"Pear rust: bright orange leaf spots in summer. Mostly cosmetic; pick off badly hit leaves on small trees. Spreads from nearby junipers"},{n:"Pear midge",t:"Pear midge: fruitlets turn black and drop in late spring. Pick off and destroy blackened fruitlets before the grubs leave"},{n:"Pear blister mite",t:"Blister mite: yellow then brown blisters on leaves. Does not harm the crop; no treatment needed"},{n:"Pear scab",t:"Scab: rake up fallen leaves in autumn, prune out cracked scabby shoots in winter"},{n:"Brown rot",t:"Brown rot: remove rotting and mummified fruit from the tree and the ground"},{n:"Fireblight",t:"Fireblight: shoots look scorched after flowering. Cut out well below the damage into healthy wood and clean tools between cuts"}],
    stages:["🌳","🌳","🌳","🌸","🍐","🍐"],
    steps:[{d:0,l:"Plant",t:"Bare-root tree while dormant (Nov-Mar), in the warmest sheltered spot you have. Stake at planting. Quince A rootstock for a 3-4.5m tree; Quince C for small gardens and pots."},{d:30,l:"Establish",t:"Water in dry spells for two years. Cover blossom on small trees if frost is forecast. Free-standing trees: prune in winter. Thin a heavy crop in midsummer."}],
    storage:"Pick while still firm and ripen indoors: about a week for early varieties, months for late ones. Store cool and dark on slatted trays, not touching, and check often. Bottle in syrup or dry."
  },
  { name:"Peach",pH:"6.0-7.0",fert:"NPK 10-10-10 in early spring. Reduce nitrogen after fruit set.",emoji:"🍑",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Aug-Sep",spacing:450,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Fan-train against south wall. Cover during flowering against peach leaf curl. Water during fruit swell.",color:"#e67e22",yld:7,
    pests:[{n:"Peach leaf curl",t:"Peach leaf curl: copper spray in AUTUMN (after leaf fall) and LATE WINTER (before bud break) — must be preventive"},{n:"Brown rot",t:"Brown rot: remove mummified fruit, copper spray, thin fruit"},{n:"Oriental fruit moth",t:"Oriental fruit moth: pheromone traps"},{n:"Aphids",t:"Aphids: dormant oil spray winter"}],
    stages:["🌳","🌳","🌳","🌸","🍑","🍑"],
    steps:[{d:0,l:"Plant tree",t:"Open center pruning. Full sun."},{d:30,l:"Establish",t:"Water weekly first year."}],
    storage:"Fresh 1wk. Can. Jam. Dry."
  },
  { name:"Plum",pH:"6.0-7.5",fert:"NPK 10-10-10 in spring. Moderate feeder.",emoji:"🟣",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Aug-Sep",spacing:450,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Excellent UK fruit tree. Net against birds. Thin fruit for size.",color:"#6c3483",yld:12,
    pests:[{n:"Plum moth",t:"Plum moth: pheromone traps, pick up fallen fruit"},{n:"Brown rot",t:"Brown rot: remove mummified fruit, copper spray"},{n:"Silver leaf",t:"Silver leaf: prune ONLY in summer (Jun-Aug), never winter"}],
    stages:["🌳","🌳","🌳","🌸","🟣","🟣"],
    steps:[{d:0,l:"Plant",t:"European types best."},{d:30,l:"Establish",t:"Stake. Water."}],
    storage:"Dry as prunes (years). Jam. Brandy/Distilling."
  },
  { name:"Cherry",pH:"6.0-7.0",fert:"NPK 10-10-10 in early spring before bud break. Moderate feeder — avoid excess nitrogen (soft growth, less fruit).",emoji:"🍒",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Jun-Aug",spacing:500,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Net against birds (essential). Modern dwarfing rootstocks suit gardens. Sour cherries hardier.",color:"#c0392b",yld:8,
    pests:[{n:"Cherry fly",t:"Cherry fly: yellow sticky traps, early harvest"},{n:"Birds (main threat!)",t:"Birds: full netting is only reliable solution"},{n:"Brown rot",t:"Brown rot: remove mummies, copper spray"},{n:"Bacterial canker",t:"Bacterial canker: prune only in summer, copper spray autumn"}],
    stages:["🌳","🌳","🌳","🌸","🍒","🍒"],
    steps:[{d:0,l:"Plant",t:"Slightly cooler spots best."},{d:30,l:"Establish",t:"Net when fruiting."}],
    storage:"Fresh 1wk. Freeze. Dry. Preserve in syrup."
  },
  { name:"Apricot",pH:"6.0-7.5",fert:"NPK 10-10-10 in spring. Light feeder.",emoji:"🟠",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Jul-Aug",spacing:450,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Fan-train against south wall. Hand-pollinate flowers — they open before pollinators active.",color:"#e67e22",yld:6,
    pests:[{n:"Brown rot",t:"Brown rot: remove mummies, copper spray, thin fruit"},{n:"Bacterial canker",t:"Bacterial canker: summer pruning only, copper autumn"},{n:"Aphids",t:"Aphids: dormant oil winter"}],
    stages:["🌳","🌳","🌳","🌸","🟠","🟠"],
    steps:[{d:0,l:"Plant",t:"Sheltered. Early bloomer—frost risk."},{d:30,l:"Establish",t:"Water first year."}],
    storage:"Dry excellently. Jam."
  },
  { name:"Walnut",pH:"6.0-7.5",fert:"Minimal once established. Young trees: balanced fertilizer in spring.",emoji:"🥜",cat:"Nut Tree",days:365,sowIn:"Nov-Feb",harvest:"Sep-Oct",spacing:800,sun:"Full",waterFreq:"Monthly",waterNote:"Tap-rooted. Water deep first 3 years, then rain-dependent. 10-15 years to bear.",color:"#8B4513",yld:10,
    pests:[{n:"Codling moth",t:"Codling moth: pheromone traps"},{n:"Walnut blight",t:"Walnut blight: copper spray at bud break"},{n:"Walnut husk fly",t:"Husk fly: clean up fallen nuts"}],
    stages:["🌳","🌳","🌳","🌳","🥜","🥜"],
    steps:[{d:0,l:"Plant",t:"Large tree. Plan placement."}],
    storage:"Shell: 6mo. In-shell: 12mo+."
  },
  { name:"Almond",pH:"6.0-8.0",fert:"NPK 10-10-10 in spring. Light feeder.",emoji:"🥜",cat:"Nut Tree",days:365,sowIn:"Nov-Mar",harvest:"Sep-Oct",spacing:600,sun:"Full",waterFreq:"Every 14 days",waterNote:"Sheltered south wall or conservatory. Flowers very early — frost destroys crop most years. Largely ornamental in UK.",color:"#d4a017",yld:1,
    pests:[{n:"Brown rot",t:"Brown rot: copper spray, remove mummies"},{n:"Shot hole disease",t:"Shot hole: copper spray, improve airflow"},{n:"Aphids",t:"Aphids: dormant oil"}],
    stages:["🌳","🌳","🌳","🌸","🥜","🥜"],
    steps:[{d:0,l:"Plant",t:"Mediterranean native. Well-drained."}],
    storage:"Shell: 12mo+. Blanch and freeze."
  },
  { name:"Chestnut",pH:"5.5-6.5",fert:"Light feeder. Balanced NPK 10-10-10 in spring for young trees. Prefers acidic soil — never lime.",emoji:"🌰",cat:"Nut Tree",days:365,sowIn:"Nov-Feb",harvest:"Sep-Oct",spacing:800,sun:"Full",waterFreq:"Monthly",waterNote:"Acidic soil preferred. Established trees rain-dependent.",color:"#8B4513",yld:10,
    stages:["🌳","🌳","🌳","🌳","🌰","🌰"],
    steps:[{d:0,l:"Plant",t:"Acidic soil preferred. Large tree — plan placement."},{d:30,l:"Establish",t:"Water weekly first 2 years. Mulch heavily."}],
    pests:[{n:"Chestnut blight (Cryphonectria)",t:"Blight: no cure — remove and burn affected wood, plant resistant hybrids, avoid wounding bark"},{n:"Chestnut weevil",t:"Weevil: collect and destroy fallen nuts promptly, keep ground clear under tree"},{n:"Squirrels",t:"Squirrels: main nut thief — harvest promptly as burrs split, trapping where legal"}],
    storage:"Fresh 1-2wk. Dry/roast 3-6mo. Flour: about 6 months airtight, longer frozen."
  },
  { name:"Quince",pH:"6.0-7.0",fert:"Light feeder. NPK 10-10-10 in early spring. Compost mulch in autumn. Avoid excess nitrogen.",emoji:"🍐",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Oct-Nov",spacing:400,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Hardy and reliable in WE. Water during fruit set, otherwise rain-dependent.",color:"#f1c40f",yld:10,
    stages:["🌳","🌳","🌳","🌸","🍐","🍐"],
    steps:[{d:0,l:"Plant",t:"Full sun. Any soil. Very tough tree."},{d:30,l:"Establish",t:"Water first year."}],
    pests:[{n:"Quince leaf blight (Diplocarpon)",t:"Leaf blight: rake and destroy fallen leaves, copper spray at bud break, improve airflow"},{n:"Codling moth",t:"Codling moth: pheromone traps May-Aug, grease bands on trunk"},{n:"Brown rot",t:"Brown rot: remove mummified fruit, prune for airflow, avoid bruising at harvest"}],
    storage:"Whole 2-3mo cool. Jam/preserve: 12+mo. Jelly."
  },
  { name:"Persimmon",pH:"6.0-7.5",fert:"Light feeder. Balanced NPK 10-10-10 in spring. Over-feeding causes fruit drop — go easy.",emoji:"🟠",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Oct-Nov",spacing:500,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Sheltered south wall in S England. Marginal — container possible. Astringent types hardier.",color:"#e67e22",yld:5,
    stages:["🌳","🌳","🌳","🌳","🟠","🟠"],
    steps:[{d:0,l:"Plant",t:"Full sun. Well-drained. Sheltered."},{d:30,l:"Establish",t:"Water first year."}],
    pests:[{n:"Generally trouble-free in WE",t:"Few pests this far north — main risk is frost on early blossom and fruit drop from stress"},{n:"Fruit drop (physiological)",t:"Fruit drop: consistent watering, avoid over-feeding, shelter from wind and late frost"},{n:"Mealybug (under glass)",t:"Mealybug: wipe off with alcohol swab, horticultural soap, encourage predators"}],
    storage:"Firm: ripen at room temp. Fully ripe: freeze."
  },
  { name:"Lemon",pH:"5.5-6.5",fert:"Citrus-specific feed (high N summer, balanced winter). Foliar Mg/Fe if leaves yellow.",emoji:"🍋",cat:"Fruit Tree",days:365,sowIn:"Apr-May",harvest:"Year-round (light)",spacing:250,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Conservatory or heated greenhouse essential — minimum 5°C. Move outdoors Jun-Sep, indoors winter. Acid-loving compost.",color:"#f1c40f",yld:2,
    stages:["🌳","🌳","🌳","🌸","🍋","🍋"],
    steps:[{d:0,l:"Plant",t:"Large pot of citrus compost. Frost-free spot — conservatory or greenhouse over winter."},{d:30,l:"Establish",t:"Water weekly. Bring under cover before the first frost, every winter."}],
    pests:[{n:"Scale insects",t:"Scale: wipe off with soapy cloth, horticultural oil spray, main pest under glass"},{n:"Mealybug",t:"Mealybug: dab with alcohol swab, encourage predators, sticky white clusters in leaf joints"},{n:"Spider mites (dry indoor air)",t:"Spider mites: raise humidity, mist foliage, neem oil — worst on overwintered indoor plants"}],
    storage:"Fresh 2-3wk. Juice + freeze. Preserved lemons (salt) 12+mo."
  },
  { name:"Orange",pH:"5.5-6.5",fert:"Citrus-specific feed (high N summer, balanced winter). Foliar Mg/Fe if leaves yellow.",emoji:"🍊",cat:"Fruit Tree",days:365,sowIn:"Apr-May",harvest:"Dec-Mar (light)",spacing:250,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Conservatory or heated greenhouse essential — minimum 7°C. Move outdoors Jun-Sep, indoors winter. Acid-loving compost.",color:"#e67e22",yld:2,
    stages:["🌳","🌳","🌳","🌸","🍊","🍊"],
    steps:[{d:0,l:"Plant",t:"Frost-free location. South-facing."},{d:30,l:"Establish",t:"Water. Protect winter."}],
    pests:[{n:"Scale insects",t:"Scale: wipe off with soapy cloth, horticultural oil spray, main pest under glass"},{n:"Mealybug",t:"Mealybug: dab with alcohol swab, encourage predators, sticky white clusters in leaf joints"},{n:"Spider mites (dry indoor air)",t:"Spider mites: raise humidity, mist foliage, neem oil — worst on overwintered indoor plants"}],
    storage:"Fresh 2-3wk room temp, 4-6wk fridge. Marmalade 12+mo."
  },
  { name:"Hazelnut",pH:"6.0-7.5",fert:"Light feeder. Compost mulch in spring. Avoid high nitrogen — promotes leaf over nuts.",emoji:"🌰",cat:"Nut Tree",days:365,sowIn:"Nov-Feb",harvest:"Sep-Oct",spacing:450,sun:"Full-Partial",waterFreq:"Every 7-14 days",waterNote:"Excellent UK native nut. Easy to grow. Coppice every 7-8 years.",color:"#8B4513",yld:2,
    stages:["🌳","🌳","🌳","🌳","🌰","🌰"],
    steps:[{d:0,l:"Plant",t:"Two varieties needed for pollination. Wind-pollinated."},{d:30,l:"Establish",t:"Mulch. Water."}],
    pests:[{n:"Nut weevil (Curculio nucum)",t:"Nut weevil: collect and destroy fallen nuts, hoe soil under tree in winter to expose larvae"},{n:"Grey squirrels (#1 threat)",t:"Squirrels: strip whole crops while still green — harvest promptly, trapping where legal"},{n:"Big bud mite",t:"Big bud mite: remove and burn swollen buds in winter, prune affected shoots"}],
    storage:"In shell: 12+ months cool dry. Shelled: freeze."
  },
  { name:"Chamomile",pH:"5.6-7.5",fert:"NONE. Prefers poor, free-draining soil. Rich soil gives lush leaf and fewer flowers.",emoji:"🌼",cat:"Herb",days:60,sowIn:"Mar-Apr, Sep-Oct",harvest:"Jun-Sep",spacing:15,sun:"Full",waterFreq:"Every 3-5 days",waterNote:"Moderate. Once established, drought-tolerant — UK rainfall sufficient most years.",color:"#f1c40f",yld:0.03,
    stages:["🟤","🌱","🌿","🌿","🌼","🌼"],
    steps:[{d:0,l:"Sow surface",t:"Tiny seeds — don't bury. Press into soil."},{d:30,l:"Thin",t:"15cm apart."},{d:50,l:"Harvest flowers",t:"Pick when petals fold back. Morning after dew dries."}],
    pests:[{n:"Aphids",t:"Aphids: soap spray, or leave — chamomile attracts hoverflies that eat them"},{n:"Powdery mildew",t:"Powdery mildew: improve airflow, avoid overhead watering, thin crowded plants"},{n:"Generally trouble-free",t:"Chamomile is a companion herb — repels many pests and rarely suffers itself"}],
    storage:"Dry flowers 1-2 years."
  },
  { name:"Thyme",pH:"6.0-8.0",fert:"NONE. Poor, gritty, alkaline soil gives the best aroma. Feeding weakens flavour.",emoji:"🌿",cat:"Herb",days:90,sowIn:"Mar-Apr",harvest:"Jun-Oct",spacing:25,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Drought-tolerant. Free-draining soil essential — wet winter feet kill it. Poor soil = more aroma.",color:"#7dcea0",yld:0.1,
    stages:["🟤","🌱","🌿","🌿","🌸","🌿"],
    steps:[{d:0,l:"Plant",t:"Well-drained. Full sun. From cuttings or divisions."},{d:60,l:"Harvest",t:"Cut stems. Never more than 1/3 at once."}],
    pests:[{n:"Root rot (overwatering — main killer)",t:"Root rot: sharp drainage essential, never waterlog, grow in raised bed or gritty mix"},{n:"Rosemary beetle",t:"Rosemary beetle: hand-pick metallic striped beetles from foliage, also attacks lavender and sage"},{n:"Spider mites (under glass)",t:"Spider mites: mist foliage, improve airflow, only a problem on indoor/greenhouse plants"}],
    storage:"Dry 1-2 years. Keeps flavor well."
  },
  { name:"Parsley",pH:"6.0-7.0",fert:"Moderate feeder. Compost at sowing, liquid feed every 2-3wk in growing season for lush leaf.",emoji:"🌿",cat:"Herb",days:70,sowIn:"Mar-May, Sep",harvest:"May-Nov",spacing:18,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Excellent in cool moist UK climate. Biennial — flowers in 2nd year.",color:"#27ae60",yld:0.15,
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Sow",t:"Slow to germinate (2-4wk). Soak seed 24hr first."},{d:14,l:"Patience",t:"Don't give up — it's slow."},{d:50,l:"Harvest",t:"Outer stems first."}],
    pests:[{n:"Carrot fly",t:"Carrot fly: parsley is in the carrot family — use fleece or a 60cm barrier, companion with onion"},{n:"Aphids",t:"Aphids: soap spray, check leaf undersides"},{n:"Celery leaf miner",t:"Leaf miner: remove and destroy affected leaves, fleece cover early season"}],
    storage:"Dry for winter. Freeze in oil/ice cubes."
  },
  { name:"Dill",pH:"5.5-6.5",fert:"Light feeder. Compost at sowing is enough. Excess nitrogen gives weak floppy stems.",emoji:"🌿",cat:"Herb",days:40,sowIn:"Mar-May, Sep",harvest:"Jun-Sep",spacing:20,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Cool weather herb. Bolts in heat. Succession sow.",color:"#27ae60",yld:0.08,
    stages:["🟤","🌱","🌿","🌿","🌸","🌿"],
    steps:[{d:0,l:"Direct sow",t:"Best sown direct — it dislikes root disturbance (module-raised plants must go out young). Succession sow every 3wk."},{d:30,l:"Harvest leaves",t:"Before flowering for best flavor."},{d:40,l:"Seed heads",t:"Let some flower for pickle dill."}],
    pests:[{n:"Aphids",t:"Aphids: soap spray, or leave — dill flowers attract hoverflies and parasitic wasps"},{n:"Carrot fly",t:"Carrot fly: same family as carrot — fleece or barrier if grown near carrots"},{n:"Powdery mildew",t:"Powdery mildew: improve airflow, avoid overhead watering, thin dense stands"}],
    storage:"Dry 1 year. Seeds for pickling indefinitely."
  },

// ── NEW CROPS: BRASSICAS ──
  { name:"Broccoli",pH:"6.0-7.5",fert:"Heavy feeder. NPK 20-10-10 at transplant. Side-dress nitrogen at 3wk. Liquid feed every 2wk during head formation.",emoji:"🥦",cat:"Vegetable",days:80,sowIn:"Mar-Jun",harvest:"Jun-Nov",spacing:45,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Heavy feeder. Calabrese for summer, sprouting for winter/spring. Net against cabbage white.",color:"#27ae60",yld:0.4,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: netting essential. Bt spray if caterpillars found"},{n:"Aphids",t:"Aphids: soap spray, check undersides"},{n:"Club root",t:"Club root: lime to pH 7.2+, rotate 7yr"},{n:"Downy mildew",t:"Downy mildew: copper spray, spacing, morning water"}],
    stages:["🟤","🌱","🌿","🥦","🥦","🥦"],
    steps:[{d:0,l:"Transplant",t:"40-50cm apart. Rich soil. Net for cabbage white immediately."},{d:14,l:"Feed",t:"Nitrogen-rich. Compost side-dress."},{d:45,l:"Head forming",t:"Consistent water now. Don't let it dry out."},{d:65,l:"Harvest main",t:"Cut 15cm below head. LEAVE PLANT — side shoots produce for weeks."},{d:80,l:"Side shoots",t:"Keep cutting side shoots every 3-4 days."}],
    storage:"Fresh 5-7 days. Blanch+freeze 12mo. Pickle florets."
  },
  { name:"Cauliflower",pH:"6.5-7.5",fert:"Heaviest feeder of all brassicas. NPK 20-10-10. Weekly liquid feed. Any stress = tiny heads or bolting.",emoji:"🥦",cat:"Vegetable",days:110,sowIn:"Mar-Jun",harvest:"Jun-Apr",spacing:55,sun:"Full",waterFreq:"Every 2 days",waterNote:"Demanding crop — very consistent water. Summer types bolt easily; winter types reliable.",color:"#ecf0f1",yld:0.5,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: fine mesh netting from day 1"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Club root",t:"Club root: lime, rotate 7yr, resistant varieties"}],
    stages:["🟤","🌱","🌿","🌿","🥦","🥦"],
    steps:[{d:0,l:"Transplant",t:"50-60cm apart. Richest soil you have. Heavy feeder."},{d:14,l:"Feed weekly",t:"Liquid feed. This crop punishes neglect."},{d:50,l:"Blanch heads",t:"White types: tie outer leaves over curd when 5cm diameter. Protects color."},{d:75,l:"Harvest",t:"Cut when head is tight and firm. Once florets separate you're too late."}],
    storage:"Fresh 1-2wk. Blanch+freeze. Pickle. Cauliflower rice — grate and freeze."
  },
  { name:"Brussels Sprouts",pH:"6.5-7.5",fert:"NPK 20-10-10 at transplant. Very long season — monthly compost side-dress. Firm soil (don't dig after planting).",emoji:"🥬",cat:"Vegetable",days:180,sowIn:"Feb-May",harvest:"Oct-Mar",spacing:60,sun:"Full",waterFreq:"Every 3 days",waterNote:"Classic UK winter crop. Frost improves flavour. Stake tall varieties.",color:"#27ae60",yld:0.5,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: netting whole season"},{n:"Aphids (grey cabbage aphid)",t:"Grey aphid: soap spray + blast with hose. Worst brassica aphid problem"},{n:"Whitefly",t:"Whitefly: yellow sticky traps"}],
    stages:["🟤","🌱","🌿","🌿","🥬","🥬"],
    steps:[{d:0,l:"Transplant",t:"60cm apart. STAKE — they get tall and heavy."},{d:21,l:"Feed",t:"Nitrogen. Remove yellowing lower leaves."},{d:80,l:"Top off",t:"Remove growing tip when lowest sprouts are 1cm. Forces energy into sprouts."},{d:100,l:"Harvest",t:"Pick from bottom up. Frost improves sweetness dramatically."}],
    storage:"Fresh 2-3wk on stalk in cold. Blanch+freeze. Cool wet winters perfect for this crop."
  },

// ── NEW CROPS: ROOTS + TUBERS ──
  { name:"Sweet Potato",pH:"5.5-6.5",fert:"Low nitrogen — excess N = all vine, no tubers. NPK 5-10-20 (high potassium). Sandy, well-drained soil ideal.",emoji:"🍠",cat:"Vegetable",days:110,sowIn:"May-Jun",harvest:"Sep-Oct",spacing:35,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Greenhouse or polytunnel for reliable harvest. Slips planted late May. Reduce water 3wk before harvest.",color:"#e67e22",yld:0.5,
    pests:[{n:"Slugs and wireworm (holes in tubers)",t:"Lift promptly in autumn, avoid ground that was recently grass, control slugs from late summer"},{n:"Whitefly",t:"Whitefly: yellow traps"},{n:"Fusarium wilt",t:"Fusarium: resistant varieties, rotate 3yr"}],
    stages:["🟤","🌱","🌿","🍃","🍠","🍠"],
    steps:[{d:0,l:"Plant slips",t:"Bury 2/3 of slip in mound. Soil must be 18°C+. Greenhouse or polytunnel for best results."},{d:7,l:"Mulch",t:"Black plastic helps soil warm. Vines spread."},{d:80,l:"Reduce water",t:"Tubers swelling. 3 weeks pre-harvest."},{d:110,l:"Harvest",t:"Dig carefully. Cure 7-10d at 27-30°C, 80% humidity."}],
    storage:"Cured: 6-8 months at 13-15°C. Never refrigerate — cold damage below 10°C. Different family than potato — no rotation conflict."
  },
  { name:"Celeriac",pH:"6.0-7.0",fert:"Heavy feeder like celery. Rich soil, compost, liquid feed every 2wk. Never let dry out.",emoji:"🟤",cat:"Vegetable",days:150,sowIn:"Mar-May",harvest:"Sep-Mar",spacing:30,sun:"Full-Partial",waterFreq:"Every 2 days",waterNote:"Heavy water through summer. Frost improves flavour. Stores in ground over winter.",color:"#a1887f",yld:0.3,
    pests:[{n:"Celery fly",t:"Celery fly: fleece early season"},{n:"Septoria leaf spot",t:"Septoria: copper spray, rotate"},{n:"Slugs",t:"Slugs: beer traps"}],
    stages:["🟤","🌱","🌿","🌿","🟤","🟤"],
    steps:[{d:0,l:"Transplant",t:"Slow to germinate (3-4wk). Start very early indoors. 30cm apart."},{d:21,l:"Mulch + feed",t:"Heavy mulch to retain moisture. Liquid feed every 2wk."},{d:60,l:"Remove side shoots",t:"Snap off side roots and lower leaves to focus growth into bulb."},{d:120,l:"Harvest",t:"Dig when softball-sized. Can leave in ground into winter with mulch protection."}],
    storage:"Fresh 3-4 months in damp sand. Freeze blanched cubes. Makes incredible remoulade, soup, mash."
  },

// ── NEW CROPS: FLOWERS + SEEDS ──
  { name:"Sunflower",pH:"6.0-7.5",fert:"Moderate feeder. NPK 10-10-10 at planting. Tolerates poor soil. Deep tap root mines nutrients.",emoji:"🌻",cat:"Vegetable",days:80,sowIn:"Apr-May",harvest:"Aug-Oct",spacing:45,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Deep roots. Heavy water at flowering. Easy and reliable.",color:"#f1c40f",yld:0.05,
    pests:[{n:"Birds (biggest threat to seeds)",t:"Birds: bag heads with mesh when seeds forming"},{n:"Sunflower moth",t:"Moth: Bt if larvae found"},{n:"Downy mildew",t:"Downy mildew: resistant varieties, spacing"}],
    stages:["🟤","🌱","🌿","🌿","🌻","🌻"],
    steps:[{d:0,l:"Direct sow",t:"2cm deep, 40-50cm apart. Soil 10°C+. Stake tall varieties."},{d:21,l:"Thin + feed",t:"Balanced fertilizer. Protect from slugs while small."},{d:55,l:"Flowering",t:"Massive bee magnet. Cross-pollination improves seed set."},{d:75,l:"Harvest seeds",t:"When back of head turns brown. Cut, hang upside down to dry. Rub out seeds."}],
    storage:"Dry seeds: 12+ months. Roast for snacking. Press for oil. Whole heads: chicken feed. Stalks: compost or bean poles."
  },

// ── NEW CROPS: PERENNIALS ──
  { name:"Artichoke",pH:"6.5-8.0",fert:"Heavy feeder in spring growth. NPK 10-10-10 monthly Mar-Jun. Compost mulch autumn.",emoji:"🌿",cat:"Vegetable",days:180,sowIn:"Mar-Apr",harvest:"Jun-Aug",spacing:90,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Established plants tolerate dry spells. Mulch heavily for winter protection in cold areas.",color:"#7dcea0",yld:1,
    pests:[{n:"Aphids (blackfly)",t:"Blackfly: squash colonies on stems and buds, soap spray, encourage ladybirds"},{n:"Slugs on young plants",t:"Slugs: beer traps, copper. Only young plants"},{n:"Botrytis in wet springs",t:"Botrytis: spacing, don't overhead water"}],
    stages:["🌱","🌿","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Plant offsets",t:"Root divisions from established plant. 90cm apart. Or seed Imperial Star for first-year crop."},{d:30,l:"Establish",t:"Water weekly first season. Mulch heavily."},{d:365,l:"Year 2+",t:"Harvest globes when scales are tight. Cut 10cm below head. Remove dead stalks in autumn. Divide every 3-4yr."}],
    storage:"Fresh 1-2wk. Hearts in oil 3-6mo. Freeze hearts. Italian: preserved in brine."
  },
  { name:"Rhubarb",pH:"6.0-7.0",fert:"Annual heavy compost mulch in autumn. NPK 10-10-10 in spring. Perennial — feed the crown.",emoji:"🟥",cat:"Vegetable",days:365,sowIn:"Nov-Mar",harvest:"Mar-Jul",spacing:90,sun:"Full-Partial",waterFreq:"Every 5-7 days",waterNote:"Loves cool wet UK climate. Water deeply during dry spring spells. Mulch heavily annually.",color:"#c0392b",yld:1.5,
    pests:[{n:"Crown rot (overwatering/poor drainage)",t:"Crown rot: improve drainage. Never waterlog. Raised bed ideal"},{n:"Slugs on young shoots",t:"Slugs: copper rings around crown in spring"}],
    stages:["🌱","🌿","🌿","🌿","🟥","🟥"],
    steps:[{d:0,l:"Plant crown",t:"Divisions from established plant. Crown at soil surface. 90cm apart."},{d:365,l:"Year 2",t:"Light harvest only — pull 3-4 stalks."},{d:730,l:"Year 3+",t:"Full harvest Mar-Jun. PULL stalks, don't cut. Stop by end June to let plant recover."}],
    storage:"Fresh 2wk. Freeze chopped 12mo. Compote, jam, crumble. LEAVES ARE POISONOUS — never eat leaves."
  },
  { name:"Blackberry",pH:"5.5-7.0",fert:"Compost mulch annually. NPK 10-10-10 in spring. Potassium at fruiting.",emoji:"🫐",cat:"Fruit",days:365,sowIn:"Nov-Mar",harvest:"Jul-Sep",spacing:250,sun:"Full-Partial",waterFreq:"Every 3-5 days",waterNote:"Water during fruit set. Once established, rain-dependent in UK.",color:"#2c3e50",yld:3,
    pests:[{n:"Spotted wing drosophila (SWD)",t:"SWD: early harvest, traps, fine mesh over ripening fruit"},{n:"Raspberry beetle",t:"Raspberry beetle: shake onto cloth early morning"},{n:"Cane diseases",t:"Cane disease: remove fruited canes immediately after harvest"}],
    stages:["🌱","🌿","🌿","🌿","🫐","🫐"],
    steps:[{d:0,l:"Plant canes",t:"Thornless varieties for ease. Post-and-wire support. 2.5-3.5m apart (up to 4m for very vigorous kinds)."},{d:365,l:"Year 2 fruit",t:"Fruit on LAST year's canes. After harvest, cut fruited canes to ground. Tie in new canes."}],
    storage:"Very perishable fresh (2-3 days). Freeze immediately. Jam, wine, syrup, dry."
  },

// ── NEW CROPS: LEGUME STAPLES ──
  { name:"Fennel",pH:"6.0-8.0",fert:"Light feeder. Compost at planting sufficient. Don't over-feed — reduces bulb flavor.",emoji:"🌿",cat:"Vegetable",days:80,sowIn:"Apr-Jul",harvest:"Jul-Oct",spacing:25,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Bulbing fennel best for UK. Bolt-resistant varieties for early sowing. Mulch to keep cool.",color:"#27ae60",yld:0.2,
    pests:[{n:"Aphids",t:"Aphids: soap spray"},{n:"Bolting (heat stress — #1 problem)",t:"Bolting: set off by cold snaps, drought and root disturbance. Sow from late May to July, keep evenly moist, use bolt-resistant varieties"}],
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Sow",t:"Sow direct, or in modules and plant out young — root disturbance makes it bolt. 25cm apart. Main sowing late May-July."},{d:21,l:"Thin + mulch",t:"Keep moist. Hill soil around swelling bulb."},{d:60,l:"Harvest",t:"Cut at soil level when bulb is tennis-ball sized. Feathery fronds edible too."}],
    storage:"Fresh 1-2wk fridge. Roast, braise, raw in salads. Seeds: dry for spice (1yr+). Italian staple."
  },
  { name:"Lentil",pH:"6.0-8.0",fert:"NO nitrogen (fixes own). Potash/phosphate only if the soil is poor. Poor soil fine.",emoji:"🟤",cat:"Vegetable",days:110,sowIn:"Apr-May",harvest:"Aug-Sep",spacing:5,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Sow in warmest sheltered spot. Marginal in UK except dry sunny summers. Polytunnel improves reliability.",color:"#8B4513",yld:0.002,
    pests:[{n:"Ascochyta blight",t:"Ascochyta: resistant varieties, don't work wet plants"},{n:"Aphids",t:"Aphids: tolerate — lentils are tough"},{n:"Bruchid beetle (storage)",t:"Bruchid: freeze dried lentils 48hr before storage"}],
    stages:["🟤","🌱","🌿","🍃","🟤","🟤"],
    steps:[{d:0,l:"Broadcast sow",t:"3cm deep, thick. Like wheat/grain — dense planting. Poor soil fine. NO nitrogen."},{d:45,l:"Flowering",t:"Don't irrigate unless extreme drought."},{d:80,l:"Harvest",t:"When 80% of pods brown. Cut whole plant. Thresh. Winnow."}],
    storage:"Dried: 5+ YEARS sealed. Protein staple. Nitrogen-fixer — improves soil for next crop."
  },
  { name:"Chickpea",pH:"6.0-9.0",fert:"NO nitrogen (legume). Tolerates poor, alkaline, dry soil. Minimal inputs.",emoji:"🟡",cat:"Vegetable",days:110,sowIn:"Apr-May",harvest:"Aug-Sep",spacing:10,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Polytunnel or warm sheltered spot. Marginal outdoor in UK except hot summers. Drought-tolerant once established.",color:"#d4a017",yld:0.006,
    pests:[{n:"Ascochyta blight",t:"Ascochyta: resistant varieties, spacing, don't work wet foliage"},{n:"Pod borer",t:"Pod borer: Bt spray"},{n:"Fusarium wilt",t:"Fusarium: rotate 4yr, resistant varieties"}],
    stages:["🟤","🌱","🌿","🍃","🟡","🟡"],
    steps:[{d:0,l:"Direct sow",t:"5cm deep, 10cm apart. Polytunnel for reliability in UK."},{d:60,l:"Flowering",t:"No water needed. Pod formation."},{d:90,l:"Harvest",t:"When plant yellows and pods rattle. Pull whole plant. Dry. Thresh."}],
    storage:"Dried: 5+ YEARS sealed. Hummus, falafel, roasted. Nitrogen-fixer. Globally important staple legume."
  },
];

export const CROP_MAP = new Map(CROPS.map(c => [c.name, c]));
export const CROP_COLORS = [{r:220,g:60,b:60},{r:60,g:160,b:60},{r:60,g:100,b:200},{r:200,g:160,b:30},{r:160,g:60,b:180},{r:230,g:120,b:30},{r:40,g:180,b:170},{r:200,g:80,b:140},{r:100,g:140,b:60},{r:80,g:80,b:180},{r:180,g:100,b:60},{r:60,g:180,b:100}];
