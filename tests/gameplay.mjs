import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/game.ts',import.meta.url),'utf8');
const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const preferencesURL='data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync(new URL('../app/preferences.ts',import.meta.url),'utf8'))).toString('base64');
const prefs=await import(preferencesURL);
const compiled=compile(source).replace("'./preferences'",JSON.stringify(preferencesURL));
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.Image=class {complete=false;naturalWidth=0;set src(v){queueMicrotask(()=>this.onload?.())}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
let registered;document.modelContext={registerTool:async(t)=>{registered=t}};
const gradient={addColorStop:noop};const context=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>{o[k]=v;return true}});
const {Game,gamepadButtons,journeyRoute,journeyObjective,worldRegions,memoryBlooms,sunwellOffers}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const game=new Game({getContext:()=>context,getBoundingClientRect:()=>({width:1440,height:810})},noop);await game.ready;
const run=(seconds)=>{for(let i=0;i<Math.round(seconds*120);i++){game.elapsed+=1/120;game.update(1/120)}};
const tap=k=>{game.input(k,true);run(1/120);game.input(k,false)};
const place=(room,x,y=705)=>{game.state.room=room;game.state.roomName=game.world[room].name;game.player={x,y,vx:0,vy:0,face:1,grounded:true};game.coyote=.12;game.invincible=0;game.dashCooldown=0;game.dashTime=0;game.usedDouble=false;game.hitStop=0;game.strikeBuffer=0;game.knockback=0;game.comboWindow=0;game.attack=0;game.attackCooldown=0;game.padKeys.clear();game.padPressed.clear();game.projectiles=[];game.keys.clear();game.pressed.clear()};
let tests=0;function check(name,fn){fn();console.log('PASS',name);tests++}
game.start();
check('First jump reaches the 145px ability ledge',()=>{place(2,890);game.input('Space',true);let min=705;for(let i=0;i<90;i++){run(1/120);min=Math.min(min,game.player.y)}game.input('Space',false);assert.ok(min<560,`jump apex ${min} must be <560`)});
check('Single jump crosses the first gap without damage',()=>{place(0,810);game.input('ArrowRight',true);run(.15);game.input('Space',true);run(.9);game.input('Space',false);game.input('ArrowRight',false);run(.2);assert.ok(game.player.x>1070);assert.equal(game.player.y,705);assert.equal(game.state.health,5)});
check('Sun Dash is acquired through proximity',()=>{place(1,1940);run(.03);assert.equal(game.state.dash,true)});
check('Amber barrier stops walking',()=>{place(2,540);game.input('ArrowRight',true);run(.6);game.input('ArrowRight',false);assert.ok(game.player.x<590);assert.equal(game.broken.has(2),false)});
check('Sun Dash breaks the barrier and crosses it',()=>{place(2,555);game.input('ArrowRight',true);tap('ShiftLeft');run(.18);game.input('ArrowRight',false);assert.equal(game.broken.has(2),true);assert.ok(game.player.x>635)});
check('Sky Feather can be acquired by a real jump from the ground',()=>{place(2,910);game.input('Space',true);run(.65);game.input('Space',false);assert.equal(game.state.doubleJump,true)});
check('Double jump grants extra height and cannot be spammed',()=>{place(0,300);game.input('Space',true);run(.3);game.input('Space',false);run(.02);game.input('Space',true);run(.03);assert.ok(game.player.vy<-500);assert.equal(game.usedDouble,true);game.input('Space',false);run(.05);const velocity=game.player.vy;tap('Space');assert.ok(game.player.vy>velocity);game.keys.clear()});
check('Ability gate denies entry before unlock',()=>{place(1,1310,340);game.state.doubleJump=false;tap('KeyE');assert.equal(game.state.room,1);game.state.doubleJump=true;tap('KeyE');assert.equal(game.state.room,3)});
check('Combat defeats a wisp and yields light',()=>{place(0,1500);const e=game.world[0].enemies[0];e.x=1550;e.home=1550;e.range=0;e.y=660;const light=game.state.light;tap('KeyJ');run(.33);tap('KeyJ');assert.equal(e.hp,0);assert.ok(game.state.light>=light+3)});
check('Damage has an invulnerability grace period',()=>{place(0,2000);game.hurt(false);const hp=game.state.health;game.hurt(false);assert.equal(game.state.health,hp)});
check('All three sunseeds and final restoration are completable',()=>{for(const room of [2,4,5]){for(const e of game.world[room].enemies)e.hp=0;const seed=game.world[room].seed;place(room,seed.x,seed.y+35);run(.02)}assert.deepEqual([...game.state.seeds].sort(),[2,4,5]);place(0,230);tap('KeyE');assert.equal(game.state.won,true);assert.equal(game.state.health,5)});
check('Save and resume preserve abilities, sunseeds, and checkpoint',()=>{game.save();assert.equal(game.hasSave(),true);game.start(true);assert.equal(game.state.dash,true);assert.equal(game.state.doubleJump,true);assert.equal(game.state.seeds.length,3);assert.equal(game.state.room,0);assert.equal(game.player.x,230)});
check('Malformed local save is safely ignored',()=>{storage.set('luma-sunseed-v1','{oops');assert.equal(game.hasSave(),false);game.start(true);assert.equal(game.state.room,0);assert.equal(game.state.seeds.length,0)});
check('Read-only progress tool validates inputs',()=>{assert.equal(registered.name,'read_luma_progress');assert.equal(registered.execute({}).room,0);assert.throws(()=>registered.execute({room:5}));assert.equal(game.state.room,0)});
check('Standard controller maps gameplay and menus with a stick dead zone',()=>{
 const pad={mapping:'standard',axes:[.1,0],buttons:Array.from({length:16},()=>({pressed:false}))};
 assert.equal(gamepadButtons(pad).keys.size,0);pad.axes=[-.8,.8];pad.buttons[0].pressed=true;pad.buttons[2].pressed=true;pad.buttons[5].pressed=true;pad.buttons[3].pressed=true;pad.buttons[9].pressed=true;
 const m=gamepadButtons(pad);for(const key of ['ArrowLeft','Space','KeyJ','ShiftLeft','KeyE'])assert.ok(m.keys.has(key));assert.ok(m.menus.has('next'));assert.ok(m.menus.has('pause'));assert.equal(gamepadButtons({...pad,mapping:''}).keys.size,0);
});
check('Controller polling creates one jump per press and clears input on disconnect',()=>{
 place(0,300);const pad={mapping:'standard',connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[pad]}});
 pad.buttons[0].pressed=true;game.pollGamepad();run(.04);assert.ok(game.player.vy<0);game.pollGamepad();assert.equal(game.padPressed.size,0);
 navigator.getGamepads=()=>[];game.pollGamepad();assert.equal(game.padKeys.size,0);assert.equal(game.paused,true);game.setPaused(false);
});
check('Chargers telegraph, lock their direction, then recover',()=>{
 place(0,1960);const e=game.world[0].enemies[1];e.hp=3;e.x=e.home;e.mode='patrol';e.timer=0;game.invincible=10;
 game.updateEnemies(.01);assert.equal(e.mode,'windup');assert.equal(e.direction,-1);const x=e.x;
 game.updateEnemies(.3);assert.equal(e.x,x);game.player.x=2300;game.updateEnemies(.51);assert.equal(e.mode,'attack');game.updateEnemies(.15);assert.ok(e.x<x);game.updateEnemies(.4);assert.equal(e.mode,'recover');
});
check('Sentries aim first and fire finite projectiles',()=>{
 place(1,1450);const e=game.world[1].enemies[1];e.hp=2;e.x=e.home;e.mode='patrol';e.timer=0;
 game.updateEnemies(.01);assert.equal(e.mode,'windup');assert.equal(game.projectiles.length,0);game.updateEnemies(.96);assert.equal(game.projectiles.length,1);assert.equal(e.mode,'recover');game.updateProjectiles(4);assert.equal(game.projectiles.length,0);
});
check('Keeper commits to telegraphs and changes its attack below half health',()=>{
 place(5,1700,400);const e=game.world[5].enemies[2];e.hp=8;e.x=e.home;e.timer=0;e.mode='patrol';game.invincible=10;
 game.updateEnemies(.01);game.updateEnemies(1.21);assert.equal(game.projectiles.length,3);
 game.projectiles=[];e.hp=4;e.mode='patrol';e.timer=0;game.updateEnemies(.01);game.updateEnemies(1.1);assert.equal(game.projectiles.length,5);
});
check('Light strikes disperse incoming projectiles',()=>{
 place(0,350);game.projectiles=[{x:410,y:670,vx:-180,vy:0,life:2,radius:8}];tap('KeyJ');assert.equal(game.projectiles.length,0);
});
check('Third combo strike is stronger and separate swings cannot hit twice',()=>{
 place(0,1460);const e=game.world[0].enemies[0];e.hp=8;e.home=1520;e.range=0;e.x=1520;game.invincible=10;
 tap('KeyJ');const first=e.hp;run(.1);assert.equal(e.hp,first);run(.24);tap('KeyJ');run(.34);tap('KeyJ');assert.equal(game.combo,3);assert.equal(e.hp,4);
});
check('Defeated enemies stay defeated when loading old-compatible saves',()=>{
 game.defeated.add('0-0');game.save();game.start(true);assert.equal(game.world[0].enemies[0].hp,0);
 const old=JSON.parse(storage.get('luma-sunseed-v1'));delete old.defeated;storage.set('luma-sunseed-v1',JSON.stringify(old));game.start(true);assert.equal(game.world[0].enemies[0].hp,2);
});
check('Losing focus pauses safely and clears held keys',()=>{
 place(0,350);game.input('ArrowRight',true);game.blur();assert.equal(game.paused,true);assert.equal(game.keys.size,0);game.setPaused(false);
});
check('Very wide and narrow canvas sizes render without negative camera bounds',()=>{
 for(const width of [360,800,3000]){game.viewport=width;game.render();place(0,230);run(.03);assert.ok(game.camera>=0)}game.viewport=1440;
});

