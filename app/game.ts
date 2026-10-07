import { fallsCurrents, currentState, ridingCurrent, RIVERHEART, tideSurge } from './falls';
import { chooseBossPattern, bossChoreography, smoothStep } from './encounters';
import { Environment } from './environment';
import { CombatVisuals, strikeTiming, strikeActive } from './combat-visuals';
import { stages, trials, stageRooms, areaStage, areaPart, beaconId, stageBeacons, unlockedStage, bossPhase, bossAttack, type Hazard, type MovingPlatform, type BossPattern } from './campaign';
export { stages, stageRooms, areaStage, areaPart, stageBeacons, unlockedStage } from './campaign';
import { canonicalKeys, keyboardAction, keyLabel, normalizePreferences, readPreferences, type ControlAction, type Preferences } from './preferences';
/** Luma's deterministic, fixed-step TypeScript game engine. No remote services. */
export interface Snapshot {room:number;roomName:string;bosses:number[];beacons:string[];bossName:string;stage:number;part:number;enemiesLeft:number;health:number;maxHealth:number;heartLevel:number;magnet:boolean;discoveries:string[];light:number;seeds:number[];dash:boolean;doubleJump:boolean;visited:number[];shrines:number[];canTravel:boolean;time:number;won:boolean;message:string;controller:boolean;dashCharge:number;bossHealth:number|null;bossMaxHealth:number;bossIntent:string;combo:number;animation:string}
type Platform={x:number;y:number;w:number;h:number;moving?:MovingPlatform};
type Door={x:number;y:number;to:number;label:string;needs?:'doubleJump'|'dash';boss?:number;trial?:number};
type Mote={x:number;y:number;id:string};
type EnemyKind='drifter'|'charger'|'sentry'|'keeper';
type Enemy={x:number;y:number;home:number;range:number;phase:number;hp:number;hit:number;kind:EnemyKind;mode:'patrol'|'windup'|'attack'|'recover'|'reposition'|'stagger';timer:number;aimX:number;aimY:number;direction:number;maxHp:number;id:string;windup:number;defeat:number;enraged:boolean;boss?:number;cycle?:number;pattern?:BossPattern;baseY?:number;fromX?:number;fromY?:number;toX?:number;toY?:number;motionDuration?:number;shots?:number;phaseLevel?:number;recoil?:number};
type Projectile={x:number;y:number;vx:number;vy:number;life:number;radius:number};
export type MenuAction='pause'|'map'|'confirm'|'back'|'next'|'previous'|'focusLost'|'decrease'|'increase'|'well';
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
type Room={name:string;tint:string;stage?:number;part?:number;beacon?:{x:number;y:number};hazards?:Hazard[];platforms:Platform[];doors:Door[];enemies:Enemy[];motes:Mote[];shrine?:number;seed?:{x:number;y:number};ability?:{x:number;y:number;type:'dash'|'doubleJump'}};
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
 // Each biome is a four-area stage. Old entrance IDs retain their geometry and discoveries.
 const beacons=[{x:1810,y:510},{x:1300,y:300},{x:1700,y:365},{x:1840,y:350},{x:1300,y:220},{x:1830,y:360}];
 for(let stage=0;stage<6;stage++){
  const ids=stageRooms(stage),base=r[stage],content=trials[stage];base.stage=stage;base.part=0;base.beacon=beacons[stage];
  base.seed=undefined;base.enemies=base.enemies.filter(e=>e.kind!=='keeper');
  base.doors=[...(stage?[{x:85,y:705,to:stageRooms(stage-1)[3],label:'Previous stage'}]:[]),{x:2310,y:705,to:ids[1],label:stages[stage].trial}];
  r.push({name:stages[stage].trial,tint:base.tint,stage,part:1,platforms:(content.platforms as Platform[]).map(p=>({...p,moving:p.moving?{...p.moving}:undefined})),doors:[{x:85,y:705,to:stage,label:stages[stage].name},{x:2310,y:705,to:ids[2],label:stages[stage].gauntlet}],enemies:[enemy(2000,665,85,stage%2?'sentry':'charger')],motes:[],shrine:230,beacon:content.beacon,hazards:content.hazards});
  r.push({name:stages[stage].gauntlet,tint:base.tint,stage,part:2,platforms:[ground(0,2400),rect(450,560,230),rect(840,420,260),rect(1210,280,260),rect(1560,420,260),rect(1920,560,240)],doors:[{x:85,y:705,to:ids[1],label:stages[stage].trial},{x:2310,y:705,to:ids[3],label:stages[stage].arena,trial:stage}],enemies:[enemy(530,660,110),enemy(880,660,140,'charger'),enemy(1330,235,90,'sentry'),enemy(1680,375,110,stage>1?'sentry':'drifter'),enemy(2030,660,120,'charger')],motes:[],shrine:230,beacon:{x:1340,y:240},hazards:stage>1?[{kind:'thorns',x:1110,y:677,w:110,h:28}]:[]});
  const guardian=enemy(1530,645,680,'keeper');guardian.boss=stage;guardian.cycle=0;guardian.hp=guardian.maxHp=stages[stage].hp;
  r.push({name:stages[stage].arena,tint:base.tint,stage,part:3,platforms:[ground(0,2400),rect(850,550,220),rect(1220,435,240),rect(1760,550,220)],doors:[{x:85,y:705,to:ids[2],label:stages[stage].gauntlet},...(stage<5?[{x:2310,y:705,to:stage+1,label:stages[stage+1].name,boss:stage}]:[])],enemies:[guardian],motes:[],shrine:230});
 }
 r.forEach((room,ri)=>{room.enemies.forEach((e,ei)=>e.id=`${ri}-${ei}`);room.platforms.forEach((p,pi)=>{if(p.y<700){for(let i=0;i<3;i++)room.motes.push({x:p.x+45+i*(p.w-90)/2,y:p.y-38,id:`${ri}-${pi}-${i}`})}});for(let i=0;i<7;i++)room.motes.push({x:430+i*270,y:653,id:`${ri}-g-${i}`})});return r;
}

/** Optional discoveries invite a return journey after movement upgrades. */
export const memoryBlooms=[
 {id:'brook-song',room:0,x:875,y:415,needs:'doubleJump' as const,name:'The Brook’s First Song',hint:'Above the first brook, a quiet bud waits for a skyward leap.',memory:'Before the forest grew sleepy, the brook taught every young leaf to dance.'},
 {id:'waterfall-wish',room:1,x:1000,y:420,needs:'dash' as const,name:'A Waterfall Wish',hint:'Climb above the falls. A golden bud answers the light of Sun Dash.',memory:'A tiny guardian once wished on the falling water. The forest has kept that wish warm.'},
 {id:RIVERHEART,room:9,x:690,y:190,needs:'dash' as const,name:'The Riverheart',hint:'Ride the western current in the Spillway to a sheltered alcove above the trail.',memory:'The river carries those who listen. Sun Dash now recovers twice as fast while you ride a current.'},
 {id:'wind-lullaby',room:3,x:1730,y:350,needs:'doubleJump' as const,name:'The Wind’s Lullaby',hint:'Seek the highest eastern branch, where the wind rests between songs.',memory:'The canopy sways to an old lullaby. Even the bravest little lights need a place to rest.'}
];
export type Blessing='heart'|'magnet';
export function sunwellOffers(state:Pick<Snapshot,'heartLevel'|'magnet'>){
 return [
  {id:'heart' as const,name:'Heartwood',cost:state.heartLevel===0?20:35,complete:state.heartLevel>=2,detail:state.heartLevel>=2?'Your roots are strong. Seven hearts of courage.':`Grow one extra heart · ${5+state.heartLevel} → ${6+state.heartLevel} hearts.`,level:state.heartLevel},
  {id:'magnet' as const,name:'Glowkeeper',cost:25,complete:state.magnet,detail:state.magnet?'Nearby light is drawn to your glow.':'Gather light from farther away, even beside tricky ledges.',level:state.magnet?1:0}
 ];
}

/** Map metadata comes from the same passages used by the physics engine. */
export const worldRegions=rooms().map((r,id)=>({id,name:r.name.replace(/^The /,''),doors:r.doors,stage:r.stage!,part:r.part!,hasSeed:[2,4,5].includes(r.stage!)&&r.part===3,hasMemory:memoryBlooms.some(b=>b.room===id)}));
export function journeyRoute(state:Pick<Snapshot,'room'|'dash'|'doubleJump'|'bosses'|'beacons'>,target:number):number[]{
 const queue=[[state.room]],seen=new Set([state.room]);
 while(queue.length){const path=queue.shift()!,room=path[path.length-1];if(room===target)return path;
  for(const door of worldRegions[room].doors){if(!seen.has(door.to)&&unlockedStage(state,areaStage(door.to))&&(door.boss===undefined||state.bosses.includes(door.boss))&&(door.trial===undefined||stageBeacons(state,door.trial)===3)&&(!door.needs||state[door.needs])){seen.add(door.to);queue.push([...path,door.to])}}
 }return [];
}
export function journeyObjective(state:Pick<Snapshot,'room'|'dash'|'doubleJump'|'seeds'|'won'|'bosses'|'beacons'|'enemiesLeft'>){
 if(state.won)return {title:'Six guardians awake. The forest sings!',detail:'Every little light made a difference.',target:23,route:[] as number[]};
 const stage=areaStage(state.room),ids=stageRooms(stage);
 let target=state.room,title='',detail='';
 if(state.bosses.includes(stage)){target=stage<5?stage+1:ids[3];title=stage<5?`Continue to ${stages[stage+1].name}.`:'The dawn is restored.';detail='The guardian has opened the eastern passage. You can also revisit earlier stages.'}
 else if(stage===1&&!state.dash){target=1;title='Awaken Sun Dash.';detail='Find the golden light near the eastern passage.'}
 else if(stage===2&&!state.doubleJump){target=2;title='Find the Sky Feather.';detail='Dash through the amber thorns, then jump onto the first high ledge.'}
 else {const part=[0,1,2].find(n=>!state.beacons.includes(beaconId(stage,n)));
  if(part!==undefined){target=ids[part];title=`Light the ${['exploration','trial','gauntlet'][part]} beacon.`;detail=stage===1?(part===0?'Hold jump inside the pale currents to ride upward. Find the beacon above the falls.':part===1?'Ride the pulsing current, then dash onto the high beacon shelf. A western alcove holds the Riverheart.':'Ride the current to reach the high sentry. Clear every creature and light the beacon.'):part===0?'Find the golden beacon above the main trail, and interact beside it.':part===1?'Cross the shifting platforms and timed hazards. Find and activate the trail beacon.':'Climb the terraces, awaken every creature in the gauntlet, and activate its beacon.'}
  else {target=ids[3];title=`Face ${stages[stage].boss}.`;detail=stages[stage].hint+' Clear every gauntlet creature to open the arena.'}
 }
 if(areaPart(state.room)===2&&state.beacons.includes(beaconId(stage,2))&&state.enemiesLeft>0){target=state.room;title=`Awaken ${state.enemiesLeft} remaining gauntlet creatures.`;detail='Every creature here must be awakened before the arena opens. Climb the terraces to find the sentries.'}
 const route=journeyRoute(state,target);if(state.room!==target&&route.length>1)detail=`Take the passage to ${worldRegions[route[1]].name}. ${detail}`;
 return {title,detail,target,route};
}

