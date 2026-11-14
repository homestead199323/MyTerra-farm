/* ═══════════════════════════════════════════
   AI KNOWLEDGE ENGINE
   Offline farm assistant logic — no API calls.
   Extracted from App.jsx — Phase A Commit 10.
   ═══════════════════════════════════════════ */
import { BREEDS } from "../data/breeds";
import { COMP } from "../data/companions";
import { CROPS } from "../data/crops";
import { LDB } from "../data/livestock";
import { PRESERVATION } from "../data/preservation";
import { VARIETIES } from "../data/varieties";
import { buildTaskQueue } from "./task-queue";
import { formatMoneyShort } from "./money";
import { getCropDifficulty } from "./calendar";
import { daysBetweenLocalKeys } from "./utils";
import { rCR, rCM } from "./regional";
import { getRegionalCalendar, getRegionalVarieties } from "./regional-detail";

// The preservation method a question is about: its exact name, else the method sharing the most
// distinctive words with the question ("pickle" -> Vinegar Pickling, "pressure canning" -> Pressure Canning).
const PRES_STOP = new Set(["and","the","for","low","high","acid","making","long","term","storage","preserves","vegetables","hot","water","bath","farmhouse","harvesting","cold"]);
const presStem = (w) => w.replace(/(ing|ied|ies|ed|es|s)$/, "");
function findPreservation(q, exactOnly) {
  let best = null, bestScore = 0;
  Object.entries(PRESERVATION).forEach(([key, p]) => {
    if (q.includes(p.name.toLowerCase()) || q.includes(key)) { best = p; bestScore = 99; return; }
    if (exactOnly) return;
    const words = (key + " " + p.name).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !PRES_STOP.has(w));
    const score = new Set(words.map(presStem).filter((w) => w.length > 2 && q.includes(w))).size;
    if (score > bestScore) { best = p; bestScore = score; }
  });
  return best;
}
function preservationAnswer(p) {
  let r = `${p.icon || "🫙"} ${p.name}\n\n`;
  r += `Category: ${p.cat} | Difficulty: ${p.difficulty}\n`;
  r += `Keeps: ${p.shelf}\n\n`;
  if (p.overview) r += `${p.overview}\n\n`;
  if (p.ratio) r += `Ratios: ${p.ratio}\n\n`;
  if (p.method) r += `Method: ${p.method}\n\n`;
  if (p.storage) r += `Storage: ${p.storage}\n\n`;
  r += "Full guide in Learn → Preserving.";
  return r;
}