check('Suggested routes respect ability gates and show the next discovery',()=>{
 game.start();assert.equal(journeyObjective(game.state).target,1);assert.deepEqual(journeyRoute(game.state,4),[]);
 game.state.dash=true;assert.equal(journeyObjective(game.state).target,2);
 game.state.doubleJump=true;assert.deepEqual(journeyRoute(game.state,4),[0,1,3,4]);
 place(5,300);assert.equal(journeyObjective(game.state).target,5);game.state.seeds=[5];assert.equal(journeyObjective(game.state).target,2);
 game.state.seeds=[2,4,5];assert.equal(journeyObjective(game.state).target,0);assert.ok(journeyObjective(game.state).detail.includes('Waking Glade'));
 for(const region of worldRegions)for(const door of region.doors)assert.ok(worldRegions[door.to].doors.some(d=>d.to===region.id),'Every map passage has a return');
});
check('Entering Amber Hollow cannot move a checkpoint past the dash gate',()=>{
 game.start();place(1,310);tap('KeyE');game.enter(2);assert.equal(game.checkpoint.room,1);assert.ok(game.player.x<590);assert.equal(game.state.shrines.includes(2),false);
 game.save();game.start(true);assert.equal(game.state.room,1);assert.equal(game.state.dash,false);assert.equal(game.player.x,310);
});
check('Sunwells unlock travel only after resting; exploration alone does not',()=>{
 game.start();game.enter(1);assert.equal(game.state.visited.includes(1),true);assert.equal(game.state.shrines.includes(1),false);
 game.setPaused(true);place(0,230);assert.equal(game.travelTo(1),false);
 game.setPaused(false);place(1,310);tap('KeyE');assert.ok(game.state.shrines.includes(1));assert.equal(game.checkpoint.room,1);
 game.setPaused(true);game.player.vx=250;game.jumpBuffer=.14;game.attack=.2;game.projectiles=[{x:100,y:100,life:2}];assert.equal(game.travelTo(0),true);
 assert.equal(game.player.x,230);assert.equal(game.player.vx,0);assert.equal(game.jumpBuffer,0);assert.equal(game.attack,0);assert.equal(game.projectiles.length,0);assert.equal(game.state.room,0);assert.equal(game.paused,true);assert.equal(game.checkpoint.room,0);
 game.start(true);assert.deepEqual(game.state.shrines,[0,1]);assert.equal(game.state.room,0);
});
check('Travel rejects invalid destinations, midair use, and use away from a Sunwell',()=>{
 game.start();game.state.shrines=[0,1];game.setPaused(true);
 for(const target of [-1,6,1.5,NaN,Infinity,0])assert.equal(game.travelTo(target),false);
 place(0,500);assert.equal(game.travelTo(1),false);place(0,230,620);assert.equal(game.travelTo(1),false);
 place(0,230);game.player.grounded=false;assert.equal(game.travelTo(1),false);game.player.grounded=true;game.setPaused(false);assert.equal(game.travelTo(1),false);
});
check('Legacy saves retain their known checkpoint without lighting every visited room',()=>{
 game.start();const old=JSON.parse(storage.get('luma-sunseed-v1'));delete old.shrines;old.visited=[0,1,2,3,4,5];old.room=2;old.checkpoint={room:2,x:1310,y:705};storage.set('luma-sunseed-v1',JSON.stringify(old));game.start(true);
 assert.deepEqual(game.state.shrines,[0,2]);assert.equal(game.player.x,1310);
 old.checkpoint={room:5,x:1e12,y:-9999};storage.set('luma-sunseed-v1',JSON.stringify(old));game.start(true);assert.equal(game.player.x,300);assert.equal(game.player.y,705);
});
check('Lethal contact leaves no projectiles or pickups from the old room',()=>{
 game.start();place(1,310);tap('KeyE');place(2,1390);game.state.health=1;const e=game.world[2].enemies[0];e.home=1390;e.range=0;e.x=1390;
 game.projectiles=[{x:100,y:100,vx:0,vy:0,life:5,radius:8}];run(1/120);assert.equal(game.state.room,1);assert.equal(game.player.x,310);assert.equal(game.state.health,5);assert.equal(game.projectiles.length,0);
 place(2,910,545);game.state.health=1;game.state.doubleJump=false;game.projectiles=[{x:910,y:510,vx:0,vy:0,life:5,radius:8},{x:100,y:100,vx:0,vy:0,life:5,radius:8}];run(1/120);
 assert.equal(game.state.room,1);assert.equal(game.state.doubleJump,false);assert.equal(game.projectiles.length,0);
});
check('Restoring the forest survives reload without repeating the finale',()=>{
 game.start();game.state.seeds=[2,4,5];place(0,230);tap('KeyE');assert.equal(game.state.won,true);game.start(true);assert.equal(game.state.won,true);assert.equal(game.state.canTravel,false);
});
check('Amber sunseed can be reached with actual double-jump movement',()=>{
 game.start();game.state.dash=true;game.state.doubleJump=true;game.broken.add(2);for(const e of game.world[2].enemies)e.hp=0;place(2,1310);
 game.input('ArrowRight',true);game.input('Space',true);run(.42);game.input('Space',false);run(1/120);game.input('Space',true);run(.72);game.keys.clear();
 assert.ok(game.state.seeds.includes(2),`Seed must be reachable by movement; player at ${game.player.x},${game.player.y}`);assert.equal(game.state.health,5);
});

