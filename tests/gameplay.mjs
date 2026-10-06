import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/game.ts',import.meta.url),'utf8');
const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const preferencesURL='data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync(new URL('../app/preferences.ts',import.meta.url),'utf8'))).toString('base64');
const prefs=await import(preferencesURL);
const campaignURL='data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync(new URL('../app/campaign.ts',import.meta.url),'utf8'))).toString('base64');
const campaign=await import(campaignURL);
const atlasURL='data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync(new URL('../app/art-atlas.ts',import.meta.url),'utf8'))).toString('base64');
const visualsURL='data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync(new URL('../app/combat-visuals.ts',import.meta.url),'utf8')).replace("'./art-atlas'",JSON.stringify(atlasURL))).toString('base64');
const compiled=compile(source).replace("'./combat-visuals'",JSON.stringify(visualsURL)).replaceAll("'./campaign'",JSON.stringify(campaignURL)).replace("'./preferences'",JSON.stringify(preferencesURL));
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
const strike=()=>{tap('KeyJ');run(.065)};
const place=(room,x,y=705)=>{game.encounter=null;game.bossHazards=[];game.state.room=room;game.state.roomName=game.world[room].name;game.player={x,y,vx:0,vy:0,face:1,grounded:true};game.coyote=.12;game.invincible=0;game.dashCooldown=0;game.dashTime=0;game.usedDouble=false;game.hitStop=0;game.strikeBuffer=0;game.knockback=0;game.comboWindow=0;game.attack=0;game.attackCooldown=0;game.padKeys.clear();game.padPressed.clear();game.projectiles=[];game.keys.clear();game.pressed.clear()};
const unlock=stage=>{game.state.bosses=Array.from({length:stage},(_,i)=>i)};
const prepare=stage=>{unlock(stage);game.state.beacons=[0,1,2].map(p=>`${stage}:${p}`);for(const e of game.world[campaign.stageRooms(stage)[2]].enemies)e.hp=0};
let tests=0;function check(name,fn){fn();console.log('PASS',name);tests++}
game.start();
check('First jump reaches the 145px ability ledge',()=>{place(2,890);game.input('Space',true);let min=705;for(let i=0;i<90;i++){run(1/120);min=Math.min(min,game.player.y)}game.input('Space',false);assert.ok(min<560,`jump apex ${min} must be <560`)});
check('Single jump crosses the first gap without damage',()=>{place(0,810);game.input('ArrowRight',true);run(.15);game.input('Space',true);run(.9);game.input('Space',false);game.input('ArrowRight',false);run(.2);assert.ok(game.player.x>1070);assert.equal(game.player.y,705);assert.equal(game.state.health,5)});
check('Sun Dash is acquired through proximity',()=>{place(1,1940);run(.03);assert.equal(game.state.dash,true)});
check('Amber barrier stops walking',()=>{place(2,540);game.input('ArrowRight',true);run(.6);game.input('ArrowRight',false);assert.ok(game.player.x<590);assert.equal(game.broken.has(2),false)});
check('Sun Dash breaks the barrier and crosses it',()=>{place(2,555);game.input('ArrowRight',true);tap('ShiftLeft');run(.18);game.input('ArrowRight',false);assert.equal(game.broken.has(2),true);assert.ok(game.player.x>635)});
check('Sky Feather can be acquired by a real jump from the ground',()=>{place(2,910);game.input('Space',true);run(.65);game.input('Space',false);assert.equal(game.state.doubleJump,true)});
check('Double jump grants extra height and cannot be spammed',()=>{place(0,300);game.input('Space',true);run(.3);game.input('Space',false);run(.02);game.input('Space',true);run(.03);assert.ok(game.player.vy<-500);assert.equal(game.usedDouble,true);game.input('Space',false);run(.05);const velocity=game.player.vy;tap('Space');assert.ok(game.player.vy>velocity);game.keys.clear()});
check('Three beacons and a cleared gauntlet are required before arena entry',()=>{
 game.start();place(7,2310);tap('KeyE');assert.equal(game.state.room,7);
 game.state.beacons=['0:0','0:1','0:2'];tap('KeyE');assert.equal(game.state.room,7);
 for(const e of game.world[7].enemies)e.hp=0;tap('KeyE');assert.equal(game.state.room,8);
});

