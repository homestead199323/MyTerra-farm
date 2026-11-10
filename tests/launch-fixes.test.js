// Regression tests for the pre-launch audit fixes (2026-10-12).
import test from 'node:test';
import assert from 'node:assert/strict';
import {daysBetweenLocalKeys,localDayNumber,localDateFromKey,todayLocalKey,markTaskDone} from '../src/lib/utils.js';
import {parseTaskKey,buildTaskQueue} from '../src/lib/task-queue.js';
import {applyTaskCompletion,undoTaskCompletion} from '../src/features/quiet/complete-task.js';
import {applySeedlingStage} from '../src/lib/seedling-stage.js';
import {getRegionalVarieties} from '../src/lib/regional.js';
import {normalizeUnit,migratePantry} from '../src/lib/inventory.js';
import {CITY_DB} from '../src/data/cities.js';
import {fixture} from './fixture.js';


test('Day arithmetic is whole calendar days in every time zone (DST changes included)',()=>{
  // Spring forward (Europe: last Sunday of March) and fall back (last Sunday of October) — the
  // old floor((to-from)/864e5) undercounted by one for the whole summer in DST zones.
  assert.equal(daysBetweenLocalKeys('2027-03-25',new Date(2027,3,4)),10);
  assert.equal(daysBetweenLocalKeys('2026-03-01',new Date(2026,5,1)),92);
  assert.equal(daysBetweenLocalKeys('2026-10-20',new Date(2026,9,30)),10);
  assert.equal(daysBetweenLocalKeys('garbage',new Date()),0);
  // Consecutive local midnights always advance the ordinal by exactly one.
  for(const [y,m,d0] of [[2026,2,26],[2026,9,22],[2027,2,25]]){
    let prev=localDayNumber(new Date(y,m,d0));
    for(let i=1;i<8;i++){const n=localDayNumber(new Date(y,m,d0+i));assert.equal(n-prev,1,`day ${y}-${m+1}-${d0+i}`);prev=n;}
  }
  assert.equal(localDayNumber(localDateFromKey('1970-01-02')),1);
});

test('Completion keys with UUID ids parse into kind / id / suffix',()=>{
  const id='3fa85f64-5717-4562-b3fc-2c963f66afa6';
  assert.deepEqual(parseTaskKey(`plot-${id}-water`),{kind:'plot',id,suffix:'water'});
  assert.deepEqual(parseTaskKey(`plot-${id}-step-12`),{kind:'plot',id,suffix:'step-12'});
  assert.deepEqual(parseTaskKey(`animal-${id}-health`),{kind:'animal',id,suffix:'health'});
  assert.deepEqual(parseTaskKey('species-Guinea Fowl-eggs'),{kind:'species',id:'Guinea Fowl',suffix:'eggs'});
  assert.equal(parseTaskKey('nonsense'),null);
});

test('Animal periodic jobs are planned with a DST-safe day ordinal',()=>{
  // The same hen-house must get its weekly clean exactly once per 7-day window around the clock change.
  const data={...fixture,livestock:{animals:[{id:'hens',type:'Chicken',count:3,zone:'coop'}]}};
  for(const start of [new Date(2026,2,25),new Date(2026,9,21)]){
    let cleans=0;
    for(let i=0;i<14;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);if(buildTaskQueue(data,{now:d}).some(t=>t.key==='species-Chicken-clean'))cleans++;}
    assert.equal(cleans,2);
  }
});

test('Harvest fallback scales the per-plant yield by the plant count; a typed 0 kg is kept as a failed crop',()=>{
  const plots=fixture.garden.plots.map(p=>p.id==='lettuce'?{...p,expectedYieldKg:undefined}:p);
  const data={...fixture,garden:{plots}};
  const task={key:'plot-lettuce-harvest',type:'harvest',plotId:'lettuce'};
  const next=applyTaskCompletion(data,task,undefined);
  assert.equal(next.pantry.items[0].qty,2); // Lettuce yld 0.2 kg/plant × 10 plants
  const failed=applyTaskCompletion(data,task,0,{allowZero:true});
  assert.equal((failed.pantry.items||[]).length,0);
  assert.equal(failed.garden.plots.find(p=>p.id==='lettuce').status,'harvested');
  assert.equal(failed.memory.harvests.at(-1).kg,0);
});

test('Done today → Undo un-ticks a care step and un-starts a sowing',()=>{
  const sow={id:'s',crop:'Lettuce',zone:'bed2',status:'planned',sowPending:true,sowFrom:'2026-01',plantCount:4,steps:[{l:'Sow',t:'',d:0,done:false},{l:'Thin',t:'',d:14,done:false}]};
  const data={...fixture,garden:{plots:[sow]}};
  const key='plot-s-step-0';
  const ticked=applyTaskCompletion(data,{key,type:'step',plotId:'s',stepIdx:0},null);
  const p1=ticked.garden.plots[0];
  assert.equal(p1.steps[0].done,true);
  assert.equal(p1.status,'planted');
  const undone=undoTaskCompletion(ticked,key);
  const p2=undone.garden.plots[0];
  assert.equal(p2.steps[0].done,false);
  assert.equal(p2.status,'planned');
  assert(!(undone.completions[todayLocalKey()]||[]).includes(key));
});