function farmKnowledgeEngine(query, data) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  const now = new Date();
  const month = now.getMonth();
  const MN = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const MN_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

  // ── Helper: find crop by name (fuzzy) ──
  const findCrop = (text) => {
    const t = text.toLowerCase();
    return rCR(data.region).find(c => t.includes(c.name.toLowerCase())) || rCR(data.region).find(c => c.name.toLowerCase().includes(t));
  };

  // ── Helper: find animal by name (fuzzy) ──
  const findAnimal = (text) => {
    const t = text.toLowerCase();
    return Object.entries(LDB).find(([k]) => t.includes(k.toLowerCase()));
  };

  // ── Helper: get user's active crops ──
  const activePlots = data.garden.plots.filter(p => p.status !== "harvested");
  const userAnimals = data.livestock.animals;
  const zones = data.zones;

  // ── 0. A PRESERVATION METHOD ASKED FOR BY NAME (the suggestion chips) ──
  const namedMethod = findPreservation(q, true);
  if (namedMethod) return preservationAnswer(namedMethod);

  // ── 1. CROP-SPECIFIC QUERIES ──
  const matchedCrop = findCrop(q);
  if (matchedCrop) {
    const c = matchedCrop;
    const varieties = getRegionalVarieties(c.name, data.region);
    const companions = COMP[c.name];
    const diff = getCropDifficulty(c.name);
    const userPlot = activePlots.find(p => p.crop === c.name);

    // "how to grow X" / "X guide" / "plant X"
    if (q.match(/how|grow|plant|guide|care|tips|start/)) {
      let r = `${c.emoji} ${c.name} — Complete Growing Guide\n\n`;
      r += `Category: ${c.cat} | Difficulty: ${diff.l}\n`;
      r += `Days to harvest: ${c.days} | Spacing: ${c.spacing}cm\n`;
      r += `Sun: ${c.sun} | Water: ${c.waterFreq}\n`;
      if (c.pH) r += `Ideal pH: ${c.pH}\n`;
      r += `Sow: ${c.sowIn} | Harvest: ${c.harvest}\n\n`;
      r += `Step-by-step:\n`;
      c.steps.forEach((s, i) => { r += `${i + 1}. Day ${s.d}: ${s.l} — ${s.t}\n`; });
      if (c.fert) r += `\nFertilizer: ${c.fert}\n`;
      if (companions) {
        r += `\nCompanions:\n`;
        r += `Good with: ${companions.good.join(", ") || "None listed"}\n`;
        if (companions.bad.length > 0) r += `Avoid near: ${companions.bad.join(", ")}\n`;
      }
      if (varieties.length > 0) {
        r += `\nBest varieties:\n`;
        varieties.slice(0, 3).forEach(v => { r += `- ${v.name}: ${v.note}\n`; });
      }
      r += `\nStorage: ${c.storage}`;
      if (userPlot) r += `\n\nYou currently have ${userPlot.name || c.name} planted${userPlot.plantDate ? ` since ${userPlot.plantDate}` : ""}.`;
      return r;
    }

    // "X pests" / "pest" / "disease" / "bugs"
    if (q.match(/pest|disease|bug|problem|sick|dying|yellow|wilt|rot|mold|mildew|aphid|worm/)) {
      let r = `${c.emoji} ${c.name} — Pests & Disease Guide\n\n`;
      if (c.pests && c.pests.length > 0) {
        c.pests.forEach((p, i) => { r += `${i + 1}. ${p.n}\nTreatment: ${p.t}\n\n`; });
      } else {
        r += `No major pest data recorded for ${c.name}. General tips:\n`;
        r += `- Check leaves daily for spots, holes, or discoloration\n`;
        r += `- Neem oil spray for most common pests\n`;
        r += `- Good spacing and airflow prevent fungal issues\n`;
      }
      return r;
    }

    // "water X" / "watering"
    if (q.match(/water|irrigat/)) {
      return `${c.emoji} ${c.name} — Watering Guide\n\nFrequency: ${c.waterFreq}\n\n${c.waterNote}\n\nTip: Water at the base, not the leaves. Early morning is best.`;
    }

    // "harvest X" / "when to pick"
    if (q.match(/harvest|pick|ready|ripe/)) {
      let r = `${c.emoji} ${c.name} — Harvest Info\n\n`;
      r += `Days to harvest: ${c.days}\n`;
      r += `Harvest season: ${c.harvest}\n`;
      r += `Storage: ${c.storage}\n`;
      if (userPlot && userPlot.plantDate) {
        const dLeft = c.days - daysBetweenLocalKeys(userPlot.plantDate, now);
        r += dLeft <= 0 ? `\nYour ${c.name} should be ready to harvest now!` : `\nYour ${c.name} should be ready in about ${dLeft} days.`;
      }
      return r;
    }

    // "X varieties" / "best variety"
    if (q.match(/variet|breed|type|which|best/)) {
      if (varieties.length > 0) {
        let r = `${c.emoji} ${c.name} — Varieties\n\n`;
        varieties.forEach(v => { r += `${v.name} (${v.days}d): ${v.note}${v.yld ? ` — Yield: ~${v.yld}kg/plant` : ""}\n\n`; });
        return r;
      }
      return `${c.emoji} ${c.name}: No specific variety data available. The general variety works well for most conditions. Days to harvest: ${c.days}, Spacing: ${c.spacing}cm.`;
    }

    // "companion" / "what to plant with X"
    if (q.match(/companion|plant with|next to|near|together|pair/)) {
      if (companions) {
        return `${c.emoji} ${c.name} — Companion Planting\n\nGood companions: ${companions.good.join(", ") || "None listed"}\nAvoid planting near: ${companions.bad.length > 0 ? companions.bad.join(", ") : "No known bad companions"}\n\nTip: Companion planting helps with pest control, pollination, and soil health.`;
      }
      return `No companion planting data for ${c.name} yet. General rule: mix plant families and avoid grouping the same crop type.`;
    }

    // Default: quick crop summary
    let r = `${c.emoji} ${c.name}\n\n`;
    r += `${c.cat} | ${diff.l} | ${c.days} days | ${c.sun}\n`;
    r += `Sow: ${c.sowIn} | Harvest: ${c.harvest}\n`;
    r += `Water: ${c.waterFreq} | Spacing: ${c.spacing}cm\n`;
    if (c.storage) r += `Storage: ${c.storage}\n`;
    r += `\nAsk me specifics like "${c.name} pests", "${c.name} varieties", or "how to grow ${c.name}".`;
    return r;
  }

  // ── 2. ANIMAL-SPECIFIC QUERIES ──
  const matchedAnimal = findAnimal(q);
  if (matchedAnimal) {
    const [name, db] = matchedAnimal;
    const breeds = BREEDS[name] || [];
    const cal = getRegionalCalendar(name, data.region);
    const userAnimal = userAnimals.find(a => a.type === name);

    if (q.match(/feed|food|eat|diet|nutrition/)) {
      return `${db.e} ${name} — Feeding Guide\n\n${db.feed}\n\nYour farm: ${userAnimal ? `${userAnimal.count}x ${name}${userAnimal.breed ? ` (${userAnimal.breed})` : ""}` : "None yet"}`;
    }
    if (q.match(/house|housing|coop|barn|shelter|space/)) {
      return `${db.e} ${name} — Housing\n\n${db.house}\n\nSleep: ${db.sleep}`;
    }
    if (q.match(/breed|mating|reproduc|baby|pregnan|gestat/)) {
      return `${db.e} ${name} — Breeding\n\n${db.breed}`;
    }
    if (q.match(/sick|health|injur|hurt|limp|wound|treat|vet/)) {
      let r = `${db.e} ${name} — Health & Injuries\n\n`;
      db.inj.forEach((j, i) => { r += `${i + 1}. ${j.n}\nTreatment: ${j.t}\n\n`; });
      return r;
    }
    if (q.match(/produce|egg|milk|meat|wool|honey|output|yield/)) {
      let r = `${db.e} ${name} — Produce\n\nProduces: ${db.prod.join(", ")}\n\n`;
      Object.entries(db.out).forEach(([k, v]) => { r += `${k}: ~${v.p} ${v.u}\nStorage: ${v.s}\n\n`; });
      if (userAnimal) r += `Your ${userAnimal.count}x ${name} could produce:\n`;
      if (userAnimal) Object.entries(db.out).forEach(([k, v]) => { r += `- ${k}: ~${Math.round(v.p * userAnimal.count * 10) / 10} ${v.u}\n`; });
      return r;
    }
    if (q.match(/breed|which breed|best breed|variet|type/i) && breeds.length > 0) {
      let r = `${db.e} ${name} — Breeds\n\n`;
      breeds.forEach(b => { r += `${b.name}: ${b.note}${b.eggs ? ` (${b.eggs} eggs/day)` : ""}\n\n`; });
      return r;
    }
    if (q.match(/calendar|month|schedul|when/i) && cal) {
      let r = `${db.e} ${name} — Monthly Calendar\n\n`;
      Object.entries(cal).forEach(([m, t]) => { r += `${m}: ${t}\n`; });
      return r;
    }
    // Default animal summary
    let r = `${db.e} ${name}\n\nProduces: ${db.prod.join(", ")}\n`;
    r += `Feed: ${db.feed}\nHousing: ${db.house}\nBreeding: ${db.breed}\n`;
    if (userAnimal) r += `\nYour farm: ${userAnimal.count}x ${name}${userAnimal.breed ? ` (${userAnimal.breed})` : ""}`;
    r += `\n\nAsk me: "${name} feeding", "${name} health", "${name} breeds", or "${name} produce"`;
    return r;
  }

  // ── 3. SEASONAL QUERIES ──
  if (q.match(/what.*plant|what.*sow|what.*grow|plant now|sow now|this month|season/)) {
    const sowNow = rCR(data.region).filter(c => {
      const months = c.sowIn.toLowerCase();
      return MN_SHORT[month] && months.includes(MN_SHORT[month].toLowerCase());
    });
    const harvestNow = rCR(data.region).filter(c => {
      const months = c.harvest.toLowerCase();
      return MN_SHORT[month] && months.includes(MN_SHORT[month].toLowerCase());
    });
    const alreadyPlanted = new Set(activePlots.map(p => p.crop));
    const newOptions = sowNow.filter(c => !alreadyPlanted.has(c.name));

    let r = `${MN[month].charAt(0).toUpperCase() + MN[month].slice(1)} — What to Plant & Harvest\n\n`;
    r += `SOW NOW (${sowNow.length} crops):\n`;
    sowNow.slice(0, 10).forEach(c => {
      const diff = getCropDifficulty(c.name);
      r += `${c.emoji} ${c.name} — ${c.days}d, ${diff.l}${alreadyPlanted.has(c.name) ? " (already planted)" : ""}\n`;
    });
    if (sowNow.length > 10) r += `...and ${sowNow.length - 10} more\n`;
    if (harvestNow.length > 0) {
      r += `\nHARVEST NOW (${harvestNow.length} crops):\n`;
      harvestNow.slice(0, 8).forEach(c => { r += `${c.emoji} ${c.name}\n`; });
    }
    if (newOptions.length > 0) {
      const easy = newOptions.filter(c => getCropDifficulty(c.name).l === "Easy").slice(0, 3);
      if (easy.length > 0) {
        r += `\nRecommended for you (easy, not yet planted):\n`;
        easy.forEach(c => { r += `${c.emoji} ${c.name} — ${c.days}d to harvest\n`; });
      }
    }
    return r;
  }

  // ── 4. COMPANION PLANTING QUERIES ──
  if (q.match(/companion|plant.*with|plant.*near|good.*together|bad.*together/)) {
    if (activePlots.length > 0) {
      let r = "Companion Planting — Your Current Crops\n\n";
      activePlots.forEach(p => {
        const co = COMP[p.crop];
        if (co) {
          r += `${p.name || p.crop}:\n`;
          r += `  Good with: ${co.good.join(", ") || "—"}\n`;
          if (co.bad.length > 0) r += `  Avoid: ${co.bad.join(", ")}\n`;
          r += "\n";
        }
      });
      return r;
    }
    let r = "Companion Planting — Top Pairings\n\n";
    r += "Tomato + Basil: Classic duo. Basil repels pests, improves flavor.\n";
    r += "Carrot + Onion: Each repels the other's main pest.\n";
    r += "Corn + Bean + Squash: The Three Sisters. Corn supports beans, squash shades soil.\n";
    r += "Lettuce + Radish: Fast radish marks slow lettuce rows.\n\n";
    r += "Plant some crops and I'll give you personalized companion advice!";
    return r;
  }

  // ── 5. MY FARM STATUS ──
  if (q.match(/my farm|my crop|my animal|status|overview|what do i have|farm summary|how.*my/)) {
    let r = "Your Farm Summary\n\n";
    r += `Zones: ${zones.length > 0 ? zones.map(z => z.name).join(", ") : "None yet — set up your farm layout first"}\n\n`;
    if (activePlots.length > 0) {
      r += `Active crops (${activePlots.length}):\n`;
      activePlots.forEach(p => {
        const c = rCM(data.region).get(p.crop);
        if (c && p.plantDate) {
          const dLeft = c.days - daysBetweenLocalKeys(p.plantDate, now);
          r += `${c.emoji} ${p.name || p.crop}${dLeft <= 0 ? " — READY TO HARVEST!" : ` — ${dLeft}d to harvest`}\n`;
        } else {
          r += `${c?.emoji || "🌱"} ${p.name || p.crop} (planned)\n`;
        }
      });
    } else { r += "No crops planted yet.\n"; }
    if (userAnimals.length > 0) {
      r += `\nAnimals:\n`;
      userAnimals.forEach(a => {
        const db = LDB[a.type];
        r += `${db?.e || "🐄"} ${a.count}x ${a.type}${a.breed ? ` (${a.breed})` : ""}\n`;
      });
    } else { r += "\nNo animals yet.\n"; }
    const costs = data.costs?.items || [];
    const exp = costs.filter(i => i.type === "expense").reduce((s, i) => s + i.amount, 0);
    const inc = costs.filter(i => i.type !== "expense").reduce((s, i) => s + i.amount, 0);
    if (costs.length > 0) r += `\nFinancials: Spent ${formatMoneyShort(exp, data)} | Revenue ${formatMoneyShort(inc, data)} | Net ${formatMoneyShort(inc - exp, data)}`;
    return r;
  }

  // ── 6. WHAT TO DO TODAY ──
  if (q.match(/what.*do|today|task|todo|should i|next step|what now|action/)) {
    const tasks = buildTaskQueue(data);
    if (tasks.length === 0) {
      return "No tasks right now! Here's what you can do:\n\n1. See what to sow now (Plan)\n2. Plant a new crop (My Space → Crops)\n3. Add animals (My Space → Animals)\n4. Change your layout (My Space → Map → Edit)";
    }
    let r = "Today's Priority Tasks\n\n";
    tasks.slice(0, 8).forEach((t, i) => {
      const pri = t.pri === 0 ? "URGENT" : t.pri <= 1 ? "High" : t.pri <= 2 ? "Medium" : "Low";
      r += `${i + 1}. [${pri}] ${t.emoji} ${t.title}\n   ${t.loc}${t.daysOut > 0 ? ` — in ${t.daysOut}d` : t.daysOut === 0 ? " — TODAY" : ""}\n`;
    });
    return r;
  }

  // ── 7. PRESERVATION QUERIES ──
  if (q.match(/preserv|can|pickl|ferment|dry|dehydrat|freez|store|storage|jam|sauce|smok|cure|curing|cheese|cellar/)) {
    const method = findPreservation(q, false);
    if (method) return preservationAnswer(method);
    // General preservation advice
    let r = "Food Preservation Methods\n\n";
    r += "Full guides in Learn → Preserving:\n";
    const cats = {};
    Object.values(PRESERVATION).forEach((p) => {
      if (!cats[p.cat]) cats[p.cat] = [];
      cats[p.cat].push(p.name);
    });
    Object.entries(cats).forEach(([cat, items]) => {
      r += `\n${cat}: ${items.join(", ")}\n`;
    });
    r += "\nAsk me about a specific method like 'how to pickle' or 'how to make jam'.";
    return r;
  }

  // ── 8. WATERING GENERAL ──
  if (q.match(/water|irrigat/)) {
    if (activePlots.length > 0) {
      let r = "Watering Guide for Your Crops\n\n";
      activePlots.forEach(p => {
        const c = rCM(data.region).get(p.crop);
        if (c) r += `${c.emoji} ${p.name || p.crop}: ${c.waterFreq} — ${c.waterNote}\n\n`;
      });
      r += "General tip: Water in the early morning at the base of plants, not on leaves.";
      return r;
    }
    return "Watering Tips\n\nEarly morning is best. Water at the base, not on leaves. Most vegetables need water every 2-3 days in summer. Check soil moisture by sticking your finger 5cm deep — if dry, water.\n\nPlant some crops and I'll give you specific watering schedules!";
  }

  // ── 9. YELLOWING LEAVES ──
  if (q.match(/yellow|leaf|leaves/)) {
    return "Yellowing Leaves — Common Causes\n\n1. Nitrogen deficiency: Lower leaves yellow first. Fix with compost tea or balanced fertilizer.\n2. Overwatering: Leaves yellow and droop. Let soil dry between waterings.\n3. Underwatering: Leaves dry and curl. Water deeply and consistently.\n4. pH imbalance: Test soil. Most vegetables want pH 6.0-7.0.\n5. Pests: Check undersides of leaves for aphids, whitefly, or mites.\n6. Natural aging: Oldest leaves yellow as plant matures — normal.\n\nTip: If it's just the bottom leaves, it's likely nitrogen. If it's all over, check water and pH first.";
  }

  // ── 10. HEAT STRESS ──
  if (q.match(/heat|hot|summer|shade|scorch|sunburn|wilt/)) {
    return "Heat Stress Management\n\nSigns: Wilting in afternoon, leaf curl, blossom drop, sunscald on fruit.\n\nImmediate actions:\n1. Water deeply in early morning (before 8am)\n2. Mulch 8-10cm thick to keep roots cool\n3. Shade cloth (30-50%) over sensitive crops\n4. Mist plants in late afternoon (not midday!)\n5. Harvest early morning when cool\n\nHeat-tolerant crops: Okra, eggplant, peppers, sweet potato, watermelon.\nHeat-sensitive: Lettuce, spinach, peas, broccoli — grow these in spring/fall.";
  }

  // ── 11. BEGINNER QUERIES ──
  if (q.match(/beginner|start|new|first time|easy|simple|recommend/)) {
    const easyCrops = rCR(data.region).filter(c => getCropDifficulty(c.name).l === "Easy").slice(0, 6);
    let r = "Getting Started — Beginner's Guide\n\n";
    r += "Start with these easy crops:\n";
    easyCrops.forEach(c => { r += `${c.emoji} ${c.name} — ${c.days} days, ${c.spacing}cm spacing\n`; });
    r += "\nFirst steps:\n";
    r += "1. Set up your layout (My Space → Map)\n";
    r += "2. Plant 2-3 easy crops to build confidence\n";
    r += "3. Follow the step-by-step guides in each crop card\n";
    r += "4. Check Today each morning\n";
    r += "5. Harvest and enjoy!\n\n";
    r += "For animals, start with chickens — they're the easiest and give you eggs daily.";
    return r;
  }

  // ── 12. SOIL QUERIES ──
  if (q.match(/soil|ph|compost|mulch|fertiliz|nutrient|nitrogen|potassium|phosphor/)) {
    return "Soil Health Guide\n\nIdeal soil pH for most vegetables: 6.0-7.0\n\nImproving soil:\n1. Compost: Add 5-8cm yearly. Best all-round amendment.\n2. Mulch: 8-10cm straw or wood chips. Retains moisture, suppresses weeds.\n3. Crop rotation: Never plant the same family in the same spot 2 years running.\n4. Cover crops: Plant clover or rye in fallow beds over winter.\n\nFertilizer basics:\n- N (Nitrogen): Leafy growth. Compost, blood meal, fish emulsion.\n- P (Phosphorus): Roots and flowers. Bone meal, rock phosphate.\n- K (Potassium): Fruit and disease resistance. Wood ash, potassium sulfate.\n\nTest your soil yearly. Local agricultural offices often do free tests.";
  }

  // ── 13. LIST ALL CROPS ──
  if (q.match(/list.*crop|all crop|crop list|what crop|how many crop/)) {
    let r = `All ${rCR(data.region).length} Crops in Database\n\n`;
    const byCat = {};
    rCR(data.region).forEach(c => { if (!byCat[c.cat]) byCat[c.cat] = []; byCat[c.cat].push(c); });
    Object.entries(byCat).forEach(([cat, crops]) => {
      r += `${cat} (${crops.length}):\n`;
      crops.forEach(c => { r += `  ${c.emoji} ${c.name} — ${c.days}d\n`; });
      r += "\n";
    });
    return r;
  }

  // ── 14. LIST ALL ANIMALS ──
  if (q.match(/list.*animal|all animal|animal list|what animal|how many animal/)) {
    let r = `All ${Object.keys(LDB).length} Animals in Database\n\n`;
    Object.entries(LDB).forEach(([name, db]) => {
      r += `${db.e} ${name} — Produces: ${db.prod.join(", ")}\n`;
    });
    r += "\nAsk about any animal for detailed care guide, breeds, and produce info.";
    return r;
  }

  // ── 15. HELP / WHAT CAN YOU DO ──
  if (q.match(/help|what can you|can you|how to use|feature|capabilit/)) {
    return "I'm your offline farming encyclopedia! Here's what I can help with:\n\n" +
      "Crops: \"How to grow tomatoes\", \"tomato pests\", \"tomato varieties\"\n" +
      "Animals: \"chicken feeding\", \"goat health\", \"cow breeds\"\n" +
      "Seasonal: \"What to plant now\", \"what's in season\"\n" +
      "Companions: \"What to plant with tomatoes\"\n" +
      "Tasks: \"What should I do today\"\n" +
      "My farm: \"Farm status\", \"My crops\"\n" +
      "Preservation: \"How to pickle\", \"how to make jam\"\n" +
      "General: \"Soil health\", \"watering tips\", \"heat stress\"\n" +
      "Lists: \"All crops\", \"All animals\"\n\n" +
      `I have data on ${rCR(data.region).length} crops, ${Object.keys(LDB).length} animals, ${Object.keys(PRESERVATION).length} preservation methods, and ${Object.keys(VARIETIES).length > 0 ? Object.values(VARIETIES).flat().length : 0} varieties. All offline!`;
  }

  // ── FALLBACK: Try to find any matching content ──
  // Search crop names, animal names, preservation names
  const allNames = [...rCR(data.region).map(c => ({name: c.name, type: "crop", emoji: c.emoji})),
    ...Object.entries(LDB).map(([k, v]) => ({name: k, type: "animal", emoji: v.e})),
    ...Object.keys(PRESERVATION).map(k => ({name: k, type: "preservation", emoji: "🫙"}))];

  const fuzzyMatches = allNames.filter(n => {
    const nLow = n.name.toLowerCase();
    return words.some(w => w.length > 2 && nLow.includes(w));
  });

  if (fuzzyMatches.length > 0) {
    let r = "I found some matches for your question:\n\n";
    fuzzyMatches.slice(0, 5).forEach(m => {
      r += `${m.emoji} ${m.name} (${m.type})\n`;
    });
    r += "\nTry asking specifically, like \"how to grow " + fuzzyMatches[0].name + "\" or \"" + fuzzyMatches[0].name + " care guide\".";
    return r;
  }

  return `I didn't find a specific answer for "${query}" in my database.\n\nTry asking about:\n- A specific crop: "How to grow tomatoes"\n- An animal: "Chicken care"\n- Seasonal advice: "What to plant now"\n- Your farm: "My farm status"\n- Tasks: "What should I do today"\n\nI have ${rCR(data.region).length} crops and ${Object.keys(LDB).length} animals in my offline knowledge base!`;
}

