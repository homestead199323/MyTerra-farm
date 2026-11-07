/* ═══════════════════════════════════════════
   FLAT MAP ARTWORK — the overhead view and layout editor drawn in the same toy style as the 3D
   map: flat matte colours from the shared palette (palette.js), rounded shapes, soft faint
   shadows falling the same way as the 3D sun (towards the bottom-left), no photo textures.
   The ids (patterns, gradients, filters, symbols) are kept so every caller keeps working.
   MARKER: FLAT_TOY_ART_V1
   ═══════════════════════════════════════════ */
import {memo} from 'react';
import {srand} from './sceneMath';
import {roofBays,buildingScale} from './aerial-layout';
import {TOY,FRUIT_HEX} from './palette';

const T=TOY, L=T.leaf;
const solid=(id,c)=><linearGradient id={id}><stop stopColor={c}/></linearGradient>;
const flatPattern=(id,c)=><pattern id={id} width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill={c}/></pattern>;
export const AerialDefs=memo(function AerialDefs({id}) {
  const n=k=>`${id}-${k}`;
  return <defs>
    {solid(n('roof'),T.slate)}{solid(n('clay'),T.terracotta)}{solid(n('water'),T.water)}{solid(n('leaf'),L[1])}{solid(n('lettuce'),L[2])}{solid(n('tree'),L[0])}{solid(n('fur'),T.cream)}
    <linearGradient id={n('glass')}><stop stopColor={T.glass} stopOpacity=".55"/></linearGradient>
    {/* soft, faint shadows, offset like the 3D sun's */}
    <filter id={n('canopy-shadow')} x="-30%" y="-30%" width="160%" height="160%"><feColorMatrix type="matrix" values={`0 0 0 0 .24  0 0 0 0 .35  0 0 0 0 .23  0 0 0 .18 0`}/><feGaussianBlur stdDeviation=".08"/></filter>
    <filter id={n('shadow')} x="-30%" y="-30%" width="170%" height="180%" colorInterpolationFilters="sRGB"><feDropShadow dx="-.08" dy=".12" stdDeviation=".08" floodColor={T.shadow} floodOpacity=".16"/></filter>
    <filter id={n('building-shadow')} x="-35%" y="-30%" width="175%" height="175%" colorInterpolationFilters="sRGB"><feDropShadow dx="-.28" dy=".42" stdDeviation=".16" floodColor={T.shadow} floodOpacity=".2"/></filter>
    {flatPattern(n('metal'),T.slate)}{flatPattern(n('meadow'),T.meadow)}{flatPattern(n('grass'),T.lawn)}{flatPattern(n('soil'),T.soil)}{flatPattern(n('gravel'),T.gravel)}{flatPattern(n('wood'),T.wood)}{flatPattern(n('stone'),T.stone)}
    <pattern id={n('lawn')} width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="none"/></pattern>
    {/* crop families seen from above: rounded flat blobs in the 3D crop greens */}
    <symbol id={n('seedling')} viewBox="-1 -1 2 2">{[-1,1].map(t=><ellipse key={t} cx={t*.24} cy="0" rx=".34" ry=".22" fill={L[2]} transform={`rotate(${t*25} ${t*.24} 0)`}/>)}<circle r=".1" fill={L[1]}/></symbol>
    <symbol id={n('leafy')} viewBox="-1 -1 2 2">{Array.from({length:6},(_,i)=><circle key={i} cx={Math.cos(i*1.05)*.45} cy={Math.sin(i*1.05)*.45} r=".46" fill={L[i%2?0:3]}/>)}<circle r=".48" fill={L[2]}/><circle r=".2" fill="#b8e3a8"/></symbol>
    <symbol id={n('herb')} viewBox="-1 -1 2 2">{Array.from({length:9},(_,i)=><circle key={i} cx={Math.cos(i*2.4)*Math.sqrt(i/9)*.62} cy={Math.sin(i*2.4)*Math.sqrt(i/9)*.62} r={.3-.012*i} fill={L[i%4]}/>)}</symbol>
    <symbol id={n('vine')} viewBox="-1 -1 2 2">{Array.from({length:7},(_,i)=><circle key={i} cx={Math.cos(i*.9)*.5} cy={Math.sin(i*.9)*.5} r=".42" fill={L[(i+1)%4]}/>)}<circle r=".45" fill={L[0]}/></symbol>
    <symbol id={n('carrot')} viewBox="-1 -1 2 2"><g strokeLinecap="round" fill="none">{Array.from({length:8},(_,i)=><path key={i} d={`M0 0L${Math.cos(i*.785)*.82} ${Math.sin(i*.785)*.82}`} stroke={L[i%2?2:1]} strokeWidth=".2"/>)}</g><circle r=".2" fill={L[1]}/></symbol>
    <symbol id={n('onion')} viewBox="-1 -1 2 2"><g strokeLinecap="round" fill="none">{Array.from({length:6},(_,i)=><path key={i} d={`M0 0L${Math.cos(i*1.05+.3)*.85} ${Math.sin(i*1.05+.3)*.85}`} stroke={i%2?T.leafOlive:L[3]} strokeWidth=".16"/>)}</g><circle r=".18" fill="#e9e2c4"/></symbol>
    <symbol id={n('tree-crown')} viewBox="-1.3 -1.3 2.6 2.6"><circle cx="0" cy="0" r="1" fill={L[0]}/></symbol>
  </defs>;
});