test('Planting out a seedling batch whose bed planting was deleted unlinks it instead of planting into nothing',()=>{
  const data={...fixture,nursery:{batches:[{id:'b1',crop:'Tomato',plants:6,cells:8,stage:'hardening',plotId:'gone',targetZoneId:'bed1',sowDate:'2026-03-01',plantOutDate:'2026-05-01'}]}};
  const next=applySeedlingStage(data,'b1','planted','2026-05-02');
  const b=next.nursery.batches[0];
  assert.equal(b.stage,'hardening');
  assert.equal(b.plotId,null);
  // The Today tick goes through markTaskDone → same behaviour.
  const viaTick=markTaskDone(data,'seed-b1-planted');
  assert.equal(viaTick.nursery.batches[0].plotId,null);
});

test('Regional variety lists come from the region, with the Western-Europe base as fallback',()=>{
  assert.equal(getRegionalVarieties('Potato','western_europe')[0].name,'Maris Piper');
  assert.equal(getRegionalVarieties('Potato','mediterranean')[0].name,'Spunta');
  assert.equal(getRegionalVarieties('Potato')[0].name,'Maris Piper');
  assert.deepEqual(getRegionalVarieties('Potato','us_cold').length>0,true);
  assert.deepEqual(getRegionalVarieties('',"mediterranean"),[]);
});

test('Pantry units: grams and millilitres convert; old lots get ids so FIFO takes the right one',()=>{
  assert.deepEqual(normalizeUnit('g',500),{unit:'kg',qty:0.5});
  assert.deepEqual(normalizeUnit('ml',250),{unit:'L',qty:0.25});
  const data={...fixture,pantry:{items:[{name:'Honey',unit:'kg',qty:1},{name:'Honey',unit:'kg',qty:2}]}};
  const ids=migratePantry(data).pantry.items.map(i=>i.id);
  assert.equal(ids.filter(Boolean).length,2);
  assert.notEqual(ids[0],ids[1]);
});

test('City list has no duplicate city/country rows',()=>{
  const seen=new Set();
  for(const c of CITY_DB){const k=`${c.city}|${c.country}`.toLowerCase();assert(!seen.has(k),`duplicate ${k}`);seen.add(k);}
});

// Living map (2026-10-14): the hand-drawn zig-zag "parking" path by the Kitchen workshop becomes a Yard zone.
import {migrateYardLine,YARD_LINE_POINTS} from '../src/lib/migrations.js';
test('migration: the workshop zig-zag becomes a yard',()=>{
  const line={id:'p2',kind:'path',points:YARD_LINE_POINTS.map(([xM,yM])=>({xM,yM}))};
  const data={zones:[{id:'ws',type:'storage',name:'Kitchen workshop',xM:46,yM:36,wM:10,hM:8}],mapLines:[{id:'p1',kind:'path',points:[{xM:1,yM:1},{xM:2,yM:2}]},line]};
  const out=migrateYardLine(data);
  assert.equal(out.mapLines.length,1);assert.equal(out.mapLines[0].id,'p1');
  const yard=out.zones.find(z=>z.type==='yard');assert.ok(yard);assert.deepEqual([yard.xM,yard.yM,yard.wM,yard.hM],[46,46,33,4]);assert.equal(yard.id,'yard-ws');
  assert.equal(migrateYardLine(out),out,'idempotent');
  const changed={...data,mapLines:[{...line,points:line.points.map((p,i)=>i===3?{...p,xM:80}:p)}]};
  assert.equal(migrateYardLine(changed).mapLines.length,1);assert.ok(!migrateYardLine(changed).zones.some(z=>z.type==='yard'),'a different line is left alone');
  assert.equal(migrateYardLine({zones:[]}).zones.length,0,'no mapLines → untouched');
});