check('Moonpetal sunseed is reachable from its Sunwell by climbing the terraces',()=>{
 game.start();game.state.doubleJump=true;for(const e of game.world[4].enemies)e.hp=0;place(4,2120);
 const leap=(first,second)=>{game.input('Space',true);run(first);game.input('Space',false);run(1/120);game.input('Space',true);run(second);game.input('Space',false)};
 game.input('ArrowLeft',true);run(.4);leap(.42,.62);game.input('ArrowLeft',false);run(.65);
 assert.equal(game.player.y,445,`first terrace ${game.player.x},${game.player.y}`);
 game.input('ArrowLeft',true);leap(.42,.72);game.input('ArrowLeft',false);run(.65);
 assert.ok(game.state.seeds.includes(4),`Moonpetal seed ${game.player.x},${game.player.y}`);assert.equal(game.state.health,5);
});
check('Sunspire sunseed is reachable from its Sunwell through the ruined platforms',()=>{
 game.start();game.state.doubleJump=true;for(const e of game.world[5].enemies)e.hp=0;place(5,300);
 const leap=(first,second)=>{game.input('Space',true);run(first);game.input('Space',false);run(1/120);game.input('Space',true);run(second);game.input('Space',false)};
 game.input('ArrowRight',true);game.input('Space',true);run(1);game.input('Space',false);game.input('ArrowRight',false);run(.08);assert.equal(game.player.y,565);
 game.input('ArrowRight',true);leap(.42,.72);game.input('ArrowRight',false);run(.65);assert.equal(game.player.y,435);
 game.input('ArrowRight',true);game.input('Space',true);run(1.3);game.input('Space',false);game.input('ArrowRight',false);run(.08);assert.equal(game.player.y,535);
 game.input('ArrowRight',true);leap(.42,.85);game.input('ArrowRight',false);run(.55);
 assert.ok(game.state.seeds.includes(5),`Sunspire seed ${game.player.x},${game.player.y}`);assert.equal(game.state.health,5);
});

