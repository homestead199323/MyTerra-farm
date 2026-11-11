import {companionsFor} from './farm-model';
import FarmIcon from '../../components/FarmIcon';
export default function CompanionPanel({crop,zone,plots,available,onChoose,rotation}) {
 if(!crop)return null;
 const result=companionsFor(crop,zone?.id,plots,available);
 return <section className="q-companions" aria-label="Companion planting"><h3>Companions</h3>
 {zone&&rotation&&<p className="q-warning" role="status">{rotation.crop} ({rotation.label}) grew here in {rotation.year}. Rotate: pick another bed if you can.</p>}
 {zone&&result.conflicts.length>0&&<p className="q-warning" role="status">Keep apart from {result.conflicts.join(', ')}, already in this bed.</p>}
 {zone&&result.matches.length>0&&<p className="q-success">Good neighbour for {result.matches.join(', ')}.</p>}
 <div className="q-companion-list">{result.suggestions.slice(0,4).map(s=><button type="button" className="q-companion" key={s.name} onClick={()=>onChoose(s.name)}><FarmIcon name={s.name} emoji={available.find(c=>c.name===s.name)?.emoji} size={36} harvest/><span><strong>{s.name}</strong></span></button>)}</div>
 </section>;
}