// ── 2026-11-10: conservative yields, Pacific Northwest region, apple + pear ──
test('Conservative yields: a denser grid never estimates more per square metre than standard rows', async () => {
  const { CROPS } = await import('../src/data/crops.js');
  const { spacingGuide, crowdingFactor, plantDensity } = await import('../src/data/spacing.js');
  for (const crop of CROPS) {
    const rows = spacingGuide(crop, 'rows'), hex = spacingGuide(crop, 'offset');
    const perM2Rows = plantDensity(rows.inRowCM, rows.rowCM) * crop.yld * crowdingFactor(crop, rows.inRowCM, rows.rowCM);
    const perM2Hex = plantDensity(hex.inRowCM, hex.rowCM) * crop.yld * crowdingFactor(crop, hex.inRowCM, hex.rowCM);
    assert.equal(crowdingFactor(crop, rows.inRowCM, rows.rowCM), 1, crop.name);
    assert(perM2Hex <= perM2Rows * 1.035, `${crop.name}: offset ${perM2Hex} > rows ${perM2Rows}`);
  }
});
test('Conservative yields: a variety never swaps a regional yield for the base one', async () => {
  const { getRegionalVarieties, getRegionalCrop } = await import('../src/lib/regional.js');
  const { CROP_MAP } = await import('../src/data/crops.js');
  const { VARIETIES, VAR_RO } = await import('../src/data/varieties.js');
  // Zucchini has no northern list: the base list is borrowed, scaled to the northern crop yield
  assert.equal(VAR_RO.northern_europe.Zucchini, undefined);
  const base = VARIETIES.Zucchini, north = getRegionalVarieties('Zucchini', 'northern_europe');
  const k = getRegionalCrop(CROP_MAP.get('Zucchini'), 'northern_europe').yld / CROP_MAP.get('Zucchini').yld;
  assert(k < 1);
  assert.deepEqual(north.map((v) => v.name), base.map((v) => v.name));
  north.forEach((v, i) => assert(Math.abs(v.yld - base[i].yld * k) <= base[i].yld * k * 0.06, v.name));
  assert.equal(getRegionalVarieties('Zucchini', 'northern_europe'), north); // memoised, stable reference
  assert.equal(getRegionalVarieties('Zucchini', 'western_europe'), base);
  // no variety promises more than about a third above the yield of the crop it belongs to (25% + rounding)
  for (const region of ['western_europe', 'mediterranean', 'northern_europe', 'us_warm', 'us_cold']) {
    for (const name of Object.keys(VARIETIES)) {
      const crop = getRegionalCrop(CROP_MAP.get(name), region);
      if (!crop) continue;
      for (const v of getRegionalVarieties(name, region)) {
        if (!v.yld) continue;
        assert(v.yld <= crop.yld * 1.35, `${region} ${name} ${v.name}: ${v.yld} vs ${crop.yld}`);
      }
    }
  }
});
test('Pacific Northwest uses the maritime (Western Europe) guide and keeps dollars', async () => {
  const { searchCity } = await import('../src/data/cities.js');
  const { currencyCode } = await import('../src/lib/money.js');
  const region = (q, country) => searchCity(q).find((c) => c.city === q && (!country || c.country === country)).region;
  for (const [q, c] of [['Seattle', 'US'], ['Portland', 'US'], ['Vancouver', 'Canada'], ['Victoria', 'Canada'], ['Oregon', 'US'], ['Washington', 'US'], ['British Columbia', 'Canada']])
    assert.equal(region(q, c), 'western_europe', q);
  assert.equal(region('Los Angeles', 'US'), 'us_warm');
  assert.equal(region('Maryland', 'US'), region('Baltimore', 'US'));
  // with no usable device locale the farm's town decides, before the climate group
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { languages: [] }, configurable: true });
  try {
    assert.equal(currencyCode({ city: 'Seattle, US', region: 'western_europe' }), 'USD');
    assert.equal(currencyCode({ city: 'Vancouver, Canada', region: 'western_europe' }), 'CAD');
    assert.equal(currencyCode({ city: 'Leeds, UK', region: 'western_europe' }), 'EUR');
    assert.equal(currencyCode({ city: 'Leeds, UK', region: 'western_europe', currency: 'GBP' }), 'GBP');
  } finally {
    if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator;
  }
});
test('Apple and pear are full crops in every region', async () => {
  const { CROPS, CROP_MAP } = await import('../src/data/crops.js');
  const { getRegionalCrop, getRegionalVarieties } = await import('../src/lib/regional.js');
  const { cropMeasureType } = await import('../src/lib/farm-calc.js');
  const { isTreeCrop, cropFitsZone } = await import('../src/features/quiet/planting-plan.js');
  const { getCropDifficulty } = await import('../src/lib/calendar.js');
  const { BLOSSOM } = await import('../src/data/frost.js');
  assert.equal(CROPS.length, 72);
  const keys = Object.keys(CROP_MAP.get('Plum')).sort();
  for (const name of ['Apple', 'Pear']) {
    const crop = CROP_MAP.get(name);
    assert.deepEqual(Object.keys(crop).sort(), keys, name);
    assert(isTreeCrop(crop) && cropFitsZone(crop, { type: 'orchard' }) && BLOSSOM.has(name));
    assert.equal(cropMeasureType(name, 'western_europe'), 'plants');
    assert(getCropDifficulty(name));
    for (const region of ['western_europe', 'mediterranean', 'northern_europe', 'us_warm', 'us_cold']) {
      const rc = getRegionalCrop(crop, region);
      assert(rc && rc.yld > 0 && rc.pests.length >= 3, `${region} ${name}`);
      assert.equal(getRegionalVarieties(name, region).length, 5, `${region} ${name}`);
    }
  }
});
