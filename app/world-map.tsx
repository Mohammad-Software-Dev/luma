"use client";
import { useState } from 'react';
import { Check, Compass, Flame, Leaf, LockKeyhole, Navigation, Sun } from 'lucide-react';
import { journeyObjective, worldRegions } from './game';
import type { Snapshot } from './game';

const positions=[[100,255],[300,255],[500,255],[300,75],[100,75],[500,75]];
const passages=worldRegions.flatMap(region=>region.doors.filter(d=>region.id<d.to).map(d=>({from:region.id,to:d.to,needs:d.needs??worldRegions[d.to].doors.find(back=>back.to===region.id)?.needs})));

export function WorldMap({state,onTravel,interactKey="E"}:{state:Snapshot;onTravel:(room:number)=>void;interactKey?:string}){
 const [selected,setSelected]=useState(state.room);
 const objective=journeyObjective(state),region=worldRegions[selected];
 const known=(id:number)=>state.visited.includes(id)||worldRegions.some(r=>state.visited.includes(r.id)&&r.doors.some(d=>d.to===id));
 const revealed=known(selected),lit=state.shrines.includes(selected);
 return <div className="exploration-map">
  <div className="map-objective"><Sun size={22}/><div><span>NEXT DISCOVERY</span><strong>{objective.title}</strong><p>{objective.detail}</p></div></div>
  <div className="world-map connected-map" aria-label="Six areas and their connecting passages">
   <svg viewBox="0 0 600 330" preserveAspectRatio="none" aria-hidden="true" className="map-passages">
    {passages.map(({from,to,needs})=>{const a=positions[from],b=positions[to],locked=needs&&!state[needs],visible=known(from)&&known(to),route=objective.route.some((id,i)=>id===from&&objective.route[i+1]===to||id===to&&objective.route[i+1]===from);return <g key={`${from}-${to}`} opacity={visible?1:.25}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={locked?'passage-locked':route?'passage-route':'passage-open'}/>{locked&&<g transform={`translate(${(a[0]+b[0])/2},${(a[1]+b[1])/2})`}><circle r="13" fill="#18362c"/><path d="M-4 -1 V-5 A4 4 0 0 1 4 -5 V-1 M-6 -1 H6 V7 H-6 Z" fill="none" stroke="#d6a897" strokeWidth="2"/></g>}</g>})}
   </svg>
   {[4,3,5,0,1,2].map(id=>{const r=worldRegions[id],visited=state.visited.includes(id),current=id===state.room;return <button key={id} aria-pressed={selected===id} aria-label={`${known(id)?r.name:'Unexplored area'}${current?', you are here':''}${state.shrines.includes(id)?', Sunwell lit':''}`} style={{left:`${positions[id][0]/6}%`,top:`${positions[id][1]/3.3}%`}} onClick={()=>setSelected(id)} className={`map-room ${visited?'discovered':''} ${current?'current':''} ${selected===id?'selected':''} ${id===objective.target&&!state.won?'objective-region':''}`}>
    <span>{current?<Leaf size={18}/>:state.seeds.includes(id)?<Check size={18}/>:id===objective.target&&!state.won?<Sun size={18}/>:<Compass size={18}/>}</span><strong>{known(id)?r.name:'Unexplored'}</strong><small>{current?'YOU ARE HERE':state.seeds.includes(id)?'SUNSEED RECOVERED':visited?'EXPLORED':'UNDISCOVERED'}</small>{state.shrines.includes(id)&&<Flame className="map-shrine" size={13} aria-hidden="true"/>}
   </button>})}
  </div>
  <div className="map-legend"><span><Navigation size={13}/> Suggested route</span><span><LockKeyhole size={13}/> Sky Feather gate</span><span><Flame size={13}/> Lit Sunwell</span></div>
  <section className="map-detail" aria-label="Selected area details">
   <div className="map-detail-heading"><h3>{revealed?region.name:'An undiscovered clearing'}</h3>{revealed&&region.hasSeed&&<span><Sun size={14}/>{state.seeds.includes(selected)?'Seed recovered':'Sunseed awaits'}</span>}</div>
   {revealed?<><ul className="map-connections">{region.doors.map(door=><li key={door.to}><Chevron/><span>{worldRegions[door.to].name}</span><small>{door.needs&&!state[door.needs]?'Sky Feather required':door.needs?'Sky Feather path':'Open passage'}</small></li>)}</ul>
    {lit?<button className="travel-button" disabled={!state.canTravel||selected===state.room||state.won} onClick={()=>onTravel(selected)}><Flame size={16}/>{selected===state.room?'Your current Sunwell':`Travel to ${region.name}`}</button>:<p className="map-note">Rest at this area’s Sunwell to unlock a return journey.</p>}
   </>:<p className="map-note">Explore a connecting passage to reveal this clearing.</p>}
   <p className="travel-hint">{state.won?'The forest is restored. A new journey awaits.':state.canTravel?'You are at a lit Sunwell. Select another lit Sunwell to travel.':`Travel begins at a lit Sunwell. Rest with ${interactKey} or Y, then open the map beside it.`}</p>
  </section>
 </div>;
}
function Chevron(){return <span className="map-chevron" aria-hidden="true">↗</span>}
