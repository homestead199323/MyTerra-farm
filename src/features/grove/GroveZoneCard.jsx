import {useState} from 'react';
import ZoneSheet from './ZoneSheet';
import {isPlantZone} from '../farm/living/visuals';
import {animalZone} from '../quiet/farm-model';
import BedDetail from '../quiet/BedDetail';
import AnimalArt from '../quiet/AnimalArt';
import PlotOverlay from '../farm/PlotOverlay';
import Journal from '../quiet/Journal';
import { NurseryList } from '../nursery/NurseryUI';
export default function GroveZoneCard({zone,data,setData,onClose,onPlantInZone,onEditLayout}) {
 const [plotId,setPlotId]=useState(null),plot=data.garden?.plots.find(p=>p.id===plotId);
 const animals=data.livestock?.animals.filter(a=>animalZone(a,data.zones)?.id===zone.id)||[];
 return <><ZoneSheet title={zone.name} subtitle={`${zone.wM} × ${zone.hM} m · ${(zone.wM*zone.hM).toFixed(1)} m²`} onClose={onClose}>
 {isPlantZone(zone.type)&&<BedDetail zone={zone} data={data} onPlot={setPlotId}/>}
 {animals.map(a=><div className="q-plant-entry" key={a.id}><AnimalArt species={a.type} size={72}/><div><h3>{a.name||a.type}</h3><p>{a.count} {a.type}{a.count>1?'s':''}{a.breed?` · ${a.breed}`:''}</p></div></div>)}
 {zone.type==='nursery'&&<NurseryList data={data} setData={setData} zoneId={zone.id}/>}<Journal data={data} setData={setData} zoneId={zone.id}/>
 <div className="q-row q-wrap">{isPlantZone(zone.type)&&onPlantInZone&&<button className="q-button" onClick={()=>{onClose();onPlantInZone(zone.id);}}>{zone.type==='orchard'?'Plant in this orchard':'Plant in this bed'}</button>}{onEditLayout&&<button className="q-secondary" onClick={()=>{onClose();onEditLayout();}}>Edit area</button>}</div>
 </ZoneSheet>{plot&&<PlotOverlay plot={plot} data={data} setData={setData} onClose={()=>setPlotId(null)}/>}</>;
}
