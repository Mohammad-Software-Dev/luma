/** Device preferences are separate from adventure saves. Safe to import during SSR. */
export const controlActions = ['left', 'right', 'jump', 'strike', 'dash', 'interact', 'map'] as const;
export type ControlAction = typeof controlActions[number];
export type Bindings = Record<ControlAction, string>;
export interface Preferences {
 version: 1; muted: boolean; musicVolume: number; effectsVolume: number;
 motion: 'system' | 'reduced'; assist: boolean; rumble: boolean; bindings: Bindings;
}
export const controlNames: Record<ControlAction, string> = {left:'Move left',right:'Move right',jump:'Jump',strike:'Light strike',dash:'Sun Dash',interact:'Interact',map:'World map'};
export const defaultBindings: Bindings = {left:'KeyA',right:'KeyD',jump:'Space',strike:'KeyJ',dash:'ShiftLeft',interact:'KeyE',map:'KeyM'};
export const canonicalKeys = {...defaultBindings};
const aliases: Record<ControlAction, string[]> = {left:['ArrowLeft'],right:['ArrowRight'],jump:['KeyW','ArrowUp'],strike:['KeyX'],dash:['ShiftRight','KeyK'],interact:['ArrowDown'],map:[]};
const STORAGE_KEY='luma-preferences-v1';
export function defaultPreferences(): Preferences {return {version:1,muted:false,musicVolume:.65,effectsVolume:.85,motion:'system',assist:false,rumble:true,bindings:{...defaultBindings}}}
export function validBinding(code: unknown): code is string {return typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Enter|Backspace|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backquote|Minus|Equal)$/.test(code)}
export function normalizePreferences(value: unknown): Preferences {
 const defaults=defaultPreferences();if(!value||typeof value!=='object')return defaults;
 const v=value as Partial<Preferences>;if(v.version!==1)return defaults;
 const volume=(n:unknown,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.min(1,Math.max(0,n)):fallback;
 const bindings=v.bindings;
 const valid=bindings&&controlActions.every(a=>validBinding(bindings[a]))&&new Set(controlActions.map(a=>bindings[a])).size===controlActions.length;
 return {version:1,muted:typeof v.muted==='boolean'?v.muted:defaults.muted,musicVolume:volume(v.musicVolume,defaults.musicVolume),effectsVolume:volume(v.effectsVolume,defaults.effectsVolume),motion:v.motion==='reduced'?'reduced':'system',assist:v.assist===true,rumble:typeof v.rumble==='boolean'?v.rumble:true,bindings:valid?{...bindings}:{...defaultBindings}};
}
export function readPreferences(): Preferences {try{return normalizePreferences(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'))}catch{return defaultPreferences()}}
export function savePreferences(value: Preferences): boolean {try{localStorage.setItem(STORAGE_KEY,JSON.stringify(normalizePreferences(value)));return true}catch{return false}}
export function keyLabel(code:string):string {
 if(code.startsWith('Key'))return code.slice(3);if(code.startsWith('Digit'))return code.slice(5);if(code.startsWith('Numpad'))return `NUM ${code.slice(6)}`;
 return ({Space:'SPACE',ShiftLeft:'L SHIFT',ShiftRight:'R SHIFT',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',BracketLeft:'[',BracketRight:']',Comma:',',Period:'.',Slash:'/',Semicolon:';',Quote:"'",Backquote:'`',Minus:'−',Equal:'='} as Record<string,string>)[code]??code.toUpperCase();
}
export function bindingKeys(action:ControlAction,bindings:Bindings):string[] {
 return [bindings[action],...(bindings[action]===defaultBindings[action]?aliases[action].filter(key=>!controlActions.some(other=>other!==action&&bindings[other]===key)):[])];
}
export function keyboardAction(code:string,bindings:Bindings):ControlAction|undefined {
 return controlActions.find(a=>bindings[a]===code)??controlActions.find(a=>bindingKeys(a,bindings).includes(code));
}
export function rebindControl(bindings:Bindings,action:ControlAction,code:string):{bindings:Bindings;error?:string} {
 if(!validBinding(code))return {bindings,error:'Choose a letter, arrow, number, Space, Shift, or punctuation key. Escape stays available to pause.'};
 const conflict=controlActions.find(a=>a!==action&&bindings[a]===code);
 if(conflict)return {bindings,error:`${keyLabel(code)} is already used for ${controlNames[conflict].toLowerCase()}. Choose another key.`};
 return {bindings:{...bindings,[action]:code}};
}