/* a toy tree from above: three overlapping round crowns, a lighter sunny top, a soft shadow to the bottom-left */
export function Canopy({x=0,y=0,r=1,fruit,seed}) {
  const s=seed??Math.round(x*7+y*13), c=L[Math.abs(s)%4], light=L[2];
  return <g transform={`translate(${x} ${y})`}>
    <ellipse cx={-r*.28} cy={r*.36} rx={r*.95} ry={r*.82} fill={T.shadow} opacity=".14"/>
    <circle cx={-r*.28} cy={r*.18} r={r*.62} fill={c}/><circle cx={r*.3} cy={r*.12} r={r*.6} fill={c}/>
    <circle cx="0" cy={-r*.1} r={r*.78} fill={c}/>
    <circle cx={r*.18} cy={-r*.28} r={r*.36} fill={light} opacity=".55"/>
    {fruit&&Array.from({length:7},(_,i)=><circle key={i} cx={Math.cos(i*2.4)*r*.5} cy={Math.sin(i*2.4)*r*.45-r*.05} r={r*.09} fill={fruit}/>)}
  </g>;
}
const TREE=/apple|pear|peach|plum|cherry|citrus|lemon|orange|fig|olive|walnut|almond|avocado|apricot|quince|persimmon|pomegranate|hazelnut|chestnut/;
const FRUITY={tomato:'#e0453a',pepper:'#e0453a',strawberry:'#e0453a',raspberry:'#c8202f',eggplant:'#6a4690',cucumber:'#4f9f61',zucchini:'#4f9f61',pumpkin:'#f5922e',squash:'#f5922e',melon:'#9bd06a',bean:'#7fae4a',pea:'#93d089'};
export const CropCrown=memo(function CropCrown({crop='',stage=3,x,y,size=.45,id,seed=0}) {
 const name=crop.toLowerCase();
 if(stage<2)return <g><circle cx={x} cy={y} r={size*.1} fill={T.soilDark}/>{stage===0&&<circle cx={x} cy={y} r={size*.22} fill="none" stroke={T.soilLight} strokeWidth=".03" strokeDasharray=".05 .05"/>}</g>;
 if(TREE.test(name)){const k=Object.keys(FRUIT_HEX).find(f=>name.includes(f));return <Canopy x={x} y={y} r={size*.48*(stage===2?.55:stage===3?.75:1)} id={id} seed={seed} fruit={stage>=5?(FRUIT_HEX[k]||FRUIT_HEX.apple):null}/>;}
 const family=stage===2?'seedling':/carrot|parsnip|fennel|dill/.test(name)?'carrot':/onion|leek|garlic|chive|corn|maize|wheat/.test(name)?'onion':/lettuce|cabbage|spinach|chard|kale|broccoli|cauliflower|brussels/.test(name)?'leafy':/tomato|pepper|eggplant|bean|pea|cucumber|pumpkin|squash|melon|strawberry|zucchini|raspberry/.test(name)?'vine':'herb';
 const r=size*(stage===2?.52:stage===3?.78:1), fk=Object.keys(FRUITY).find(f=>name.includes(f));
 return <g transform={`translate(${x} ${y}) rotate(${srand(seed)*80})`}>
   <ellipse cx={-r*.12} cy={r*.16} rx={r*.46} ry={r*.4} fill={T.shadow} opacity=".14"/>
   <use href={`#${id}-${family}`} x={-r/2} y={-r/2} width={r} height={r}/>
   {stage>=4&&fk&&[0,1,2].map(i=><circle key={i} cx={Math.cos(i*2.1)*r*.24} cy={Math.sin(i*2.1)*r*.21} r={r*(stage===5?.11:.07)} fill={stage===5?FRUITY[fk]:'#9fcf6a'}/>)}
 </g>;
});

