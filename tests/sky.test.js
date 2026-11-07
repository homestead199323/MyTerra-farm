import test from 'node:test';
import assert from 'node:assert/strict';
import {sunPosition,skyState,FIXED_SKY,weatherOf,windToScene,precipCount,cloudCount,vaneAngle} from '../src/features/grove/sky.js';

const near=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b} (±${tol})`);
const finite=(o)=>Object.entries(o).forEach(([k,v])=>{if(typeof v==='number')assert.ok(Number.isFinite(v),`${k} finite`);if(Array.isArray(v))v.forEach((x,i)=>assert.ok(Number.isFinite(x),`${k}[${i}] finite`));});

test('sky: London noon midsummer ≈ 62°',()=>{near(sunPosition(new Date(2026,5,21,12,0),51.5).elevation,62,1.5,'elevation');});
test('sky: London noon midwinter ≈ 15°',()=>{near(sunPosition(new Date(2026,11,21,12,0),51.5).elevation,15,1.5,'elevation');});
test('sky: night at 23:00',()=>{assert.equal(skyState({date:new Date(2026,5,21,23,0),lat:51.5}).night,1);});
test("sky: fixed look matches today's sun",()=>{
  const L=Math.hypot(.55,.66,-.35),want=[.55/L,.66/L,-.35/L];
  want.forEach((v,i)=>near(FIXED_SKY.sunDir[i],v,.01,'sunDir['+i+']'));
  assert.equal(FIXED_SKY.sunIntensity,2.45);assert.equal(FIXED_SKY.fog,'#c3bd78');assert.equal(FIXED_SKY.night,0);
});
test('sky: no weather → clear calm',()=>{const w=weatherOf(null);assert.equal(w.precip,'none');assert.equal(w.cloud,0);assert.equal(w.windStrength,.15);});
test('sky: high latitude winter is finite',()=>{
  const p=sunPosition(new Date(2026,11,21,12,0),60);assert.ok(Number.isFinite(p.elevation)&&Number.isFinite(p.azimuth));
  finite(skyState({date:new Date(2026,11,21,12,0),lat:60}));finite(skyState({date:new Date(2026,11,21,3,0),lat:60}));
});
test('sky: weather table',()=>{
  assert.equal(weatherOf({code:3}).cloud,.85);assert.equal(weatherOf({code:61}).precip,'rain');assert.equal(weatherOf({code:73}).precip,'snow');
  assert.equal(weatherOf({code:45}).cloud,1);assert.equal(weatherOf({code:0,windKmh:90}).windStrength,1);assert.equal(weatherOf({code:0,windKmh:2}).windStrength,.15);
  const d=windToScene(180);near(Math.hypot(d[0],d[1]),1,1e-6,'unit');
});
test('sky: preset blend monotonic',()=>{
  const at=(el)=>skyState({date:new Date(2026,5,21,12,0),lat:51.5,elevationOverride:el}).sunIntensity;
  const s=[40,20,5,-10].map(at);for(let i=1;i<s.length;i++)assert.ok(s[i]<=s[i-1]+1e-9,'non-increasing at '+i);
});
test('sky: liveSky off is the fixed look whatever the clock',()=>{
  const s=skyState({date:new Date(2026,0,1,2,0),lat:51.5,liveSky:false});assert.deepEqual(s.sunDir,FIXED_SKY.sunDir);assert.equal(s.night,0);
});
test('weather fx: particle and cloud counts',()=>{
  assert.equal(precipCount('rain',{mobile:false,reduced:false}),400);assert.equal(precipCount('rain',{mobile:true,reduced:false}),200);
  assert.equal(precipCount('snow',{mobile:false,reduced:false}),260);assert.equal(precipCount('snow',{mobile:true,reduced:false}),130);
  assert.equal(precipCount('snow',{mobile:false,reduced:true}),0);assert.equal(precipCount('none',{mobile:false,reduced:false}),0);
  assert.equal(cloudCount(0,{mobile:false}),0);assert.equal(cloudCount(.3,{mobile:false}),0);assert.equal(cloudCount(1,{mobile:false}),6);assert.equal(cloudCount(.85,{mobile:true}),3);assert.ok(cloudCount(.4,{mobile:true})>=2);
});
test('weather fx: vane points into the wind',()=>{
  // air moving toward +x (scene) → the arrow tip points to −x; rotation.y = atan2(−dz, dx)
  near(vaneAngle([1,0]),0,1e-9,'east wind');near(vaneAngle([0,1]),-Math.PI/2,1e-9,'wind toward +z');
});
test('sky: longitude and summer time — Brussels 21:00 CEST is still daylight',()=>{
  // 2026-06-21 19:00 UTC = 21:00 CEST; solar time at 4.35° E ≈ 19:17 → the sun is still up (~+5°)
  const d=new Date(Date.UTC(2026,5,21,19,0));
  assert.ok(sunPosition(d,50.85,4.35).elevation>2,'sun up with longitude');
  assert.ok(sunPosition(new Date(Date.UTC(2026,5,21,10,0)),51.5,-0.12).elevation>52,'London 11:00 BST (10:00 solar) ≈ 54°');
});
test('sky: liveSky off is calm whatever the forecast',()=>{
  const s=skyState({date:new Date(2026,0,1,2,0),lat:51.5,liveSky:false,weather:{code:61,windKmh:60,windDeg:90}});
  assert.equal(s.windStrength,FIXED_SKY.windStrength);assert.deepEqual(s.windDir,FIXED_SKY.windDir);assert.equal(s.precip,'none');assert.equal(s.cloud,0);
});