check('Passage arrival resets combat feedback without inheriting the previous boss',()=>{
 game.start();game.state.doubleJump=true;place(5,2210);game.state.bossHealth=8;game.state.animation='dash';game.attackCooldown=.2;game.jumpBuffer=.1;tap('KeyE');
 assert.equal(game.state.room,2);assert.equal(game.state.bossHealth,null);assert.equal(game.state.animation,'idle');assert.equal(game.jumpBuffer,0);assert.equal(game.attackCooldown,0);
});

check('A slightly early strike queues the next combo without auto-attacking',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.hp=8;e.x=e.home=1510;e.range=0;
 tap('KeyJ');assert.equal(e.hp,7);run(.22);tap('KeyJ');assert.equal(e.hp,7);run(.15);assert.equal(e.hp,6);assert.equal(game.state.combo,2);run(.9);assert.equal(e.hp,6);
});
check('Pausing clears queued attacks before resuming',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.hp=8;e.x=e.home=1510;e.range=0;
 tap('KeyJ');run(.22);tap('KeyJ');game.setPaused(true);game.setPaused(false);run(.4);assert.equal(e.hp,7);
});
check('Strikes interrupt a sentry wind-up and create a safe stun window',()=>{
 game.start();place(1,1500);const e=game.world[1].enemies[1];e.x=e.home=1560;e.range=0;e.mode='windup';e.timer=.03;
 tap('KeyJ');assert.equal(e.hp,1);assert.equal(e.mode,'recover');game.player.x=e.x;run(.3);assert.equal(game.projectiles.length,0);assert.equal(game.state.health,5);
});
check('The Keeper guards preparation but takes combo damage during recovery',()=>{
 game.start();place(5,1720,400);const e=game.world[5].enemies[2];e.x=e.home=1840;e.range=0;e.timer=0;
 run(1/120);tap('KeyJ');assert.equal(e.hp,8);assert.ok(game.combatTexts.some(t=>t.text==='GUARDED'));
 run(1.21);assert.equal(e.mode,'recover');tap('KeyJ');assert.equal(e.hp,7);run(.34);tap('KeyJ');run(.34);tap('KeyJ');assert.equal(e.hp,4);assert.equal(e.enraged,true);
});
check('Two properly timed counter windows can complete the Keeper fight',()=>{
 game.start();game.state.doubleJump=true;place(5,1720,400);const e=game.world[5].enemies[2];e.x=e.home=1840;e.range=0;e.timer=0;
 const counter=()=>{let elapsed=0;while(e.mode!=='recover'&&elapsed<4){run(1/120);elapsed+=1/120}assert.equal(e.mode,'recover');for(let hit=0;hit<3;hit++){tap('KeyJ');run(.35)}};
 counter();assert.equal(e.hp,4);while(e.mode==='recover')run(1/120);counter();assert.equal(e.hp,0);assert.equal(game.defeated.has(e.id),true);assert.equal(game.state.health,5);assert.equal(game.projectiles.length,0);
 game.input('ArrowRight',true);run(.27);game.input('ArrowRight',false);assert.ok(game.state.seeds.includes(5),'The released seed can be picked up after the fight');
});
check('Projectiles hit terrain, including when a long step crosses an entire ledge',()=>{
 game.start();place(5,1720,705);game.projectiles=[{x:1840,y:345,vx:0,vy:235,life:3,radius:10}];game.updateProjectiles(.5);assert.equal(game.projectiles.length,0);assert.equal(game.state.health,5);
 place(0,350);game.projectiles=[{x:500,y:520,vx:0,vy:500,life:2,radius:8}];game.updateProjectiles(.4);assert.equal(game.projectiles.length,0);
});
check('Awakening a creature grants its light only once and removes contact damage',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.x=e.home=1510;e.range=0;const light=game.state.light;
 tap('KeyJ');run(.34);tap('KeyJ');assert.equal(e.hp,0);const reward=game.state.light;assert.ok(reward>=light+3);game.player.x=e.x;run(.34);tap('KeyJ');assert.equal(game.state.light,reward);assert.equal(game.state.health,5);
});