/* post-and-rail (or white picket) fence: round posts, rounded rails; gateW leaves a centred gap with a green gate */
export function Fence({x=0,y=0,w,h,id,gate=false,pickets=false,gateW,top=true}) {
 const gw=gateW??w*.28, g0=x+w/2-gw/2, g1=x+w/2+gw/2;
 const segments=[...(top?[[[x,y],[x+w,y]]]:[]),[[x,y],[x,y+h]],[[x+w,y],[x+w,y+h]],...(!gate?[[[x,y+h],[x+w,y+h]]]:[[[x,y+h],[g0,y+h]],[[g1,y+h],[x+w,y+h]]])];
 const rail=pickets?T.woodPale:T.woodMid, post=pickets?T.white:T.woodDark;
 return <g strokeLinecap="round" filter={`url(#${id}-shadow)`}>
   {segments.map(([a,b],i)=><g key={i}><path d={`M${a}L${b}`} stroke={rail} strokeWidth={pickets?.07:.1}/>{Array.from({length:Math.min(800,Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(pickets?.26:1.3))+1))}).map((_,j,arr)=>{const t=j/(arr.length-1);return <circle key={j} cx={a[0]+(b[0]-a[0])*t} cy={a[1]+(b[1]-a[1])*t} r={pickets?.06:.085} fill={post} stroke={pickets?T.stoneDark:'none'} strokeWidth=".015"/>;})}</g>)}
   {gate&&<path d={`M${g0+.08} ${y+h}H${g1-.08}`} stroke={T.green} strokeWidth=".12"/>}
 </g>;
}

/* a rounded toy roof from above: matte slate or terracotta, the sunny (right) slope a shade lighter, a rounded ridge cap */
export function Roof({x=0,y=0,w,h,id,clay=false,hip=false}) {
 const ridge=Math.min(w*.18,h*.25), base=clay?T.terracotta:T.slate, cap=clay?'#cf7f62':T.slateDark, ov=.14;
 const X0=x-ov, X1=x+w+ov, Y0=y-ov, Y1=y+h+ov*.7;
 return <g filter={`url(#${id}-building-shadow)`}>
   <rect x={X0} y={Y0} width={X1-X0} height={Y1-Y0} rx=".16" fill={base}/>
   <path d={`M${X0+.05} ${Y0+.05}H${X1-.05}V${y+h/2}H${X0+.05}Z`} fill="#ffffff" opacity=".1"/>
   {hip&&<><path d={`M${X1} ${Y0}L${x+w-ridge} ${y+h/2}L${X1} ${Y1}Z`} fill="#ffffff" opacity=".1"/><path d={`M${X0} ${Y0}L${x+ridge} ${y+h/2}L${X0} ${Y1}Z`} fill="#000000" opacity=".05"/><path d={`M${X0+.08} ${Y0+.08}L${x+ridge} ${y+h/2}L${X0+.08} ${Y1-.08}M${X1-.08} ${Y0+.08}L${x+w-ridge} ${y+h/2}L${X1-.08} ${Y1-.08}`} stroke={cap} strokeWidth=".09" strokeLinecap="round" fill="none"/></>}
   <path d={`M${x+(hip?ridge:-.06)} ${y+h/2}H${x+w-(hip?ridge:-.06)}`} stroke={cap} strokeWidth=".16" strokeLinecap="round"/>
   <path d={`M${X0+.1} ${Y1-.04}H${X1-.1}`} stroke={T.trim} strokeWidth=".06" strokeLinecap="round" opacity=".8"/>
 </g>;
}

