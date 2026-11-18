import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLANS,PRICE_IDS,priceIdFor,planName,hasFeature,pageLock,foundingLeft,FOUNDING_LIMIT,yearlySaving} from '../src/services/payments/plans.js';
import {planLabel} from '../src/services/payments/plan-label.js';

const grow={plan:'basic',state:'active',canWrite:true,isPro:false,trialDaysLeft:0};
const homestead={plan:'pro',state:'active',canWrite:true,isPro:true,trialDaysLeft:0};
const trial={plan:'trial',state:'trial',canWrite:true,isPro:true,trialDaysLeft:5};
const trialOver={plan:'trial',state:'trial_expired',canWrite:false,isPro:false,trialDaysLeft:0};
const lifetime={plan:'lifetime',state:'lifetime',canWrite:true,isPro:true,trialDaysLeft:0};
const unknown={plan:'none',state:'unknown',canWrite:false,isPro:false,trialDaysLeft:0};

test('Plans are Grow, Homestead and Lifetime at the confirmed prices',()=>{
  const byId=Object.fromEntries(PLANS.map(p=>[p.id,p]));
  assert.deepEqual(PLANS.map(p=>p.id),['basic','pro','lifetime']);
  assert.equal(byId.basic.name,'Grow');assert.equal(byId.basic.month,4.99);assert.equal(byId.basic.year,39);
  assert.equal(byId.pro.name,'Homestead');assert.equal(byId.pro.month,9.99);assert.equal(byId.pro.year,79);
  assert.equal(byId.lifetime.name,'Lifetime');assert.equal(byId.lifetime.once,129);
  assert.equal(planName('basic'),'Grow');assert.equal(planName('pro'),'Homestead');assert.equal(planName('lifetime'),'Lifetime');
});

test('A yearly plan states its real saving against twelve monthly payments',()=>{
  assert.equal(yearlySaving(PLANS[0]),35);
  assert.equal(yearlySaving(PLANS[1]),34);
  assert.equal(yearlySaving(PLANS[2]),0);
});

test('Checkout picks the price for the plan and the billing period',()=>{
  assert.equal(priceIdFor('basic','month'),PRICE_IDS.basic.month);
  assert.equal(priceIdFor('basic','year'),PRICE_IDS.basic.year);
  assert.equal(priceIdFor('pro','year'),PRICE_IDS.pro.year);
  assert.equal(priceIdFor('lifetime','year'),PRICE_IDS.lifetime.once);
  assert.equal(priceIdFor('nope','month'),null);
  assert.notEqual(PRICE_IDS.basic.month,PRICE_IDS.basic.year);
});

test('RELEASE GUARD: every plan has a real Paddle price id',()=>{
  const ids=[PRICE_IDS.basic.month,PRICE_IDS.basic.year,PRICE_IDS.pro.month,PRICE_IDS.pro.year,PRICE_IDS.lifetime.once];
  ids.forEach(id=>assert.match(String(id),/^pri_[0-9a-z]{26}$/,'not a Paddle price id: '+id));
  assert.equal(new Set(ids).size,ids.length);
});

test('The payment webhook gives each price the plan the checkout sold',()=>{
  const hook=readFileSync('supabase/functions/paddle-webhook/index.ts','utf8');
  const tierOf=id=>{const m=hook.match(new RegExp('"'+id+'":\\s*"(basic|pro|lifetime)"'));return m?m[1]:null;};
  assert.equal(tierOf(PRICE_IDS.basic.month),'basic');
  assert.equal(tierOf(PRICE_IDS.basic.year),'basic');
  assert.equal(tierOf(PRICE_IDS.pro.month),'pro');
  assert.equal(tierOf(PRICE_IDS.pro.year),'pro');
  assert.equal(tierOf(PRICE_IDS.lifetime.once),'lifetime');
});

