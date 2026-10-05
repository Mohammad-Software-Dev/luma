import { canonicalKeys, keyboardAction, keyLabel, normalizePreferences, readPreferences, type ControlAction, type Preferences } from './preferences';
/** Luma's deterministic, fixed-step TypeScript game engine. No remote services. */
export interface Snapshot {room:number;roomName:string;health:number;light:number;seeds:number[];dash:boolean;doubleJump:boolean;visited:number[];shrines:number[];canTravel:boolean;time:number;won:boolean;message:string;controller:boolean;dashCharge:number;bossHealth:number|null;bossMaxHealth:number;bossIntent:string;combo:number;animation:string}
type Platform={x:number;y:number;w:number;h:number};
type Door={x:number;y:number;to:number;label:string;needs?:'doubleJump'|'dash'};
type Mote={x:number;y:number;id:string};
type EnemyKind='drifter'|'charger'|'sentry'|'keeper';
type Enemy={x:number;y:number;home:number;range:number;phase:number;hp:number;hit:number;kind:EnemyKind;mode:'patrol'|'windup'|'attack'|'recover';timer:number;aimX:number;aimY:number;direction:number;maxHp:number;id:string;windup:number;defeat:number;enraged:boolean};
type Projectile={x:number;y:number;vx:number;vy:number;life:number;radius:number};
export type MenuAction='pause'|'map'|'confirm'|'back'|'next'|'previous'|'focusLost'|'decrease'|'increase';
/** Standard Gamepad mapping only; unknown layouts deliberately fall back to keyboard. */
export function gamepadButtons(pad:Pick<Gamepad,'mapping'|'axes'|'buttons'>){
 const keys=new Set<string>(), menus=new Set<MenuAction>();
 if(pad.mapping!=='standard')return {keys,menus};
 const b=(i:number)=>!!pad.buttons[i]?.pressed, x=pad.axes[0]||0,y=pad.axes[1]||0;
 if(x<-.24||b(14))keys.add('ArrowLeft');if(x>.24||b(15))keys.add('ArrowRight');
 if(b(0))keys.add('Space');if(b(2))keys.add('KeyJ');if(b(1)||b(5)||b(7))keys.add('ShiftLeft');if(b(3))keys.add('KeyE');
 if(b(9))menus.add('pause');if(b(8))menus.add('map');if(b(0))menus.add('confirm');if(b(1))menus.add('back');
 if(x<-.55||b(14))menus.add('decrease');if(x>.55||b(15))menus.add('increase');
 if(y>.55||b(13))menus.add('next');if(y<-.55||b(12))menus.add('previous');
 return {keys,menus};
}
type CombatText={x:number;y:number;text:string;color:string;life:number;max:number};
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;color:string;r:number};
type Room={name:string;tint:string;platforms:Platform[];doors:Door[];enemies:Enemy[];motes:Mote[];shrine?:number;seed?:{x:number;y:number};ability?:{x:number;y:number;type:'dash'|'doubleJump'}};
const W=2400,H=810,SAVE_KEY='luma-sunseed-v1';
const rect=(x:number,y:number,w:number,h=55):Platform=>({x,y,w,h});
const ground=(x:number,w:number)=>rect(x,705,w,180);
/** Swept collision prevents fast projectiles passing through a thin ledge. */
function crossesPlatform(x:number,y:number,toX:number,toY:number,p:Platform,radius:number){
 let entry=0,exit=1;
 for(const [origin,delta,min,max] of [[x,toX-x,p.x-radius,p.x+p.w+radius],[y,toY-y,p.y-radius,p.y+p.h+radius]]){
  if(Math.abs(delta)<.000001){if(origin<min||origin>max)return false;continue}
  const a=(min-origin)/delta,b=(max-origin)/delta;entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(entry>exit)return false;
 }return true;
}
const enemy=(x:number,y:number,range=120,kind:EnemyKind='drifter'):Enemy=>({x,y,home:x,range,phase:x/100,hp:kind==='keeper'?8:kind==='charger'?3:2,hit:0,kind,mode:'patrol',timer:.6,aimX:0,aimY:0,direction:1,maxHp:kind==='keeper'?8:kind==='charger'?3:2,id:'',windup:0,defeat:0,enraged:false});
function rooms():Room[]{
 const r:Room[]=[
  {name:'The Waking Glade',tint:'#adcf6105',platforms:[ground(0,900),ground(1070,1330),rect(450,575,240),rect(770,455,210),rect(1230,565,240),rect(1710,550,240)],doors:[{x:2310,y:705,to:1,label:'Whisper Falls'}],enemies:[enemy(1550,662),enemy(2070,658,100,'charger')],motes:[],shrine:230},
  {name:'Whisper Falls',tint:'#29dce418',platforms:[ground(0,2400),rect(460,560,260),rect(830,460,220),rect(1170,340,280),rect(1730,560,240)],doors:[{x:85,y:705,to:0,label:'Waking Glade'},{x:2310,y:705,to:2,label:'Amber Hollow'},{x:1310,y:340,to:3,label:'Windborne Canopy',needs:'doubleJump'}],enemies:[enemy(900,665,150),enemy(1560,660,140,'sentry')],motes:[],shrine:310,ability:{x:1940,y:665,type:'dash'}},
  {name:'Amber Hollow',tint:'#9f520b35',platforms:[ground(0,1020),ground(1210,1190),rect(790,560,230),rect(1220,540,200),rect(1570,405,260),rect(2040,480,250)],doors:[{x:85,y:705,to:1,label:'Whisper Falls'},{x:2170,y:480,to:5,label:'Sunspire Ruins',needs:'doubleJump'}],enemies:[enemy(1390,665),enemy(1970,656,150,'charger')],motes:[],shrine:1310,ability:{x:910,y:510,type:'doubleJump'},seed:{x:1700,y:355}},
  {name:'Windborne Canopy',tint:'#73ed8822',platforms:[ground(0,750),ground(970,630),ground(1820,580),rect(410,545,210),rect(800,430,260),rect(1270,530,240),rect(1620,390,270),rect(2070,540,210)],doors:[{x:85,y:705,to:4,label:'Moonpetal Sanctuary'},{x:1230,y:705,to:1,label:'Whisper Falls'},{x:2310,y:705,to:5,label:'Sunspire Ruins'}],enemies:[enemy(580,659),enemy(1390,485,110,'sentry'),enemy(2090,659,100,'charger')],motes:[],shrine:1140},
  {name:'Moonpetal Sanctuary',tint:'#6668d140',platforms:[ground(0,700),ground(920,780),ground(1900,500),rect(350,550,220),rect(760,400,240),rect(1160,260,300),rect(1650,445,230),rect(2060,570,230)],doors:[{x:2310,y:705,to:3,label:'Windborne Canopy'}],enemies:[enemy(450,509,80),enemy(1000,660,80),enemy(1340,215,95,'sentry')],motes:[],shrine:2120,seed:{x:1300,y:205}},
  {name:'Sunspire Ruins',tint:'#e7a13320',platforms:[ground(0,900),ground(1110,1290),rect(470,565,260),rect(870,435,260),rect(1300,535,200),rect(1660,400,320),rect(2090,540,200)],doors:[{x:85,y:705,to:3,label:'Windborne Canopy'},{x:2210,y:705,to:2,label:'Amber Hollow'}],enemies:[enemy(650,521,110,'sentry'),enemy(1470,660,120,'charger'),enemy(1840,345,100,'keeper')],motes:[],shrine:300,seed:{x:1830,y:335}}
 ];
 r.forEach((room,ri)=>{room.enemies.forEach((e,ei)=>e.id=`${ri}-${ei}`);room.platforms.forEach((p,pi)=>{if(p.y<700){for(let i=0;i<3;i++)room.motes.push({x:p.x+45+i*(p.w-90)/2,y:p.y-38,id:`${ri}-${pi}-${i}`})}});for(let i=0;i<7;i++)room.motes.push({x:430+i*270,y:653,id:`${ri}-g-${i}`})});return r;
}

