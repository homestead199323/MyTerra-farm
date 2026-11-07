import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrain,MODE} from '../src/features/grove/herd-brain.js';

const goat={idx:0,species:'Goat',kind:'grazer',L:1.15,walk:.38,x:3,z:2,arena:{x0:0,x1:6,z0:0,z1:4},home:null,water:null,seed:3};
const run=(brain,ticks,env,dt=.25)=>{const legs=[];for(let i=0;i<ticks;i++)legs.push(...brain.tick(i*dt,env));return legs;};
const inside=(p,A,pad=0)=>p[0]>=A.x0+pad-1e-6&&p[0]<=A.x1-pad+1e-6&&p[1]>=A.z0+pad-1e-6&&p[1]<=A.z1-pad+1e-6;

test('brain: legs stay inside the arena',()=>{
  const legs=run(createBrain([goat]),500,{night:0,reduced:false});
  assert.ok(legs.length>5,'several legs');
  legs.forEach(l=>{assert.ok(inside(l.to,goat.arena,goat.L*.55),`to ${l.to} inside`);assert.ok(inside(l.from,goat.arena,goat.L*.55),`from ${l.from} inside`);});
  assert.ok(legs.some(l=>l.mode===MODE.walk),'walks');assert.ok(legs.some(l=>l.mode===MODE.graze),'grazes');
});
test('brain: tiny arena → stand',()=>{
  const cow={...goat,species:'Cow',L:2.3,walk:.45,x:.2,z:.2,arena:{x0:0,x1:.4,z0:0,z1:.4}};
  const legs=run(createBrain([cow]),200,{night:0,reduced:false});
  legs.forEach(l=>{assert.ok(l.mode===MODE.stand||l.mode===MODE.graze,'mode '+l.mode);assert.deepEqual(l.from,l.to);});
});
test('brain: birds go inside at night and out at dawn',()=>{
  const hen={idx:0,species:'Chicken',kind:'bird',L:.5,walk:.25,x:3,z:3,arena:{x0:0,x1:6,z0:0,z1:6},home:{x:1,z:1},water:null,seed:5};
  const brain=createBrain([hen]);const night=run(brain,200,{night:1,reduced:false});
  const last=night[night.length-1];assert.equal(last.mode,MODE.inside);assert.ok(Math.hypot(last.to[0]-1,last.to[1]-1)<.3,'at home');
  const day=[];for(let i=200;i<400;i++)day.push(...brain.tick(i*.25,{night:0,reduced:false}));
  assert.ok(day.some(l=>l.mode!==MODE.inside),'comes out');assert.ok(day.every(l=>inside(l.to,hen.arena,0)),'stays in the run');
});
test('brain: scatter moves away from the tap',()=>{
  const hen={idx:0,species:'Chicken',kind:'bird',L:.5,walk:.25,x:2,z:2,arena:{x0:0,x1:6,z0:0,z1:6},home:null,water:null,seed:7};
  const brain=createBrain([hen]);brain.tick(0,{night:0,reduced:false});
  const [leg]=brain.scatter([0],1,1,10);
  assert.equal(leg.mode,MODE.scatter);assert.ok((leg.to[0]-leg.from[0])*1+(leg.to[1]-leg.from[1])*1>0,'away from (1,1)');
  assert.ok(leg.t1-leg.t0>=1.3&&leg.t1-leg.t0<=1.7,'duration');assert.ok(inside(leg.to,hen.arena,0));
});
test('brain: no overlapping legs',()=>{
  const legs=run(createBrain([goat,{...goat,idx:1,seed:9}]),600,{night:0,reduced:false});
  [0,1].forEach(idx=>{const mine=legs.filter(l=>l.idx===idx);for(let i=1;i<mine.length;i++)assert.ok(mine[i].t0>=mine[i-1].t1-1e-6,'leg '+i);});
});
test('brain: ducks swim',()=>{
  const duck={idx:0,species:'Duck',kind:'bird',L:.55,walk:.2,x:1,z:1,arena:{x0:0,x1:6,z0:0,z1:6},home:null,water:{x0:4,x1:6,z0:4,z1:6,y:.36},seed:11};
  const legs=run(createBrain([duck]),400,{night:0,reduced:false});
  const swim=legs.find(l=>l.mode===MODE.swim);assert.ok(swim,'swims');assert.ok(inside(swim.to,duck.water,0));assert.equal(swim.param,.36);
});
test('brain: reduced motion → stand only',()=>{
  const legs=run(createBrain([goat]),100,{night:0,reduced:true});
  assert.ok(legs.length>=1);legs.forEach(l=>{assert.equal(l.mode,MODE.stand);assert.deepEqual(l.from,l.to);});
});
test('brain: cows lie down',()=>{
  const cow={...goat,species:'Cow',L:2.3,walk:.45,x:8,z:6,arena:{x0:0,x1:16,z0:0,z1:12}};
  assert.ok(run(createBrain([cow]),2400,{night:0,reduced:false}).some(l=>l.mode===MODE.lie),'lies down within 10 minutes');
});
test('brain: scatter starts from where the hen is mid-walk',()=>{
  const hen={idx:0,species:'Chicken',kind:'bird',L:.5,walk:.25,x:1,z:1,arena:{x0:0,x1:8,z0:0,z1:8},home:null,water:null,seed:21};
  const brain=createBrain([hen]);let walk=null;for(let i=0;i<400&&!walk;i++)walk=brain.tick(i*.25,{night:0,reduced:false}).find(l=>l.mode===MODE.walk);
  assert.ok(walk,'walks at some point');const mid=(walk.t0+walk.t1)/2,[leg]=brain.scatter([0],-5,-5,mid);
  const ex=[(walk.from[0]+walk.to[0])/2,(walk.from[1]+walk.to[1])/2];
  assert.ok(Math.hypot(leg.from[0]-ex[0],leg.from[1]-ex[1])<.05,`from ${leg.from} ≈ mid-point ${ex}`);
});
test('brain: looking at an area starts from the animal’s current position',()=>{
  const brain=createBrain([goat]);let walk=null;
  for(let i=0;i<400&&!walk;i++)walk=brain.tick(i*.25,{night:0,reduced:false}).find(l=>l.mode===MODE.walk);
  assert.ok(walk,'walks at some point');
  const mid=(walk.t0+walk.t1)/2,[leg]=brain.look([0],10,10,mid);
  const expected=[(walk.from[0]+walk.to[0])/2,(walk.from[1]+walk.to[1])/2];
  assert.ok(Math.hypot(leg.from[0]-expected[0],leg.from[1]-expected[1])<.05);
  assert.deepEqual(leg.to,leg.from);assert.equal(leg.mode,MODE.stand);
  assert.ok(Math.abs(leg.heading-Math.atan2(10-leg.from[0],10-leg.from[1]))<1e-6);
  assert.ok(leg.t1>leg.t0);
});
test('brain: animals indoors or swimming do not interrupt their activity to look',()=>{
  const brain=createBrain([goat,{...goat,idx:1,seed:9}]);
  brain.animals[0].mode=MODE.inside;brain.animals[1].mode=MODE.swim;
  assert.deepEqual(brain.look([0,1],4,4,1),[]);
});
test('brain: snapshots preserve active movement across a scene rebuild',()=>{
  const brain=createBrain([goat]);
  const [leg]=brain.tick(0,{night:0,reduced:false});
  const [snapshot]=brain.snapshot();
  assert.deepEqual(snapshot,leg);
  snapshot.from[0]+=100;
  assert.notEqual(brain.snapshot()[0].from[0],snapshot.from[0]);
  assert.deepEqual(brain.tick((leg.t0+leg.t1)/2,{night:0,reduced:false}),[]);
});
test('brain: first legs are well-formed (t1 > t0) before any tick',()=>{
  const b=createBrain([goat]);assert.ok(b.animals.length===1);
});