/** Shared timing drives both enemy behavior and the visible wind-up meter. */
export function combatProfile(kind:EnemyKind,enraged=false){
 if(kind==='drifter')return {windup:.7,active:.65,recovery:1.25,speed:300,spread:[0]};
 if(kind==='charger')return {windup:.8,active:.48,recovery:1.3,speed:390,spread:[0]};
 if(kind==='keeper')return {windup:enraged?1.05:1.2,active:0,recovery:enraged?1.35:1.25,speed:enraged?235:205,spread:enraged?[-.38,-.19,0,.19,.38]:[-.23,0,.23]};
 return {windup:.95,active:0,recovery:2.25,speed:210,spread:[0]};
}

export class Game {
 ready:Promise<void>;state:Snapshot={room:0,roomName:'The Waking Glade',bosses:[],beacons:[],bossName:'',stage:0,part:0,enemiesLeft:0,health:5,maxHealth:5,heartLevel:0,magnet:false,discoveries:[],light:0,seeds:[],dash:false,doubleJump:false,visited:[0],shrines:[0],canTravel:false,time:0,won:false,message:'',controller:false,dashCharge:1,bossHealth:null,bossMaxHealth:8,bossIntent:'',combo:0,animation:'idle'};
 private visuals=new CombatVisuals();
 private environment=new Environment();
 private glowSprites=new Map<string,HTMLCanvasElement>();
 private preferences=readPreferences();private keyboardHeld=new Map<string,ControlAction>();private motionQuery:MediaQueryList|undefined;private musicBus:GainNode|null=null;private effectsBus:GainNode|null=null;
 private encounter:number|null=null;private bossHazards:Array<{x:number;timer:number;life:number;w:number;fired:boolean}>=[];private strikeBuffer=0;private combatTexts:CombatText[]=[];private respawns=0;private backdrops:HTMLImageElement[]=[];private runSheet=new Image();private padKeys=new Set<string>();private padPressed=new Set<string>();private padMenus=new Set<MenuAction>();private activePad:Gamepad|null=null;private gamepadActive=false;private projectiles:Projectile[]=[];private defeated=new Set<string>();private swingHits=new Set<string>();private combo=0;private comboWindow=0;private hitStop=0;private knockback=0;private landing=0;private runCycle=0;private stepDistance=0;private lastFacing=1;private reducedMotion=false;private backdropLoads=new Map<number,Promise<void>>();
 private ctx:CanvasRenderingContext2D;private bg=new Image();private sprite=new Image();private world=rooms();private keys=new Set<string>();private pressed=new Set<string>();private collected=new Set<string>();private broken=new Set<number>();private particles:Particle[]=[];private paused=true;private started=false;private stopped=false;private raf=0;private last=0;private accumulator=0;private elapsed=0;private messageUntil=0;private camera=0;private viewport=1440;private scale=1;private checkpoint={room:0,x:230,y:705};private saveAvailable=true;private mute=false;private audio:AudioContext|null=null;private music=0;private nextNote=0;private invincible=0;private shake=0;private attack=0;private attackCooldown=0;private dashTime=0;private dashCooldown=0;private coyote=0;private jumpBuffer=0;private usedDouble=false;private transition=0;private lastPublish=0;private safe={x:230,y:705};private player={x:230,y:705,vx:0,vy:0,face:1,grounded:true};private resize:ResizeObserver;private lifecycle=new AbortController();private ambient:Array<{x:number;y:number;s:number;phase:number}>=[];
 constructor(private canvas:HTMLCanvasElement,private onUpdate:(s:Snapshot)=>void,private onMenu:(action:MenuAction)=>void=()=>{}){
  this.ctx=canvas.getContext('2d',{alpha:false})!;
  this.backdrops=[this.bg,...Array.from({length:5},()=>new Image())];
  this.motionQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');this.motionQuery?.addEventListener?.('change',this.motionChanged);this.setPreferences(this.preferences);
  this.ready=Promise.all([this.load(this.bg,'/forest.png'),this.load(this.sprite,'/art/luma-base.webp'),this.visuals.ready,this.environment.ready]).then(()=>{if(this.stopped)return;this.render();void this.load(this.runSheet,'/art/luma-run.webp').catch(()=>{});});
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
 private fit(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2,1920/Math.max(1,r.width),1080/Math.max(1,r.height));this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.scale=this.canvas.height/H;this.viewport=this.canvas.width/this.scale;}
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
  if(!s||![1,2].includes(s.version)||!Number.isInteger(s.room)||s.room<0||s.room>=this.world.length||!Array.isArray(s.seeds)||!s.seeds.every((x:unknown)=>typeof x==='number'&&[2,4,5].includes(x))||!Array.isArray(s.collected)||!Array.isArray(s.visited))return null;
  // Legacy journeys keep rewards and memories, but replay the new campaign gates.
  s.bosses=s.version===2&&Array.isArray(s.bosses)?[...new Set<number>(s.bosses.filter((n:unknown)=>Number.isInteger(n)&&typeof n==='number'&&n>=0&&n<6))]:[];
  s.bosses=s.bosses.filter((n:number)=>Array.from({length:n},(_,i)=>i).every(i=>s.bosses.includes(i)));
  s.beacons=s.version===2&&Array.isArray(s.beacons)?[...new Set<string>(s.beacons.filter((id:unknown)=>typeof id==='string'&&/^[0-5]:[0-2]$/.test(id)&&unlockedStage(s,Number(id[0]))))]:[];
  if(!unlockedStage(s,areaStage(s.room)))s.room=0;
  if(s.version===1){s.checkpoint={room:0};s.visited=[0];s.shrines=[0];s.defeated=(Array.isArray(s.defeated)?s.defeated:[]).filter((id:unknown)=>typeof id==='string'&&id!=='5-2')}
  const checkpointRoom=s.checkpoint?.room;
  // Checkpoints are Sunwells, never arbitrary positions from corrupt saves.
  const room=Number.isInteger(checkpointRoom)&&checkpointRoom>=0&&checkpointRoom<this.world.length&&unlockedStage(s,areaStage(checkpointRoom))?checkpointRoom:0;
  s.checkpoint={room,x:this.world[room].shrine!,y:705};
  s.shrines=[...new Set([0,room,...(Array.isArray(s.shrines)?s.shrines.filter((n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<this.world.length&&unlockedStage(s,areaStage(n))):[])])];
  s.heartLevel=Number.isInteger(s.heartLevel)&&s.heartLevel>=0&&s.heartLevel<=2?s.heartLevel:0;s.magnet=s.magnet===true;
  s.discoveries=[...new Set<string>(Array.isArray(s.discoveries)?s.discoveries.filter((id:unknown)=>memoryBlooms.some(b=>b.id===id)):[])];
  s.legacy=s.version===1;s.won=s.version===2&&s.bosses.length===6;return s;
 }catch{return null}}

 start(resume=false){
  this.clearInput();this.visuals.reset();this.world=rooms();this.collected.clear();this.broken.clear();this.defeated.clear();this.particles=[];this.projectiles=[];this.bossHazards=[];this.encounter=null;this.swingHits.clear();this.combo=0;this.comboWindow=0;this.strikeBuffer=0;this.combatTexts=[];this.hitStop=0;this.landing=0;this.knockback=0;this.runCycle=0;this.stepDistance=0;this.lastPublish=0;this.state={room:0,roomName:'The Waking Glade',bosses:[],beacons:[],bossName:'',stage:0,part:0,enemiesLeft:0,health:5,maxHealth:5,heartLevel:0,magnet:false,discoveries:[],light:0,seeds:[],dash:false,doubleJump:false,visited:[0],shrines:[0],canTravel:false,time:0,won:false,message:'',controller:false,dashCharge:1,bossHealth:null,bossMaxHealth:8,bossIntent:'',combo:0,animation:'idle'};this.checkpoint={room:0,x:230,y:705};
  const s=resume?this.readSave():null;if(s){this.state={...this.state,room:s.room,bosses:s.bosses,beacons:s.beacons,heartLevel:s.heartLevel,maxHealth:5+s.heartLevel,health:5+s.heartLevel,magnet:s.magnet,discoveries:s.discoveries,seeds:[...new Set<number>(s.seeds)],dash:!!s.dash,doubleJump:!!s.doubleJump,light:Number.isFinite(s.light)?Math.max(0,Math.min(1000000,Math.floor(s.light))):0,visited:s.visited.filter((n:number)=>Number.isInteger(n)&&n>=0&&n<this.world.length&&unlockedStage(s,areaStage(n))),shrines:s.shrines,won:!!s.won&&s.bosses.length===6,time:Number.isFinite(s.time)?Math.max(0,s.time):0};this.collected=new Set(s.collected.filter((n:unknown)=>typeof n==='string'));this.broken=new Set(Array.isArray(s.broken)?s.broken.filter((n:unknown)=>n===2):[]);this.defeated=new Set(Array.isArray(s.defeated)?s.defeated.filter((n:unknown)=>typeof n==='string'):[]);for(const room of this.world)for(const e of room.enemies)if(e.boss!==undefined?this.state.bosses.includes(e.boss):this.defeated.has(e.id))e.hp=0;if(s.checkpoint&&Number.isInteger(s.checkpoint.room)&&s.checkpoint.room>=0&&s.checkpoint.room<this.world.length&&Number.isFinite(s.checkpoint.x))this.checkpoint=s.checkpoint;}
  this.player={x:s?this.checkpoint.x:230,y:705,vx:0,vy:0,face:1,grounded:true};this.state.room=s?this.checkpoint.room:0;this.state.roomName=this.world[this.state.room].name;if(!this.state.visited.includes(this.state.room))this.state.visited.push(this.state.room);this.safe={x:this.player.x,y:705};this.camera=Math.max(0,this.player.x-this.viewport*.35);this.invincible=0;this.attack=0;this.attackCooldown=0;this.dashTime=0;this.dashCooldown=0;this.transition=0;this.coyote=.1;this.jumpBuffer=0;this.usedDouble=false;this.started=true;this.paused=false;
  try{if(!this.audio||this.audio.state==='closed'){this.audio=new AudioContext();this.musicBus=this.audio.createGain();this.effectsBus=this.audio.createGain();this.musicBus.connect(this.audio.destination);this.effectsBus.connect(this.audio.destination);this.applyAudioPreferences();}if(!this.mute)this.audio.resume().catch(()=>{})}catch{}
  this.toast(s?.legacy?'A bigger adventure awaits! Your rewards are safe. Begin the six-stage campaign at the Glade.':s?'Welcome back, little light.':'Light the high trail beacon, then follow the eastern passage. Six guardians await.');this.save();this.publish();
 }
 save(){if(!this.started)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,bosses:this.state.bosses,beacons:this.state.beacons,room:this.state.room,checkpoint:this.checkpoint,heartLevel:this.state.heartLevel,magnet:this.state.magnet,discoveries:this.state.discoveries,seeds:this.state.seeds,dash:this.state.dash,doubleJump:this.state.doubleJump,light:this.state.light,visited:this.state.visited,shrines:this.state.shrines,won:this.state.won,time:this.state.time,collected:[...this.collected],broken:[...this.broken],defeated:[...this.defeated]}))}catch{this.saveAvailable=false}}
 destroy(){this.environment.destroy();for(const c of this.glowSprites.values()){c.width=0;c.height=0;}this.glowSprites.clear();this.motionQuery?.removeEventListener?.('change',this.motionChanged);this.stopped=true;cancelAnimationFrame(this.raf);this.resize.disconnect();this.lifecycle.abort();window.removeEventListener('keydown',this.keydown);window.removeEventListener('keyup',this.keyup);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.save();this.audio?.close().catch(()=>{})}
 private frame=(now:number)=>{if(this.stopped)return;if(document.hidden){this.last=now;this.accumulator=0;this.raf=requestAnimationFrame(this.frame);return;}this.pollGamepad();const dt=Math.min((now-(this.last||now))/1000,.05);this.last=now;this.elapsed+=dt;if(!this.paused&&!document.hidden&&!this.state.won){this.accumulator+=dt;while(this.accumulator>=1/120){this.update(1/120);this.accumulator-=1/120}}this.render();this.raf=requestAnimationFrame(this.frame)};
 private held(...keys:string[]){return keys.some(k=>this.keys.has(k)||this.padKeys.has(k))}
 private tap(...keys:string[]){return keys.some(k=>this.pressed.has(k)||this.padPressed.has(k))}
 private update(dt:number){
  if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return}
  const p=this.player,r=this.world[this.state.room];this.visuals.update(dt,p,this.dashTime>0,this.reducedMotion);this.state.time+=dt;this.updatePlatforms(dt);this.strikeBuffer=Math.max(0,this.strikeBuffer-dt);for(const text of this.combatTexts)text.life-=dt;this.combatTexts=this.combatTexts.filter(text=>text.life>0);this.comboWindow=Math.max(0,this.comboWindow-dt);this.knockback=Math.max(0,this.knockback-dt);this.landing=Math.max(0,this.landing-dt);this.invincible=Math.max(0,this.invincible-dt);this.attack=Math.max(0,this.attack-dt);this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.transition=Math.max(0,this.transition-dt);this.shake=Math.max(0,this.shake-dt*25);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.coyote=Math.max(0,this.coyote-dt);
  if(this.state.message&&this.elapsed>this.messageUntil){this.state.message='';this.publish()}
  if(this.tap('Space','KeyW','ArrowUp'))this.jumpBuffer=.14;
  const dir=Number(this.held('KeyD','ArrowRight'))-Number(this.held('KeyA','ArrowLeft'));
  if(dir)p.face=dir;
  if(this.jumpBuffer>0&&(this.coyote>0||this.state.doubleJump&&!this.usedDouble)){
   const double=this.coyote<=0;this.usedDouble=double;p.vy=double?-690:-730;p.grounded=false;this.coyote=0;this.jumpBuffer=0;this.burst(p.x,p.y,12,double?'#d7edb7':'#e3d298');this.tone(double?740:440,.09,'sine',.05);
  }
  if(this.tap('ShiftLeft','ShiftRight','KeyK')){if(this.state.dash&&this.dashCooldown<=0){this.dashTime=.18;this.dashCooldown=.7;p.vy=0;this.invincible=Math.max(this.invincible,.23);this.burst(p.x,p.y-30,14,'#ffdaa0');this.tone(230,.15,'triangle',.07)}else if(!this.state.dash)this.toast('Find the Sun Dash in Whisper Falls.')}
  if(this.tap('KeyJ','KeyX'))this.strikeBuffer=.14;
  if(this.strikeBuffer>0&&this.attackCooldown<=0){this.strikeBuffer=0;this.combo=this.comboWindow>0?this.combo%3+1:1;this.comboWindow=.85;this.attack=strikeTiming.duration;this.attackCooldown=strikeTiming.cooldown;this.swingHits.clear();this.tone(440+this.combo*95,.1,'triangle',.045);this.publish()}
  if(strikeActive(this.attack)){
   for(const e of r.enemies){if(e.hp>0&&!this.swingHits.has(e.id)&&Math.abs(e.x-p.x)<(this.combo===3?150:135)&&Math.abs(e.y-(p.y-35))<95&&(e.x-p.x)*p.face>-25){
    this.swingHits.add(e.id);this.strikeEnemy(e);

   }}
   this.projectiles=this.projectiles.filter(q=>{if(Math.hypot(q.x-(p.x+p.face*55),q.y-(p.y-40))<105){this.burst(q.x,q.y,10,'#d8ffca');this.visuals.emit('parry',q.x,q.y,1,Math.atan2(q.vy,q.vx));this.combatText(q.x,q.y-20,'PARRY','#caffcc');this.tone(980,.08,'sine',.025);return false}return true});
  }
  const target=dir*325;p.vx=this.dashTime>0?p.face*1000:this.knockback>0?p.vx:p.vx+(target-p.vx)*Math.min(1,dt*(dir?15:20));
  const oldY=p.y,oldX=p.x,wasGrounded=p.grounded;p.x+=p.vx*dt;
  if(this.dashTime<=0){const gravity=p.vy<0&&!this.held('Space','KeyW','ArrowUp')?2300:1550;p.vy=Math.min(1000,p.vy+gravity*dt)}
  const current=ridingCurrent(this.state.room,p.x,p.y,this.state.time);
  if(current&&this.held('Space','KeyW','ArrowUp')&&this.dashTime<=0){
   p.vy=Math.min(p.vy,p.vy+(-current.speed-p.vy)*Math.min(1,dt*12));this.coyote=0;this.jumpBuffer=0;
   if(this.state.discoveries.includes(RIVERHEART))this.dashCooldown=Math.max(0,this.dashCooldown-dt);
  }
  p.y+=p.vy*dt;p.grounded=false;
  for(const plat of r.platforms){if(p.x+18>plat.x&&p.x-18<plat.x+plat.w&&p.vy>=0&&oldY<=plat.y+2&&p.y>=plat.y){if(!wasGrounded&&p.vy>230){this.landing=.15;this.visuals.emit('land',p.x,plat.y);this.burst(p.x,plat.y,8,'#d6d3a0');this.tone(110,.06,'triangle',.015)}p.y=plat.y;p.vy=0;p.grounded=true;this.coyote=.12;this.usedDouble=false;if(plat.y===705&&!r.hazards?.some(h=>Math.abs(p.x-h.x)<h.w+30)){this.safe={x:p.x,y:p.y}}}}
  if(this.state.room===2&&!this.broken.has(2)&&p.x+18>590&&p.x-18<635&&p.y>430){if(this.dashTime>0){this.broken.add(2);this.burst(612,580,55,'#ffc478');this.shake=this.reducedMotion?0:8;this.toast('A new path opens. Keep growing, little light.');this.save()}else{p.x=oldX<610?571:654;p.vx=0;if(this.tap('KeyE','ArrowDown'))this.toast(`Amber thorns yield to Sun Dash. Press ${keyLabel(this.preferences.bindings.dash)}.`)}}
  p.x=Math.max(25,Math.min(W-25,p.x));
  if(p.y>H+130){this.hurt(true);this.pressed.clear();return}
  const respawns=this.respawns;this.updateHazards(dt);if(this.respawns!==respawns){this.clearInput();return}this.updateEnemies(dt);if(this.respawns!==respawns){this.clearInput();return}this.updateProjectiles(dt);if(this.respawns!==respawns){this.clearInput();return}
  for(const m of r.motes){if(!this.collected.has(m.id)&&Math.hypot(m.x-p.x,m.y-(p.y-35))<(this.state.magnet?105:44)){this.collected.add(m.id);this.state.light++;this.burst(m.x,m.y,8,'#fff0a3');this.tone(750+(this.state.light%5)*90,.09,'sine',.027);this.publish()}}
  if(r.ability&&!this.state[r.ability.type]&&Math.hypot(r.ability.x-p.x,r.ability.y-(p.y-35))<72){this.state[r.ability.type]=true;this.burst(r.ability.x,r.ability.y,65,'#f8e3a8');this.toast(r.ability.type==='dash'?`Sun Dash awakened! Press ${keyLabel(this.preferences.bindings.dash)} to burst through amber thorns.`:'Sky Feather awakened! Press jump again in the air.');this.chime();this.save();this.publish()}
  if(r.seed&&!this.state.seeds.includes(this.state.room)&&Math.hypot(r.seed.x-p.x,r.seed.y-(p.y-35))<65){const guardian=this.seedGuarded(r);if(!guardian){this.state.seeds.push(this.state.room);this.burst(r.seed.x,r.seed.y,90,'#ffdd78');this.toast(`Sunseed ${this.state.seeds.length} of 3 found. The forest feels a little brighter.`);this.chime();this.save();this.publish()}else if(this.tap('KeyE','ArrowDown'))this.toast(`Free the sunseed from its guardian. Press ${keyLabel(this.preferences.bindings.strike)} to strike.`)}
  if(this.tap('KeyE','ArrowDown')){
   let used=this.activateBeacon()||this.discoverMemory();
   if(!used&&r.shrine!==undefined&&Math.abs(r.shrine-p.x)<100&&Math.abs(p.y-705)<90){used=true;const newlyLit=!this.state.shrines.includes(this.state.room);if(newlyLit)this.state.shrines.push(this.state.room);this.state.health=this.state.maxHealth;this.checkpoint={room:this.state.room,x:r.shrine,y:705};this.burst(p.x,p.y-30,35,'#acffce');if(this.state.bosses.length===6){this.state.won=true;this.chime();this.toast('The Sunwell is awake. Thank you, little guardian.')}else this.toast(!this.saveAvailable?'Hearts restored. Browser storage is unavailable.':newlyLit?'Sunwell lit! Let your gathered light help you grow.':'Hearts restored and saved. Take a moment to grow.');this.save();this.publish();if(!this.state.won)this.onMenu('well')}
   if(!used){for(const door of r.doors){if(Math.abs(door.x-p.x)<105&&Math.abs(p.y-door.y)<100){used=true;const blocked=this.doorBlocked(door);if(blocked)this.toast(blocked);else{this.enter(door.to);return}break}}
   }
   if(!used&&this.state.room===0&&this.state.seeds.length<3&&p.x<350)this.toast('Light three beacons in each stage, then awaken its guardian to open the next stage.');
  }
  for(const q of this.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=100*dt}this.particles=this.particles.filter(q=>q.life>0);
  if(this.dashTime>0)this.particles.push({x:p.x,y:p.y-30,vx:-p.face*35,vy:0,life:.3,max:.3,color:'#ffe6a1',r:18});
  if(p.grounded&&Math.abs(p.vx)>40){this.runCycle+=Math.abs(p.vx)*dt*.04;this.stepDistance+=Math.abs(p.vx)*dt;if(this.stepDistance>90){this.stepDistance=0;this.burst(p.x-p.face*18,p.y-3,2,'#d4d7b0');this.tone(160+Math.random()*30,.035,'triangle',.007)}}
  this.state.animation=this.dashTime>0?'dash':this.attack>0?'strike':this.knockback>0?'hurt':!p.grounded?p.vy<0?'jump':'fall':this.landing>0?'land':Math.abs(p.vx)>40?'run':'idle';
  this.state.dashCharge=Math.max(0,1-this.dashCooldown/.7);const boss=r.enemies.find(e=>e.boss!==undefined&&e.hp>0);this.state.bossHealth=boss&&Math.abs(boss.x-p.x)<750?boss.hp:null;
  this.camera+=(Math.max(0,Math.min(W-this.viewport,p.x-this.viewport*.4))-this.camera)*Math.min(1,dt*5);
  if(this.elapsed>this.nextNote){const notes=[261.63,329.63,392,523.25,440,392,329.63,293.66];this.tone(notes[this.music++%notes.length],1.7,'sine',.014,'music');this.nextNote=this.elapsed+1.4}
  if(this.state.time-this.lastPublish>.1){this.lastPublish=this.state.time;this.publish()}
  this.pressed.clear();this.padPressed.clear();
 }
 private activateBeacon(){
  const r=this.world[this.state.room],b=r.beacon,id=beaconId(areaStage(this.state.room),areaPart(this.state.room));
  if(!b||this.state.beacons.includes(id)||Math.hypot(b.x-this.player.x,b.y-(this.player.y-35))>85)return false;
  this.state.beacons.push(id);this.state.light+=10;this.burst(b.x,b.y,50,'#fff1b4');this.chime();this.toast(`Trail beacon ${stageBeacons(this.state,areaStage(this.state.room))} / 3 lit · +10 light. ${stageBeacons(this.state,areaStage(this.state.room))===3?'Clear the gauntlet to reach the guardian.':'The next challenge awaits.'}`);this.save();this.publish();return true;
 }
 private doorBlocked(door:Door){
  if(!unlockedStage(this.state,areaStage(door.to))||door.boss!==undefined&&!this.state.bosses.includes(door.boss))return 'Awaken this stage’s guardian to open the next stage.';
  if(door.trial!==undefined){if(stageBeacons(this.state,door.trial)<3)return 'The arena is sealed. Activate the exploration, trial, and gauntlet beacons first.';if(this.world[stageRooms(door.trial)[2]].enemies.some(e=>e.hp>0))return 'Awaken every creature in the gauntlet before facing the guardian.'}
  if(door.needs&&!this.state[door.needs])return 'Return with the required movement ability.';
  return '';
 }
 private bossActive(){return this.encounter!==null}
 private resetBosses(){
  for(const room of this.world)for(const e of room.enemies)if(e.boss!==undefined&&!this.state.bosses.includes(e.boss)){e.hp=e.maxHp;e.x=e.home;e.y=645;e.mode='patrol';e.timer=.6;e.cycle=0;e.enraged=false;e.hit=0;e.phaseLevel=1;e.shots=0;e.recoil=0;e.fromX=undefined;e.fromY=undefined;e.toX=undefined;e.toY=undefined}
  this.encounter=null;this.bossHazards=[];
 }
 private completeStage(e:Enemy){
  const stage=e.boss!;if(!this.state.bosses.includes(stage))this.state.bosses.push(stage);
  if([2,4,5].includes(stage)&&!this.state.seeds.includes(stage))this.state.seeds.push(stage);
  this.encounter=null;this.projectiles=[];this.bossHazards=[];this.state.health=this.state.maxHealth;
  this.checkpoint={room:this.state.room,x:230,y:705};if(!this.state.shrines.includes(this.state.room))this.state.shrines.push(this.state.room);
  this.chime();this.burst(e.x,e.y,100,stages[stage].color);
  if(this.state.bosses.length===6){this.state.won=true;this.toast('All six guardians awake. The sunseeds restore the dawn.')}else this.toast(`${stages[stage].boss} awakened! Stage ${stage+1} complete · +40 light. The passage to ${stages[stage+1].name} is open.`);
 }
 private updatePlatforms(dt:number){
  const r=this.world[this.state.room];
  for(const plat of r.platforms){if(!plat.moving)continue;const m=plat.moving,oldX=plat.x,oldY=plat.y;
   const aboard=this.player.grounded&&Math.abs(this.player.y-oldY)<3&&this.player.x+18>oldX&&this.player.x-18<oldX+plat.w;
   plat[m.axis]=m.origin+Math.sin(this.state.time/m.period*Math.PI*2+m.phase)*m.range;
   const dx=plat.x-oldX,dy=plat.y-oldY;if(aboard){this.player.x+=dx;this.player.y+=dy}
   const index=r.platforms.indexOf(plat);for(const mote of r.motes.filter(q=>q.id.startsWith(`${this.state.room}-${index}-`))){mote.x+=dx;mote.y+=dy}
  }
 }
 private hazardShape(h:Hazard){
  const phase=((this.state.time+(h.offset||0))%(h.period||5))/(h.period||5);
  return {x:h.kind==='swing'?h.x+Math.sin(phase*Math.PI*2)*(h.range||140):h.x,y:h.y,w:h.w,h:h.h,active:h.kind!=='jet'||phase>.45&&phase<.8,warning:h.kind==='jet'&&phase>.25&&phase<=.45};
 }
 private updateHazards(dt:number){
  const p=this.player;
  for(const h of this.world[this.state.room].hazards||[]){const q=this.hazardShape(h);if(q.active&&p.x+16>q.x&&p.x-16<q.x+q.w&&p.y>q.y&&p.y-65<q.y+q.h&&this.dashTime<=0){const n=this.respawns;this.hurt(false);if(n!==this.respawns)return}}
  for(const q of this.bossHazards){q.timer-=dt;if(q.timer<=0){q.life-=dt;if(!q.fired){q.fired=true;this.burst(q.x,670,16,'#ffcba0')}
    if(Math.abs(p.x-q.x)<q.w/2+16&&p.y>510&&this.dashTime<=0){const n=this.respawns;this.hurt(false);if(n!==this.respawns)return}
   }}this.bossHazards=this.bossHazards.filter(q=>q.life>0);
 }
 private beginBossWindup(e:Enemy){
  const p=this.player,profile=bossAttack(e.boss!,e.cycle||0,e.hp,e.maxHp,this.preferences.assist);
  e.aimX=p.x;e.aimY=p.y-35;e.direction=Math.sign(p.x-e.x)||1;e.mode='windup';e.windup=profile.windup;e.timer=e.windup;if(e.pattern==='surge'){e.windup=tideSurge.warning*(this.preferences.assist?1.35:1);e.timer=e.windup;}
  e.toX=Math.max(800,Math.min(2040,e.x+Math.max(-230,Math.min(230,e.aimX-e.x))));
  this.tone(140+e.boss!*20,.18,'sine',.025);this.publish();
 }
 private bossVolley(e:Enemy){
  const stage=e.boss!,profile=bossAttack(stage,e.cycle||0,e.hp,e.maxHp,this.preferences.assist),shot=e.shots||0;
  this.visuals.emit('cast',e.x,e.y,2);
  if(e.pattern==='fan'||e.pattern==='spiral'){
   const angle=e.pattern==='spiral'?shot*.24:Math.atan2(e.aimY-e.y,e.aimX-e.x);
   const offsets=e.pattern==='fan'&&[1,3,5].includes(stage)?[-.25,0,.25]:profile.spread;
   for(const offset of offsets){const a=angle+offset;this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*profile.projectileSpeed,vy:Math.sin(a)*profile.projectileSpeed,life:5,radius:10})}
  }
  if(e.pattern==='rain'||e.pattern==='eruption')for(const offset of profile.marks)this.bossHazards.push({x:Math.max(650,Math.min(2110,e.aimX+offset)),timer:this.preferences.assist?1.5:1.05,life:.65,w:e.pattern==='rain'?65:85,fired:false});
  e.shots=shot+1;
 }
 private updateBoss(e:Enemy,dt:number){
  const stage=e.boss!,p=this.player;e.hit=Math.max(0,e.hit-dt);e.recoil=Math.max(0,(e.recoil||0)-dt);e.phase+=dt;
  if(this.encounter===null){if(p.x<650)return;this.encounter=this.state.room;e.timer=.5;this.toast(`${stages[stage].boss} · ${stages[stage].hint}`)}
  p.x=Math.max(590,Math.min(2190,p.x));e.timer=Math.max(0,e.timer-dt);
  const profile=bossAttack(stage,e.cycle||0,e.hp,e.maxHp,this.preferences.assist),phase=profile.phase;
  if(e.pattern==='surge'&&e.mode==='windup')e.y+=(440-e.y)*Math.min(1,dt*3);
  if(e.pattern==='surge'&&e.mode==='recover')e.y+=(645-e.y)*Math.min(1,dt*7);
  if(e.phaseLevel===undefined)e.phaseLevel=phase;
  // A phase change is a readable breathing beat, with no stale attacks left behind.
  if(phase>e.phaseLevel){e.phaseLevel=phase;e.mode='stagger';e.timer=.85;e.y=645;this.projectiles=[];this.bossHazards=[];this.visuals.emit('awake',e.x,e.y,2);this.toast(`${stages[stage].boss} · Phase ${phase}. A new rhythm awakens.`);this.publish();return;}
  if(e.mode==='stagger'){if(e.timer<=0){e.mode='patrol';e.timer=.25;}return;}
  if(e.mode==='patrol'&&e.timer<=0){
   e.pattern=chooseBossPattern(stage,e.cycle||0,e.hp,e.maxHp,Math.abs(p.x-e.x));
   const move=bossChoreography(stage,e.pattern),side=e.x>p.x?1:-1;
   e.fromX=e.x;e.fromY=e.y;e.toX=stage===4?e.x:Math.max(820,Math.min(2020,p.x+side*(move.flight?370:300)));e.toY=move.altitude;
   e.motionDuration=move.reposition;e.timer=move.reposition;e.mode='reposition';
   if(stage===4)this.beginBossWindup(e);
  }else if(e.mode==='reposition'){
   const u=1-e.timer/(e.motionDuration||.7),a=smoothStep(u),move=bossChoreography(stage,e.pattern!);
   e.x=e.fromX!+(e.toX!-e.fromX!)*a;e.y=e.fromY!+(e.toY!-e.fromY!)*a-Math.sin(Math.PI*u)*(move.flight?65:stage===2?12:24);
   e.direction=Math.sign(p.x-e.x)||e.direction;
   if(e.timer<=0)this.beginBossWindup(e);
  }else if(e.mode==='windup'&&e.timer<=0){
   const move=bossChoreography(stage,e.pattern!);e.mode='attack';e.timer=e.pattern==='surge'?tideSurge.active:move.active;e.motionDuration=e.timer;e.fromX=e.x;e.fromY=e.y;e.shots=0;
   if(e.pattern!=='slam'&&e.pattern!=='charge')this.bossVolley(e);
  }else if(e.mode==='attack'){
   const move=bossChoreography(stage,e.pattern!),u=Math.min(1,1-e.timer/(e.motionDuration||move.active));
   if(e.pattern==='charge'){const accelerate=Math.min(1,.3+u*3.5),brake=u>.82?Math.max(.25,(1-u)/.18):1;e.x=Math.max(800,Math.min(2040,e.x+e.direction*profile.chargeSpeed*accelerate*brake*dt));}
   else if(e.pattern==='surge'){e.y=440;if(p.y>tideSurge.waterline+20&&this.dashTime<=0){const before=this.respawns;this.hurt(false);if(this.respawns!==before)return;}}
   else if(e.pattern==='slam'||stage===3&&e.pattern==='fan'){
    e.x=(e.fromX??e.x)+((e.toX??e.x)-(e.fromX??e.x))*smoothStep(u);e.y=(e.fromY??645)+(645-(e.fromY??645))*u-Math.sin(Math.PI*u)*move.leap;
   }else e.y=(e.fromY??645)+(645-(e.fromY??645))*smoothStep(u);
   if((e.pattern==='fan'||e.pattern==='spiral')&&(e.shots||0)<move.volleys&&u>=(e.shots||0)/move.volleys)this.bossVolley(e);
   if(e.timer<=0){
    if(e.pattern!=='surge')e.y=645;if(e.pattern==='slam'){
     this.visuals.emit('land',e.x,705,2);this.burst(e.x,701,18,stages[stage].color);
     for(const side of [-1,1])for(let n=0;n<(phase>1?2:1);n++)this.projectiles.push({x:e.x+side*65,y:682-n*55,vx:side*270*(profile.projectileSpeed/225),vy:0,life:5,radius:12});
    }
    e.mode='recover';e.timer=e.pattern==='surge'?tideSurge.recovery*(this.preferences.assist?1.4:1):profile.recovery;e.cycle=(e.cycle||0)+1;this.publish();
   }
  }else if(e.mode==='recover'&&e.timer<=0){e.mode='patrol';e.timer=.4}
  if(e.mode==='attack'&&Math.abs(e.x-p.x)<65&&Math.abs(e.y-(p.y-35))<65&&this.dashTime<=0)this.hurt(false);
 }
 private drawChallenges(t:number){
  const c=this.ctx,r=this.world[this.state.room],b=r.beacon;
  for(const q of fallsCurrents[this.state.room]||[]){
   const phase=currentState(q,this.state.time);this.environment.current(c,q,phase,t,this.reducedMotion);
   if(Math.abs(this.player.x-(q.x+q.w/2))<210)this.label(phase==='resting'?'CURRENT RESTING':phase==='rising'?'CURRENT RISING':`${this.state.controller?'A':keyLabel(this.preferences.bindings.jump)} · HOLD TO RIDE / RELEASE TO LAND`,q.x+q.w/2,q.y-18,'#c7fbef',11);
  }
  const tide=r.enemies.find(e=>e.boss===1&&e.hp>0);
  if(tide?.pattern==='surge'&&(tide.mode==='windup'||tide.mode==='attack')){
   this.environment.flood(c,590,2200,tideSurge.waterline,tide.mode==='attack',t,this.reducedMotion);
   this.label(tide.mode==='windup'?'FLOOD RISING · RIDE A CURRENT':'STAY ABOVE THE WATER',this.camera+this.viewport/2,350,'#d7fbff',15);
  }
  for(const h of r.hazards||[]){const q=this.hazardShape(h);
   if(h.kind==='swing'){c.strokeStyle='#b6bd9b';c.lineWidth=3;c.beginPath();c.moveTo(h.x,100);c.lineTo(q.x+q.w/2,q.y);c.stroke();this.glow(q.x+q.w/2,q.y+q.h/2,45,'#ffc28b44');this.environment.brambles(c,q.x-6,q.y-6,q.w+12,q.h+12)}
   else if(h.kind==='thorns'){for(let x=q.x;x<q.x+q.w;x+=42)this.environment.brambles(c,x,675,Math.min(48,q.x+q.w-x),32);this.glow(q.x+q.w/2,687,60,'#ffd5a322')}
   else{this.environment.vent(c,q,areaStage(this.state.room),t,this.reducedMotion);if(Math.abs(this.player.x-q.x)<240)this.label(q.active?'VENT · JUMP OR DASH':q.warning?'VENT RISING':'VENT RESTING',q.x+q.w/2,q.y-20,'#ffe7c5',11)}
  }
  for(const q of this.bossHazards){this.environment.vent(c,{x:q.x-q.w/2,y:500,w:q.w,h:205,active:q.timer<=0,warning:q.timer>0},areaStage(this.state.room),t,this.reducedMotion);if(q.timer>0)this.label('MOVE',q.x,474,'#ffe1bb',12)}
  if(b){const lit=this.state.beacons.includes(beaconId(areaStage(this.state.room),areaPart(this.state.room))),close=Math.hypot(b.x-this.player.x,b.y-(this.player.y-35))<85;
   this.glow(b.x,b.y,lit?70:100,lit?'#bcffd22a':'#ffda8055');this.environment.beacon(c,b.x,b.y,lit,t,this.reducedMotion);this.label(lit?'BEACON LIT':close?(this.state.controller?'Y':keyLabel(this.preferences.bindings.interact))+' · Light beacon':'TRAIL BEACON',b.x,b.y-42,lit?'#c0f8da':'#ffe4ad',12);
  }
  if(this.bossActive()){c.save();c.globalAlpha=.7;this.environment.brambles(c,556,360,40,345);c.restore();this.label('GUARDIAN BATTLE',590,332,'#ffe1a1',12)}
 }

 private discoverMemory(){
  const bloom=memoryBlooms.find(b=>b.room===this.state.room&&!this.state.discoveries.includes(b.id)&&Math.hypot(b.x-this.player.x,b.y-(this.player.y-35))<72);
  if(!bloom)return false;
  if(!this.state[bloom.needs]){this.toast(bloom.needs==='dash'?'This memory bud needs the warmth of Sun Dash.':'A Sky Feather will help this quiet memory bloom.');return true}
  this.state.discoveries.push(bloom.id);this.state.light+=20;this.burst(bloom.x,bloom.y,65,'#c5f3d7');this.chime();this.toast(bloom.id===RIVERHEART?'Riverheart awakened! Sun Dash recovers twice as fast while riding a current. +20 light.':`${bloom.name} · Memory ${this.state.discoveries.length} of ${memoryBlooms.length} · +20 light. Read its story on the map.`);this.save();this.publish();return true;
 }
 openSunwell(){if(!this.started||this.state.won||!this.atSunwell())return false;this.setPaused(true);this.publish();this.onMenu('well');return true}
 buyBlessing(id:Blessing){
  if(!this.started||!this.paused||this.state.won||!this.atSunwell())return false;
  const offer=sunwellOffers(this.state).find(o=>o.id===id);if(!offer||offer.complete||this.state.light<offer.cost)return false;
  this.state.light-=offer.cost;
  if(id==='heart'){this.state.heartLevel++;this.state.maxHealth=5+this.state.heartLevel;this.state.health=this.state.maxHealth}else this.state.magnet=true;
  this.burst(this.player.x,this.player.y-35,40,id==='heart'?'#ffe4b0':'#c5f3d7');this.toast(id==='heart'?`Heartwood grows. You now have ${this.state.maxHealth} hearts.`:'Glowkeeper awakened. Nearby light follows you.');this.save();this.publish();return true;
 }
 private settlePlayer(x:number,y=705,face=1){
  this.clearInput();this.visuals.reset();this.encounter=null;this.projectiles=[];this.bossHazards=[];this.swingHits.clear();this.attack=0;this.attackCooldown=0;this.combo=0;this.comboWindow=0;this.strikeBuffer=0;this.combatTexts=[];this.dashTime=0;this.dashCooldown=0;this.usedDouble=false;this.hitStop=0;this.knockback=0;this.jumpBuffer=0;this.coyote=.12;this.landing=0;
  this.player={x,y,vx:0,vy:0,face,grounded:true};this.safe={x,y};this.invincible=this.preferences.assist?2.4:1.6;this.state.bossHealth=null;this.state.bossIntent='';this.state.combo=0;this.state.animation='idle';this.state.dashCharge=1;this.camera=Math.max(0,Math.min(W-this.viewport,x-this.viewport*.4));this.transition=.6;void this.loadBackdrop(areaStage(this.state.room));
 }
 private enter(to:number){
  if(!Number.isInteger(to)||to<0||to>=this.world.length||!unlockedStage(this.state,areaStage(to)))return false;
  const previous=this.state.room,r=this.world[to],gate=this.world[previous].doors.find(d=>d.to===to);if(!gate||this.doorBlocked(gate))return false;const back=r.doors.find(d=>d.to===previous);
  this.state.room=to;this.state.roomName=r.name;if(!this.state.visited.includes(to))this.state.visited.push(to);
  this.settlePlayer(back?back.x+(back.x<300?105:back.x>2100?-105:0):300,back?back.y:705,back&&back.x>2100?-1:1);
  // Merely entering an area must not activate a Sunwell or move the checkpoint past a gate.
  this.save();this.publish();this.tone(330,.4,'sine',.03);
 }
 private atSunwell(){const shrine=this.world[this.state.room].shrine;return shrine!==undefined&&this.state.shrines.includes(this.state.room)&&Math.abs(this.player.x-shrine)<100&&Math.abs(this.player.y-705)<20&&this.player.grounded}
 travelTo(to:number){
  if(!this.started||!this.paused||this.state.won||!Number.isInteger(to)||to<0||to>=this.world.length||to===this.state.room||!unlockedStage(this.state,areaStage(to))||areaPart(to)===3&&!this.state.bosses.includes(areaStage(to))&&(stageBeacons(this.state,areaStage(to))<3||this.world[stageRooms(areaStage(to))[2]].enemies.some(e=>e.hp>0))||!this.state.shrines.includes(to)||!this.atSunwell())return false;
  this.state.room=to;this.state.roomName=this.world[to].name;this.state.health=this.state.maxHealth;const x=this.world[to].shrine!;
  if(!this.state.visited.includes(to))this.state.visited.push(to);this.checkpoint={room:to,x,y:705};this.settlePlayer(x);this.save();this.chime();this.toast(`The light carries you to ${worldRegions[to].name}.`);this.publish();return true;
 }
 private hurt(fall:boolean){
  if(this.invincible>0&&!fall)return;if(!fall||!this.preferences.assist)this.state.health--;this.invincible=this.preferences.assist?2.4:1.6;this.shake=this.reducedMotion?0:6;this.rumble(.35,120);this.burst(this.player.x,this.player.y-25,22,'#ffb991');this.tone(130,.18,'triangle',.06);
  if(this.state.health<=0){this.resetBosses();this.respawns++;this.state.health=this.state.maxHealth;this.state.room=this.checkpoint.room;this.state.roomName=this.world[this.state.room].name;this.settlePlayer(this.checkpoint.x);this.toast('A little rest, a little courage. Your light is safe.');this.save()}
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
  e.hit=.28;e.recoil=.24;
  if(e.kind==='keeper'&&e.mode!=='recover'){
   this.visuals.emit('guard',e.x-this.player.face*28,e.y,1);this.combatText(e.x+this.player.face*95,e.y-45,'GUARDED','#bcdce5');this.burst(e.x,e.y,8,'#bcdce5');this.tone(150,.09,'triangle',.03);return;
  }
  this.visuals.emit('hit',e.x-this.player.face*22,e.y,this.combo===3?2:1,this.combo===2?-.8:.4);
  const damage=this.combo===3?2:1;e.hp=Math.max(0,e.hp-damage);
  if(e.kind!=='keeper'){e.mode='recover';e.timer=.65;e.x=Math.max(e.home-e.range-75,Math.min(e.home+e.range+75,e.x+this.player.face*24));}
  this.combatText(e.x+(e.kind==='keeper'?this.player.face*95:0),e.y-45,e.hp<=0?'AWAKE':this.combo===3?'2 · FINISH':'1');
  this.hitStop=this.combo===3?.055:.035;this.shake=this.reducedMotion?0:this.combo===3?6:3;this.burst(e.x,e.y,this.combo===3?30:18,'#ffe8a4');this.rumble(this.combo===3?.25:.12,70);this.tone(this.combo===3?330:640,.09,'triangle',.035);
  if(e.kind==='keeper'&&e.hp>0&&e.hp<=e.maxHp/2&&!e.enraged){e.enraged=true;this.toast(e.boss!==undefined?`${stages[e.boss].boss} enters phase ${bossPhase(e.hp,e.maxHp,e.boss)}. Read its next warning.`:'The Keeper gathers more light. Watch for a wider fan.');this.burst(e.x,e.y,30,'#ffd58d');}
  if(e.hp<=0){this.visuals.emit('awake',e.x,e.y,e.boss!==undefined?2:1);e.defeat=.65;this.defeated.add(e.id);this.state.light+=e.boss!==undefined?40:e.kind==='keeper'?15:3;this.tone(880,.16,'sine',.05);if(e.boss!==undefined){this.completeStage(e)}else if(e.kind==='keeper'){this.projectiles=[];this.toast('The Keeper is awake. Its sunseed is yours.')}this.save();this.publish()}
 }
 private updateEnemies(dt:number){
  const p=this.player;
  for(const e of this.world[this.state.room].enemies){
   if(e.hp<=0){e.defeat=Math.max(0,e.defeat-dt);continue}
   if(e.boss!==undefined){this.updateBoss(e,dt);continue}
   e.baseY??=e.y;e.phase+=dt*.8;e.hit=Math.max(0,e.hit-dt);e.recoil=Math.max(0,(e.recoil||0)-dt);e.timer=Math.max(0,e.timer-dt);
   const profile=this.enemyProfile(e);
   const close=Math.abs(p.x-e.x)<(e.kind==='keeper'?580:e.kind==='sentry'?470:320)&&Math.abs(p.y-35-e.y)<(e.kind==='charger'?100:330);
   if(e.mode==='recover'){
    if(e.kind==='drifter'){e.y+=(e.baseY-e.y)*Math.min(1,dt*3);e.x+=(e.home-e.x)*Math.min(1,dt*.6);}
    if(e.timer<=0){e.mode='patrol';e.timer=.5;}
   }else if(e.mode==='patrol'){
    if(e.kind==='drifter'){e.x+=(e.home+Math.sin(e.phase)*e.range-e.x)*Math.min(1,dt*3);e.y=e.baseY+Math.sin(e.phase*2)*16;}
    else if(e.kind==='charger'){
     const target=close?Math.max(e.home-e.range,Math.min(e.home+e.range,p.x-e.direction*155)):e.home+Math.sin(e.phase)*e.range*.35;
     e.x+=(target-e.x)*Math.min(1,dt*.7);e.direction=Math.sign(target-e.x)||e.direction;
    }else e.x+=(e.home-e.x)*Math.min(1,dt*2);
    if(close&&e.timer<=0){e.mode='windup';e.windup=profile.windup;e.timer=e.windup;e.aimX=p.x;e.aimY=p.y-35;e.direction=Math.sign(p.x-e.x)||1;
     if(e.kind==='drifter'){e.aimX=Math.max(e.home-e.range-120,Math.min(e.home+e.range+120,p.x+p.vx*.12));e.aimY=Math.max(e.baseY-110,Math.min(e.baseY+35,p.y-35));}
     this.tone(e.kind==='keeper'?165:280,.16,'sine',.02);
    }
   }else if(e.mode==='windup'){
    if(e.kind==='drifter')e.y=e.baseY-35*smoothStep(1-e.timer/e.windup);
    if(e.timer<=0){
     if(e.kind==='charger'||e.kind==='drifter'){e.mode='attack';e.timer=profile.active;e.motionDuration=profile.active;e.fromX=e.x;e.fromY=e.y;}
     else{
      const angle=Math.atan2(e.aimY-e.y,e.aimX-e.x);this.visuals.emit('cast',e.x,e.y);
      const spread=e.kind==='sentry'&&(e.cycle||0)%2?[-.13,.13]:profile.spread;
      for(const offset of spread)this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(angle+offset)*profile.speed,vy:Math.sin(angle+offset)*profile.speed,life:3.8,radius:e.kind==='keeper'?10:8});
      e.cycle=(e.cycle||0)+1;this.tone(190,.13,'triangle',.02);e.mode='recover';e.timer=profile.recovery;
     }
    }
   }else if(e.mode==='attack'){
    const u=Math.min(1,1-e.timer/(e.motionDuration||profile.active));
    if(e.kind==='drifter'){e.x=e.fromX!+(e.aimX-e.fromX!)*smoothStep(u);e.y=e.fromY!+(e.aimY-e.fromY!)*smoothStep(u)-Math.sin(u*Math.PI)*22;}
    else{const acceleration=Math.min(1,.35+u*4);e.x+=e.direction*profile.speed*acceleration*dt;e.x=Math.max(e.home-e.range-75,Math.min(e.home+e.range+75,e.x));}
    if(e.timer<=0){e.mode='recover';e.timer=profile.recovery;}
   }
   const ey=e.y;
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
   if(this.visuals.projectile(c,q,t))continue;
   this.glow(q.x,q.y,28,'#ffba7333');c.strokeStyle='#ffe3ba88';c.lineWidth=3;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(q.x-q.vx*.06,q.y-q.vy*.06);c.stroke();
   c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(q.vy,q.vx));c.fillStyle='#ffda91';c.beginPath();c.ellipse(0,0,q.radius,q.radius*.65,0,0,Math.PI*2);c.fill();c.fillStyle='#fff4c9';c.beginPath();c.arc(2,0,q.radius*.35,0,Math.PI*2);c.fill();c.restore();
  }
  for(const e of this.world[this.state.room].enemies){
   if(e.hp<=0&&e.defeat<=0||e.x<this.camera-220||e.x>this.camera+this.viewport+220)continue;
   const motion=this.reducedMotion?0:1,y=e.y+Math.sin(e.phase*3)*9,boss=e.kind==='keeper',radius=boss?65:e.kind==='charger'?30:27,alive=e.hp>0;
   const color=e.boss!==undefined?stages[e.boss].color:e.kind==='charger'?'#edba85':e.kind==='sentry'?'#98dfd7':boss?'#edd082':'#c3a5d7',windup=e.mode==='windup'&&alive,open=e.mode==='recover'&&alive;
   c.save();if(!alive)c.globalAlpha=e.defeat/.65;this.glow(e.x,y,boss?90:48,(open?'#baf1b5':color)+'33');c.restore();
   if(windup){
    const progress=1-e.timer/(e.windup||this.enemyProfile(e).windup);
    c.save();c.strokeStyle='#ffe0a7';c.lineWidth=2;c.setLineDash([6,7]);c.globalAlpha=.75;
    if(e.boss!==undefined){
     const profile=bossAttack(e.boss,e.cycle||0,e.hp,e.maxHp,this.preferences.assist);
     if(e.pattern==='surge'){/* Basin-wide warning is drawn with the current scenery. */}
     else if(e.pattern==='charge'){const lane=profile.chargeSpeed*profile.chargeDuration;this.environment.chargeWarning(c,e.x,y,lane,e.direction)}
     else if(e.pattern==='slam'){c.strokeStyle='#ffdb9e';for(const side of [-1,1]){c.beginPath();c.moveTo((e.toX??e.x)+side*70,683);c.lineTo((e.toX??e.x)+side*360,683);c.stroke();this.label('LANDING · JUMP', (e.toX??e.x)+side*180,654,'#ffe2b4',12)}}
     else if(e.boss===3&&e.pattern==='fan'){c.beginPath();c.moveTo(e.x,e.y);c.quadraticCurveTo(e.x,420,e.toX??e.x,645);c.stroke();this.label('DIVE · MOVE',e.toX??e.x,610,'#ffe2b4',12)}
     else if(e.pattern==='rain'||e.pattern==='eruption'){for(const offset of profile.marks)this.environment.vent(c,{x:Math.max(650,Math.min(2110,e.aimX+offset))-35,y:500,w:70,h:205,warning:true},areaStage(this.state.room),t,this.reducedMotion)}
     else {const angle=e.pattern==='spiral'?0:Math.atan2(e.aimY-e.y,e.aimX-e.x),offsets=e.pattern==='fan'&&[1,3,5].includes(e.boss)?[-.25,0,.25]:profile.spread;for(const offset of offsets){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(angle+offset)*260,e.y+Math.sin(angle+offset)*260);c.strokeStyle='#072729dd';c.lineWidth=6;c.stroke();c.strokeStyle='#ffe0a7';c.lineWidth=2;c.stroke()}}
    }else if(e.kind==='charger'){
     this.environment.chargeWarning(c,e.x,y,240,e.direction);
     for(let n=1;n<=3;n++){const x=e.x+e.direction*n*65;c.beginPath();c.moveTo(x-e.direction*8,y-8);c.lineTo(x,y);c.lineTo(x-e.direction*8,y+8);c.stroke()}
    }else{
     const angle=Math.atan2(e.aimY-e.y,e.aimX-e.x),profile=this.enemyProfile(e);
     for(const offset of profile.spread){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(angle+offset)*280,e.y+Math.sin(angle+offset)*280);c.strokeStyle='#072729dd';c.lineWidth=6;c.stroke();c.strokeStyle='#ffe0a7';c.lineWidth=2;c.stroke()}
    }
    c.setLineDash([]);c.globalAlpha=1;c.strokeStyle='#132c2bcc';c.lineWidth=5;c.beginPath();c.arc(e.x,y,radius+13,0,Math.PI*2);c.stroke();c.strokeStyle='#ffe0a7';c.beginPath();c.arc(e.x,y,radius+13,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,progress));c.stroke();c.restore();
   }
   if(e.boss!==undefined&&e.mode==='attack'&&e.pattern==='slam'){c.strokeStyle='#ffe4ae';c.lineWidth=2;c.beginPath();c.ellipse(e.toX??e.x,701,65,10,0,0,Math.PI*2);c.stroke();this.label(e.timer<.25?'JUMP':'LANDING',e.toX??e.x,661,'#ffe4ae',12);}
   if(!this.visuals.enemy(c,e,t,this.reducedMotion)){
   c.save();c.translate(e.x,y);if(e.boss!==undefined){c.scale(1.35,1.35);const rays=4+e.boss;for(let i=0;i<rays;i++)this.drawLeaf(0,-16,55,12,-Math.PI+(i/(rays-1))*Math.PI,stages[e.boss].color);if(e.boss%2===0){c.strokeStyle=stages[e.boss].color;c.lineWidth=5;c.beginPath();c.moveTo(-23,-20);c.quadraticCurveTo(-55,-70,-32,-88);c.moveTo(23,-20);c.quadraticCurveTo(55,-70,32,-88);c.stroke()}}
   if(!alive){const remaining=e.defeat/.65;c.globalAlpha=remaining;if(motion){c.translate(0,-(1-remaining)*30);c.scale(.6+remaining*.4,.6+remaining*.4)}}
   const breathing=1+Math.sin(t*3+e.phase)*.025*motion;c.scale(breathing,breathing);
   const shell=c.createLinearGradient(-30,-30,30,30);shell.addColorStop(0,e.hit>0?'#fff2cb':open?'#648264':'#596757');shell.addColorStop(1,e.hit>0?'#d3e4b9':'#1c3031');c.fillStyle=shell;c.strokeStyle=color;c.lineWidth=2;
   if(e.kind==='drifter'||e.boss===3){
    for(const side of [-1,1]){c.save();c.scale(side,1);const flap=Math.sin(t*8+e.phase)*.15*motion;this.drawLeaf(3,-3,33,21,-.3+flap,e.hit>0?'#ffe6b4':'#aa95b6');this.drawLeaf(4,8,24,13,.38-flap,'#696c87');c.restore()}
    c.beginPath();c.ellipse(0,0,11,22,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-5,-18);c.quadraticCurveTo(-17,-32,-20,-26);c.moveTo(5,-18);c.quadraticCurveTo(17,-32,20,-26);c.stroke();
   }else if(e.kind==='charger'||e.boss===0||e.boss===2){
    if(e.boss!==undefined){c.scale(1.55,1.55);c.strokeStyle=stages[e.boss].color;c.lineWidth=2;c.beginPath();c.arc(0,0,35,-Math.PI*.9,Math.PI*.9);c.stroke()}c.scale(e.direction,1);const lean=windup?-.09:e.mode==='attack'?.1:0;c.rotate(lean);
    c.strokeStyle='#d9bd8b';c.lineWidth=3;
    for(const x of [-18,0,18]){const step=e.mode==='attack'?Math.sin(t*23+x)*4*motion:Math.sin(t*4+x)*2*motion;c.beginPath();c.moveTo(x,10);c.lineTo(x-9,23+step);c.lineTo(x-16,25+step);c.stroke()}
    c.strokeStyle=color;c.beginPath();c.ellipse(-3,0,28,21,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-3,-20);c.lineTo(-3,19);c.stroke();c.fillStyle='#6b4d3b';c.beginPath();c.ellipse(23,0,12,15,0,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#dfc28d';c.beginPath();c.moveTo(29,-4);c.quadraticCurveTo(45,-9,44,-25);c.quadraticCurveTo(51,-3,34,7);c.closePath();c.fill();
    c.fillStyle='#fff2c2';c.beginPath();c.arc(25,-5,3,0,Math.PI*2);c.fill();
   }else if(e.kind==='sentry'||e.boss===4){
    if(e.boss!==undefined)c.scale(1.35,1.35);const turn=t*.22*motion;
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
   }
   if(alive&&!boss&&e.hp<e.maxHp){c.fillStyle='#071e24cc';c.fillRect(e.x-23,y+42,46,5);c.fillStyle=color;c.fillRect(e.x-23,y+42,46*e.hp/e.maxHp,5)}
   if(boss&&alive&&Math.abs(this.player.x-e.x)<1000)this.label(open?'OPEN · STRIKE NOW':windup?e.pattern?.toUpperCase()||'LIGHT FAN':'GUARDED',e.x,y-94,open?'#d5f4bd':'#ffe8b4',12);
  }
 }
 private drawMemories(t:number){
  const c=this.ctx,p=this.player;
  for(const bloom of memoryBlooms.filter(b=>b.room===this.state.room)){
   const found=this.state.discoveries.includes(bloom.id),awake=this.state[bloom.needs],close=Math.hypot(bloom.x-p.x,bloom.y-(p.y-35))<72;
   const pulse=this.reducedMotion?0:Math.sin(t*2+bloom.x)*3,y=bloom.y+pulse;
   this.glow(bloom.x,y,found?42:65,found?'#bdf1d91a':awake?'#bef6ce40':'#b8d1e125');
   c.save();c.translate(bloom.x,y);c.strokeStyle='#a6c7a9';c.lineWidth=3;c.beginPath();c.moveTo(0,40-pulse);c.quadraticCurveTo(5,20,0,3);c.stroke();
   this.drawLeaf(0,29,20,7,-.6,'#6c9a78');this.drawLeaf(0,30,16,6,-2.7,'#54886e');
   const petals=found?6:3;
   for(let i=0;i<petals;i++){const angle=found?i*Math.PI/3:-Math.PI/2+(i-1)*.45;this.drawLeaf(0,0,found?21:24,found?9:7,angle,found?'#f4dcac':awake?'#c4eed6':'#90a9b9')}
   c.fillStyle=found?'#ffe2a4':awake?'#e7ffd2':'#bdd2df';c.beginPath();c.arc(0,0,found?6:4,0,Math.PI*2);c.fill();c.restore();
   if(close&&!found)this.label(awake?(this.state.controller?'Y':keyLabel(this.preferences.bindings.interact))+' · Remember':bloom.needs==='dash'?'SUN DASH REQUIRED':'SKY FEATHER REQUIRED',bloom.x,y-45,awake?'#def5c2':'#cedde8',13);
   else if(found&&close)this.label(bloom.name,bloom.x,y-43,'#d8edc8',12);
  }
 }
 private drawGuardian(t:number){
  const c=this.ctx,p=this.player,moving=Math.abs(p.vx)>40&&p.grounded;
  c.save();c.translate(p.x,p.y);if(this.invincible>0)c.globalAlpha=this.reducedMotion?.7:.7+Math.sin(t*6)*.15;c.scale(p.face,1);
  const dash=this.dashTime>0,strike=this.attack>0,air=!p.grounded;
  const sx=dash?1:this.landing>0?1.14:air?.94:1,sy=dash?1:this.landing>0?.86:air?1.06:1;
  c.scale(sx,sy);c.rotate(dash?0:strike?0:air?Math.max(-.14,Math.min(.12,p.vy*.0002)):Math.sin(t*2)*.015);
  if(this.visuals.hero(c,p,this.attack,this.combo,dash,t,this.reducedMotion)){c.restore();return;}
  if(moving&&!dash&&!strike&&this.runSheet.naturalWidth){
   const frame=Math.floor(this.runCycle)%8;
   const crops=[[9,35,401,457],[411,78,359,418],[777,90,366,406],[1173,50,342,442],[21,552,363,426],[397,555,344,423],[772,535,388,413],[1144,559,370,419]];
   const [x,y,w,h]=crops[frame],base=frame<4?496:978;
   c.drawImage(this.runSheet,x,y,w,h,-w*.105,(y-base)*.21,w*.21,h*.21);
  }else if(this.sprite.naturalWidth){const bob=!air&&!strike?Math.sin(t*2)*1.6:0;c.drawImage(this.sprite,-45,-96+bob,87,96)}
  c.restore();
 }
 private toast(message:string){this.state.message=message;this.messageUntil=this.elapsed+5.5;this.publish()}
 private publish(){
  this.state.controller=!!this.activePad;this.state.combo=this.comboWindow>0?this.combo:0;this.state.stage=areaStage(this.state.room);this.state.part=areaPart(this.state.room);this.state.enemiesLeft=this.world[this.state.room].enemies.filter(e=>e.hp>0).length;
  const boss=this.world[this.state.room].enemies.find(e=>e.boss!==undefined&&e.hp>0);
  this.state.bossHealth=boss&&Math.abs(boss.x-this.player.x)<1000?boss.hp:null;this.state.bossMaxHealth=boss?.maxHp||0;this.state.bossName=boss?stages[boss.boss!].boss:'';
  this.state.bossIntent=!boss?'':boss.mode==='recover'?'OPEN · STRIKE NOW':boss.mode==='reposition'?'REPOSITIONING · WATCH ITS STANCE':boss.mode==='stagger'?'PHASE SHIFT · GET READY':boss.mode==='windup'?`${(boss.pattern||'').toUpperCase()} · PHASE ${bossPhase(boss.hp,boss.maxHp,boss.boss!)}`:'GUARDED · READ THE NEXT WARNING';
  this.state.canTravel=this.started&&this.atSunwell()&&!this.state.won&&!this.bossActive();
  this.onUpdate({...this.state,seeds:[...this.state.seeds],visited:[...this.state.visited],shrines:[...this.state.shrines],discoveries:[...this.state.discoveries],bosses:[...this.state.bosses],beacons:[...this.state.beacons]});
 }
 private burst(x:number,y:number,n:number,color:string){n=Math.min(n,180-this.particles.length);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*190,l=.3+Math.random()*.65;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:l,max:l,color,r:1+Math.random()*4})}}
 private tone(freq:number,duration:number,type:OscillatorType='sine',volume=.04,channel:'effects'|'music'='effects'){if(!this.audio||this.mute||this.audio.state!=='running')return;const o=this.audio.createOscillator(),g=this.audio.createGain(),t=this.audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect((channel==='music'?this.musicBus:this.effectsBus)??this.audio.destination);o.start(t);o.stop(t+duration+.03)}
 private chime(){[523,659,784,1046].forEach((f,i)=>{setTimeout(()=>{if(!this.stopped)this.tone(f,.55,'sine',.05)},i*110)})}
 private glow(x:number,y:number,r:number,color:string){
  const c=this.ctx;if(x+r<this.camera||x-r>this.camera+this.viewport||y+r<0||y-r>H)return;
  if(typeof document.createElement==='function'){
   let sprite=this.glowSprites.get(color);if(!sprite){sprite=document.createElement('canvas');sprite.width=64;sprite.height=64;const a=sprite.getContext('2d')!,g=a.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,color);g.addColorStop(1,'transparent');a.fillStyle=g;a.fillRect(0,0,64,64);if(this.glowSprites.size>=48){const key=this.glowSprites.keys().next().value!;const old=this.glowSprites.get(key)!;old.width=0;old.height=0;this.glowSprites.delete(key);}this.glowSprites.set(color,sprite);}c.drawImage(sprite,x-r,y-r,r*2,r*2);return;
  }
  const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
 }
 private label(text:string,x:number,y:number,color='#f8e8b8',size=15){const c=this.ctx;c.font=`${size}px Georgia`;c.textAlign='center';c.fillStyle='rgba(3,24,22,.72)';const w=c.measureText(text).width+24;c.beginPath();c.roundRect(x-w/2,y-17,w,28,5);c.fill();c.fillStyle=color;c.fillText(text,x,y+2)}
 private render(){
  const c=this.ctx;if(!this.scale)return;c.setTransform(this.scale,0,0,this.scale,0,0);c.clearRect(0,0,this.viewport,H);const r=this.world[this.state.room],p=this.player,t=this.elapsed;
  const backdrop=this.backdrops[this.started?areaStage(this.state.room):0];const art=backdrop?.naturalWidth?backdrop:this.bg;
  if(art.complete&&art.naturalWidth){const ratio=art.naturalWidth/art.naturalHeight,baseWidth=Math.max(this.viewport+190,H*ratio),baseHeight=baseWidth/ratio;const offset=this.started&&!this.reducedMotion?Math.min(180,this.camera*.075):70;c.drawImage(art,-offset,-Math.max(0,baseHeight-H)*.32,baseWidth,baseHeight)}else{c.fillStyle='#184e40';c.fillRect(0,0,this.viewport,H)}
  c.fillStyle=r.tint;c.fillRect(0,0,this.viewport,H);
  const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#06232144');shade.addColorStop(.5,'#06232100');shade.addColorStop(1,'#07292388');c.fillStyle=shade;c.fillRect(0,0,this.viewport,H);
  this.environment.background(c,this.started?areaStage(this.state.room):0,this.camera,this.viewport,t,this.reducedMotion,this.state.room);
  if(!this.started){for(const a of this.ambient){const x=(a.x+t*7)%(this.viewport+50)-25,y=a.y+Math.sin(t+a.phase)*15;this.glow(x,y,13,'#faff9a20');c.fillStyle='#fffacbb0';c.beginPath();c.arc(x,y,a.s,0,Math.PI*2);c.fill()}return}
  c.save();c.translate(-this.camera+(Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
  for(const [index,plat] of r.platforms.entries()){if(plat.x+plat.w<this.camera-80||plat.x>this.camera+this.viewport+80)continue;this.environment.platform(c,plat,areaStage(this.state.room),this.state.room,index);}
  if(this.state.room===2&&!this.broken.has(2)){this.glow(612,580,105,'#ffac4933');this.environment.brambles(c,578,435,68,270);this.label('AMBER THORNS',612,411,'#ffd797',12);if(Math.abs(p.x-612)<160)this.label(this.state.controller?'B / RB · Sun Dash':keyLabel(this.preferences.bindings.dash)+' · Sun Dash',612,745)}
  for(const door of r.doors){this.glow(door.x,door.y-55,70,door.needs&&!this.state[door.needs]?'#98b2d51a':'#dfecae25');this.environment.portal(c,door.x,door.y);const close=Math.abs(p.x-door.x)<105&&Math.abs(p.y-door.y)<100;this.label(close&&this.doorBlocked(door)?'PASSAGE SEALED · SEE OBJECTIVE':close?(this.state.controller?'Y · ':keyLabel(this.preferences.bindings.interact)+' · ')+door.label:door.label,door.x,door.y-105,close?'#fff0b0':'#d6e4cf',close?15:13)}
  if(r.shrine!==undefined){const x=r.shrine;this.glow(x,657,100,'#b3ffd23a');this.environment.shrine(c,x,t,this.reducedMotion);if(Math.abs(p.x-x)<105)this.label(this.state.bosses.length===6?(this.state.controller?'Y':keyLabel(this.preferences.bindings.interact))+' · Restore the Sunwell':(this.state.controller?'Y':keyLabel(this.preferences.bindings.interact))+' · Rest & grow',x,598)}
  for(const m of r.motes){if(this.collected.has(m.id))continue;const y=m.y+Math.sin(t*2+m.x)*5;this.glow(m.x,y,20,'#ffe68844');c.fillStyle='#ffe9a8';c.save();c.translate(m.x,y);c.rotate(.5);c.beginPath();c.ellipse(0,0,3,5,0,0,Math.PI*2);c.fill();c.restore()}
  if(r.ability&&!this.state[r.ability.type]){const a=r.ability,y=a.y+Math.sin(t*2)*7;this.glow(a.x,y,80,'#fff1b14f');this.environment.ability(c,a.x,y,a.type,t);this.label(a.type==='dash'?'SUN DASH':'SKY FEATHER',a.x,y-48,'#ffedb5',13)}
  if(r.seed&&!this.state.seeds.includes(this.state.room)){const {x,y}=r.seed;this.glow(x,y,100,'#ffcf6455');c.save();c.translate(x,y+Math.sin(t*2)*6);c.rotate(Math.sin(t)*.15);c.beginPath();c.moveTo(0,-23);c.bezierCurveTo(31,2,18,23,0,23);c.bezierCurveTo(-18,23,-31,2,0,-23);const g=c.createLinearGradient(-15,-20,15,22);g.addColorStop(0,'#fff2b6');g.addColorStop(1,'#ecab4d');c.fillStyle=g;c.shadowColor='#ffd56c';c.shadowBlur=22;c.fill();c.restore();if(!this.seedGuarded(r))this.label('SUNSEED',x,y-48,'#ffdf8d',12)}
  this.drawChallenges(t);this.drawMemories(t);this.drawEnemies(t);
  c.fillStyle='#031c2166';c.beginPath();c.ellipse(p.x,p.y+3,33,8,0,0,Math.PI*2);c.fill();this.glow(p.x,p.y-35,70,'#ffebb21a');
  this.visuals.trails(c,this.reducedMotion);this.drawGuardian(t);
  this.visuals.slash(c,p,this.attack,this.combo,this.reducedMotion);this.visuals.impactsDraw(c,this.reducedMotion);
  for(const text of this.combatTexts){c.save();c.globalAlpha=Math.min(1,text.life*4);c.font='bold 16px Arial';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#0b2228';const y=text.y-(this.reducedMotion?0:(1-text.life/text.max)*28);c.strokeText(text.text,text.x,y);c.fillStyle=text.color;c.fillText(text.text,text.x,y);c.restore()}
  for(const q of this.particles){c.globalAlpha=q.life/q.max;this.glow(q.x,q.y,q.r*2,q.color+'44');c.fillStyle=q.color;c.beginPath();c.arc(q.x,q.y,q.r*q.life/q.max,0,Math.PI*2);c.fill()}c.globalAlpha=1;
  for(const a of this.ambient){const x=(a.x+t*5)%W,y=a.y+Math.sin(t*.6+a.phase)*15;this.glow(x,y,12,'#fbffb223');c.globalAlpha=.3+(Math.sin(t+a.phase)+1)*.25;c.fillStyle='#fff5be';c.beginPath();c.arc(x,y,a.s,0,Math.PI*2);c.fill()}c.globalAlpha=1;c.restore();
  this.environment.foreground(c,areaStage(this.state.room),this.camera,this.viewport,t,this.reducedMotion);
  if(this.transition>0){c.fillStyle=`rgba(252,239,200,${this.transition*.6})`;c.fillRect(0,0,this.viewport,H)}
 }
}