// ── Build suggestion catalog from all database entries ──
function buildAISuggestions(region) {
  const s = [];
  // Crop suggestions — region-filtered: crops with _na for this region are excluded.
  rCR(region).forEach(c => {
    s.push({e:c.emoji, q:`How to grow ${c.name}`, cat:"Crop Guide", keys:[c.name.toLowerCase(),"grow","plant","guide"]});
    s.push({e:c.emoji, q:`${c.name} pests & diseases`, cat:"Pest Help", keys:[c.name.toLowerCase(),"pest","disease","bug"]});
    s.push({e:c.emoji, q:`${c.name} watering guide`, cat:"Watering", keys:[c.name.toLowerCase(),"water","irrigat"]});
    s.push({e:c.emoji, q:`${c.name} harvest info`, cat:"Harvest", keys:[c.name.toLowerCase(),"harvest","pick","ready"]});
    s.push({e:c.emoji, q:`${c.name} varieties`, cat:"Varieties", keys:[c.name.toLowerCase(),"variet","type","best"]});
    s.push({e:c.emoji, q:`Companion planting for ${c.name}`, cat:"Companions", keys:[c.name.toLowerCase(),"companion","plant with"]});
  });
  // Animal suggestions
  Object.entries(LDB).forEach(([name, db]) => {
    s.push({e:db.e, q:`${name} care guide`, cat:"Animal Care", keys:[name.toLowerCase(),"care","guide"]});
    s.push({e:db.e, q:`${name} feeding guide`, cat:"Feeding", keys:[name.toLowerCase(),"feed","food","diet"]});
    s.push({e:db.e, q:`${name} housing`, cat:"Housing", keys:[name.toLowerCase(),"house","coop","barn","shelter"]});
    s.push({e:db.e, q:`${name} breeding`, cat:"Breeding", keys:[name.toLowerCase(),"breed","mating","baby"]});
    s.push({e:db.e, q:`${name} health & injuries`, cat:"Health", keys:[name.toLowerCase(),"health","sick","vet","injur"]});
    s.push({e:db.e, q:`${name} produce & yield`, cat:"Produce", keys:[name.toLowerCase(),"produce","egg","milk","yield"]});
    if (BREEDS[name]?.length > 0) s.push({e:db.e, q:`${name} breeds`, cat:"Breeds", keys:[name.toLowerCase(),"breed","type"]});
    if (getRegionalCalendar(name, region)) s.push({e:db.e, q:`${name} monthly calendar`, cat:"Calendar", keys:[name.toLowerCase(),"calendar","month","schedule"]});
  });
  // Preservation suggestions
  Object.values(PRESERVATION).forEach((p) => {
    const nameWords = p.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    s.push({e:p.icon||"🫙", q:`${p.name} guide`, cat:"Preservation", keys:[...nameWords,"preserv","store"]});
  });
  // General topics
  s.push({e:"🌱", q:"What should I plant now?", cat:"Seasonal", keys:["plant","sow","season","month","now"]});
  s.push({e:"📋", q:"What should I do today?", cat:"Tasks", keys:["today","task","todo","do","action"]});
  s.push({e:"🌾", q:"My farm status", cat:"Farm", keys:["farm","status","overview","my"]});
  s.push({e:"🤝", q:"Companion planting tips", cat:"Companions", keys:["companion","together","pair"]});
  s.push({e:"💧", q:"Watering tips for my crops", cat:"Watering", keys:["water","irrigat"]});
  s.push({e:"🌿", q:"Soil health guide", cat:"Soil", keys:["soil","ph","compost","mulch","fertiliz"]});
  s.push({e:"🌡️", q:"Heat stress management", cat:"Weather", keys:["heat","hot","summer","shade","wilt"]});
  s.push({e:"🍂", q:"Yellowing leaves diagnosis", cat:"Diagnosis", keys:["yellow","leaf","leaves"]});
  s.push({e:"🌱", q:"Beginner's guide to farming", cat:"Getting Started", keys:["beginner","start","new","first","easy"]});
  s.push({e:"📜", q:"List all crops", cat:"Lists", keys:["list","all crop","crop list"]});
  s.push({e:"🐾", q:"List all animals", cat:"Lists", keys:["list","all animal","animal list"]});
  s.push({e:"❓", q:"What can you help with?", cat:"Help", keys:["help","what can","feature"]});
  return s;
}


export { farmKnowledgeEngine, buildAISuggestions };