check('Combat defeats a wisp and yields light',()=>{place(0,1500);const e=game.world[0].enemies[0];e.x=1550;e.home=1550;e.range=0;e.y=660;const light=game.state.light;strike();run(.33);strike();assert.equal(e.hp,0);assert.ok(game.state.light>=light+3)});
check('Damage has an invulnerability grace period',()=>{place(0,2000);game.hurt(false);const hp=game.state.health;game.hurt(false);assert.equal(game.state.health,hp)});
check('Only all six guardian victories complete the campaign and restore three sunseeds',()=>{
 game.start();game.state.dash=true;game.state.doubleJump=true;
 for(let stage=0;stage<6;stage++){prepare(stage);const room=campaign.stageRooms(stage)[3];place(room,1400);const e=game.world[room].enemies[0];e.hp=1;e.mode='recover';e.timer=2;game.strikeEnemy(e);assert.ok(game.state.bosses.includes(stage));assert.equal(game.state.won,stage===5)}
 assert.deepEqual(game.state.seeds,[2,4,5]);assert.equal(game.state.health,5);
});

check('Save and resume preserve abilities, sunseeds, and checkpoint',()=>{game.save();assert.equal(game.hasSave(),true);game.start(true);assert.equal(game.state.dash,true);assert.equal(game.state.doubleJump,true);assert.equal(game.state.seeds.length,3);assert.equal(game.state.room,23);assert.equal(game.player.x,230)});
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
check('Boss patterns change at half health and Solwarden has a third phase',()=>{
 assert.equal(campaign.bossPhase(36,36,5),1);assert.equal(campaign.bossPhase(18,36,5),2);assert.equal(campaign.bossPhase(12,36,5),3);
 for(let stage=0;stage<6;stage++){const normal=campaign.bossPattern(stage,0,campaign.stages[stage].hp,campaign.stages[stage].hp),enraged=campaign.bossPattern(stage,0,1,campaign.stages[stage].hp);assert.notEqual(normal,enraged)}
});

