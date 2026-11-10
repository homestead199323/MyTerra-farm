/* ═══════════════════════════════════════════
   ANIMAL BREEDS — variety data per livestock species
   Extracted from App.jsx (Phase A Commit 2, 2026-05-07)
   ═══════════════════════════════════════════ */

export const BREEDS = {
  Chicken: [
    {name:"Rhode Island Red",note:"Dual purpose. 250-300 eggs/yr. Hardy. Brown eggs.",eggs:0.8},
    {name:"Leghorn",note:"Top layer. 280-320 white eggs/yr. Active forager.",eggs:0.9},
    {name:"Sussex",note:"Dual purpose. 250 eggs/yr. Docile. Good meat bird.",eggs:0.7},
    {name:"Plymouth Rock",note:"Friendly. 200 brown eggs/yr. Cold-hardy.",eggs:0.6},
    {name:"Australorp",note:"Record holder 364 eggs/yr. Gentle. Heat-tolerant.",eggs:0.85},
    {name:"Orpington",note:"Very docile. 200 eggs/yr. Great mothers. Meat bird.",eggs:0.55},
    {name:"Marans",note:"Dark chocolate brown eggs. 150-200/yr. Hardy.",eggs:0.5},
    {name:"Silkie",note:"Broody. Best mothers. 100 eggs/yr. Ornamental.",eggs:0.3},
    {name:"ISA Brown",note:"Commercial hybrid. 300+ eggs/yr. First 2 years.",eggs:0.9},
    {name:"Heritage/Mixed",note:"Local heritage breeds. Hardy. 150-200 eggs/yr.",eggs:0.5},
  ],
  Goat: [
    {name:"Saanen",note:"Top dairy. 3-4L/day. White. Gentle."},
    {name:"Alpine",note:"Hardy dairy. 2-3L/day. Adaptable to mountains."},
    {name:"Nubian",note:"Rich milk (high butterfat). 2L/day. Good meat."},
    {name:"Boer",note:"Best meat breed. Fast growth. Docile."},
    {name:"Toggenburg",note:"Swiss dairy. 2-3L/day. Cold-hardy."},
    {name:"Local Heritage",note:"Regional breed. Hardy. Adapted to local terrain. Dual purpose."},
  ],
  Sheep: [
    {name:"Merino",note:"Best wool. Fine fiber. 4-5kg fleece/yr."},
    {name:"Suffolk",note:"Top meat breed. Fast growth. Large."},
    {name:"Dorper",note:"Hair sheep (no shearing). Excellent meat. Heat-tolerant."},
    {name:"East Friesian",note:"Top dairy sheep. 2-3L/day."},
    {name:"Local Mountain Breed",note:"Native regional breed. Hardy mountain sheep. Dual purpose."},
    {name:"Lacaune",note:"Roquefort cheese sheep. Good dairy."},
  ],
  Cow: [
    {name:"Jersey",note:"Rich milk. 20L/day. Small. Efficient. High butterfat."},
    {name:"Holstein",note:"Highest volume. 25-30L/day. Large."},
    {name:"Brown Swiss",note:"Dual purpose. 18-22L/day. Hardy mountain breed."},
    {name:"Hereford",note:"Beef breed. Hardy. Easy calving."},
    {name:"Dexter",note:"Smallest. Dual purpose. Perfect for small farm."},
    {name:"Local/Busha",note:"Small native breed. Very hardy. Low maintenance. Suits small farms."},
  ],
  Pig: [
    {name:"Large White",note:"Best commercial breed. Fast growth. Lean."},
    {name:"Berkshire",note:"Premium meat. Marbled. Heritage."},
    {name:"Duroc",note:"Fast growth. Good meat quality. Hardy."},
    {name:"Mangalica",note:"Woolly pig. Excellent fat/lard. Heritage."},
    {name:"Kunekune",note:"Small. Grass-fed. Perfect homestead pig."},
    {name:"Heritage Local",note:"Hardy regional breed. Well adapted to local conditions."},
  ],
  Rabbit: [
    {name:"New Zealand White",note:"Top meat breed. Fast growth. 5kg adult."},
    {name:"Californian",note:"Excellent meat. 4-5kg. Commercial standard."},
    {name:"Rex",note:"Good meat + fur. 3-4kg."},
    {name:"Flemish Giant",note:"Largest breed. 6-8kg. Slower growth."},
    {name:"Heritage Mixed",note:"Hardy local heritage rabbits."},
  ],
  Duck: [
    {name:"Khaki Campbell",note:"Top layer. 300+ eggs/yr."},
    {name:"Pekin",note:"Best meat duck. Fast growth. 3kg in 7wk."},
    {name:"Indian Runner",note:"Upright. Great layers. Slug control."},
    {name:"Muscovy",note:"Quiet. Lean meat. Good mothers. Fly."},
    {name:"Rouen",note:"Large. Good meat. Decorative."},
  ],
  Bee: [{name:"Italian (Apis mellifera ligustica)",note:"Gentle. Productive. Most popular."},{name:"Carniolan",note:"Very gentle. Cold-hardy. Low swarming."},{name:"Buckfast",note:"Hybrid. Productive. Disease-resistant."}],
  Turkey: [{name:"Broad Breasted Bronze",note:"Commercial. Fast growth to 15kg. Cannot mate naturally."},{name:"Bourbon Red",note:"Heritage. Beautiful. 6-8kg. Good forager. Med-adapted."},{name:"Narragansett",note:"Heritage. Calm. 7-9kg. Cold and heat tolerant."},{name:"Royal Palm",note:"Small ornamental. 4-5kg. Excellent pest control."},{name:"Local Bronze/Black",note:"Regional heritage. Hardy. Self-sustaining. Best for free-range."}],
  Goose: [{name:"Toulouse",note:"Large grey. 8-10kg. Calm. Traditional breed for confit and roasting."},{name:"Embden",note:"Large white. 10-12kg. Fast growth. Good meat."},{name:"Chinese",note:"Light breed. Best layers (60+ eggs). Loud — excellent guard goose."},{name:"Pilgrim",note:"Auto-sexing (males white, females grey). Calm. Dual purpose."},{name:"Sebastopol",note:"Curly-feathered ornamental. Gentle. Good layers."}],
  Quail: [{name:"Coturnix (Japanese)",note:"Standard. 300+ eggs/yr. Mature 6wk. Best for beginners."},{name:"Jumbo Coturnix",note:"Larger meat strain. 300g body. Same laying rate."},{name:"Texas A&M",note:"White. Bred for meat. Calm temperament."},{name:"Pharaoh",note:"Brown speckled. Original Coturnix. Hardy. Most common."},{name:"Button Quail",note:"Tiny ornamental. Not for production. Pets only."}],
  "Guinea Fowl": [{name:"Pearl",note:"Most common. Grey spotted. Hardy. Excellent tick control."},{name:"Lavender",note:"Light grey. Slightly calmer than Pearl."},{name:"White",note:"Visible at night. Slightly more predator-vulnerable."},{name:"Royal Purple",note:"Dark iridescent. Beautiful. Same hardiness as Pearl."}],
  Donkey: [{name:"Standard",note:"110-130cm. General purpose. Guardian. Pack animal."},{name:"Miniature",note:"Under 90cm. Companion. Pet. Light cart only."},{name:"Mammoth",note:"Over 140cm. Draft work. Can breed with horses (mules)."},{name:"Mediterranean Miniature",note:"Sardinian/Sicilian origin. Hardy. Heat-adapted. 80-100cm."}],
  Horse: [{name:"Haflinger",note:"Small (130-140cm). Strong. Draft + riding. Alpine/Med adapted. Golden chestnut."},{name:"Fjord",note:"Norwegian. Small, strong. Excellent draft. Calm. Easy keeper."},{name:"Murgese",note:"Italian breed. 150-160cm. Draft/riding. Heat-adapted. Hardy."},{name:"Quarter Horse",note:"Versatile. Cattle work, riding, light draft. Most popular worldwide."},{name:"Local Mountain Breed",note:"Regional breeds adapted to terrain. Hardy. Low maintenance. Dual purpose."}],
};
