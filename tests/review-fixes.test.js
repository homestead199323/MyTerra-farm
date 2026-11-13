// Fixes from the 12 Nov 2026 usability review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LDB as LIVESTOCK_DB } from '../src/data/livestock.js';
import { PRESERVATION } from '../src/data/preservation.js';
import { CROPS } from '../src/data/crops.js';
import { stockLines, currentStorageNote, addBoughtStock } from '../src/lib/inventory.js';
import { logHarvest, harvestablePlots } from '../src/lib/harvest-log.js';
import { produceTotals } from '../src/lib/progress.js';
import { moneyAmount, formatMoneyShort } from '../src/lib/money.js';

const all = (o) => JSON.stringify(o);

test('no egg advice recommends water glassing', () => {
  assert.doesNotMatch(all(LIVESTOCK_DB), /water.?glass/i);
  assert.doesNotMatch(all(PRESERVATION), /water.?glass/i);
});

test('existing pantry lots with the old egg note show the new advice', () => {
  const [line] = stockLines([{ name: 'Chicken Eggs', unit: 'pcs', category: 'Eggs', qty: 2, storageNote: 'Unwashed 2-3wk. Water glass 12+mo.' }]);
  assert.doesNotMatch(line.storageNote, /water/i);
  assert.match(line.storageNote, /Fridge/);
  assert.equal(currentStorageNote('Something water-glass related'), '');
  assert.equal(currentStorageNote('Fresh 3-5 days.'), 'Fresh 3-5 days.');
});

test('oil preservation never promises months for fresh or cooked garlic, herbs or vegetables', () => {
  const o = PRESERVATION.oil_preservation;
  assert.doesNotMatch(o.shelf, /month/i);
  assert.match(o.shelf, /4 days/);
  assert.doesNotMatch(o.tip, /weeks/i);
  assert.match(o.overview, /does not kill the spores/i);
  assert.ok(o.sources && /Home Food Preservation/.test(o.sources));
  assert.doesNotMatch(o.method, /1g per 100g/);
});

test('no crop storage hint keeps food in oil for months', () => {
  CROPS.forEach((c) => {
    if (c.storage && /\bin oil\b/i.test(c.storage) && !/freeze in oil/i.test(c.storage))
      assert.match(c.storage, /4 days/, c.name);
  });
});

test('storage notes fit the pantry card (70 chars)', () => {
  assert.ok(LIVESTOCK_DB.Chicken.out.Eggs.s.length <= 70);
  CROPS.forEach((c) => { if (c.storage && /\bin oil\b/i.test(c.storage)) assert.ok(c.storage.length <= 70, c.name); });
});

test('money summaries keep cents: one 0.50 sale is 0.50, not 1', () => {
  assert.equal(moneyAmount(0.5), '0.50');
  assert.equal(moneyAmount(1), '1');
  assert.equal(moneyAmount(0.5 + 0.5), '1');
  assert.equal(moneyAmount(12.499), '12.50');
  assert.equal(moneyAmount(0.1 + 0.2), '0.30');
  assert.equal(formatMoneyShort(0.5, { currency: 'EUR' }), '€0.50');
});

test('a logged harvest counts once in both Pantry and Progress', () => {
  const plot = { id: 'p1', crop: 'Cress', zone: 'z1', status: 'planted', plantDate: '2026-11-02', steps: [{ d: 0, l: 'Sow', done: true }, { d: 10, l: 'Harvest' }] };
  const base = { region: 'we', garden: { plots: [plot] }, zones: [{ id: 'z1', name: 'Windowsill' }], pantry: { items: [] } };
  assert.equal(harvestablePlots(base).length, 1);
  const d = logHarvest(base, { plotId: 'p1', qty: 0.2, date: '2026-11-12' }, '2026-11-12');
  assert.equal(d.pantry.items.length, 1);
  assert.equal(d.pantry.items[0].source, 'farm');
  assert.equal(d.memory.harvests.length, 1);
  assert.equal(d.memory.harvests[0].kg, 0.2);
  const t = produceTotals(d, '2026-11-12', 6);
  assert.equal(t.kg, 0.2);
  assert.equal(t.harvests, 1);
  assert.equal(d.garden.plots[0].status, 'planted', 'not the last pick: planting stays');
  const last = logHarvest(base, { plotId: 'p1', qty: 0.3, last: true }, '2026-11-12');
  assert.equal(last.garden.plots[0].status, 'harvested');
  // bought stock does not count as a harvest
  const bought = addBoughtStock(base, { name: 'Cress', category: 'Fresh Produce', qty: 1, unit: 'kg' }, 2, '2026-11-12');
  assert.equal(produceTotals(bought, '2026-11-12', 6).harvests, 0);
});

test('harvest date cannot be in the future and empty amounts change nothing', () => {
  const base = { region: 'we', garden: { plots: [] }, pantry: { items: [] } };
  assert.equal(logHarvest(base, { name: 'Blackberries', qty: 0 }, '2026-11-12'), base);
  const d = logHarvest(base, { name: 'Blackberries', qty: 1, unit: 'kg', date: '2027-01-01' }, '2026-11-12');
  assert.equal(d.pantry.items[0].addedDate, '2026-11-12');
});