check('Light strikes disperse incoming projectiles',()=>{
 place(0,350);game.projectiles=[{x:410,y:670,vx:-180,vy:0,life:2,radius:8}];strike();assert.equal(game.projectiles.length,0);
});
check('Third combo strike is stronger and separate swings cannot hit twice',()=>{
 place(0,1460);const e=game.world[0].enemies[0];e.hp=8;e.home=1520;e.range=0;e.x=1520;game.invincible=10;
 strike();const first=e.hp;run(.1);assert.equal(e.hp,first);run(.24);strike();run(.34);strike();assert.equal(game.combo,3);assert.equal(e.hp,4);
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

check('Campaign objectives and routes honor beacon and boss gates',()=>{
 game.start();assert.equal(journeyObjective(game.state).target,0);assert.deepEqual(journeyRoute(game.state,1),[]);
 game.state.beacons=['0:0'];assert.equal(journeyObjective(game.state).target,6);assert.deepEqual(journeyRoute(game.state,6),[0,6]);
 prepare(0);assert.equal(journeyObjective(game.state).target,8);assert.deepEqual(journeyRoute(game.state,8),[0,6,7,8]);
 game.state.bosses=[0];assert.equal(journeyObjective(game.state).target,1);assert.deepEqual(journeyRoute(game.state,1),[0,6,7,8,1]);
 for(const region of worldRegions)for(const door of region.doors)assert.ok(worldRegions[door.to].doors.some(d=>d.to===region.id));
 assert.equal(worldRegions.length,24);
});

check('Entering a stage cannot move its checkpoint past an ability gate',()=>{
 game.start();unlock(2);place(11,230);tap('KeyE');assert.equal(game.enter(2),undefined);assert.equal(game.checkpoint.room,11);assert.ok(game.player.x<590);assert.equal(game.state.shrines.includes(2),false);
 game.save();game.start(true);assert.equal(game.state.room,11);assert.equal(game.state.dash,false);assert.equal(game.player.x,230);
});

check('Sunwells unlock travel only after resting; exploration alone does not',()=>{
 game.start();unlock(1);place(8,2310);game.enter(1);assert.equal(game.state.visited.includes(1),true);assert.equal(game.state.shrines.includes(1),false);
 game.setPaused(true);place(0,230);assert.equal(game.travelTo(1),false);
 game.setPaused(false);place(1,310);tap('KeyE');assert.ok(game.state.shrines.includes(1));assert.equal(game.checkpoint.room,1);
 game.setPaused(true);game.player.vx=250;game.jumpBuffer=.14;game.attack=.2;game.projectiles=[{x:100,y:100,life:2}];assert.equal(game.travelTo(0),true);
 assert.equal(game.player.x,230);assert.equal(game.player.vx,0);assert.equal(game.jumpBuffer,0);assert.equal(game.attack,0);assert.equal(game.projectiles.length,0);assert.equal(game.state.room,0);assert.equal(game.paused,true);assert.equal(game.checkpoint.room,0);
 game.start(true);assert.deepEqual(game.state.shrines,[0,1]);assert.equal(game.state.room,0);
});
check('Travel rejects invalid destinations, midair use, and use away from a Sunwell',()=>{
 game.start();unlock(1);game.state.shrines=[0,1];game.setPaused(true);
 for(const target of [-1,24,1.5,NaN,Infinity,0])assert.equal(game.travelTo(target),false);
 place(0,500);assert.equal(game.travelTo(1),false);place(0,230,620);assert.equal(game.travelTo(1),false);
 place(0,230);game.player.grounded=false;assert.equal(game.travelTo(1),false);game.player.grounded=true;game.setPaused(false);assert.equal(game.travelTo(1),false);
});
check('Legacy saves preserve earned rewards and restart the newly expanded campaign safely',()=>{
 game.start();const old=JSON.parse(storage.get('luma-sunseed-v1'));Object.assign(old,{version:1,light:87,dash:true,doubleJump:true,heartLevel:1,magnet:true,seeds:[2,4,5],won:true,visited:[0,1,2,3,4,5],room:5,checkpoint:{room:5,x:1e12,y:-9999}});storage.set('luma-sunseed-v1',JSON.stringify(old));game.start(true);
 assert.equal(game.state.room,0);assert.equal(game.player.x,230);assert.deepEqual(game.state.shrines,[0]);assert.equal(game.state.light,87);assert.equal(game.state.maxHealth,6);assert.equal(game.state.magnet,true);assert.equal(game.state.doubleJump,true);assert.equal(game.state.won,false);assert.deepEqual(game.state.bosses,[]);
});

check('Lethal contact leaves no projectiles or pickups from the old room',()=>{
 game.start();unlock(1);place(1,310);tap('KeyE');place(2,1390);game.state.health=1;const e=game.world[2].enemies[0];e.home=1390;e.range=0;e.x=1390;
 game.projectiles=[{x:100,y:100,vx:0,vy:0,life:5,radius:8}];run(1/120);assert.equal(game.state.room,1);assert.equal(game.player.x,310);assert.equal(game.state.health,5);assert.equal(game.projectiles.length,0);
 place(2,910,545);game.state.health=1;game.state.doubleJump=false;game.projectiles=[{x:910,y:510,vx:0,vy:0,life:5,radius:8},{x:100,y:100,vx:0,vy:0,life:5,radius:8}];run(1/120);
 assert.equal(game.state.room,1);assert.equal(game.state.doubleJump,false);assert.equal(game.projectiles.length,0);
});
check('Campaign victory survives reload without repeating the finale',()=>{
 game.start();game.state.bosses=[0,1,2,3,4,5];game.state.won=true;game.save();game.start(true);assert.equal(game.state.won,true);assert.equal(game.state.canTravel,false);
});

check('Amber exploration beacon is reachable with actual double-jump movement',()=>{
 game.start();game.state.dash=true;game.state.doubleJump=true;game.broken.add(2);for(const e of game.world[2].enemies)e.hp=0;place(2,1310);
 game.input('ArrowRight',true);game.input('Space',true);run(.42);game.input('Space',false);run(1/120);game.input('Space',true);run(.72);game.keys.clear();
 tap('KeyE');assert.ok(game.state.beacons.includes('2:0'),`Beacon must be reachable by movement; player at ${game.player.x},${game.player.y}`);assert.equal(game.state.health,5);
});

check('Moonpetal exploration beacon is reachable by climbing the terraces',()=>{
 game.start();game.state.doubleJump=true;for(const e of game.world[4].enemies)e.hp=0;place(4,2120);
 const leap=(first,second)=>{game.input('Space',true);run(first);game.input('Space',false);run(1/120);game.input('Space',true);run(second);game.input('Space',false)};
 game.input('ArrowLeft',true);run(.4);leap(.42,.62);game.input('ArrowLeft',false);run(.65);
 assert.equal(game.player.y,445,`first terrace ${game.player.x},${game.player.y}`);
 game.input('ArrowLeft',true);leap(.42,.72);game.input('ArrowLeft',false);run(.65);
 tap('KeyE');assert.ok(game.state.beacons.includes('4:0'),`Moonpetal beacon ${game.player.x},${game.player.y}`);assert.equal(game.state.health,5);
});
check('Sunspire exploration beacon is reachable through the ruined platforms',()=>{
 game.start();game.state.doubleJump=true;for(const e of game.world[5].enemies)e.hp=0;place(5,300);
 const leap=(first,second)=>{game.input('Space',true);run(first);game.input('Space',false);run(1/120);game.input('Space',true);run(second);game.input('Space',false)};
 game.input('ArrowRight',true);game.input('Space',true);run(1);game.input('Space',false);game.input('ArrowRight',false);run(.08);assert.equal(game.player.y,565);
 game.input('ArrowRight',true);leap(.42,.72);game.input('ArrowRight',false);run(.65);assert.equal(game.player.y,435);
 game.input('ArrowRight',true);game.input('Space',true);run(1.3);game.input('Space',false);game.input('ArrowRight',false);run(.08);assert.equal(game.player.y,535);
 game.input('ArrowRight',true);leap(.42,.85);game.input('ArrowRight',false);run(.55);
 tap('KeyE');assert.ok(game.state.beacons.includes('5:0'),`Sunspire beacon ${game.player.x},${game.player.y}`);assert.equal(game.state.health,5);
});

check('Passage arrival resets combat feedback without inheriting the previous boss',()=>{
 game.start();place(0,2310);game.state.bossHealth=8;game.state.animation='dash';game.attackCooldown=.2;game.jumpBuffer=.1;tap('KeyE');
 assert.equal(game.state.room,6);assert.equal(game.state.bossHealth,null);assert.equal(game.state.animation,'idle');assert.equal(game.jumpBuffer,0);assert.equal(game.attackCooldown,0);
});

check('A slightly early strike queues the next combo without auto-attacking',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.hp=8;e.x=e.home=1510;e.range=0;
 strike();assert.equal(e.hp,7);run(.22);strike();assert.equal(e.hp,7);run(.15);assert.equal(e.hp,6);assert.equal(game.state.combo,2);run(.9);assert.equal(e.hp,6);
});
check('Pausing clears queued attacks before resuming',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.hp=8;e.x=e.home=1510;e.range=0;
 strike();run(.15);tap('KeyJ');game.setPaused(true);game.setPaused(false);run(.4);assert.equal(e.hp,7);
});
check('Strikes interrupt a sentry wind-up and create a safe stun window',()=>{
 game.start();place(1,1500);const e=game.world[1].enemies[1];e.x=e.home=1560;e.range=0;e.mode='windup';e.timer=.12;
 strike();assert.equal(e.hp,1);assert.equal(e.mode,'recover');game.player.x=e.x;run(.3);assert.equal(game.projectiles.length,0);assert.equal(game.state.health,5);
});
check('Campaign guardians guard preparation but take combo damage during recovery',()=>{
 game.start();prepare(0);place(8,1400);const e=game.world[8].enemies[0];e.x=e.home=1500;e.timer=0;
 run(.6);strike();assert.equal(e.hp,18);assert.ok(game.combatTexts.some(t=>t.text==='GUARDED'));
 e.mode='recover';e.timer=2;game.attackCooldown=0;game.comboWindow=0;strike();assert.equal(e.hp,17);run(.34);strike();run(.34);strike();assert.equal(e.hp,14);
});

