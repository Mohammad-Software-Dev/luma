"use client";
import { useState } from 'react';
import { Check, Flower2, Heart, Map, Sparkles } from 'lucide-react';
import { memoryBlooms, sunwellOffers, type Blessing, type Snapshot } from './game';

export function Sunwell({state,onBuy,onMap,onDone}:{state:Snapshot;onBuy:(id:Blessing)=>boolean;onMap:()=>void;onDone:()=>void}){
 const [notice,setNotice]=useState('');
 return <div className="sunwell-panel">
  <div className="well-balance"><span><Sparkles size={22}/><strong>{state.light}</strong> gathered light</span><span><Heart size={16}/>{state.maxHealth} hearts</span></div>
  <p className="well-intro">A little light can help you grow. Blessings stay with you for this journey.</p>
  {!state.canTravel&&<p className="well-notice" role="status">Rest beside a lit Sunwell to receive its blessings.</p>}
  <div className="blessing-cards">{sunwellOffers(state).map(offer=>{
   const missing=Math.max(0,offer.cost-state.light);
   return <section className={`blessing-card ${offer.complete?'grown':''}`} key={offer.id}>
    <span className="blessing-symbol">{offer.id==='heart'?<Heart size={26}/>:<Sparkles size={26}/>}</span>
    <div><h3>{offer.name}</h3><p>{offer.detail}</p><small>{offer.id==='heart'?`${offer.level} / 2 blessings received`:offer.complete?'Blessing received':'A companion for curious explorers'}</small></div>
    <button disabled={offer.complete||missing>0||!state.canTravel} onClick={()=>{const bought=onBuy(offer.id);setNotice(bought?`${offer.name} received. Your blessing is ready.`:'This blessing is unavailable. Rest at a Sunwell and try again.')}}>
     {offer.complete?<><Check size={16}/>Fully grown</>:missing>0?`Gather ${missing} more light`:<><Sparkles size={15}/>{offer.id==='heart'?'Grow Heartwood':'Awaken Glowkeeper'} · {offer.cost} light</>}
    </button>
   </section>;
  })}</div>
  <p className="well-notice" role="status" aria-live="polite">{notice}</p>
  <div className="well-memories"><Flower2 size={22}/><div><strong>{state.discoveries.length} / {memoryBlooms.length} Memory Blooms</strong><p>Quiet buds wait off the beaten path. Return with new abilities to wake them, earn 20 light, and uncover a little forest story.</p></div></div>
  <div className="well-actions"><button className="travel-button" onClick={onMap}><Map size={16}/>Travel & discoveries</button><button className="settings-done" onClick={onDone}>Back to the forest</button></div>
 </div>;
}
