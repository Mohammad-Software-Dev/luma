"use client";
import { useState } from 'react';
import { Check, Compass, Flame, LockKeyhole, Sun, Flower2, Swords } from 'lucide-react';
import { journeyObjective, worldRegions, memoryBlooms, stages, stageRooms, areaStage, areaPart, stageBeacons, unlockedStage } from './game';
import type { Snapshot } from './game';

export function WorldMap({state,onTravel,interactKey="E"}:{state:Snapshot;onTravel:(room:number)=>void;interactKey?:string}){
 const [selected,setSelected]=useState(state.room);
 const objective=journeyObjective(state),region=worldRegions[selected],stage=areaStage(selected),available=unlockedStage(state,stage);
 const known=(id:number)=>unlockedStage(state,areaStage(id))&&(state.visited.includes(id)||worldRegions.some(r=>state.visited.includes(r.id)&&r.doors.some(d=>d.to===id)));
 const revealed=known(selected),lit=state.shrines.includes(selected),bloom=memoryBlooms.find(b=>b.room===selected),remembered=bloom&&state.discoveries.includes(bloom.id);
 return <div className="exploration-map">
  <div className="map-objective"><Sun size={22}/><div><span>NEXT CHALLENGE</span><strong>{objective.title}</strong><p>{objective.detail}</p></div></div>
  <nav className="campaign-stages" aria-label="Campaign stages">{stages.map((s,i)=><button key={s.name} aria-pressed={stage===i} onClick={()=>setSelected(i)}><span>{state.bosses.includes(i)?<Check size={16}/>:unlockedStage(state,i)?<Compass size={16}/>:<LockKeyhole size={16}/>} STAGE {i+1}</span><strong>{s.name}</strong><small>{state.bosses.includes(i)?'GUARDIAN AWAKENED':unlockedStage(state,i)?`${stageBeacons(state,i)} / 3 BEACONS`:`DEFEAT ${stages[i-1].boss.toUpperCase()}`}</small></button>)}</nav>
  <div className="campaign-route" aria-label={`Four areas in ${stages[stage].name}`}>{stageRooms(stage).map((id,index)=>{
   const r=worldRegions[id],visited=state.visited.includes(id),current=id===state.room,complete=index===3?state.bosses.includes(stage):state.beacons.includes(`${stage}:${index}`);
   return <button key={id} aria-pressed={selected===id} className={current?'current':''} onClick={()=>setSelected(id)}><span>{complete?<Check size={20}/>:index===3?<Swords size={20}/>:<Sun size={20}/>}</span><small>{['EXPLORE','TRAVERSAL TRIAL','COMBAT GAUNTLET','BOSS BATTLE'][index]}</small><strong>{available?r.name:'Sealed area'}</strong><em>{current?'YOU ARE HERE':complete?index===3?'AWAKENED':'BEACON LIT':visited?'EXPLORED':available?'AWAITING YOUR LIGHT':'LOCKED'}</em></button>;
  })}</div>
  <div className="map-legend"><span><Swords size={13}/>{state.bosses.length} / 6 guardians</span><span><Flower2 size={13}/>{state.discoveries.length} / {memoryBlooms.length} memories</span><span><Flame size={13}/> Lit Sunwell</span></div>
  <section className="map-detail" aria-label="Selected area details">
   <div className="map-detail-heading"><h3>{available?region.name:'A sealed stage'}</h3>{region.part===3&&available&&<span><Swords size={14}/>{stages[stage].boss}{state.bosses.includes(stage)?' · awakened':''}</span>}</div>
   {available?<><p className="map-note">{region.part===3?stages[stage].hint:stage===1?(region.part===1?'Ride the pulsing current to the high beacon. Hold jump to rise, release to land, and explore the western alcove for the Riverheart.':region.part===2?'Use the rising current to reach the high sentry. Clear all five creatures and light the beacon before Tidewing’s Basin.':'The pale fountains lift you while jump is held. Release to land on a ledge, and find Sun Dash near the eastern passage.'):region.part===2?'Awaken all five creatures and activate the high beacon. All three stage beacons are required to open the boss arena.':region.part===1?'Cross the environmental trial and interact with its golden beacon. Rest at the entrance Sunwell before attempting the obstacles.':'Explore the high paths and light the golden beacon. Find movement upgrades and optional memories along the way.'}</p><ul className="map-connections">{region.doors.map(door=><li key={door.to}><span aria-hidden="true">→</span><span>{worldRegions[door.to].name}</span><small>{!unlockedStage(state,areaStage(door.to))?'Guardian victory required':door.trial!==undefined&&stageBeacons(state,stage)<3?'Three beacons required':door.trial!==undefined?'Gauntlet must be cleared':'Open passage'}</small></li>)}</ul>
    {lit?<button className="travel-button" disabled={!state.canTravel||selected===state.room||state.won||!revealed} onClick={()=>onTravel(selected)}><Flame size={16}/>{selected===state.room?'Your current Sunwell':`Travel to ${region.name}`}</button>:<p className="map-note">Rest at this area’s Sunwell to unlock a return journey.</p>}
   </>:<p className="map-note">Awaken {stages[Math.max(0,stage-1)].boss} to open this stage. Travel cannot bypass a guardian.</p>}
   {revealed&&bloom&&<div className="map-memory"><Flower2 size={19}/><div><strong>{remembered?bloom.name:'A quiet memory waits'}</strong><p>{remembered?bloom.memory:bloom.hint}</p><small>{remembered?'REMEMBERED · 20 LIGHT RECEIVED':state[bloom.needs]?`${interactKey} / Y · INTERACT TO REMEMBER`:`RETURN WITH ${bloom.needs==='dash'?'SUN DASH':'SKY FEATHER'}`}</small></div></div>}
   <p className="travel-hint">{state.won?'The forest is restored. A new journey awaits.':state.canTravel?'Select a lit Sunwell in an unlocked stage to travel.':`Travel begins at a lit Sunwell. Rest with ${interactKey} or Y, then open the map beside it.`}</p>
  </section>
 </div>;
}
