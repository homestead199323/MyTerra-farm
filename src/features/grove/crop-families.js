/* Crop → 3D model family and look. No three.js here, so screens outside the 3D map (crop
   icons, PlantArt) can use it without loading the 3D engine. Used by crops3d.js and toy-art.js.
   MARKER: CROP_FAMILIES_V1 */
export const FAMILIES = [
  [/tomato/, "bush", { leaf: 0x5fae63, fruit: 0xe3493a, fr: .085, n: 7, stake: true, tall: 2.6 }],
  [/pepper \(hot\)|chilli|chili/, "bush", { leaf: 0x5fb36a, fruit: [0xe0463a], fr: .06, n: 7, stake: true, tall: 1.9, shape: "pod" }],
  [/pepper|capsicum/, "bush", { leaf: 0x5fb36a, fruit: [0xe0463a, 0xf2c13a, 0x6cb45a], fr: .075, n: 5, stake: true, tall: 1.9, shape: "ell" }],
  [/eggplant|aubergine/, "bush", { leaf: 0x6a9f6c, fruit: 0x5a3b7c, fr: .075, n: 3, stake: true, tall: 1.9, shape: "egg" }],
  [/okra/, "bush", { leaf: 0x66b06a, fruit: 0x7cc46a, fr: .05, n: 6, stake: false, tall: 2.8, shape: "pod" }],
  [/potato/, "bush", { leaf: 0x5ba562, fruit: 0xfafafa, fr: .035, n: 6, stake: false, tall: 1.3, flower: true }],
  [/rocket|arugula/, "leafy", { leaf: 0x5fa85a, tip: 0x8fca7a, n: 9, up: .7 }],
  [/lettuce|endive|lamb/, "leafy", { leaf: 0x95d37d, tip: 0xcdef9f, n: 10, up: .55, rosette: true }],
  [/spinach/, "leafy", { leaf: 0x4e9d55, tip: 0x7cc472, n: 9, up: .5 }],
  [/chard/, "leafy", { leaf: 0x3f8f4e, tip: 0x6fbb6a, stem: 0xd9443a, n: 8, up: .85, tall: 1.4 }],
  [/kale/, "leafy", { leaf: 0x5a9a7f, tip: 0x8dc4a2, n: 9, up: .9, tall: 1.5 }],
  [/celery/, "leafy", { leaf: 0x8ec86a, tip: 0xbbe192, stem: 0xd3e8a6, n: 9, up: 1.1, tall: 1.7 }],
  [/cabbage/, "head", { leaf: 0x8ec98a, head: 0xa9d99a, kind: "cabbage" }],
  [/broccoli/, "head", { leaf: 0x6aa877, head: 0x3f8a4f, kind: "broccoli" }],
  [/cauliflower/, "head", { leaf: 0x7fb784, head: 0xf5f0dc, kind: "cauli" }],
  [/brussels/, "head", { leaf: 0x6aa877, head: 0x8cc88a, kind: "sprouts" }],
  [/carrot/, "root", { leaf: 0x5fb461, root: 0xf08a3c, shape: "cone" }],
  [/parsnip/, "root", { leaf: 0x6ab865, root: 0xf2e6c4, shape: "cone" }],
  [/beet/, "root", { leaf: 0x5f9a4c, stem: 0xb03a4e, root: 0x8e2f52, shape: "ball" }],
  [/radish/, "root", { leaf: 0x6ab865, root: 0xe4475b, shape: "ball", small: true }],
  [/turnip|celeriac|swede|kohlrabi/, "root", { leaf: 0x6ab865, root: 0xf2ecdf, cap: 0xa66aa6, shape: "ball" }],
  [/fennel|dill/, "root", { leaf: 0x8fcf7a, feathery: true, tall: 1.9 }],
  [/leek/, "allium", { leaf: 0x6fae7a, bulb: 0xf1eee2, leek: true }],
  [/onion|garlic|chive|shallot/, "allium", { leaf: 0x6fba6c, bulb: 0xe3c58c }],
  [/pumpkin/, "vine", { leaf: 0x5fa858, fruit: 0xf08c3a, shape: "pumpkin" }],
  [/squash/, "vine", { leaf: 0x5fa858, fruit: 0xf2c34a, shape: "pumpkin" }],
  [/zucchini|courgette/, "vine", { leaf: 0x5fa858, fruit: 0x3f8a3f, shape: "long" }],
  [/cucumber/, "vine", { leaf: 0x66b05d, fruit: 0x4f9f48, shape: "long" }],
  [/watermelon/, "vine", { leaf: 0x5fa858, fruit: 0x3f8a3f, stripe: 0x9ad786, shape: "melon" }],
  [/melon/, "vine", { leaf: 0x5fa858, fruit: 0xe8d6a0, shape: "melon" }],
  [/broad bean|fava/, "climber", { leaf: 0x66b562, pod: 0x8ccf6a, poles: false }],
  [/lentil|chickpea/, "climber", { leaf: 0x7fbf6a, pod: 0xb9d98a, poles: false, low: true }],
  [/bean|pea/, "climber", { leaf: 0x66b562, pod: 0x8ccf6a, poles: true }],
  [/corn|maize/, "stalk", { leaf: 0x6fb55e, kind: "corn" }],
  [/wheat|barley|oat|rye|spelt/, "stalk", { leaf: 0xa9c86a, kind: "grain" }],
  [/sunflower/, "stalk", { leaf: 0x66a95c, kind: "sunflower" }],
  [/lavender/, "herb", { leaf: 0x9db39b, spikes: 0x8d7fd1 }],
  [/rosemary/, "herb", { leaf: 0x5c8f6c, spiky: true, tall: 1.5 }],
  [/chamomile/, "herb", { leaf: 0x86c276, dots: 0xffffff, centre: 0xf5c93b }],
  [/oregano|marjoram/, "herb", { leaf: 0x7fb07a, small: true }],
  [/thyme/, "herb", { leaf: 0x7fb07a, small: true }],
  [/sage/, "herb", { leaf: 0x8fae8f }],
  [/mint/, "herb", { leaf: 0x79b57a }],
  [/parsley|coriander|cilantro/, "herb", { leaf: 0x66b562, glossy: true }],
  [/basil/, "herb", { leaf: 0x66b562, glossy: true }],
  [/strawberry/, "berry", { leaf: 0x5ea85c, fruit: 0xe2433c, kind: "low" }],
  [/raspberry/, "berry", { leaf: 0x66ad64, fruit: 0xe24c6b, kind: "cane" }],
  [/blackberry/, "berry", { leaf: 0x5a9c5c, fruit: 0x3b2a4a, kind: "cane" }],
  [/grape/, "berry", { leaf: 0x6db362, fruit: 0x6a4a8c, kind: "vine" }],
  [/asparagus/, "spears", {}],
  [/rhubarb/, "rhubarb", {}],
  [/artichoke/, "artichoke", {}],
];
/* windowsill tray crops are a carpet of seedlings: the plain leafy model, whatever word is in the name ("Pea Shoots" is not a pea plant) */
export const TRAY_RE = /shoots|microgreens|^cress$/;
export function cropFamily(name = "") {
  const n = name.toLowerCase(), i = TRAY_RE.test(n) ? -1 : FAMILIES.findIndex(([re]) => re.test(n));
  return i < 0 ? { idx: FAMILIES.length, family: "leafy", o: { leaf: 0x7cc47c, tip: 0xa8dd98, n: 9, up: .6 } } : { idx: i, family: FAMILIES[i][1], o: FAMILIES[i][2] };
}
/* a stable, readable name per family entry, used for the crop icon files (crop-<slug>-<stage>.webp) */
export function cropSlug(name = "") {
  const f = cropFamily(name);
  if (f.idx >= FAMILIES.length) return "greens";
  return FAMILIES[f.idx][0].source.split("|")[0].replace(/[^a-z]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}
/* fruit trees are their own 3D model (Grove3D fruitTree); their icon files are tree-<key>-<stage>.webp */
export const TREE_RE = /apple|pear|peach|plum|cherry|citrus|lemon|orange|fig|olive|walnut|almond|avocado|apricot|quince|persimmon|pomegranate|hazelnut|chestnut/;
export const TREE_KEYS = ["apple", "pear", "peach", "plum", "cherry", "apricot", "lemon", "orange", "citrus", "fig", "olive", "walnut", "almond", "hazelnut", "chestnut", "quince", "persimmon", "pomegranate", "avocado"];
export function treeKey(name = "") { const n = name.toLowerCase(); return TREE_RE.test(n) ? TREE_KEYS.find((k) => n.includes(k)) || "apple" : null; }