/** Map metadata comes from the same passages used by the physics engine. */
export const worldRegions=rooms().map((r,id)=>({id,name:r.name.replace(/^The /,''),doors:r.doors,hasSeed:!!r.seed}));
export function journeyRoute(state:Pick<Snapshot,'room'|'dash'|'doubleJump'>,target:number):number[]{
 const queue=[[state.room]],seen=new Set([state.room]);
 while(queue.length){const path=queue.shift()!,room=path[path.length-1];if(room===target)return path;
  for(const door of worldRegions[room].doors){if(!seen.has(door.to)&&(!door.needs||state[door.needs])){seen.add(door.to);queue.push([...path,door.to])}}
 }return [];
}
export function journeyObjective(state:Pick<Snapshot,'room'|'dash'|'doubleJump'|'seeds'|'won'>){
 if(state.won)return {title:'The forest is singing again.',detail:'Every little light made a difference.',target:0,route:[] as number[]};
 let target=0,title='Bring the sunseeds home.',detail='Rest at the Waking Glade Sunwell to restore the forest.';
 if(!state.dash){target=1;title='Awaken Sun Dash.';detail='Find the golden light beyond the falls, near the eastern passage.'}
 else if(!state.doubleJump){target=2;title='Find the Sky Feather.';detail='Dash through the amber thorns, then jump onto the first high ledge.'}
 else if(state.seeds.length<3){const remaining=[2,4,5].filter(n=>!state.seeds.includes(n));target=remaining.sort((a,b)=>(journeyRoute(state,a).length||99)-(journeyRoute(state,b).length||99))[0];title=`Recover the ${worldRegions[target].name} sunseed.`;detail=target===2?'Double jump to the high amber ledge.':target===4?'Climb the moonlit terraces and free the seed from its sentry.':'Climb the ruins and strike the Keeper while it rests.'}
 const route=journeyRoute(state,target);
 if(state.room!==target&&route.length>1)detail=`Take the passage to ${worldRegions[route[1]].name}. ${detail}`;
 return {title,detail,target,route};
}

/** Shared timing drives both enemy behavior and the visible wind-up meter. */
export function combatProfile(kind:EnemyKind,enraged=false){
 if(kind==='charger')return {windup:.8,active:.48,recovery:1.3,speed:390,spread:[0]};
 if(kind==='keeper')return {windup:enraged?1.05:1.2,active:0,recovery:enraged?1.35:1.25,speed:enraged?235:205,spread:enraged?[-.38,-.19,0,.19,.38]:[-.23,0,.23]};
 return {windup:.95,active:0,recovery:2.25,speed:210,spread:[0]};
}

