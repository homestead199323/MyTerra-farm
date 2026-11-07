import {bedRows,bedLength,layoutPlots} from '../quiet/farm-model';
import {gridCapacity} from '../quiet/planting-plan';

// All scene coordinates are metres. A resized area regenerates geometry; artwork is never stretched.
export function plantedRows(zone,plots) {
  const rows=bedRows(zone), length=bedLength(zone);
  const layout=layoutPlots(zone,plots);
  const legacy=Array.from({length:rows},(_,i)=>{
    const planting=layout.find(p=>p.layout.version!==2&&i+1>=p.layout.startRow&&i+1<p.layout.startRow+p.layout.rowCount);
    const rowOffset=planting?i+1-planting.layout.startRow:0;
    const total=planting?.plantCount||0, num=planting?.layout.rowCount||1;
    return {number:i+1,planting,rowOffset,columns:Math.ceil(total/num),offset:planting?.layout.pattern==='offset'&&num>1,count:total?Math.floor(total/num)+(rowOffset<total%num?1:0):0,fraction:planting?Math.min(1,planting.layout.lengthM/length):1};
  });
  const modern=layout.filter(p=>p.layout.version===2&&p.layout.pattern!=='scatter').flatMap(planting=>{
    const l=planting.layout;let left=planting.plantCount;
    return Array.from({length:l.rowCount},(_,i)=>{
      const count=Math.min(left,gridCapacity(l.lengthM,l.spacingCM/100,l.pattern,i));left-=count;
      return {planting,number:i+1,rowOffset:i,count,columns:count,offset:l.pattern==='offset',fraction:l.lengthM/length,atM:l.startM+l.spacingCM/200+i*l.rowSpacingCM/100,pitch:l.spacingCM/100,gapM:l.rowSpacingCM/100};
    });
  });
  return modern.length?[...legacy.filter(r=>r.planting).map(r=>({...r,atM:(r.number-.5)*(zone.rowAxis==='vertical'?zone.wM:zone.hM)/rows})),...modern].sort((a,b)=>a.atM-b.atM).map((r,i)=>({...r,number:i+1})):legacy;

}
// Normalized position along a row; a common pitch keeps unequal rows staggered.
// Reserving half a cell at the far end keeps every plant inside the recorded length.
export function plantPosition(row,index,count=row.count) {
  if(!count)return .5;
  if(row.pitch){const sampled=count===row.count?index:Math.min(row.count-1,Math.floor((index+.5)*row.count/count));return (.1+row.pitch/2+(sampled+(row.offset&&row.rowOffset%2?.5:0))*row.pitch)/row.planting.layout.lengthM;}
  const columns=count===row.count?row.columns:count;
  return row.offset?(index+.5+(row.rowOffset%2)*.5)/(columns+.5):(index+.5)/count;
}
export function entranceOf(zone) {return {xM:zone.xM+zone.wM/2,yM:zone.yM+zone.hM};}
export function areaCenter(zone) {return {xM:zone.xM+zone.wM/2,yM:zone.yM+zone.hM/2};}
// A compressed orthogonal grid routes paths around the recorded area footprints.
// Coordinates include obstacle edges and entrance midpoints, so metres remain exact at any farm size.
// from: where the network starts — the farm gate on the front edge by default; a garden starts at the
// back door on the far edge ({xM: farmW / 2, yM: 0}).
export function accessPaths(zones,farmW,farmH,lines=[],from=null) {
  if(!zones.length)return [];
  const width=Math.max(.25,Math.min(.75,Math.min(farmW,farmH)*.04)),clearance=width/2+.12;
  const obstacles=zones.map(z=>({left:z.xM-clearance,right:z.xM+z.wM+clearance,top:z.yM-clearance,bottom:z.yM+z.hM+clearance}));
  const start=from?{xM:from.xM,yM:from.yM}:{xM:farmW/2,yM:farmH};
  const entries=zones.filter(z=>z.road!==false).map(z=>[
    {xM:z.xM-clearance,yM:z.yM+z.hM/2,edge:{xM:z.xM,yM:z.yM+z.hM/2}},
    {xM:z.xM+z.wM+clearance,yM:z.yM+z.hM/2,edge:{xM:z.xM+z.wM,yM:z.yM+z.hM/2}},
    {xM:z.xM+z.wM/2,yM:z.yM-clearance,edge:{xM:z.xM+z.wM/2,yM:z.yM}},
    {xM:z.xM+z.wM/2,yM:z.yM+z.hM+clearance,edge:entranceOf(z)},
  ].filter(p=>p.xM>=clearance&&p.xM<=farmW-clearance&&p.yM>=clearance&&p.yM<=farmH-clearance));
  const manual=lines.filter(l=>l.kind==='path').flatMap(l=>l.points.slice(1).map((p,i)=>[l.points[i],p]));
  const manualPoints=manual.flat().filter(p=>p.xM>=0&&p.xM<=farmW&&p.yM>=0&&p.yM<=farmH);
  const unique=values=>[...new Set(values)].sort((a,b)=>a-b);
  const xs=unique([clearance,farmW-clearance,start.xM,...manualPoints.map(p=>p.xM),...entries.flatMap(es=>es.map(e=>e.xM))]);
  const ys=unique([clearance,farmH-clearance,start.yM,...manualPoints.map(p=>p.yM),...entries.flatMap(es=>es.map(e=>e.yM))]);
  const nx=xs.length,total=nx*ys.length;
  const blocked=new Uint8Array(total);
  for(let n=0;n<total;n++){const x=xs[n%nx],y=ys[Math.floor(n/nx)];blocked[n]=obstacles.some(o=>x>o.left+.00001&&x<o.right-.00001&&y>o.top+.00001&&y<o.bottom-.00001)?1:0;}
  const index=p=>ys.indexOf(p.yM)*nx+xs.indexOf(p.xM),at=n=>({xM:xs[n%nx],yM:ys[Math.floor(n/nx)]});
  const segmentClear=(a,b)=>!obstacles.some(o=>a.yM===b.yM?
    a.yM>o.top+.00001&&a.yM<o.bottom-.00001&&Math.max(a.xM,b.xM)>o.left+.00001&&Math.min(a.xM,b.xM)<o.right-.00001:
    a.xM>o.left+.00001&&a.xM<o.right-.00001&&Math.max(a.yM,b.yM)>o.top+.00001&&Math.min(a.yM,b.yM)<o.bottom-.00001);
  const neighbours=new Map();
  function adjacent(n){if(neighbours.has(n))return neighbours.get(n);const x=n%nx,y=Math.floor(n/nx),a=at(n);const ns=[...(x?[n-1]:[]),...(x<nx-1?[n+1]:[]),...(y?[n-nx]:[]),...(y<ys.length-1?[n+nx]:[])].filter(k=>!blocked[k]&&segmentClear(a,at(k)));neighbours.set(n,ns);return ns;}
  const origin=index(start),dist=new Float64Array(total).fill(Infinity),prev=new Int32Array(total).fill(-1),heap=[];
  function push(n,d){heap.push({n,d});let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].d<=d)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}}
  function pop(){const head=heap[0],tail=heap.pop();if(heap.length){heap[0]=tail;let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].d<heap[c].d)c++;if(heap[i].d<=heap[c].d)break;[heap[i],heap[c]]=[heap[c],heap[i]];i=c;}}return head;}
  const network=new Set(blocked[origin]?[]:[origin]),result=[];
  // Drawn paths are also valid connection points, including points along each segment.
  for(let n=0;n<total;n++){const p=at(n);if(!blocked[n]&&manual.some(([a,b])=>{const dx=b.xM-a.xM,dy=b.yM-a.yM,d=dx*dx+dy*dy,t=d?((p.xM-a.xM)*dx+(p.yM-a.yM)*dy)/d:0;return t>=0&&t<=1&&Math.hypot(p.xM-a.xM-t*dx,p.yM-a.yM-t*dy)<.00001;}))network.add(n);}
  const remaining=new Set(entries.map((_,i)=>i));
  while(remaining.size&&network.size){
    dist.fill(Infinity);prev.fill(-1);heap.length=0;
    for(const n of network){dist[n]=0;push(n,0);}
    while(heap.length){const {n,d}=pop();if(d!==dist[n])continue;const a=at(n);for(const k of adjacent(n)){const b=at(k),next=d+Math.abs(a.xM-b.xM)+Math.abs(a.yM-b.yM);if(next<dist[k]){dist[k]=next;prev[k]=n;push(k,next);}}}
    let target=null,owner=-1,best=Infinity;
    for(const i of remaining)for(const e of entries[i])if(dist[index(e)]<best){target=e;owner=i;best=dist[index(e)];}
    if(!target)break;
    const path=[];let n=index(target);
    while(n!==-1){path.push(at(n));network.add(n);n=prev[n];}
    path.reverse();path.push(target.edge);remaining.delete(owner);
    result.push(path.filter((p,i,a)=>!i||i===a.length-1||!((a[i-1].xM===p.xM&&a[i+1].xM===p.xM)||(a[i-1].yM===p.yM&&a[i+1].yM===p.yM))));
  }
  return result;
}
export function roofBays(length,spacing=.32){return Math.max(2,Math.min(80,Math.ceil(length/spacing)));}

// Open-front depth, doors and windows stay at architectural sizes when a footprint changes.
export function buildingScale(w,h,type){
 const barn=type==='barn'||type==='coop',small=barn&&Math.min(w,h)<4;
 const front=Math.min(h*.3,barn?(small?.6:2.2):.45);
 return {front,roofDepth:h-front,door:Math.min(w*.55,barn?(small?.65:2.4):.95),window:Math.min(.9,w*.2),small};
}