check('Every guardian can be defeated through real attack and recovery cycles',()=>{
 for(let stage=0;stage<6;stage++){
  game.start();prepare(stage);place(campaign.stageRooms(stage)[3],1400);const e=game.world[game.state.room].enemies[0];e.timer=0;
  // Isolate counterplay from dodging; hazards and damage are checked separately.
  game.invincible=1000;let cycles=0;
  while(e.hp>0&&cycles++<20){let elapsed=0;while(e.mode!=='recover'&&elapsed<7){run(1/120);elapsed+=1/120}assert.equal(e.mode,'recover');game.player.x=e.x-90;game.player.y=705;game.player.face=1;game.player.vx=0;game.comboWindow=0;game.attackCooldown=0;
   for(let hit=0;hit<3&&e.hp>0;hit++){strike();run(.34)}
   if(e.hp>0)while(e.mode==='recover')run(1/120);
  }
  assert.equal(e.hp,0,`Guardian ${stage} complete`);assert.ok(game.state.bosses.includes(stage));assert.equal(game.projectiles.length,0);assert.equal(game.bossHazards.length,0);assert.equal(game.state.health,5);assert.ok(cycles>=4,'A guardian requires several counter windows');
 }
});

check('Projectiles hit terrain, including when a long step crosses an entire ledge',()=>{
 game.start();place(5,1720,705);game.projectiles=[{x:1840,y:345,vx:0,vy:235,life:3,radius:10}];game.updateProjectiles(.5);assert.equal(game.projectiles.length,0);assert.equal(game.state.health,5);
 place(0,350);game.projectiles=[{x:500,y:520,vx:0,vy:500,life:2,radius:8}];game.updateProjectiles(.4);assert.equal(game.projectiles.length,0);
});
check('Awakening a creature grants its light only once and removes contact damage',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.x=e.home=1510;e.range=0;const light=game.state.light;
 strike();run(.34);strike();assert.equal(e.hp,0);const reward=game.state.light;assert.ok(reward>=light+3);game.player.x=e.x;run(.34);strike();assert.equal(game.state.light,reward);assert.equal(game.state.health,5);
});