export class Game {
 ready:Promise<void>;state:Snapshot={room:0,roomName:'The Waking Glade',health:5,light:0,seeds:[],dash:false,doubleJump:false,visited:[0],shrines:[0],canTravel:false,time:0,won:false,message:'',controller:false,dashCharge:1,bossHealth:null,bossMaxHealth:8,bossIntent:'',combo:0,animation:'idle'};
 private preferences=readPreferences();private keyboardHeld=new Map<string,ControlAction>();private motionQuery:MediaQueryList|undefined;private musicBus:GainNode|null=null;private effectsBus:GainNode|null=null;
 private strikeBuffer=0;private combatTexts:CombatText[]=[];private respawns=0;private backdrops:HTMLImageElement[]=[];private runSheet=new Image();private padKeys=new Set<string>();private padPressed=new Set<string>();private padMenus=new Set<MenuAction>();private activePad:Gamepad|null=null;private gamepadActive=false;private projectiles:Projectile[]=[];private defeated=new Set<string>();private swingHits=new Set<string>();private combo=0;private comboWindow=0;private hitStop=0;private knockback=0;private landing=0;private runCycle=0;private stepDistance=0;private lastFacing=1;private reducedMotion=false;private backdropLoads=new Map<number,Promise<void>>();
 private ctx:CanvasRenderingContext2D;private bg=new Image();private sprite=new Image();private world=rooms();private keys=new Set<string>();private pressed=new Set<string>();private collected=new Set<string>();private broken=new Set<number>();private particles:Particle[]=[];private paused=true;private started=false;private stopped=false;private raf=0;private last=0;private accumulator=0;private elapsed=0;private messageUntil=0;private camera=0;private viewport=1440;private scale=1;private checkpoint={room:0,x:230,y:705};private saveAvailable=true;private mute=false;private audio:AudioContext|null=null;private music=0;private nextNote=0;private invincible=0;private shake=0;private attack=0;private attackCooldown=0;private dashTime=0;private dashCooldown=0;private coyote=0;private jumpBuffer=0;private usedDouble=false;private transition=0;private lastPublish=0;private safe={x:230,y:705};private player={x:230,y:705,vx:0,vy:0,face:1,grounded:true};private resize:ResizeObserver;private lifecycle=new AbortController();private ambient:Array<{x:number;y:number;s:number;phase:number}>=[];
 constructor(private canvas:HTMLCanvasElement,private onUpdate:(s:Snapshot)=>void,private onMenu:(action:MenuAction)=>void=()=>{}){
  this.ctx=canvas.getContext('2d',{alpha:false})!;
  this.backdrops=[this.bg,...Array.from({length:5},()=>new Image())];
  this.motionQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');this.motionQuery?.addEventListener?.('change',this.motionChanged);this.setPreferences(this.preferences);
  this.ready=Promise.all([this.load(this.bg,'/forest.png'),this.load(this.sprite,'/guardian.png')]).then(()=>{this.render();void this.load(this.runSheet,'/guardian-run.png').catch(()=>{});});
  // Start nearby area downloads now; each room keeps a graceful backdrop fallback.
  for(let room=1;room<6;room++)void this.loadBackdrop(room);
  this.resize=new ResizeObserver(()=>this.fit());this.resize.observe(canvas);this.fit();
  for(let i=0;i<65;i++)this.ambient.push({x:(i*173.23)%W,y:(i*79.13)%H,s:1+(i%3)*.6,phase:i*2.4});
  window.addEventListener('keydown',this.keydown);window.addEventListener('keyup',this.keyup);window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);
  this.raf=requestAnimationFrame(this.frame);
  const context=(document as unknown as {modelContext?:{registerTool:(t:unknown,o:unknown)=>Promise<void>}}).modelContext;
  if(context?.registerTool){try{Promise.resolve(context.registerTool({name:'read_luma_progress',description:'Read current Luma adventure progress, abilities, sunseeds, and location.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('This tool takes an empty object.');return {...this.state,paused:this.paused};}},{signal:this.lifecycle.signal})).catch(()=>{})}catch{}}
 }
 private load(img:HTMLImageElement,src:string){return new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(Error(`Unable to load ${src}`));img.src=src})}
 private loadBackdrop(room:number){
  if(!room)return Promise.resolve();const existing=this.backdropLoads.get(room);if(existing)return existing;
  const names=['forest','falls','hollow','canopy','sanctuary','sunspire'];
  const pending=this.load(this.backdrops[room],`/${names[room]}.webp`).catch(()=>{this.backdropLoads.delete(room)});this.backdropLoads.set(room,pending);return pending;
 }
 private fit(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.scale=this.canvas.height/H;this.viewport=this.canvas.width/this.scale;}
 private keydown=(e:KeyboardEvent)=>{
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement|null)?.closest?.('input,select,textarea,button,[contenteditable="true"]'))return;
  const action=keyboardAction(e.code,this.preferences.bindings);
  if(action&&action!=='map'&&this.started&&!this.paused){e.preventDefault();this.keyboardHeld.set(e.code,action);this.input(canonicalKeys[action],true)}
 };
 private keyup=(e:KeyboardEvent)=>{const action=this.keyboardHeld.get(e.code);this.keyboardHeld.delete(e.code);if(action&&![...this.keyboardHeld.values()].includes(action))this.input(canonicalKeys[action],false)};
 private clearInput(){this.keyboardHeld.clear();this.keys.clear();this.pressed.clear();this.padKeys.clear();this.padPressed.clear();this.strikeBuffer=0;this.jumpBuffer=0;this.accumulator=0}
 private motionChanged=()=>{this.reducedMotion=this.preferences.motion==='reduced'||!!this.motionQuery?.matches;if(this.reducedMotion)this.shake=0};
 getPreferences(){return normalizePreferences(this.preferences)}
 setPreferences(value:Preferences){
  const next=normalizePreferences(value);if(JSON.stringify(next.bindings)!==JSON.stringify(this.preferences.bindings))this.clearInput();
  this.preferences=next;this.motionChanged();this.setMuted(next.muted);this.applyAudioPreferences();
 }
 private applyAudioPreferences(){if(!this.audio)return;this.musicBus?.gain.setTargetAtTime(this.preferences.musicVolume,this.audio.currentTime,.03);this.effectsBus?.gain.setTargetAtTime(this.preferences.effectsVolume,this.audio.currentTime,.03)}
 private enemyProfile(e:Enemy){const base=combatProfile(e.kind,e.kind==='keeper'&&e.hp<=4);return this.preferences.assist?{...base,windup:base.windup*1.45,recovery:base.recovery*1.4,speed:base.speed*.8}:base}
 private blur=()=>{this.clearInput();if(this.started&&!this.paused&&!this.state.won){this.setPaused(true);this.onMenu('focusLost')}};
 private visibility=()=>{if(document.hidden){this.blur();this.save();this.audio?.suspend().catch(()=>{})}else if(!this.paused&&!this.mute)this.audio?.resume().catch(()=>{})};
 input(key:string,down:boolean){if(down&&!this.paused){if(!this.keys.has(key))this.pressed.add(key);this.keys.add(key)}else this.keys.delete(key)}
 setPaused(value:boolean){this.paused=value;this.clearInput();if(value)this.audio?.suspend().catch(()=>{});else if(!this.mute)this.audio?.resume().catch(()=>{})}
 setMuted(value:boolean){this.preferences.muted=value;this.mute=value;if(value)this.audio?.suspend().catch(()=>{});else if(!this.paused)this.audio?.resume().catch(()=>{})}
 hasSave(){try{return !!this.readSave()}catch{return false}}
 private readSave(){try{
  const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const s=JSON.parse(raw);
  if(!s||s.version!==1||!Number.isInteger(s.room)||s.room<0||s.room>5||!Array.isArray(s.seeds)||!s.seeds.every((x:unknown)=>typeof x==='number'&&[2,4,5].includes(x))||!Array.isArray(s.collected)||!Array.isArray(s.visited))return null;
  const checkpointRoom=s.checkpoint?.room;
  // Checkpoints are Sunwells, never arbitrary positions from corrupt saves.
  const room=Number.isInteger(checkpointRoom)&&checkpointRoom>=0&&checkpointRoom<6?checkpointRoom:0;
  s.checkpoint={room,x:this.world[room].shrine!,y:705};
  s.shrines=[...new Set([0,room,...(Array.isArray(s.shrines)?s.shrines.filter((n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<6):[])])];
  return s;
 }catch{return null}}

 start(resume=false){
  this.clearInput();this.world=rooms();this.collected.clear();this.broken.clear();this.defeated.clear();this.particles=[];this.projectiles=[];this.swingHits.clear();this.combo=0;this.comboWindow=0;this.strikeBuffer=0;this.combatTexts=[];this.hitStop=0;this.landing=0;this.knockback=0;this.runCycle=0;this.stepDistance=0;this.lastPublish=0;this.state={room:0,roomName:'The Waking Glade',health:5,light:0,seeds:[],dash:false,doubleJump:false,visited:[0],shrines:[0],canTravel:false,time:0,won:false,message:'',controller:false,dashCharge:1,bossHealth:null,bossMaxHealth:8,bossIntent:'',combo:0,animation:'idle'};this.checkpoint={room:0,x:230,y:705};
  const s=resume?this.readSave():null;if(s){this.state={...this.state,room:s.room,seeds:[...new Set<number>(s.seeds)],dash:!!s.dash,doubleJump:!!s.doubleJump,light:Number.isFinite(s.light)?Math.max(0,s.light):0,visited:s.visited.filter((n:number)=>Number.isInteger(n)&&n>=0&&n<6),shrines:s.shrines,won:!!s.won&&new Set(s.seeds).size===3,time:Number.isFinite(s.time)?Math.max(0,s.time):0};this.collected=new Set(s.collected.filter((n:unknown)=>typeof n==='string'));this.broken=new Set(Array.isArray(s.broken)?s.broken.filter((n:unknown)=>n===2):[]);this.defeated=new Set(Array.isArray(s.defeated)?s.defeated.filter((n:unknown)=>typeof n==='string'):[]);for(const room of this.world)for(const e of room.enemies)if(this.defeated.has(e.id))e.hp=0;if(s.checkpoint&&Number.isInteger(s.checkpoint.room)&&s.checkpoint.room>=0&&s.checkpoint.room<6&&Number.isFinite(s.checkpoint.x))this.checkpoint=s.checkpoint;}
  this.player={x:s?this.checkpoint.x:230,y:705,vx:0,vy:0,face:1,grounded:true};this.state.room=s?this.checkpoint.room:0;this.state.roomName=this.world[this.state.room].name;if(!this.state.visited.includes(this.state.room))this.state.visited.push(this.state.room);this.safe={x:this.player.x,y:705};this.camera=Math.max(0,this.player.x-this.viewport*.35);this.invincible=0;this.attack=0;this.attackCooldown=0;this.dashTime=0;this.dashCooldown=0;this.transition=0;this.coyote=.1;this.jumpBuffer=0;this.usedDouble=false;this.started=true;this.paused=false;
  try{if(!this.audio||this.audio.state==='closed'){this.audio=new AudioContext();this.musicBus=this.audio.createGain();this.effectsBus=this.audio.createGain();this.musicBus.connect(this.audio.destination);this.effectsBus.connect(this.audio.destination);this.applyAudioPreferences();}if(!this.mute)this.audio.resume().catch(()=>{})}catch{}
  this.toast(s?'Welcome back, little light.':'Follow the fireflies. Your adventure begins to the east.');this.save();this.publish();
 }
 save(){if(!this.started)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,room:this.state.room,checkpoint:this.checkpoint,seeds:this.state.seeds,dash:this.state.dash,doubleJump:this.state.doubleJump,light:this.state.light,visited:this.state.visited,shrines:this.state.shrines,won:this.state.won,time:this.state.time,collected:[...this.collected],broken:[...this.broken],defeated:[...this.defeated]}))}catch{this.saveAvailable=false}}
 destroy(){this.motionQuery?.removeEventListener?.('change',this.motionChanged);this.stopped=true;cancelAnimationFrame(this.raf);this.resize.disconnect();this.lifecycle.abort();window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.save();this.audio?.close().catch(()=>{})}
 private frame=(now:number)=>{if(this.stopped)return;this.pollGamepad();const dt=Math.min((now-(this.last||now))/1000,.05);this.last=now;this.elapsed+=dt;if(!this.paused&&!document.hidden&&!this.state.won){this.accumulator+=dt;while(this.accumulator>=1/120){this.update(1/120);this.accumulator-=1/120}}this.render();this.raf=requestAnimationFrame(this.frame)};
 private held(...keys:string[]){return keys.some(k=>this.keys.has(k)||this.padKeys.has(k))}
 private tap(...keys:string[]){return keys.some(k=>this.pressed.has(k)||this.padPressed.has(k))}
 private update(dt:number){
  if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return}
  const p=this.player,r=this.world[this.state.room];this.state.time+=dt;this.strikeBuffer=Math.max(0,this.strikeBuffer-dt);for(const text of this.combatTexts)text.life-=dt;this.combatTexts=this.combatTexts.filter(text=>text.life>0);this.comboWindow=Math.max(0,this.comboWindow-dt);this.knockback=Math.max(0,this.knockback-dt);this.landing=Math.max(0,this.landing-dt);this.invincible=Math.max(0,this.invincible-dt);this.attack=Math.max(0,this.attack-dt);this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.transition=Math.max(0,this.transition-dt);this.shake=Math.max(0,this.shake-dt*25);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.coyote=Math.max(0,this.coyote-dt);
  if(this.state.message&&this.elapsed>this.messageUntil){this.state.message='';this.publish()}
  if(this.tap('Space','KeyW','ArrowUp'))this.jumpBuffer=.14;
  const dir=Number(this.held('KeyD','ArrowRight'))-Number(this.held('KeyA','ArrowLeft'));
  if(dir)p.face=dir;
  if(this.jumpBuffer>0&&(this.coyote>0||this.state.doubleJump&&!this.usedDouble)){
   const double=this.coyote<=0;this.usedDouble=double;p.vy=double?-690:-730;p.grounded=false;this.coyote=0;this.jumpBuffer=0;this.burst(p.x,p.y,12,double?'#d7edb7':'#e3d298');this.tone(double?740:440,.09,'sine',.05);
  }
  if(this.tap('ShiftLeft','ShiftRight','KeyK')){if(this.state.dash&&this.dashCooldown<=0){this.dashTime=.18;this.dashCooldown=.7;p.vy=0;this.invincible=Math.max(this.invincible,.23);this.burst(p.x,p.y-30,14,'#ffdaa0');this.tone(230,.15,'triangle',.07)}else if(!this.state.dash)this.toast('Find the Sun Dash in Whisper Falls.')}
  if(this.tap('KeyJ','KeyX'))this.strikeBuffer=.14;
  if(this.strikeBuffer>0&&this.attackCooldown<=0){this.strikeBuffer=0;this.combo=this.comboWindow>0?this.combo%3+1:1;this.comboWindow=.85;this.attack=.23;this.attackCooldown=.29;this.swingHits.clear();this.tone(440+this.combo*95,.1,'triangle',.045);this.publish()}
  if(this.attack>0){
   for(const e of r.enemies){if(e.hp>0&&!this.swingHits.has(e.id)&&Math.abs(e.x-p.x)<(this.combo===3?150:135)&&Math.abs(e.y-(p.y-35))<95&&(e.x-p.x)*p.face>-25){
    this.swingHits.add(e.id);this.strikeEnemy(e);

   }}
   this.projectiles=this.projectiles.filter(q=>{if(Math.hypot(q.x-(p.x+p.face*55),q.y-(p.y-40))<105){this.burst(q.x,q.y,10,'#d8ffca');this.combatText(q.x,q.y-20,'PARRY','#caffcc');this.tone(980,.08,'sine',.025);return false}return true});
  }
  const target=dir*325;p.vx=this.dashTime>0?p.face*1000:this.knockback>0?p.vx:p.vx+(target-p.vx)*Math.min(1,dt*(dir?15:20));
  const oldY=p.y,oldX=p.x,wasGrounded=p.grounded;p.x+=p.vx*dt;
  if(this.dashTime<=0){const gravity=p.vy<0&&!this.held('Space','KeyW','ArrowUp')?2300:1550;p.vy=Math.min(1000,p.vy+gravity*dt)}
  p.y+=p.vy*dt;p.grounded=false;
  for(const plat of r.platforms){if(p.x+18>plat.x&&p.x-18<plat.x+plat.w&&p.vy>=0&&oldY<=plat.y+2&&p.y>=plat.y){if(!wasGrounded&&p.vy>230){this.landing=.15;this.burst(p.x,plat.y,8,'#d6d3a0');this.tone(110,.06,'triangle',.015)}p.y=plat.y;p.vy=0;p.grounded=true;this.coyote=.12;this.usedDouble=false;if(plat.y===705){this.safe={x:p.x,y:p.y}}}}
  if(this.state.room===2&&!this.broken.has(2)&&p.x+18>590&&p.x-18<635&&p.y>430){if(this.dashTime>0){this.broken.add(2);this.burst(612,580,55,'#ffc478');this.shake=this.reducedMotion?0:8;this.toast('A new path opens. Keep growing, little light.');this.save()}else{p.x=oldX<610?571:654;p.vx=0;if(this.tap('KeyE','ArrowDown'))this.toast(`Amber thorns yield to Sun Dash. Press ${keyLabel(this.preferences.bindings.dash)}.`)}}
  p.x=Math.max(25,Math.min(W-25,p.x));
  if(p.y>H+130){this.hurt(true);this.pressed.clear();return}
  const respawns=this.respawns;this.updateEnemies(dt);if(this.respawns!==respawns){this.clearInput();return}this.updateProjectiles(dt);if(this.respawns!==respawns){this.clearInput();return}
  for(const m of r.motes){if(!this.collected.has(m.id)&&Math.hypot(m.x-p.x,m.y-(p.y-35))<44){this.collected.add(m.id);this.state.light++;this.burst(m.x,m.y,8,'#fff0a3');this.tone(750+(this.state.light%5)*90,.09,'sine',.027);this.publish()}}
  if(r.ability&&!this.state[r.ability.type]&&Math.hypot(r.ability.x-p.x,r.ability.y-(p.y-35))<72){this.state[r.ability.type]=true;this.burst(r.ability.x,r.ability.y,65,'#f8e3a8');this.toast(r.ability.type==='dash'?'Sun Dash awakened! Press Shift to burst through amber thorns.':'Sky Feather awakened! Press jump again in the air.');this.chime();this.save();this.publish()}
  if(r.seed&&!this.state.seeds.includes(this.state.room)&&Math.hypot(r.seed.x-p.x,r.seed.y-(p.y-35))<65){const guardian=this.seedGuarded(r);if(!guardian){this.state.seeds.push(this.state.room);this.burst(r.seed.x,r.seed.y,90,'#ffdd78');this.toast(`Sunseed ${this.state.seeds.length} of 3 found. The forest feels a little brighter.`);this.chime();this.save();this.publish()}else if(this.tap('KeyE','ArrowDown'))this.toast('Free the sunseed from the shadow wisp. Press J to strike.')}
  if(this.tap('KeyE','ArrowDown')){
   let used=false;
   if(r.shrine!==undefined&&Math.abs(r.shrine-p.x)<100&&Math.abs(p.y-705)<90){used=true;const newlyLit=!this.state.shrines.includes(this.state.room);if(newlyLit)this.state.shrines.push(this.state.room);this.state.health=5;this.checkpoint={room:this.state.room,x:r.shrine,y:705};this.burst(p.x,p.y-30,35,'#acffce');if(this.state.room===0&&this.state.seeds.length===3){this.state.won=true;this.chime();this.toast('The Sunwell is awake. Thank you, little guardian.')}else this.toast(!this.saveAvailable?'Hearts restored. Browser storage is unavailable.':newlyLit?'Sunwell lit! Open the map here to travel between lit Sunwells.':'Hearts restored and saved. Open the map here to travel.');this.save();this.publish()}
   if(!used){for(const door of r.doors){if(Math.abs(door.x-p.x)<105&&Math.abs(p.y-door.y)<100){used=true;if(door.needs&&!this.state[door.needs])this.toast('A Sky Feather will carry you to this hidden path.');else{this.enter(door.to);return}break}}
   }
   if(!used&&this.state.room===0&&this.state.seeds.length<3&&p.x<350)this.toast('Bring three sunseeds to the Sunwell to awaken the forest.');
  }
  for(const q of this.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=100*dt}this.particles=this.particles.filter(q=>q.life>0);
  if(this.dashTime>0)this.particles.push({x:p.x,y:p.y-30,vx:-p.face*35,vy:0,life:.3,max:.3,color:'#ffe6a1',r:18});
  if(p.grounded&&Math.abs(p.vx)>40){this.runCycle+=Math.abs(p.vx)*dt*.04;this.stepDistance+=Math.abs(p.vx)*dt;if(this.stepDistance>90){this.stepDistance=0;this.burst(p.x-p.face*18,p.y-3,2,'#d4d7b0');this.tone(160+Math.random()*30,.035,'triangle',.007)}}
  this.state.animation=this.dashTime>0?'dash':this.attack>0?'strike':this.knockback>0?'hurt':!p.grounded?p.vy<0?'jump':'fall':this.landing>0?'land':Math.abs(p.vx)>40?'run':'idle';
  this.state.dashCharge=Math.max(0,1-this.dashCooldown/.7);const boss=r.enemies.find(e=>e.kind==='keeper'&&e.hp>0);this.state.bossHealth=boss&&Math.abs(boss.x-p.x)<750?boss.hp:null;
  this.camera+=(Math.max(0,Math.min(W-this.viewport,p.x-this.viewport*.4))-this.camera)*Math.min(1,dt*5);
  if(this.elapsed>this.nextNote){const notes=[261.63,329.63,392,523.25,440,392,329.63,293.66];this.tone(notes[this.music++%notes.length],1.7,'sine',.014,'music');this.nextNote=this.elapsed+1.4}
  if(this.state.time-this.lastPublish>.1){this.lastPublish=this.state.time;this.publish()}
  this.pressed.clear();this.padPressed.clear();
 }
 private settlePlayer(x:number,y=705,face=1){
  this.clearInput();this.projectiles=[];this.swingHits.clear();this.attack=0;this.attackCooldown=0;this.combo=0;this.comboWindow=0;this.strikeBuffer=0;this.combatTexts=[];this.dashTime=0;this.dashCooldown=0;this.usedDouble=false;this.hitStop=0;this.knockback=0;this.jumpBuffer=0;this.coyote=.12;this.landing=0;
  this.player={x,y,vx:0,vy:0,face,grounded:true};this.safe={x,y};this.invincible=this.preferences.assist?2.4:1.6;this.state.bossHealth=null;this.state.bossIntent='';this.state.combo=0;this.state.animation='idle';this.state.dashCharge=1;this.camera=Math.max(0,Math.min(W-this.viewport,x-this.viewport*.4));this.transition=.6;void this.loadBackdrop(this.state.room);
 }
 private enter(to:number){
  const previous=this.state.room,r=this.world[to],back=r.doors.find(d=>d.to===previous);
  this.state.room=to;this.state.roomName=r.name;if(!this.state.visited.includes(to))this.state.visited.push(to);
  this.settlePlayer(back?back.x+(back.x<300?105:back.x>2100?-105:0):300,back?back.y:705,back&&back.x>2100?-1:1);
  // Merely entering an area must not activate a Sunwell or move the checkpoint past a gate.
  this.save();this.publish();this.tone(330,.4,'sine',.03);
 }
 private atSunwell(){const shrine=this.world[this.state.room].shrine;return shrine!==undefined&&this.state.shrines.includes(this.state.room)&&Math.abs(this.player.x-shrine)<100&&Math.abs(this.player.y-705)<20&&this.player.grounded}
 travelTo(to:number){
  if(!this.started||!this.paused||this.state.won||!Number.isInteger(to)||to<0||to>=this.world.length||to===this.state.room||!this.state.shrines.includes(to)||!this.atSunwell())return false;
  this.state.room=to;this.state.roomName=this.world[to].name;this.state.health=5;const x=this.world[to].shrine!;
  if(!this.state.visited.includes(to))this.state.visited.push(to);this.checkpoint={room:to,x,y:705};this.settlePlayer(x);this.save();this.chime();this.toast(`The light carries you to ${worldRegions[to].name}.`);this.publish();return true;
 }
 private hurt(fall:boolean){
  if(this.invincible>0&&!fall)return;if(!fall||!this.preferences.assist)this.state.health--;this.invincible=this.preferences.assist?2.4:1.6;this.shake=this.reducedMotion?0:6;this.rumble(.35,120);this.burst(this.player.x,this.player.y-25,22,'#ffb991');this.tone(130,.18,'triangle',.06);
  if(this.state.health<=0){this.respawns++;this.state.health=5;this.state.room=this.checkpoint.room;this.state.roomName=this.world[this.state.room].name;this.settlePlayer(this.checkpoint.x);this.toast('A little rest, a little courage. Your light is safe.');this.save()}
  else if(fall){this.player.x=this.safe.x;this.player.y=this.safe.y;this.player.vx=0;this.player.vy=0;this.toast('The forest caught you. Try another leap.')}
  else{this.knockback=.16;this.player.vx=-this.player.face*240;this.player.vy=-220}
  this.dashTime=0;this.publish();
 }
 private pollGamepad(){
  let pad:Gamepad|null=null;
  try{if(typeof navigator!=='undefined'&&navigator.getGamepads)pad=Array.from(navigator.getGamepads()).find(p=>p?.connected&&p.mapping==='standard')??null}catch{}
  const wasConnected=!!this.activePad;this.activePad=pad;
  if(!pad){this.padKeys.clear();this.padPressed.clear();this.padMenus.clear();if(wasConnected){this.publish();if(this.gamepadActive&&!this.paused){this.setPaused(true);this.onMenu('focusLost')}}return}
  if(!wasConnected)this.publish();
  const current=gamepadButtons(pad),previous=this.padMenus;this.padMenus=current.menus;
  if(document.hidden||document.hasFocus?.()===false){this.padKeys.clear();this.padPressed.clear();return}
  const wasPaused=this.paused;
  for(const action of current.menus){if(!previous.has(action)){
   if(action==='pause'||action==='map'||this.paused||!this.started||this.state.won)this.onMenu(action);
  }}
  if(!this.paused&&this.started&&!this.state.won){for(const key of current.keys)if(!wasPaused&&!this.padKeys.has(key))this.padPressed.add(key);this.padKeys=current.keys;if(current.keys.size)this.gamepadActive=true}else{this.padKeys.clear();this.padPressed.clear()}
 }
 private rumble(strength:number,duration:number){
  const actuator=(this.activePad as (Gamepad&{vibrationActuator?:{playEffect:(type:string,options:object)=>Promise<unknown>}})|null)?.vibrationActuator;
  if(actuator&&this.preferences.rumble&&!this.reducedMotion){try{void actuator.playEffect('dual-rumble',{duration,weakMagnitude:strength,strongMagnitude:strength*.6}).catch(()=>{})}catch{}}
 }
 private seedGuarded(room:Room){return !!room.seed&&room.enemies.some(e=>e.hp>0&&Math.hypot(e.home-room.seed!.x,e.y-room.seed!.y)<220)}
 private combatText(x:number,y:number,text:string,color='#ffe8b4'){
  this.combatTexts.push({x,y,text,color,life:.8,max:.8});if(this.combatTexts.length>12)this.combatTexts.shift();
 }
 private strikeEnemy(e:Enemy){
  e.hit=.28;
  if(e.kind==='keeper'&&e.mode!=='recover'){
   this.combatText(e.x+this.player.face*95,e.y-45,'GUARDED','#bcdce5');this.burst(e.x,e.y,8,'#bcdce5');this.tone(150,.09,'triangle',.03);return;
  }
  const damage=this.combo===3?2:1;e.hp=Math.max(0,e.hp-damage);
  if(e.kind!=='keeper'){e.mode='recover';e.timer=.65;e.x=Math.max(e.home-e.range-75,Math.min(e.home+e.range+75,e.x+this.player.face*24));}
  this.combatText(e.x+(e.kind==='keeper'?this.player.face*95:0),e.y-45,e.hp<=0?'AWAKE':this.combo===3?'2 · FINISH':'1');
  this.hitStop=this.combo===3?.055:.035;this.shake=this.reducedMotion?0:this.combo===3?6:3;this.burst(e.x,e.y,this.combo===3?30:18,'#ffe8a4');this.rumble(this.combo===3?.25:.12,70);this.tone(this.combo===3?330:640,.09,'triangle',.035);
  if(e.kind==='keeper'&&e.hp>0&&e.hp<=4&&!e.enraged){e.enraged=true;this.toast('The Keeper gathers more light. Watch for a wider fan.');this.burst(e.x,e.y,30,'#ffd58d');}
  if(e.hp<=0){e.defeat=.65;this.defeated.add(e.id);this.state.light+=e.kind==='keeper'?15:3;this.tone(880,.16,'sine',.05);if(e.kind==='keeper'){this.projectiles=[];this.toast('The Keeper is awake. Its sunseed is yours.')}this.save();this.publish()}
 }
 private updateEnemies(dt:number){
  const p=this.player;
  for(const e of this.world[this.state.room].enemies){
   if(e.hp<=0){e.defeat=Math.max(0,e.defeat-dt);continue}
   e.phase+=dt*.8;e.hit=Math.max(0,e.hit-dt);e.timer=Math.max(0,e.timer-dt);
   const profile=this.enemyProfile(e);
   const close=Math.abs(p.x-e.x)<(e.kind==='keeper'?580:e.kind==='sentry'?470:320)&&Math.abs(p.y-35-e.y)<(e.kind==='charger'?100:330);
   if(e.mode==='recover'){
    if(e.timer<=0){e.mode='patrol';e.timer=.45;}
   }else if(e.kind==='drifter'){
    e.x+=(e.home+Math.sin(e.phase)*e.range-e.x)*Math.min(1,dt*5);
   }else if(e.mode==='patrol'){
    e.x+=(e.home+Math.sin(e.phase)*e.range*.35-e.x)*Math.min(1,dt*2);
    if(close&&e.timer<=0){e.mode='windup';e.windup=profile.windup;e.timer=e.windup;e.aimX=p.x;e.aimY=p.y-35;e.direction=Math.sign(p.x-e.x)||1;this.tone(e.kind==='keeper'?165:280,.16,'sine',.02);}
   }else if(e.mode==='windup'&&e.timer<=0){
    if(e.kind==='charger'){e.mode='attack';e.timer=profile.active;}
    else{
     const angle=Math.atan2(e.aimY-e.y,e.aimX-e.x);
     for(const offset of profile.spread)this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(angle+offset)*profile.speed,vy:Math.sin(angle+offset)*profile.speed,life:3.8,radius:e.kind==='keeper'?10:8});
     this.tone(190,.13,'triangle',.02);e.mode='recover';e.timer=profile.recovery;
    }
   }else if(e.mode==='attack'){
    e.x+=e.direction*profile.speed*dt;e.x=Math.max(e.home-e.range-75,Math.min(e.home+e.range+75,e.x));
    if(e.timer<=0){e.mode='recover';e.timer=profile.recovery;}
   }
   const ey=e.y+Math.sin(e.phase*3)*9;
   // A successful strike creates a safe moment to move past a recovering creature.
   if((e.kind==='keeper'||e.hit<=0)&&e.mode!=='recover'&&Math.abs(e.x-p.x)<(e.kind==='keeper'?49:39)&&Math.abs(ey-(p.y-35))<48&&this.dashTime<=0){const respawns=this.respawns;this.hurt(false);if(this.respawns!==respawns)return;}
  }
 }
 private updateProjectiles(dt:number){
  const p=this.player,remaining:Projectile[]=[];
  for(const q of this.projectiles){const oldX=q.x,oldY=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;
   if(this.world[this.state.room].platforms.some(plat=>crossesPlatform(oldX,oldY,q.x,q.y,plat,q.radius))){this.burst(q.x,q.y,4,'#dcc396');continue}
   if(this.dashTime>0&&Math.hypot(q.x-p.x,q.y-(p.y-35))<50){this.burst(q.x,q.y,8,'#ffe2a0');continue}
   if(Math.hypot(q.x-p.x,q.y-(p.y-35))<q.radius+24){const respawns=this.respawns;this.hurt(false);if(this.respawns!==respawns)return;continue}
   if(q.life>0&&q.x>0&&q.x<W&&q.y>-30&&q.y<H+30)remaining.push(q);
  }this.projectiles=remaining;
 }
 private drawLeaf(x:number,y:number,w:number,h:number,angle:number,color:string){
  const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(w*.3,-h,w*.78,-h*.7,w,0);c.bezierCurveTo(w*.66,h*.7,w*.2,h,0,0);c.fillStyle=color;c.fill();c.strokeStyle='#f3e6b855';c.lineWidth=1;c.stroke();c.beginPath();c.moveTo(2,0);c.lineTo(w-5,0);c.stroke();c.restore();
 }
 private drawEnemies(t:number){
  const c=this.ctx;
  for(const q of this.projectiles){
   this.glow(q.x,q.y,28,'#ffba7333');c.strokeStyle='#ffe3ba88';c.lineWidth=3;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(q.x-q.vx*.06,q.y-q.vy*.06);c.stroke();
   c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(q.vy,q.vx));c.fillStyle='#ffda91';c.beginPath();c.ellipse(0,0,q.radius,q.radius*.65,0,0,Math.PI*2);c.fill();c.fillStyle='#fff4c9';c.beginPath();c.arc(2,0,q.radius*.35,0,Math.PI*2);c.fill();c.restore();
  }
  for(const e of this.world[this.state.room].enemies){
   if(e.hp<=0&&e.defeat<=0)continue;
   const motion=this.reducedMotion?0:1,y=e.y+Math.sin(e.phase*3)*9,boss=e.kind==='keeper',radius=boss?48:e.kind==='charger'?30:27,alive=e.hp>0;
   const color=e.kind==='charger'?'#edba85':e.kind==='sentry'?'#98dfd7':boss?'#edd082':'#c3a5d7',windup=e.mode==='windup'&&alive,open=e.mode==='recover'&&alive;
   c.save();if(!alive)c.globalAlpha=e.defeat/.65;this.glow(e.x,y,boss?90:48,(open?'#baf1b5':color)+'33');c.restore();
   if(windup){
    const progress=1-e.timer/(e.windup||this.enemyProfile(e).windup);
    c.save();c.strokeStyle='#ffe0a7';c.lineWidth=2;c.setLineDash([6,7]);c.globalAlpha=.75;
    if(e.kind==='charger'){
     c.fillStyle='#ffc77822';c.fillRect(e.direction>0?e.x:e.x-240,y-24,240,48);c.strokeRect(e.direction>0?e.x:e.x-240,y-24,240,48);
     for(let n=1;n<=3;n++){const x=e.x+e.direction*n*65;c.beginPath();c.moveTo(x-e.direction*8,y-8);c.lineTo(x,y);c.lineTo(x-e.direction*8,y+8);c.stroke()}
    }else{
     const angle=Math.atan2(e.aimY-e.y,e.aimX-e.x),profile=this.enemyProfile(e);
     for(const offset of profile.spread){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(angle+offset)*280,e.y+Math.sin(angle+offset)*280);c.strokeStyle='#072729dd';c.lineWidth=6;c.stroke();c.strokeStyle='#ffe0a7';c.lineWidth=2;c.stroke()}
    }
    c.setLineDash([]);c.globalAlpha=1;c.strokeStyle='#132c2bcc';c.lineWidth=5;c.beginPath();c.arc(e.x,y,radius+13,0,Math.PI*2);c.stroke();c.strokeStyle='#ffe0a7';c.beginPath();c.arc(e.x,y,radius+13,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,progress));c.stroke();c.restore();
   }
   c.save();c.translate(e.x,y);
   if(!alive){const remaining=e.defeat/.65;c.globalAlpha=remaining;if(motion){c.translate(0,-(1-remaining)*30);c.scale(.6+remaining*.4,.6+remaining*.4)}}
   const breathing=1+Math.sin(t*3+e.phase)*.025*motion;c.scale(breathing,breathing);
   const shell=c.createLinearGradient(-30,-30,30,30);shell.addColorStop(0,e.hit>0?'#fff2cb':open?'#648264':'#596757');shell.addColorStop(1,e.hit>0?'#d3e4b9':'#1c3031');c.fillStyle=shell;c.strokeStyle=color;c.lineWidth=2;
   if(e.kind==='drifter'){
    for(const side of [-1,1]){c.save();c.scale(side,1);const flap=Math.sin(t*8+e.phase)*.15*motion;this.drawLeaf(3,-3,33,21,-.3+flap,e.hit>0?'#ffe6b4':'#aa95b6');this.drawLeaf(4,8,24,13,.38-flap,'#696c87');c.restore()}
    c.beginPath();c.ellipse(0,0,11,22,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-5,-18);c.quadraticCurveTo(-17,-32,-20,-26);c.moveTo(5,-18);c.quadraticCurveTo(17,-32,20,-26);c.stroke();
   }else if(e.kind==='charger'){
    c.scale(e.direction,1);const lean=windup?-.09:e.mode==='attack'?.1:0;c.rotate(lean);
    c.strokeStyle='#d9bd8b';c.lineWidth=3;
    for(const x of [-18,0,18]){const step=e.mode==='attack'?Math.sin(t*23+x)*4*motion:Math.sin(t*4+x)*2*motion;c.beginPath();c.moveTo(x,10);c.lineTo(x-9,23+step);c.lineTo(x-16,25+step);c.stroke()}
    c.strokeStyle=color;c.beginPath();c.ellipse(-3,0,28,21,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-3,-20);c.lineTo(-3,19);c.stroke();c.fillStyle='#6b4d3b';c.beginPath();c.ellipse(23,0,12,15,0,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#dfc28d';c.beginPath();c.moveTo(29,-4);c.quadraticCurveTo(45,-9,44,-25);c.quadraticCurveTo(51,-3,34,7);c.closePath();c.fill();
    c.fillStyle='#fff2c2';c.beginPath();c.arc(25,-5,3,0,Math.PI*2);c.fill();
   }else if(e.kind==='sentry'){
    const turn=t*.22*motion;
    for(let i=0;i<6;i++)this.drawLeaf(0,0,35,12,turn+i*Math.PI/3,windup?'#d0e6b5':'#659d91');
    c.fillStyle=shell;c.beginPath();c.arc(0,0,17,0,Math.PI*2);c.fill();c.strokeStyle=color;c.stroke();
    c.strokeStyle='#aee9cb88';c.beginPath();c.arc(0,0,25,0,Math.PI*2);c.stroke();
    c.fillStyle=windup?'#fff0be':'#b9e5db';c.beginPath();c.ellipse(0,-1,8,10,0,0,Math.PI*2);c.fill();c.fillStyle='#234b48';c.beginPath();c.ellipse(0,-1,2,6,0,0,Math.PI*2);c.fill();
   }else{
    const lift=windup?-.35:open?.35:Math.sin(t*2)*.08*motion;
    for(const side of [-1,1]){c.save();c.scale(side,1);this.drawLeaf(16,-4,44,25,-.35+lift,open?'#a5c99b':'#b5a56d');this.drawLeaf(14,15,33,18,.5,'#546c53');c.restore()}
    c.fillStyle=shell;c.beginPath();c.ellipse(0,0,30,39,0,0,Math.PI*2);c.fill();c.strokeStyle='#d4c58f';c.stroke();
    for(const side of [-1,1]){this.drawLeaf(side*18,-20,27,12,side<0?-2.2:-.94,'#b8b283');c.fillStyle=open?'#c1dab1':'#dccb92';c.beginPath();c.ellipse(side*12,-9,13,17,side*.25,0,Math.PI*2);c.fill();c.fillStyle='#284038';c.beginPath();c.ellipse(side*12,-8,5,open?2:8,0,0,Math.PI*2);c.fill()}
    c.fillStyle='#ecd29a';c.beginPath();c.moveTo(-6,5);c.lineTo(0,16);c.lineTo(6,5);c.closePath();c.fill();
    for(let i=0;i<3;i++)this.drawLeaf(-8+i*8,28,18,7,Math.PI/2,'#91a076');
    c.strokeStyle=open?'#c7f0b7':'#c6d8dccc';c.lineWidth=2;c.setLineDash(open?[]:[7,7]);c.beginPath();c.arc(0,0,57,-Math.PI*.9,Math.PI*.9);c.stroke();c.setLineDash([]);
   }
   if(e.kind==='drifter'){c.fillStyle='#fff0bd';c.beginPath();c.arc(-4,-7,2.5,0,Math.PI*2);c.arc(4,-7,2.5,0,Math.PI*2);c.fill()}
   c.restore();
   if(alive&&!boss&&e.hp<e.maxHp){c.fillStyle='#071e24cc';c.fillRect(e.x-23,y+42,46,5);c.fillStyle=color;c.fillRect(e.x-23,y+42,46*e.hp/e.maxHp,5)}
   if(boss&&alive&&Math.abs(this.player.x-e.x)<580)this.label(open?'OPEN · STRIKE NOW':windup?(e.hp<=4?'WIDE LIGHT FAN':'LIGHT FAN'):'GUARDED',e.x,y-94,open?'#d5f4bd':'#ffe8b4',12);
  }
 }
 private drawGuardian(t:number){
  const c=this.ctx,p=this.player,moving=Math.abs(p.vx)>40&&p.grounded;
  c.save();c.translate(p.x,p.y);if(this.invincible>0)c.globalAlpha=this.reducedMotion?.7:.7+Math.sin(t*6)*.15;c.scale(p.face,1);
  const dash=this.dashTime>0,strike=this.attack>0,air=!p.grounded;
  const sx=dash?1.25:this.landing>0?1.14:air?.94:1,sy=dash?.82:this.landing>0?.86:air?1.06:1;
  c.scale(sx,sy);c.rotate(dash?.1:strike?-.12:air?Math.max(-.14,Math.min(.12,p.vy*.0002)):Math.sin(t*2)*.015);
  if(moving&&!dash&&!strike&&this.runSheet.naturalWidth){
   const frame=Math.floor(this.runCycle)%8;
   const crops=[[9,35,401,457],[411,78,359,418],[777,90,366,406],[1173,50,342,442],[21,552,363,426],[397,555,344,423],[772,535,388,413],[1144,559,370,419]];
   const [x,y,w,h]=crops[frame],base=frame<4?496:978;
   c.drawImage(this.runSheet,x,y,w,h,-w*.105,(y-base)*.21,w*.21,h*.21);
  }else if(this.sprite.naturalWidth){const bob=!air&&!strike?Math.sin(t*2)*1.6:0;c.drawImage(this.sprite,-45,-96+bob,87,96)}
  c.restore();
 }
 private toast(message:string){this.state.message=message;this.messageUntil=this.elapsed+5.5;this.publish()}
 private publish(){this.state.controller=!!this.activePad;this.state.combo=this.comboWindow>0?this.combo:0;const boss=this.world[this.state.room].enemies.find(e=>e.kind==='keeper'&&e.hp>0);this.state.bossHealth=boss&&Math.abs(boss.x-this.player.x)<750?boss.hp:null;this.state.bossIntent=!boss?'':boss.mode==='recover'?'OPEN · STRIKE NOW':boss.mode==='windup'?(boss.hp<=4?'WIDE FAN · JUMP, DASH OR PARRY':'LIGHT FAN · JUMP, DASH OR PARRY'):'GUARDED · WAIT FOR ITS ATTACK';this.state.canTravel=this.started&&this.atSunwell()&&!this.state.won;this.onUpdate({...this.state,seeds:[...this.state.seeds],visited:[...this.state.visited],shrines:[...this.state.shrines]})}
 private burst(x:number,y:number,n:number,color:string){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*190,l=.3+Math.random()*.65;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:l,max:l,color,r:1+Math.random()*4})}}
 private tone(freq:number,duration:number,type:OscillatorType='sine',volume=.04,channel:'effects'|'music'='effects'){if(!this.audio||this.mute||this.audio.state!=='running')return;const o=this.audio.createOscillator(),g=this.audio.createGain(),t=this.audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect((channel==='music'?this.musicBus:this.effectsBus)??this.audio.destination);o.start(t);o.stop(t+duration+.03)}
 private chime(){[523,659,784,1046].forEach((f,i)=>{setTimeout(()=>{if(!this.stopped)this.tone(f,.55,'sine',.05)},i*110)})}
 private glow(x:number,y:number,r:number,color:string){const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
 private label(text:string,x:number,y:number,color='#f8e8b8',size=15){const c=this.ctx;c.font=`${size}px Georgia`;c.textAlign='center';c.fillStyle='rgba(3,24,22,.72)';const w=c.measureText(text).width+24;c.beginPath();c.roundRect(x-w/2,y-17,w,28,5);c.fill();c.fillStyle=color;c.fillText(text,x,y+2)}
 private render(){
  const c=this.ctx;if(!this.scale)return;c.setTransform(this.scale,0,0,this.scale,0,0);c.clearRect(0,0,this.viewport,H);const r=this.world[this.state.room],p=this.player,t=this.elapsed;
  const backdrop=this.backdrops[this.started?this.state.room:0];const art=backdrop?.naturalWidth?backdrop:this.bg;
  if(art.complete&&art.naturalWidth){const ratio=art.naturalWidth/art.naturalHeight,baseWidth=Math.max(this.viewport+190,H*ratio),baseHeight=baseWidth/ratio;const offset=this.started?Math.min(180,this.camera*.075):70;c.drawImage(art,-offset,-Math.max(0,baseHeight-H)*.32,baseWidth,baseHeight)}else{c.fillStyle='#184e40';c.fillRect(0,0,this.viewport,H)}
  c.fillStyle=r.tint;c.fillRect(0,0,this.viewport,H);
  const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#06232144');shade.addColorStop(.5,'#06232100');shade.addColorStop(1,'#07292388');c.fillStyle=shade;c.fillRect(0,0,this.viewport,H);
  if(!this.started){for(const a of this.ambient){const x=(a.x+t*7)%(this.viewport+50)-25,y=a.y+Math.sin(t+a.phase)*15;this.glow(x,y,13,'#faff9a20');c.fillStyle='#fffacbb0';c.beginPath();c.arc(x,y,a.s,0,Math.PI*2);c.fill()}return}
  c.save();c.translate(-this.camera+(Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
  for(const plat of r.platforms){if(plat.x+plat.w<this.camera-50||plat.x>this.camera+this.viewport+50)continue;c.save();c.beginPath();c.moveTo(plat.x,plat.y+6);c.lineTo(plat.x+10,plat.y);c.lineTo(plat.x+plat.w-9,plat.y);c.lineTo(plat.x+plat.w,plat.y+8);c.lineTo(plat.x+plat.w-6,plat.y+plat.h*.8);c.lineTo(plat.x+plat.w*.78,plat.y+plat.h);c.lineTo(plat.x+plat.w*.43,plat.y+plat.h*.87);c.lineTo(plat.x+12,plat.y+plat.h);c.closePath();c.clip();if(this.bg.naturalWidth)c.drawImage(this.bg,120,760,980,170,plat.x,plat.y,plat.w,plat.h);else{c.fillStyle='#314b34';c.fillRect(plat.x,plat.y,plat.w,plat.h)}const dark=c.createLinearGradient(0,plat.y,0,plat.y+plat.h);dark.addColorStop(0,'#273d1900');dark.addColorStop(1,'#031c21dd');c.fillStyle=dark;c.fillRect(plat.x,plat.y,plat.w,plat.h);c.fillStyle='#acbc6155';c.fillRect(plat.x,plat.y,plat.w,4);c.restore();}
  if(this.state.room===2&&!this.broken.has(2)){this.glow(612,580,105,'#ffac4933');c.fillStyle='#86682caf';c.fillRect(590,435,45,270);c.strokeStyle='#ffc177';c.lineWidth=3;for(let i=0;i<7;i++){c.beginPath();c.moveTo(580,455+i*36);c.lineTo(639,478+i*32);c.lineTo(594,495+i*29);c.stroke()}this.label('AMBER THORNS',612,411,'#ffd797',12);if(Math.abs(p.x-612)<160)this.label(this.state.controller?'B / RB · Sun Dash':'SHIFT · Sun Dash',612,745)}
  for(const door of r.doors){this.glow(door.x,door.y-55,70,door.needs&&!this.state[door.needs]?'#98b2d51a':'#dfecae25');c.save();c.strokeStyle='#e2d5a777';c.lineWidth=2;c.beginPath();c.ellipse(door.x,door.y-44,25,45,0,Math.PI,Math.PI*2);c.stroke();c.restore();const close=Math.abs(p.x-door.x)<105&&Math.abs(p.y-door.y)<100;this.label(close&&door.needs&&!this.state[door.needs]?'SKY FEATHER REQUIRED':close?(this.state.controller?'Y · ':'E · ')+door.label:door.label,door.x,door.y-105,close?'#fff0b0':'#d6e4cf',close?15:13)}
  if(r.shrine!==undefined){const x=r.shrine;this.glow(x,657,100,'#b3ffd23a');c.strokeStyle='#baeed3';c.lineWidth=3;c.beginPath();c.ellipse(x,672,22,9,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x,660);c.lineTo(x-12,645);c.lineTo(x,625);c.lineTo(x+12,645);c.closePath();c.fillStyle='#cdf7cb';c.shadowBlur=20;c.shadowColor='#dcffb9';c.fill();c.shadowBlur=0;if(Math.abs(p.x-x)<105)this.label(this.state.room===0&&this.state.seeds.length===3?(this.state.controller?'Y':'E')+' · Restore the Sunwell':(this.state.controller?'Y':'E')+' · Rest at the Sunwell',x,598)}
  for(const m of r.motes){if(this.collected.has(m.id))continue;const y=m.y+Math.sin(t*2+m.x)*5;this.glow(m.x,y,20,'#ffe68844');c.fillStyle='#ffe9a8';c.save();c.translate(m.x,y);c.rotate(Math.PI/4);c.fillRect(-3.5,-3.5,7,7);c.restore()}
  if(r.ability&&!this.state[r.ability.type]){const a=r.ability,y=a.y+Math.sin(t*2)*7;this.glow(a.x,y,80,'#fff1b14f');c.save();c.translate(a.x,y);c.rotate(t*.25);c.strokeStyle='#ffecc0';c.lineWidth=2;c.strokeRect(-20,-20,40,40);c.restore();c.fillStyle='#fff3ca';c.font='32px Georgia';c.textAlign='center';c.fillText(a.type==='dash'?'ϟ':'✧',a.x,y+11);this.label(a.type==='dash'?'SUN DASH':'SKY FEATHER',a.x,y-48,'#ffedb5',13)}
  if(r.seed&&!this.state.seeds.includes(this.state.room)){const {x,y}=r.seed;this.glow(x,y,100,'#ffcf6455');c.save();c.translate(x,y+Math.sin(t*2)*6);c.rotate(Math.sin(t)*.15);c.beginPath();c.moveTo(0,-23);c.bezierCurveTo(31,2,18,23,0,23);c.bezierCurveTo(-18,23,-31,2,0,-23);const g=c.createLinearGradient(-15,-20,15,22);g.addColorStop(0,'#fff2b6');g.addColorStop(1,'#ecab4d');c.fillStyle=g;c.shadowColor='#ffd56c';c.shadowBlur=22;c.fill();c.restore();if(!this.seedGuarded(r))this.label('SUNSEED',x,y-48,'#ffdf8d',12)}
  this.drawEnemies(t);
  c.fillStyle='#031c2166';c.beginPath();c.ellipse(p.x,p.y+3,33,8,0,0,Math.PI*2);c.fill();this.glow(p.x,p.y-35,70,'#ffebb21a');
  this.drawGuardian(t);
  if(this.attack>0){c.save();c.translate(p.x,p.y-40);c.scale(p.face,1);c.strokeStyle='#fff2c6';c.shadowColor='#ffdd86';c.shadowBlur=22;c.lineWidth=this.combo===3?11:7;c.beginPath();const phase=(.23-this.attack)/.23;c.arc(20,0,83,-1.2+phase*.3,1.2+phase*.3);c.stroke();c.restore()}
  for(const text of this.combatTexts){c.save();c.globalAlpha=Math.min(1,text.life*4);c.font='bold 16px Arial';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#0b2228';const y=text.y-(this.reducedMotion?0:(1-text.life/text.max)*28);c.strokeText(text.text,text.x,y);c.fillStyle=text.color;c.fillText(text.text,text.x,y);c.restore()}
  for(const q of this.particles){c.globalAlpha=q.life/q.max;this.glow(q.x,q.y,q.r*2,q.color+'44');c.fillStyle=q.color;c.beginPath();c.arc(q.x,q.y,q.r*q.life/q.max,0,Math.PI*2);c.fill()}c.globalAlpha=1;
  for(const a of this.ambient){const x=(a.x+t*5)%W,y=a.y+Math.sin(t*.6+a.phase)*15;this.glow(x,y,12,'#fbffb223');c.globalAlpha=.3+(Math.sin(t+a.phase)+1)*.25;c.fillStyle='#fff5be';c.beginPath();c.arc(x,y,a.s,0,Math.PI*2);c.fill()}c.globalAlpha=1;c.restore();
  if(this.transition>0){c.fillStyle=`rgba(252,239,200,${this.transition*.6})`;c.fillRect(0,0,this.viewport,H)}
 }
}
