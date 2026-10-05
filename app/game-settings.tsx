"use client";
import { useEffect, useState } from 'react';
import { controlActions, controlNames, defaultBindings, keyLabel, rebindControl, type ControlAction, type Preferences } from './preferences';

export function GameSettings({preferences,onChange,persisted,onDone}:{preferences:Preferences;onChange:(value:Preferences)=>void;persisted:boolean;onDone:()=>void}) {
 const [capture,setCapture]=useState<ControlAction|null>(null),[notice,setNotice]=useState('');
 useEffect(()=>{
  if(!capture)return;
  const key=(e:KeyboardEvent)=>{
   e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
   if(e.code==='Escape'){setCapture(null);setNotice('Key change cancelled.');return}
   if(e.ctrlKey||e.metaKey||e.altKey){setNotice('Choose a single key without Ctrl, Command, or Alt.');return}
   const result=rebindControl(preferences.bindings,capture,e.code);
   if(result.error){setNotice(result.error);return}
   onChange({...preferences,bindings:result.bindings});setCapture(null);setNotice(`${controlNames[capture]} now uses ${keyLabel(e.code)}.`);
  };
  window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
 },[capture,preferences,onChange]);
 const change=(value:Partial<Preferences>)=>onChange({...preferences,...value});
 return <div className="game-settings">
  <p className="settings-save" role="status">{persisted?'Your preferences save on this device.':'Preferences work for this session. Device storage is unavailable.'}</p>
  <fieldset><legend>Sound</legend>
   <label className="setting-check"><span>Mute all sound</span><input type="checkbox" data-preference="muted" checked={preferences.muted} onChange={e=>change({muted:e.target.checked})}/></label>
   {(['musicVolume','effectsVolume'] as const).map((key,i)=><label className="setting-volume" key={key}><span>{i===0?'Forest music':'Game sounds'}<output>{Math.round(preferences[key]*100)}%</output></span><input aria-label={i===0?'Forest music volume':'Game sounds volume'} aria-valuetext={`${Math.round(preferences[key]*100)} percent`} type="range" data-preference={key} min="0" max="100" step="5" value={Math.round(preferences[key]*100)} onChange={e=>change({[key]:Number(e.target.value)/100})}/></label>)}
  </fieldset>
  <fieldset><legend>Comfort & challenge</legend>
   <label className="setting-select"><span>Motion</span><select aria-label="Motion" data-preference="motion" value={preferences.motion} onChange={e=>change({motion:e.target.value as Preferences['motion']})}><option value="system">Follow device preference</option><option value="reduced">Reduce motion</option></select></label>
   <p className="setting-help">Reduced motion removes camera shake and vibration, and softens decorative movement.</p>
   <label className="setting-check"><span>Controller vibration</span><input type="checkbox" data-preference="rumble" checked={preferences.rumble} onChange={e=>change({rumble:e.target.checked})}/></label>
   <label className="setting-check"><span>Gentle journey</span><input type="checkbox" data-preference="assist" checked={preferences.assist} onChange={e=>change({assist:e.target.checked})}/></label>
   <p className="setting-help">Longer attack warnings, slower enemies’ attacks, more time after a hit, and no hearts lost from falls. The whole adventure remains open to you.</p>
  </fieldset>
  <fieldset><legend>Keyboard controls</legend><p className="setting-help">Select an action, then press a key. Escape cancels a key change and always pauses the game.</p>
   <div className="binding-grid">{controlActions.map(action=><div key={action}><span>{controlNames[action]}</span><button type="button" aria-label={`Change ${controlNames[action].toLowerCase()} key, currently ${keyLabel(preferences.bindings[action])}`} aria-pressed={capture===action} onClick={()=>{setCapture(action);setNotice('')}}>{capture===action?'Press a key…':<kbd>{keyLabel(preferences.bindings[action])}</kbd>}</button></div>)}</div>
   <p className="binding-notice" role="status" aria-live="polite">{capture?`Listening for ${controlNames[capture].toLowerCase()}. Escape cancels. `:''}{notice}</p>
   <button className="settings-reset" type="button" onClick={()=>{change({bindings:{...defaultBindings}});setCapture(null);setNotice('Default keyboard controls restored.')}}>Restore default keys</button>
  </fieldset>
  <p className="setting-help">Controller and touch controls keep their familiar layout. Use up/down to select a setting and left/right to adjust volume or motion; A toggles a checkbox. Keyboard changes need a keyboard.</p>
  <button className="settings-done" type="button" onClick={onDone}>Done</button>
 </div>;
}