check('An early press outside the buffer window does not fire a late surprise strike',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.hp=8;e.x=e.home=1510;e.range=0;tap('KeyJ');run(.04);tap('KeyJ');run(.5);assert.equal(e.hp,7);
});
check('Sentry warnings commit to the original target rather than tracking a dodge',()=>{
 game.start();place(1,1420);const e=game.world[1].enemies[1];e.x=e.home=1560;e.range=0;e.timer=0;game.updateEnemies(.01);const aim=e.aimX;game.player.x=1750;game.updateEnemies(.96);
 assert.equal(e.aimX,aim);assert.equal(game.projectiles.length,1);assert.ok(game.projectiles[0].vx<0,'The shot follows its displayed leftward warning');
});
check('Contact danger returns after a regular creature finishes recovering',()=>{
 game.start();place(0,1510);const e=game.world[0].enemies[0];e.x=e.home=1510;e.range=0;e.mode='recover';e.timer=.05;game.updateEnemies(.03);assert.equal(game.state.health,5);game.updateEnemies(.03);assert.equal(game.state.health,4);
});


check('Sunwell blessings spend exact light, grow hearts twice, and reject repeat purchases',()=>{
 game.start();place(0,230);game.setPaused(true);game.state.light=19;assert.equal(game.buyBlessing('heart'),false);assert.equal(game.state.light,19);assert.equal(game.state.maxHealth,5);
 game.state.light=20;assert.equal(game.buyBlessing('heart'),true);assert.equal(game.state.light,0);assert.equal(game.state.health,6);assert.equal(game.state.maxHealth,6);assert.equal(sunwellOffers(game.state)[0].cost,35);
 game.state.light=60;assert.equal(game.buyBlessing('magnet'),true);assert.equal(game.state.light,35);assert.equal(game.state.magnet,true);assert.equal(game.buyBlessing('magnet'),false);
 assert.equal(game.buyBlessing('heart'),true);assert.equal(game.state.light,0);assert.equal(game.state.maxHealth,7);assert.equal(game.state.heartLevel,2);game.state.light=100;assert.equal(game.buyBlessing('heart'),false);assert.equal(game.state.light,100);assert.equal(game.buyBlessing('unknown'),false);
});
check('Purchases require a paused game beside a lit grounded Sunwell',()=>{
 game.start();game.state.light=100;place(0,230);assert.equal(game.buyBlessing('heart'),false);game.setPaused(true);
 place(0,500);assert.equal(game.buyBlessing('heart'),false);assert.equal(game.openSunwell(),false);
 place(0,230,630);assert.equal(game.buyBlessing('heart'),false);place(0,230);game.player.grounded=false;assert.equal(game.buyBlessing('heart'),false);
 place(1,310);assert.equal(game.buyBlessing('heart'),false);game.state.shrines.push(1);game.state.won=true;assert.equal(game.buyBlessing('heart'),false);assert.equal(game.openSunwell(),false);assert.equal(game.state.light,100);
 game.state.won=false;assert.equal(game.openSunwell(),true);assert.equal(game.paused,true);assert.equal(game.buyBlessing('heart'),true);
});
check('Extra hearts remain useful through rest, death, travel, and reload',()=>{
 game.start();place(0,230);game.state.light=100;game.setPaused(true);game.buyBlessing('heart');game.buyBlessing('heart');game.buyBlessing('magnet');game.setPaused(false);game.state.health=2;tap('KeyE');assert.equal(game.state.health,7);
 place(0,350);game.state.health=1;game.hurt(false);assert.equal(game.state.health,7);assert.equal(game.state.maxHealth,7);assert.equal(game.state.magnet,true);
 game.state.shrines.push(1);place(0,230);game.setPaused(true);assert.equal(game.travelTo(1),true);assert.equal(game.state.health,7);game.start(true);assert.equal(game.state.room,1);assert.equal(game.state.heartLevel,2);assert.equal(game.state.health,7);assert.equal(game.state.magnet,true);assert.equal(game.state.light,20);
});
check('New journeys reset blessings and memories; legacy saves retain their light and route',()=>{
 game.start();assert.equal(game.state.maxHealth,5);assert.equal(game.state.magnet,false);assert.deepEqual(game.state.discoveries,[]);
 game.state.light=47;game.state.dash=true;game.state.doubleJump=true;game.save();const old=JSON.parse(storage.get('luma-sunseed-v1'));delete old.heartLevel;delete old.magnet;delete old.discoveries;storage.set('luma-sunseed-v1',JSON.stringify(old));game.start(true);
 assert.equal(game.state.light,47);assert.equal(game.state.dash,true);assert.equal(game.state.doubleJump,true);assert.equal(game.state.maxHealth,5);assert.equal(game.state.magnet,false);assert.deepEqual(game.state.discoveries,[]);
});
check('Corrupt blessing and memory fields are sanitized without inflating hearts or currency',()=>{
 game.start();game.save();const save=JSON.parse(storage.get('luma-sunseed-v1'));Object.assign(save,{heartLevel:999,maxHealth:999,magnet:'true',light:-10,discoveries:[memoryBlooms[0].id,memoryBlooms[0].id,'unknown',null]});storage.set('luma-sunseed-v1',JSON.stringify(save));game.start(true);
 assert.equal(game.state.maxHealth,5);assert.equal(game.state.magnet,false);assert.equal(game.state.light,0);assert.deepEqual(game.state.discoveries,[memoryBlooms[0].id]);
 save.heartLevel=1.5;save.discoveries={};save.light=12.9;storage.set('luma-sunseed-v1',JSON.stringify(save));game.start(true);assert.equal(game.state.maxHealth,5);assert.equal(game.state.light,12);assert.deepEqual(game.state.discoveries,[]);
});
check('Memory Blooms require their ability and an interaction; each grants light exactly once',()=>{
 game.start();for(const bloom of memoryBlooms){for(const r of game.world){r.motes=[];for(const e of r.enemies)e.hp=0}place(bloom.room,bloom.x,bloom.y+35);game.state[bloom.needs]=false;
  run(.01);assert.equal(game.state.discoveries.includes(bloom.id),false);tap('KeyE');assert.equal(game.state.discoveries.includes(bloom.id),false);
  game.state[bloom.needs]=true;const light=game.state.light;tap('KeyE');assert.equal(game.state.discoveries.includes(bloom.id),true);assert.equal(game.state.light,light+20);tap('KeyE');assert.equal(game.state.light,light+20);
 }assert.equal(game.state.discoveries.length,3);game.start(true);assert.equal(game.state.discoveries.length,3);assert.equal(game.state.light,60);assert.equal(game.state.seeds.length,0);
 const bloom=memoryBlooms[0];game.world[0].motes=[];place(0,bloom.x,bloom.y+35);tap('KeyE');assert.equal(game.state.light,60);
});
check('Memories reject distant interactions and do not change the active Sunwell',()=>{
 game.start();game.state.doubleJump=true;const checkpoint={...game.checkpoint};place(0,875,705);tap('KeyE');assert.equal(game.state.discoveries.length,0);assert.deepEqual(game.checkpoint,checkpoint);
 place(0,875,450);tap('KeyE');assert.ok(game.state.discoveries.includes('brook-song'));assert.deepEqual(game.checkpoint,checkpoint);assert.deepEqual(game.state.shrines,[0]);
});
check('Glowkeeper extends mote collection without reaching remote seeds or Memory Blooms',()=>{
 game.start();place(0,350);game.world[0].motes=[{id:'range-test',x:440,y:670}];run(.01);assert.equal(game.state.light,0);game.state.magnet=true;run(.01);assert.equal(game.state.light,1);assert.equal(game.collected.has('range-test'),true);run(.01);assert.equal(game.state.light,1);
 game.world[0].motes=[];game.state.doubleJump=true;place(0,875,450);run(.01);assert.equal(game.state.discoveries.length,0);
 const seed=game.world[2].seed;for(const e of game.world[2].enemies)e.hp=0;game.world[2].motes=[];place(2,seed.x-95,seed.y+35);run(.01);assert.equal(game.state.seeds.includes(2),false);
});
check('Main restoration stays completable without any optional memory or blessing',()=>{
 game.start();game.state.seeds=[2,4,5];place(0,230);tap('KeyE');assert.equal(game.state.won,true);assert.equal(game.state.heartLevel,0);assert.equal(game.state.magnet,false);assert.equal(game.state.discoveries.length,0);
});
check('Every Memory Bloom sits above a real ledge and has a reachable-region hint',()=>{
 for(const bloom of memoryBlooms){const room=game.world[bloom.room];assert.ok(room.platforms.some(p=>bloom.x>p.x&&bloom.x<p.x+p.w&&bloom.y+40===p.y));assert.ok(worldRegions[bloom.room].hasMemory);assert.ok(bloom.hint.length>20)}
});