check('An early press outside the buffer window does not fire a late surprise strike',()=>{
 game.start();place(0,1450);const e=game.world[0].enemies[0];e.hp=8;e.x=e.home=1510;e.range=0;strike();run(.04);strike();run(.5);assert.equal(e.hp,7);
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
 unlock(1);game.state.shrines.push(1);place(0,230);game.setPaused(true);assert.equal(game.travelTo(1),true);assert.equal(game.state.health,7);game.start(true);assert.equal(game.state.room,1);assert.equal(game.state.heartLevel,2);assert.equal(game.state.health,7);assert.equal(game.state.magnet,true);assert.equal(game.state.light,20);
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
 const seed=game.world[2].beacon;for(const e of game.world[2].enemies)e.hp=0;game.world[2].motes=[];place(2,seed.x-95,seed.y+35);run(.01);assert.equal(game.state.seeds.includes(2),false);
});
check('Old sunseeds cannot bypass campaign bosses or trigger the former finale',()=>{
 game.start();game.state.seeds=[2,4,5];place(0,230);tap('KeyE');assert.equal(game.state.won,false);assert.equal(game.state.heartLevel,0);assert.equal(game.state.magnet,false);assert.equal(game.state.discoveries.length,0);
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
check('Gentle Journey extends boss warnings and recovery and slows their projectiles',()=>{
 game.setPreferences({...prefs.defaultPreferences(),assist:true});game.start();prepare(1);place(11,1400);game.invincible=100;const e=game.world[11].enemies[0];e.timer=0;
 game.updateEnemies(.51);assert.equal(e.windup,1.3*1.45);game.updateEnemies(1.4);assert.equal(e.mode,'windup');assert.equal(game.projectiles.length,0);game.updateEnemies(.5);assert.equal(e.mode,'attack');game.updateEnemies(.3);assert.equal(e.mode,'recover');assert.equal(e.timer,1.85*1.4);assert.equal(game.projectiles.length,5);assert.ok(Math.abs(Math.hypot(game.projectiles[0].vx,game.projectiles[0].vy)-225*.8)<.001);
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

check('Every stage requires its boss victory before the next stage can open',()=>{
 for(let stage=0;stage<5;stage++){
  game.start();prepare(stage);const arena=campaign.stageRooms(stage)[3];place(arena,2310);tap('KeyE');assert.equal(game.state.room,arena);
  game.state.shrines.push(stage+1);place(arena,230);game.state.shrines.push(arena);game.setPaused(true);assert.equal(game.travelTo(stage+1),false);game.setPaused(false);
  place(arena,1440);const e=game.world[arena].enemies[0];e.hp=1;e.mode='recover';e.timer=2;game.strikeEnemy(e);
  place(arena,2310);tap('KeyE');assert.equal(game.state.room,stage+1);assert.equal(game.state.won,false);
 }
});
check('Trail beacons require nearby interaction, reward once, and survive death and reload',()=>{
 game.start();const b=game.world[0].beacon;place(0,b.x-150,b.y+35);tap('KeyE');assert.deepEqual(game.state.beacons,[]);
 place(0,b.x,b.y+35);run(.01);assert.deepEqual(game.state.beacons,[]);game.world[0].motes=[];const light=game.state.light;tap('KeyE');assert.deepEqual(game.state.beacons,['0:0']);assert.equal(game.state.light,light+10);tap('KeyE');assert.equal(game.state.light,light+10);
 game.state.health=1;game.invincible=0;game.hurt(false);assert.deepEqual(game.state.beacons,['0:0']);game.start(true);assert.deepEqual(game.state.beacons,['0:0']);assert.equal(game.state.light,light+10);
});
check('Campaign saves cannot resume or travel into a locked future stage',()=>{
 game.start();const save=JSON.parse(storage.get('luma-sunseed-v1'));Object.assign(save,{room:23,checkpoint:{room:23,x:230,y:705},bosses:[5,2,0,0],beacons:['5:2','0:0','nonsense'],shrines:[0,23,4],visited:[0,23,4],won:true});storage.set('luma-sunseed-v1',JSON.stringify(save));game.start(true);
 assert.equal(game.state.room,0);assert.deepEqual(game.state.bosses,[0]);assert.deepEqual(game.state.beacons,['0:0']);assert.equal(game.state.won,false);assert.deepEqual(game.state.shrines,[0]);assert.deepEqual(game.state.visited,[0]);
 game.setPaused(true);game.state.shrines.push(23);assert.equal(game.travelTo(23),false);
});
check('Losing a boss battle resets its health and clears the arena attacks',()=>{
 game.start();prepare(0);place(8,1400);const e=game.world[8].enemies[0];e.hp=3;e.mode='attack';e.timer=.3;game.encounter=8;game.bossHazards=[{x:1400,timer:0,life:1,w:80,fired:true}];game.state.health=1;game.hurt(false);
 assert.equal(game.state.room,0);assert.equal(e.hp,18);assert.equal(e.mode,'patrol');assert.equal(game.encounter,null);assert.equal(game.bossHazards.length,0);assert.equal(game.projectiles.length,0);assert.equal(game.state.bosses.length,0);assert.equal(game.state.beacons.length,3);
});
check('An active boss arena seals retreat and cannot open a Sunwell menu',()=>{
 game.start();prepare(0);place(8,700);run(.7);assert.equal(game.encounter,8);game.player.x=400;run(.01);assert.ok(game.player.x>=590);assert.equal(game.openSunwell(),false);
});
check('Boss victories heal, save a checkpoint, reward once, and persist through reload',()=>{
 game.start();prepare(0);place(8,1440);const e=game.world[8].enemies[0];e.hp=1;e.mode='recover';e.timer=2;game.state.health=2;const light=game.state.light;strike();assert.equal(e.hp,0);assert.equal(game.state.light,light+40);assert.equal(game.state.health,5);assert.equal(game.checkpoint.room,8);
 run(.4);strike();assert.equal(game.state.light,light+40);game.start(true);assert.equal(game.world[8].enemies[0].hp,0);assert.equal(game.state.room,8);assert.deepEqual(game.state.bosses,[0]);
});
check('Thorns and swinging obstacles cause damage; dash passes safely through hazards',()=>{
 game.start();place(6,1150);game.updateHazards(.01);assert.equal(game.state.health,4);place(6,1150);game.state.health=5;game.dashTime=.15;game.updateHazards(.01);assert.equal(game.state.health,5);
 const h=game.world[15].hazards.find(h=>h.kind==='swing');game.state.time=0;const q=game.hazardShape(h);place(15,q.x+20,q.y+40);game.updateHazards(.01);assert.equal(game.state.health,4);
});
check('Timed vents have a resting, warning, active, and safe resting interval',()=>{
 game.start();const h=game.world[9].hazards[0];
 for(const [fraction,warning,active] of [[.1,false,false],[.35,true,false],[.6,false,true],[.9,false,false]]){game.state.time=h.period*fraction;assert.equal(game.hazardShape(h).warning,warning);assert.equal(game.hazardShape(h).active,active)}
 game.state.time=h.period*.35;place(9,h.x+25);game.updateHazards(.01);assert.equal(game.state.health,5);
 game.state.time=h.period*.6;game.updateHazards(.01);assert.equal(game.state.health,4);
});
check('Moving platforms carry standing players horizontally and vertically',()=>{
 for(const room of [6,9]){game.start();const plat=game.world[room].platforms.find(p=>p.moving);place(room,plat.x+plat.w/2,plat.y);const before={...game.player};game.state.time=.1;game.updatePlatforms(.1);assert.equal(game.player.y,plat.y);assert.equal(game.player.x,plat.x+plat.w/2);assert.ok(Math.abs(game.player[plat.moving.axis]-before[plat.moving.axis])>1);run(.01);assert.equal(game.player.grounded,true)}
});
check('Boss charge, slam, fan, spiral, rain, and eruption attacks all release from committed warnings',()=>{
 const examples=[['charge',0,0],['slam',0,1],['fan',1,0],['rain',1,1],['eruption',2,0],['spiral',3,0]];
 for(const [pattern,stage,cycle] of examples){game.start();prepare(stage);place(campaign.stageRooms(stage)[3],1400);game.invincible=100;const e=game.world[game.state.room].enemies[0];e.cycle=cycle;e.timer=0;game.updateBoss(e,.6);assert.equal(e.pattern,pattern);assert.equal(e.mode,'windup');const aim=e.aimX;game.player.x=1900;game.updateBoss(e,1.31);assert.equal(e.aimX,aim);assert.equal(e.mode,'attack');
  if(['fan','spiral','slam'].includes(pattern))assert.ok(game.projectiles.length>0);if(['rain','eruption'].includes(pattern)){assert.equal(game.bossHazards.length,3);assert.ok(game.bossHazards.every(h=>h.timer>0));game.player.x=aim;game.player.y=705;game.invincible=0;game.updateHazards(.5);assert.equal(game.state.health,5);game.updateHazards(.6);assert.equal(game.state.health,4)}
  if(pattern==='charge'){const x=e.x;game.updateBoss(e,.3);assert.notEqual(e.x,x)}
 }
});
check('New journeys clear campaign completion while retaining device preferences',()=>{
 game.setPreferences({...prefs.defaultPreferences(),assist:true});game.start();assert.deepEqual(game.state.bosses,[]);assert.deepEqual(game.state.beacons,[]);assert.equal(game.state.won,false);assert.equal(game.getPreferences().assist,true);game.setPreferences(prefs.defaultPreferences());
});

/** Drive authored routes through actual physics. Only enemies/hazards are disabled to isolate geometry. */
function walkToward(x,seconds=3){
 for(let step=0;step<seconds*120;step++){const delta=x-game.player.x;game.input('ArrowRight',delta>18);game.input('ArrowLeft',delta< -18);run(1/120);if(Math.abs(delta)<22&&Math.abs(game.player.vx)<15)break}game.keys.clear();run(.1);
}
function jumpTo(plat,double=false){
 const current=game.world[game.state.room].platforms.find(p=>Math.abs(p.y-game.player.y)<3&&game.player.x>p.x-18&&game.player.x<p.x+p.w+18);
 assert.ok(current,'Jump starts on a real platform');const center=()=>plat.x+plat.w/2;
 walkToward(Math.max(current.x+30,Math.min(current.x+current.w-30,center())),4);
 game.input('Space',true);
 for(let step=0;step<260;step++){
  if(double&&step===50)game.input('Space',false);if(double&&step===52)game.input('Space',true);
  const delta=center()-game.player.x;game.input('ArrowRight',delta>22);game.input('ArrowLeft',delta< -22);run(1/120);
  if(step>30&&game.player.grounded&&Math.abs(game.player.y-plat.y)<3&&game.player.x>plat.x&&game.player.x<plat.x+plat.w)break;
 }
 game.keys.clear();run(.1);assert.ok(game.player.grounded&&Math.abs(game.player.y-plat.y)<3,`Land on ${plat.x},${plat.y}; got ${game.player.x},${game.player.y}`);
}
check('All six traversal trials have physically playable routes to their beacons',()=>{
 for(let stage=0;stage<6;stage++){
  game.start();unlock(stage);game.state.doubleJump=stage>=2;game.state.dash=stage>=1;const room=campaign.stageRooms(stage)[1],r=game.world[room];r.enemies=[];r.hazards=[];place(room,230);
  // Trials keep three ground islands followed by their hand-authored stepping stones.
  const target=r.platforms.findIndex(p=>r.beacon.x>=p.x&&r.beacon.x<=p.x+p.w&&Math.abs(p.y-r.beacon.y-40)<3);
  for(const plat of r.platforms.slice(0,target+1).filter(p=>p.y<700))jumpTo(plat,stage>=2);
  walkToward(r.beacon.x,1);tap('KeyE');assert.ok(game.state.beacons.includes(`${stage}:1`),`Stage ${stage} trial beacon`);for(const plat of r.platforms.slice(target+1).filter(p=>p.y<700))jumpTo(plat,stage>=2);walkToward(2310,8);run(.6);assert.ok(Math.abs(game.player.x-2310)<30);assert.equal(game.player.y,705);assert.equal(game.state.health,5);
 }
});
check('All gauntlet terraces and their high beacon are reachable before the boss',()=>{
 for(let stage=0;stage<6;stage++){
  game.start();unlock(stage);game.state.doubleJump=stage>=2;const room=campaign.stageRooms(stage)[2],r=game.world[room];r.enemies=[];r.hazards=[];place(room,230);
  for(const plat of r.platforms.slice(1,4))jumpTo(plat,stage>=2);
  walkToward(r.beacon.x,1);tap('KeyE');assert.ok(game.state.beacons.includes(`${stage}:2`));assert.equal(game.state.health,5);
 }
});

check('Early exploration beacons are reachable with the movement available at that stage',()=>{
 for(const stage of [0,1,3]){game.start();unlock(stage);game.state.doubleJump=stage>=2;const r=game.world[stage];r.enemies=[];place(stage,230);const target=r.platforms.findIndex(p=>r.beacon.x>p.x&&r.beacon.x<p.x+p.w&&Math.abs(p.y-r.beacon.y-40)<3);for(const plat of r.platforms.slice(0,target+1).filter(p=>p.y<700))jumpTo(plat,stage>=2);walkToward(r.beacon.x,1);tap('KeyE');assert.ok(game.state.beacons.includes(`${stage}:0`));assert.equal(game.state.health,5)}
});

check('The first guardian is beatable with five hearts, ordinary jumps, and no invulnerability override',()=>{
 game.start();prepare(0);place(8,1400);const e=game.world[8].enemies[0];let jumpHeld=0,strikeHeld=false;
 for(let frame=0;frame<120*180&&e.hp>0&&game.state.room===8;frame++){
  jumpHeld=Math.max(0,jumpHeld-1/120);
  if(e.mode==='windup'&&e.timer<.2&&game.player.grounded)jumpHeld=.7;
  game.input('Space',jumpHeld>0);
  let goal=e.mode==='recover'?e.x:e.x-100;
  if(game.player.grounded&&game.player.y<705){const plat=game.world[8].platforms.find(p=>p.y===game.player.y&&game.player.x>=p.x&&game.player.x<=p.x+p.w);if(plat)goal=plat.x-45}
  const delta=goal-game.player.x;game.input('ArrowRight',delta>15);game.input('ArrowLeft',delta< -15);
  const strike=e.mode==='recover'&&Math.abs(e.x-game.player.x)<130&&Math.abs(e.y-game.player.y+35)<95&&game.attackCooldown<=0;
  if(strike&&!strikeHeld){game.input('KeyJ',true);strikeHeld=true}else{game.input('KeyJ',false);strikeHeld=false}
  run(1/120);
 }
 assert.equal(e.hp,0,`Briarhorn should be beatable; HP ${e.hp}, Luma ${game.state.health}, room ${game.state.room}`);assert.ok(game.state.bosses.includes(0));assert.equal(game.state.dash,false);assert.equal(game.state.doubleJump,false);
});

check('Melee damage follows anticipation and ends before visual recovery',()=>{
 game.start();place(0,1450);game.invincible=10;
 const e=game.world[0].enemies[0];e.hp=8;e.x=e.home=1510;e.y=660;e.range=0;
 tap('KeyJ');assert.equal(e.hp,8,'No damage on the anticipation pose');run(.025);assert.equal(e.hp,8);run(.04);assert.equal(e.hp,7);
 game.hitStop=0;game.attack=.055;game.swingHits.clear();const hp=e.hp;run(.025);assert.equal(e.hp,hp,'The recovery pose cannot deal another hit');
});
check('Dash afterimages and impact effects are bounded, reduced-motion aware, and cleared on travel',()=>{
 game.start();place(0,300);const v=game.visuals;
 for(let i=0;i<100;i++){v.emit('hit',400,600);v.update(.01,game.player,true,false)}
 assert.ok(v.impacts.length<=32);assert.ok(v.ghosts.length<=6);assert.ok(v.ghosts.length>0);
 v.update(.01,game.player,true,true);assert.equal(v.ghosts.length,0);game.settlePlayer(230);assert.equal(v.impacts.length,0);assert.equal(v.ghosts.length,0);
});
const {CombatVisuals}=await import(visualsURL);
check('Painted sprite poses use valid source rectangles across combos, movement, creatures, and bosses',()=>{
 const v=new CombatVisuals(),draws=[];
 const recording=new Proxy({...context,drawImage:(...args)=>draws.push(args),globalAlpha:1},{get:(o,k)=>o[k]??noop,set:(o,k,value)=>{o[k]=value;return true}});
 v.combat.naturalWidth=1536;v.movement.naturalWidth=1254;v.creatures.naturalWidth=2048;v.bosses.naturalWidth=1920;
 for(let combo=1;combo<=3;combo++)for(const time of [.29,.21,.14,.04])assert.equal(v.hero(recording,{x:0,y:0,vx:0,vy:0,face:1,grounded:true},time,combo,false,0,false),true);
 for(const [grounded,vy,dash] of [[true,0,false],[false,-300,false],[false,300,false],[false,0,true]])v.hero(recording,{x:0,y:0,vx:0,vy,face:1,grounded},0,0,dash,0,false);
 for(const kind of ['drifter','charger','sentry','keeper'])for(const mode of ['patrol','windup','attack','recover'])v.enemy(recording,{x:0,y:0,kind,hp:2,hit:0,phase:0,mode,timer:.5,windup:1,direction:1,defeat:0},1,false);
 for(let boss=0;boss<6;boss++)v.enemy(recording,{x:0,y:0,kind:'keeper',boss,hp:18,hit:0,phase:0,mode:'attack',timer:.5,windup:1,direction:1,defeat:0},1,false);
 for(const [image,sx,sy,sw,sh,dx,dy,dw,dh] of draws){const height=image===v.combat?1024:image===v.bosses?1280:image.naturalWidth;assert.ok([sx,sy,sw,sh,dx,dy,dw,dh].every(Number.isFinite));assert.ok(sx>=0&&sy>=0&&sw>0&&sh>0&&sx+sw<=image.naturalWidth+.001&&sy+sh<=height+.001);}
 assert.ok(draws.length>40);
});
const WorkingImage=globalThis.Image;
globalThis.Image=class{naturalWidth=0;set src(v){queueMicrotask(()=>this.onerror?.())}};
const missingArt=new CombatVisuals();await missingArt.ready;globalThis.Image=WorkingImage;
check('Failed art downloads resolve safely and retain the original renderer fallback',()=>{
 assert.equal(missingArt.hero(context,game.player,.15,1,false,0,false),false);
 assert.equal(missingArt.enemy(context,game.world[0].enemies[0],0,false),false);
 assert.equal(missingArt.projectile(context,{x:0,y:0,vx:1,vy:0,radius:8},0),false);
});

game.destroy();console.log(`\n${tests} gameplay checks passed.`);