export function Building({type,w,h,id,clay,children}) {
 const glass=type==='greenhouse', barn=type==='barn', coop=type==='coop';
 if(glass)return <g>
   <rect width={w} height={h} fill={T.soil}/>
   <rect x={w*.44} width={w*.12} height={h} fill={T.gravel}/>
   {children}
   <g filter={`url(#${id}-building-shadow)`}>
    <rect x="-.06" y="-.06" width={w+.12} height={h+.12} rx=".08" fill={T.glass} fillOpacity=".42" stroke={T.trim} strokeWidth=".1"/>
    <path d={`M${w*.5} 0V${h}`} stroke={T.trim} strokeWidth=".12" strokeLinecap="round"/>
    {Array.from({length:roofBays(h,1.1)+1}).map((_,i,a)=><path key={i} d={`M0 ${h*i/(a.length-1)}H${w}`} stroke={T.trim} strokeWidth=".07"/>)}
    <rect x={w*.37} y={h-.04} width={w*.26} height=".09" rx=".03" fill={T.green}/>
   </g>
 </g>;
 if(type==='beehive')return <g filter={`url(#${id}-shadow)`}><rect width={w} height={h} rx=".1" fill={T.gravel}/>{Array.from({length:Math.min(12,Math.max(1,Math.floor(w/.7)))}).map((_,i,a)=>{const bw=Math.min(.5,w*.7),bh=Math.min(.6,h*.7),xx=(i+.5)*w/a.length-bw/2,yy=h/2-bh/2;return <g key={i}><rect x={xx-.03} y={yy-.03} width={bw+.06} height={bh+.06} rx=".07" fill={T.zinc}/><rect x={xx+.04} y={yy+.04} width={bw-.08} height={bh-.08} rx=".05" fill={T.hive[i%4]}/><rect x={xx+bw*.3} y={yy+bh+.03} width={bw*.4} height=".05" rx=".02" fill={T.woodDark}/></g>;})}</g>;
 if(type==='compost')return <g filter={`url(#${id}-shadow)`}><rect width={w} height={h} rx=".08" fill={T.earth} stroke={T.wood} strokeWidth=".14"/>{[1,2].map(i=><path key={i} d={`M${w*i/3} 0V${h}`} stroke={T.wood} strokeWidth=".12"/>)}{[0,1,2].map(i=><ellipse key={i} cx={w*(i+.5)/3} cy={h/2} rx={w/3*.36} ry={h*.32} fill={T.compost[i]}/>)}</g>;
 const dim=buildingScale(w,h,type),front=dim.front,roof=dim.roofDepth,door=dim.door;
 const wall=type==='house'?T.cream:barn?T.barn:T.wood, plinth=T.stoneDark;
 return <g>
  <rect x="-.06" width={w+.12} height={h+.04} rx=".08" fill={plinth}/>
  {(barn||coop)&&<rect y={roof} width={w} height={front} rx=".06" fill={T.straw} opacity=".9"/>}
  <rect y={roof-.1} width={w} height={Math.min(.42,front)} rx=".06" fill={wall}/>
  <rect x={(w-door)/2} y={roof-.04} width={door} height={Math.min(.34,front)} rx=".05" fill={T.green} stroke={T.trim} strokeWidth=".05"/>
  {!barn&&!coop&&Array.from({length:Math.max(0,Math.floor(w/3))},(_,i)=>{const x=(i+.5)*w/Math.floor(w/3);return Math.abs(x-w/2)>1?<rect key={i} x={x-dim.window/2} y={roof} width={dim.window} height={Math.min(.22,front*.65)} rx=".03" fill={T.winGlass} stroke={T.trim} strokeWidth=".05"/>:null;})}
  {barn&&Array.from({length:Math.max(2,Math.ceil(w/3)+1)}).map((_,i,a)=><rect key={i} x={i*(w-.1)/(a.length-1)} y={roof-.08} width=".1" height={Math.min(.42,front)} rx=".03" fill={T.trim}/>)}
  <Roof w={w} h={roof} id={id} clay={clay||dim.small&&type!=='barn'&&type!=='coop'&&type!=='storage'} hip={type==='house'}/>
  {type==='house'&&<g transform={`translate(${w*.72} ${Math.min(1,h*.2)})`} filter={`url(#${id}-shadow)`}><rect width=".42" height=".5" rx=".06" fill={T.cream}/><rect x=".06" y=".06" width=".3" height=".1" rx=".03" fill={T.stoneDark}/></g>}
  {type==='house'&&<rect x={(w-Math.min(1.5,w*.7))/2} y={roof+.22} width={Math.min(1.5,w*.7)} height={Math.max(.05,front-.22)} rx=".05" fill={T.concrete}/>}
 </g>;
}