check('Brook memory is reachable from the starting Sunwell using real jumps',()=>{
 game.start();game.state.doubleJump=true;for(const e of game.world[0].enemies)e.hp=0;place(0,230);
 game.input('ArrowRight',true);run(.3);game.input('Space',true);run(1);game.input('Space',false);game.input('ArrowRight',false);run(.15);assert.equal(game.player.y,575);
 game.input('ArrowRight',true);game.input('Space',true);run(.42);game.input('Space',false);run(1/120);game.input('Space',true);run(.3);game.input('Space',false);game.input('ArrowRight',false);run(1.2);
 assert.equal(game.player.y,455,`Brook ledge ${game.player.x},${game.player.y}`);tap('KeyE');assert.ok(game.state.discoveries.includes('brook-song'));
});
check('Waterfall memory is reachable from its Sunwell through two ordinary jumps',()=>{
 game.start();game.state.dash=true;for(const e of game.world[1].enemies)e.hp=0;place(1,310);
 for(const height of [560,460]){game.input('ArrowRight',true);game.input('Space',true);run(1);game.input('Space',false);game.input('ArrowRight',false);run(.15);assert.equal(game.player.y,height,`Falls ledge ${game.player.x},${game.player.y}`)}
 tap('KeyE');assert.ok(game.state.discoveries.includes('waterfall-wish'));assert.equal(game.state.doubleJump,false);assert.equal(game.state.room,1);
});
check('Canopy memory is reachable from its Sunwell with a high double jump',()=>{
 game.start();game.state.doubleJump=true;for(const e of game.world[3].enemies)e.hp=0;place(3,1140);
 game.input('ArrowRight',true);game.input('Space',true);run(.42);game.input('Space',false);run(1/120);game.input('Space',true);run(.4);game.input('Space',false);game.input('ArrowRight',false);run(1);assert.equal(game.player.y,530);
 game.input('ArrowRight',true);game.input('Space',true);run(.42);game.input('Space',false);run(1/120);game.input('Space',true);run(.45);game.input('Space',false);game.input('ArrowRight',false);run(1.1);
 assert.equal(game.player.y,390,`Canopy ledge ${game.player.x},${game.player.y}`);tap('KeyE');assert.ok(game.state.discoveries.includes('wind-lullaby'));
});