test('Grow leaves out animals, pantry, money, insights and the assistant; Homestead has them',()=>{
  ['animals','pantry','money','analytics','ai'].forEach(f=>{
    assert.equal(hasFeature(grow,f),false,'Grow should not have '+f);
    assert.equal(hasFeature(homestead,f),true,'Homestead should have '+f);
    assert.equal(hasFeature(trial,f),true,'the trial should have '+f);
    assert.equal(hasFeature(lifetime,f),true,'Lifetime should have '+f);
  });
  assert.equal(hasFeature(grow,'crops'),true);
  assert.equal(hasFeature(trialOver,'crops'),false);
  assert.equal(hasFeature(null,'crops'),false);
});

test('Animals, Pantry and Money are locked on Grow only, never for a read-only farm',()=>{
  assert.equal(pageLock(grow,'live'),'animals');
  assert.equal(pageLock(grow,'pantry'),'pantry');
  assert.equal(pageLock(grow,'fin'),'money');
  assert.equal(pageLock(grow,'crops'),null);
  assert.equal(pageLock(grow,'home'),null);
  ['live','pantry','fin'].forEach(p=>{
    assert.equal(pageLock(homestead,p),null);
    assert.equal(pageLock(trial,p),null);
    assert.equal(pageLock(lifetime,p),null);
    assert.equal(pageLock(trialOver,p),null,'a finished trial keeps its records visible');
    assert.equal(pageLock(unknown,p),null);
    assert.equal(pageLock({...grow,state:'past_due'},p)!==null,true);
    assert.equal(pageLock({...grow,state:'expired',canWrite:false},p)!==null,true,'Grow never included it');
    assert.equal(pageLock({...homestead,state:'expired',canWrite:false,isPro:false},p),null,'an ended Homestead plan keeps its records visible');
  });
});

test('Insights stay locked for anyone without Homestead features, as before',()=>{
  assert.equal(pageLock(grow,'insights'),'analytics');
  assert.equal(pageLock(trialOver,'insights'),'analytics');
  assert.equal(pageLock(homestead,'insights'),null);
  assert.equal(pageLock(unknown,'insights'),null);
});

test('The Founding offer stops at 100 buyers',()=>{
  assert.equal(FOUNDING_LIMIT,100);
  assert.equal(foundingLeft(0),100);
  assert.equal(foundingLeft(99),1);
  assert.equal(foundingLeft(100),0);
  assert.equal(foundingLeft(140),0);
  assert.equal(foundingLeft(null),null,'unknown count must not close the offer');
  assert.equal(foundingLeft(undefined),null);
});

test('Plan labels use the new plan names',()=>{
  assert.equal(planLabel({state:'trial',trialDaysLeft:6}),'Free trial · 6 days left');
  assert.equal(planLabel({state:'trial',trialDaysLeft:1}),'Free trial · last day');
  assert.equal(planLabel({state:'trial_expired'}),'Trial ended · read-only');
  assert.equal(planLabel({state:'active',plan:'basic'}),'Grow plan');
  assert.equal(planLabel({state:'active',plan:'pro'}),'Homestead plan');
  assert.equal(planLabel({state:'past_due',plan:'basic'}),'Grow · payment issue');
  assert.equal(planLabel({state:'past_due',plan:'pro'}),'Homestead · payment issue');
  assert.equal(planLabel({state:'lifetime'}),'Lifetime');
  assert.equal(planLabel({state:'unknown'}),'');
});

test('The website, the terms and the checkout name the same plans and prices',()=>{
  const landing=readFileSync('public/landing.html','utf8');
  const terms=readFileSync('public/terms.html','utf8');
  const refunds=readFileSync('public/refunds.html','utf8');
  const privacy=readFileSync('public/privacy.html','utf8');
  ['Grow','Homestead','$4.99','$9.99','$39','$79','$129'].forEach(s=>{
    assert.equal(landing.includes(s),true,'landing is missing '+s);
    assert.equal(terms.includes(s),true,'terms are missing '+s);
  });
  [landing,terms,refunds,privacy].forEach((html,i)=>{
    assert.equal(/\$190/.test(html),false,'old Lifetime price on page '+i);
    assert.equal(/\bBasic\b/.test(html),false,'old plan name Basic on page '+i);
    assert.equal(/\bPro\b/.test(html),false,'old plan name Pro on page '+i);
  });
});