/* animals from above in the 3D coat colours: plump body, round head, ears, a soft shadow */
const COAT={Cow:['#f3f0e7','#2a2521'],Goat:['#f3efe6','#a86b3c'],Sheep:['#f3efe6',null],Chicken:['#f3f0e7',null],Duck:['#fdfcf9',null],Goose:['#f1efe8',null],Turkey:['#5a4638',null],Quail:['#a88866',null],'Guinea Fowl':['#5b625c',null],Pig:['#efc2ba',null],Horse:['#a8663d',null],Donkey:['#9a958a',null],Alpaca:['#e6d2b3',null],Rabbit:['#c9b8a4',null],Bee:['#f2c53d',null]};
export function OverheadAnimal({species='Chicken',x,y,angle=0,size=1}) {
 const bird=['Chicken','Duck','Goose','Turkey','Quail','Guinea Fowl'].includes(species),bee=species==='Bee';
 const horse=['Horse','Donkey','Alpaca'].includes(species),rabbit=species==='Rabbit',sheep=species==='Sheep';
 const [coat,patch]=COAT[species]||['#e9e2d4',null];
 const bw=bird?.15:rabbit?.17:.25, bl=bird?.22:rabbit?.26:horse?.5:.42, hy=bird?-.22:horse?-.56:-.42;
 if(bee)return <g transform={`translate(${x} ${y}) scale(${size})`}><ellipse rx=".05" ry=".08" fill={T.bee}/><path d="M-.045-.01h.09M-.04.03h.08" stroke={T.beeDark} strokeWidth=".022"/></g>;
 return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
   <ellipse cx="-.06" cy=".08" rx={bw*1.1} ry={bl*1.05} fill={T.shadow} opacity=".16"/>
   {!bird&&[-1,1].map(s=>[-1,1].map(t=><circle key={`${s}${t}`} cx={s*bw*.8} cy={t*bl*.55} r=".05" fill={T.ink} opacity=".7"/>))}
   <ellipse rx={bw} ry={bl} fill={coat}/>
   {patch&&<><ellipse cx={-bw*.3} cy={-bl*.2} rx={bw*.45} ry={bl*.3} fill={patch}/><ellipse cx={bw*.35} cy={bl*.35} rx={bw*.4} ry={bl*.25} fill={patch}/></>}
   {sheep&&Array.from({length:8},(_,i)=><circle key={i} cx={Math.cos(i*.8)*bw*.6} cy={Math.sin(i*.8)*bl*.6} r={bw*.42} fill={coat}/>)}
   <ellipse cy={hy} rx={bird?.09:.12} ry={bird?.1:horse?.18:.14} fill={sheep?'#3a2f28':coat}/>
   {bird?<><path d={`M-.035 ${hy-.08}L0 ${hy-.16} .035 ${hy-.08}Z`} fill="#f2b04a"/>{species==='Chicken'&&<ellipse cy={hy-.02} rx=".025" ry=".07" fill="#d6362e"/>}</>
     :[-1,1].map(s=><ellipse key={s} cx={s*.11} cy={hy-(horse||rabbit?.1:.05)} rx=".045" ry={horse||rabbit?.12:.07} fill={coat} stroke={T.shadow} strokeOpacity=".15" strokeWidth=".012"/>)}
 </g>;
}