check('Preferences round-trip independently of the adventure save',()=>{
 const progress=storage.get('luma-sunseed-v1');const value={...prefs.defaultPreferences(),muted:true,musicVolume:.2,effectsVolume:.4,assist:true,motion:'reduced',bindings:{...prefs.defaultBindings,jump:'KeyF'}};
 assert.equal(prefs.savePreferences(value),true);assert.deepEqual(prefs.readPreferences(),value);assert.equal(storage.get('luma-sunseed-v1'),progress);
 storage.set('luma-preferences-v1','{oops');assert.deepEqual(prefs.readPreferences(),prefs.defaultPreferences());
});
check('Malformed settings cannot create conflicting keys or invalid audio values',()=>{
 const value=prefs.normalizePreferences({...prefs.defaultPreferences(),musicVolume:9,effectsVolume:NaN,bindings:{...prefs.defaultBindings,jump:'KeyA'}});
 assert.equal(value.musicVolume,1);assert.equal(value.effectsVolume,.85);assert.deepEqual(value.bindings,prefs.defaultBindings);
 assert.deepEqual(prefs.normalizePreferences({version:2,muted:true}),prefs.defaultPreferences());
});
check('Rebinding rejects conflicts and reserved keys, and gives primary bindings precedence',()=>{
 assert.ok(prefs.rebindControl(prefs.defaultBindings,'jump','KeyA').error);assert.ok(prefs.rebindControl(prefs.defaultBindings,'jump','Escape').error);assert.ok(prefs.rebindControl(prefs.defaultBindings,'jump','Tab').error);
 const bindings={...prefs.defaultBindings,right:'ArrowLeft',jump:'KeyF'};
 assert.equal(prefs.keyboardAction('ArrowLeft',bindings),'right');assert.equal(prefs.keyboardAction('KeyD',bindings),undefined);assert.equal(prefs.keyboardAction('Space',bindings),undefined);assert.equal(prefs.keyboardAction('KeyW',bindings),undefined);assert.equal(prefs.keyboardAction('KeyF',bindings),'jump');assert.equal(prefs.keyboardAction('KeyX',bindings),'strike');
});
const keyboard=(code,extra={})=>({code,preventDefault:noop,...extra});
check('Actual remapped keyboard input moves and jumps; the former jump key is inactive',()=>{
 game.setPreferences({...prefs.defaultPreferences(),bindings:{...prefs.defaultBindings,right:'KeyL',jump:'KeyF'}});game.start();place(0,300);
 game.keydown(keyboard('KeyD'));run(.1);assert.equal(game.player.x,300);
 game.keydown(keyboard('KeyL'));run(.15);game.keyup(keyboard('KeyL'));assert.ok(game.player.x>320);
 game.keydown(keyboard('Space'));run(.05);assert.equal(game.player.y,705);
 game.keydown(keyboard('KeyF'));run(.04);assert.ok(game.player.vy<0);game.keyup(keyboard('KeyF'));
});
check('Releasing one of two physical aliases does not cancel the held direction',()=>{
 game.setPreferences(prefs.defaultPreferences());game.start();place(0,300);game.keydown(keyboard('KeyD'));game.keydown(keyboard('ArrowRight'));game.keyup(keyboard('KeyD'));assert.equal(game.keys.has('KeyD'),true);game.keyup(keyboard('ArrowRight'));assert.equal(game.keys.has('KeyD'),false);
});
check('Changing bindings clears held and queued input, and form controls never move Luma',()=>{
 game.keydown(keyboard('KeyD'));game.setPreferences({...prefs.defaultPreferences(),bindings:{...prefs.defaultBindings,right:'KeyL'}});assert.equal(game.keys.size,0);assert.equal(game.keyboardHeld.size,0);
 game.keydown(keyboard('KeyL',{target:{closest:()=>({})}}));assert.equal(game.keys.size,0);
 game.keydown(keyboard('KeyL',{defaultPrevented:true}));assert.equal(game.keys.size,0);game.keydown(keyboard('KeyL',{ctrlKey:true}));assert.equal(game.keys.size,0);game.setPreferences(prefs.defaultPreferences());
});
check('Remapped strike, dash, and interaction retain real engine behavior',()=>{
 game.setPreferences({...prefs.defaultPreferences(),bindings:{...prefs.defaultBindings,strike:'KeyV',dash:'KeyC',interact:'KeyR'}});game.start();place(0,350);game.state.dash=true;
 game.keydown(keyboard('KeyV'));run(.01);game.keyup(keyboard('KeyV'));assert.ok(game.attack>0);
 game.keydown(keyboard('KeyC'));run(.01);game.keyup(keyboard('KeyC'));assert.ok(game.dashTime>0);
 place(1,310);game.keydown(keyboard('KeyR'));run(.01);game.keyup(keyboard('KeyR'));assert.ok(game.state.shrines.includes(1));game.setPreferences(prefs.defaultPreferences());
});
check('Gentle Journey forgives falls and extends damage grace without removing enemy damage',()=>{
 game.setPreferences({...prefs.defaultPreferences(),assist:true});game.start();place(0,350);game.safe={x:350,y:705};game.player.y=1000;game.hurt(true);assert.equal(game.state.health,5);assert.equal(game.player.y,705);
 game.invincible=0;game.hurt(false);assert.equal(game.state.health,4);assert.equal(game.invincible,2.4);game.hurt(false);assert.equal(game.state.health,4);
 game.setPreferences(prefs.defaultPreferences());game.invincible=0;game.hurt(true);assert.equal(game.state.health,3);assert.equal(game.invincible,1.6);
});
check('Gentle Journey extends warnings and Keeper recovery while slowing projectiles',()=>{
 game.setPreferences({...prefs.defaultPreferences(),assist:true});game.start();place(5,1700,400);game.invincible=100;const e=game.world[5].enemies[2];e.x=e.home;e.range=0;e.timer=0;
 game.updateEnemies(.01);assert.equal(e.windup,1.2*1.45);game.updateEnemies(1.21);assert.equal(e.mode,'windup');assert.equal(game.projectiles.length,0);game.updateEnemies(.54);assert.equal(e.mode,'recover');assert.equal(e.timer,1.25*1.4);assert.equal(game.projectiles.length,3);assert.ok(Math.abs(Math.hypot(game.projectiles[0].vx,game.projectiles[0].vy)-205*.8)<.001);
 game.setPreferences(prefs.defaultPreferences());
});
check('Vibration preference and reduced motion suppress controller rumble',()=>{
 let count=0;game.activePad={vibrationActuator:{playEffect:()=>{count++;return Promise.resolve()}}};game.setPreferences({...prefs.defaultPreferences(),rumble:false});game.rumble(.2,50);assert.equal(count,0);
 game.setPreferences({...prefs.defaultPreferences(),motion:'reduced'});game.shake=9;game.motionChanged();game.rumble(.2,50);assert.equal(count,0);assert.equal(game.shake,0);
 game.setPreferences(prefs.defaultPreferences());game.rumble(.2,50);assert.equal(count,1);game.activePad=null;
});
check('Separate audio buses apply saved volumes and route melody apart from effects',()=>{
 const gains=[],oscillators=[];globalThis.AudioContext=class{
  state='suspended';currentTime=0;destination={};resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}
  createGain(){const node={gain:{setTargetAtTime:v=>{node.volume=v},setValueAtTime:noop,linearRampToValueAtTime:noop,exponentialRampToValueAtTime:noop},connect:target=>{node.target=target}};gains.push(node);return node}
  createOscillator(){const node={frequency:{setValueAtTime:noop},connect:noop,start:noop,stop:noop};oscillators.push(node);return node}
 };
 game.setPreferences({...prefs.defaultPreferences(),musicVolume:.25,effectsVolume:.7});game.start();assert.equal(game.musicBus.volume,.25);assert.equal(game.effectsBus.volume,.7);
 game.tone(440,.1);assert.equal(gains.at(-1).target,game.effectsBus);game.tone(330,.2,'sine',.02,'music');assert.equal(gains.at(-1).target,game.musicBus);
 game.setPreferences({...prefs.defaultPreferences(),muted:true});const count=oscillators.length;game.tone(440,.1);assert.equal(oscillators.length,count);assert.equal(game.audio.state,'suspended');game.start();assert.equal(game.audio.state,'suspended');assert.equal(game.getPreferences().muted,true);
 game.setPreferences(prefs.defaultPreferences());assert.equal(game.audio.state,'running');
});
check('Stored preferences survive a new journey, and controller menus can adjust settings',()=>{
 const value={...prefs.defaultPreferences(),assist:true,muted:true};prefs.savePreferences(value);
 const second=new Game({getContext:()=>context,getBoundingClientRect:()=>({width:1440,height:810})},noop);assert.equal(second.getPreferences().assist,true);second.start();assert.equal(second.getPreferences().muted,true);assert.equal(second.state.dash,false);second.destroy();
 const pad={mapping:'standard',axes:[.8,0],buttons:[]};assert.ok(gamepadButtons(pad).menus.has('increase'));pad.axes=[-.8,0];assert.ok(gamepadButtons(pad).menus.has('decrease'));
 storage.delete('luma-preferences-v1');
});
check('Storage failures leave valid settings available for the current session',()=>{
 const original=globalThis.localStorage;globalThis.localStorage={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
 assert.deepEqual(prefs.readPreferences(),prefs.defaultPreferences());assert.equal(prefs.savePreferences(prefs.defaultPreferences()),false);globalThis.localStorage=original;
});

check('System motion changes update the engine and remove their listener on destruction',()=>{
 let listener,removed=false;const query={matches:true,addEventListener:(name,fn)=>{listener=fn},removeEventListener:(name,fn)=>{removed=fn===listener}};window.matchMedia=()=>query;
 const second=new Game({getContext:()=>context,getBoundingClientRect:()=>({width:1440,height:810})},noop);assert.equal(second.reducedMotion,true);query.matches=false;listener();assert.equal(second.reducedMotion,false);
 second.setPreferences({...prefs.defaultPreferences(),motion:'reduced'});assert.equal(second.reducedMotion,true);second.destroy();assert.equal(removed,true);delete window.matchMedia;
});

game.destroy();console.log(`\n${tests} gameplay checks passed.`);
