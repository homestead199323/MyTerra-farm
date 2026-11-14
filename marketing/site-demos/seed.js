// Builds a demo garden with the app's own code (planting planner, yield, pantry, memory),
// running inside the page so every record has the shape the app itself would write.
const SPECS = require('./specs');
async function seed(page, env, today, ageShift = 0) {
  let spec = SPECS[env];
  // An earlier date for the same garden (the frosty May week): everything is that many days younger, and what would
  // not be in the ground yet has only just gone in. Trees keep their age.
  if (ageShift) spec = { ...spec, plantings: spec.plantings.map((pl, i) => (pl.ago >= 300 ? pl : { ...pl, ago: Math.max(pl.ago - ageShift, 3 + ((i * 3) % 8)) })) };
  const out = await page.evaluate(async ({ spec, today }) => {
    const [{ CROPS }, reg, pp, fc, ut, inv, mem, st, per, zt, nm] = await Promise.all([
      import('/src/data/crops.js'), import('/src/lib/regional.js'), import('/src/features/quiet/planting-plan.js'), import('/src/lib/farm-calc.js'),
      import('/src/lib/utils.js'), import('/src/lib/inventory.js'), import('/src/lib/memory.js'), import('/src/app/state.js'), import('/src/lib/perennial.js'), import('/src/data/zones.js'), import('/src/features/nursery/nursery-model.js')]);
    const region = 'western_europe', notes = [];
    const day = (n) => ut.addDaysToLocalKey(today, n);
    const r1 = (n) => Math.round(n * 10) / 10;
    const zones = spec.zones.map(([id, type, name, xM, yM, wM, hM, extra]) => ({ id, name, emoji: (zt.ZT_MAP.get(type) || {}).icon || '', type, areaM2: r1(wM * hM), soilType: 'loam', notes: '', xM, yM, wM, hM, ...(extra || {}) }));
    const plots = [];
    for (const pl of spec.plantings) {
      const zone = zones.find((z) => z.id === pl.zone); const crop = CROPS.find((c) => c.name === pl.crop);
      if (!zone || !crop) { notes.push('missing ' + pl.crop + '/' + pl.zone); continue; }
      const rc = reg.getRegionalCrop(crop, region) || crop;
      let plan = null, n = pl.count;
      while (n >= 1) {
        const form = { plantCount: n, mode: 'plants' };
        for (const k of ['axis', 'pattern', 'lengthM', 'spacingCM', 'rowSpacingCM']) if (pl[k] !== undefined) form[k] = pl[k];
        const input = pp.plantingInput(form, rc, zone);
        plan = pp.planPlanting(zone, plots, input, rc);
        if (!plan.error) break;
        n = n > 12 ? Math.floor(n * 0.85) : n - 1;
      }
      if (!plan || plan.error) { notes.push('no room: ' + pl.crop + ' in ' + zone.name + ' — ' + (plan && plan.error)); continue; }
      if (plan.count !== pl.count) notes.push(pl.crop + ' in ' + zone.name + ': ' + plan.count + ' of ' + pl.count + ' fit');
      const days = rc.days || crop.days, recurring = per.isRecurringCrop(crop);
      const plantDate = day(-pl.ago);
      const yieldKg = fc.expectedYield(crop.name, plan.count, 'plants', null, region);
      const plot = {
        id: pl.id || (pl.zone + '-' + pl.crop.toLowerCase().replace(/[^a-z]+/g, '-')), zone: zone.id, crop: crop.name, variety: pl.variety || '', varietyNote: '', name: pl.name || crop.name,
        plantDate, harvestDate: pl.dueIn !== undefined ? day(pl.dueIn) : ut.addDaysToLocalKey(plantDate, days), status: 'planted',
        plantCount: plan.count, qty: plan.count, measureType: 'plants', expectedYieldKg: yieldKg ? Math.round(yieldKg * (plan.yieldFactor != null ? plan.yieldFactor : 1) * 10) / 10 : 0,
        growDays: days, notes: '', layout: plan.layout, plantingPattern: plan.layout.pattern,
        // steps whose day has passed were done on time; the harvest step stays open
        steps: (rc.steps || crop.steps || []).map((s, i, a) => ({ ...s, done: s.d <= pl.ago - (pl.lag || 0) && i < a.length - 1 && !/harvest|pick/i.test(s.l) })),
      };
      if (recurring && pl.harvests) { plot.harvests = pl.harvests; plot.lastHarvest = pl.lastHarvest ? day(pl.lastHarvest) : undefined; }
      if (pl.stage) plot.observedStage = pl.stage;
      plots.push(plot);
    }
    let data = { ...st.DEF, setupDone: true, designerTutorialSeen: true, region, city: spec.city || '', farmName: spec.name || '', farmW: spec.farmW, farmH: spec.farmH,
      profile: { ...st.DEF.profile, ...spec.profile, onboardingVersion: 2 }, zones, garden: { plots },
      livestock: { animals: (spec.animals || []).map(([id, type, name, count, zone, breed]) => ({ name, type, breed: breed || '', count, cost: '', zone, id })) },
      ornaments: spec.ornaments || [], mapLines: spec.mapLines || [],
      gamify: { ...st.DEF.gamify, streak: spec.streak || 1, bestStreak: spec.streak || 1, lastActiveDate: day(-1), totalPlants: plots.length, celebratedBadges: [] } };
    // History, oldest first, through the same functions the app uses when a job is ticked.
    const hist = [];
    for (const h of spec.history || []) {
      if (h.every) { for (let d = h.from; d <= h.to; d += h.every) hist.push({ ...h, at: d, qty: Array.isArray(h.qty) ? h.qty[Math.abs(d) % h.qty.length] : h.qty }); }
      else hist.push(h);
    }
    hist.sort((a, b) => a.at - b.at);
    for (const h of hist) {
      const d = day(h.at);
      if (h.kind === 'eggs') { data = mem.recordProduce(data, h.sp, 'eggs', h.qty, d, false); data = inv.addStock(data, { name: h.sp + ' Eggs', category: 'Eggs', qty: h.qty, unit: 'pcs', source: 'livestock', storageNote: 'Refrigerate.' }, d); }
      else if (h.kind === 'milk') { data = mem.recordProduce(data, h.sp, 'milkL', h.qty, d, false); data = inv.addStock(data, { name: h.sp + ' Milk', category: 'Dairy', qty: h.qty, unit: 'L', source: 'livestock', storageNote: 'Strain and chill.' }, d); }
      else if (h.kind === 'harvest') { const crop = CROPS.find((c) => c.name === h.crop); data = mem.recordHarvest(data, { id: 'old-' + h.crop + h.at, zone: h.zone, crop: h.crop, plantDate: day(h.at - (crop.days || 60)) }, h.qty, d, h.exp || null, true, false); data = inv.addStock(data, { name: h.crop, category: 'Fresh Produce', qty: h.qty, unit: 'kg', source: 'farm', storageNote: crop.storage || '' }, d); }
      else if (h.kind === 'stock') { data = inv.addStock(data, { name: h.name, category: h.category, qty: h.qty, unit: h.unit, source: h.source || 'farm', storageNote: '' }, d); }
      else if (h.kind === 'sell') { data = inv.sellStock(data, { key: h.key, qty: h.qty, price: h.price, buyer: h.buyer || '', paid: h.paid !== false, today: d, date: d }); }
      else if (h.kind === 'use') { data = inv.takeStock(data, { key: h.key, qty: h.qty, kind: h.how || 'use', today: d }); }
      else if (h.kind === 'cost') { data = { ...data, costs: { ...(data.costs || {}), items: [...((data.costs && data.costs.items) || []), { id: 'c' + h.at + h.label.replace(/\W/g, ''), type: 'expense', amount: h.amount, label: h.label, date: d, cat: h.cat }] } }; }
    }
    data.log = (data.log || []).slice(-40);
    return { data, notes, plots: plots.map((p) => p.crop + '@' + p.zone + ' x' + p.plantCount + ' due ' + p.harvestDate) };
  }, { spec, today });
  return out;
}
module.exports = seed;