export function Ornament({o,id}) {
 const type=o.type;
 if(type==='tree')return <Canopy id={id} r={.95} seed={o.id?.length}/>;
 if(type==='bush'||type==='flowers')return <g><Canopy id={id} r={.45} seed={o.id?.length}/>{type==='flowers'&&Array.from({length:9},(_,i)=><circle key={i} cx={(srand(i)-.5)*.6} cy={(srand(i+10)-.5)*.6} r=".06" fill={T.flower[i%6]}/>)}</g>;
 if(type==='pond')return <ellipse rx=".7" ry=".45" fill={T.water} stroke={T.stone} strokeWidth=".1"/>;
 if(type==='rock')return <g><ellipse cx="-.06" cy=".08" rx=".34" ry=".24" fill={T.shadow} opacity=".14"/><ellipse rx=".32" ry=".24" fill={T.rock}/><ellipse cx=".06" cy="-.06" rx=".16" ry=".1" fill={T.stone}/></g>;
 if(type==='shed')return <g><rect x="-.6" y="-.5" width="1.2" height="1" rx=".08" fill={T.wood}/><Roof x={-.55} y={-.45} w={1.1} h={.7} id={id}/></g>;
 if(type==='pot'||type==='planter'||type==='hangpot')return <g><circle r=".3" fill={T.pot} stroke={T.potRim} strokeWidth=".06"/><circle r=".22" fill={T.soilDark}/><CropCrown x={0} y={0} crop="Basil" id={id} size={.5} stage={4}/></g>;
 if(type==='wateringcan')return <g fill={T.green}><circle r=".15"/><path d="M.1-.07l.3-.13-.2.26Z"/><rect x="-.22" y="-.04" width=".1" height=".08" rx=".03"/></g>;
 if(type==='haybale')return <g><ellipse cx="-.06" cy=".1" rx=".42" ry=".28" fill={T.shadow} opacity=".14"/><rect x="-.4" y="-.24" width=".8" height=".48" rx=".2" fill={T.hay}/><path d="M-.18-.22v.44M.18-.22v.44" stroke={T.hayDark} strokeWidth=".04" strokeLinecap="round"/></g>;
 if(type==='woodpile')return <g>{[0,1,2,3].map(i=><rect key={i} x="-.4" y={-.26+i*.14} width=".8" height=".12" rx=".06" fill={i%2?T.woodMid:T.wood}/>)}</g>;
 return <g><rect x="-.45" y="-.2" width=".9" height=".4" rx=".08" fill={T.wood}/><path d="M-.45-.07h.9M-.45 .07h.9" stroke={T.woodMid} strokeWidth=".03"/><path d="M-.32-.2v.4M.32-.2v.4" stroke={T.woodDark} strokeWidth=".06" strokeLinecap="round"/></g>;
}
