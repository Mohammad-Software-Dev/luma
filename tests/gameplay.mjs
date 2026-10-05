import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/game.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.Image=class {complete=false;naturalWidth=0;set src(v){queueMicrotask(()=>this.onload?.())}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
let registered;document.modelContext={registerTool:async(t)=>{registered=t}};
const gradient={addColorStop:noop};const context=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>{o[k]=v;return true}});
const {Game,gamepadButtons}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const game=new Game({getContext:()=>context,getBoundingClientRect:()=>({width:1440,height:810})},noop);await game.ready;
const run=(seconds)=>{for(let i=0;i<Math.round(seconds*120);i++){game.elapsed+=1/120;game.update(1/120)}};
const tap=k=>{game.input(k,true);run(1/120);game.input(k,false)};
const place=(room,x,y=705)=>{game.state.room=room;game.state.roomName=game.world[room].name;game.player={x,y,vx:0,vy:0,face:1,grounded:true};game.coyote=.12;game.invincible=0;game.dashCooldown=0;game.dashTime=0;game.usedDouble=false;game.hitStop=0;game.knockback=0;game.comboWindow=0;game.attack=0;game.attackCooldown=0;game.padKeys.clear();game.padPressed.clear();game.projectiles=[];game.keys.clear();game.pressed.clear()};
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
 game.updateEnemies(.3);assert.equal(e.x,x);game.player.x=2300;game.updateEnemies(.41);assert.equal(e.mode,'attack');game.updateEnemies(.15);assert.ok(e.x<x);game.updateEnemies(.4);assert.equal(e.mode,'recover');
});
check('Sentries aim first and fire finite projectiles',()=>{
 place(1,1450);const e=game.world[1].enemies[1];e.hp=2;e.x=e.home;e.mode='patrol';e.timer=0;
 game.updateEnemies(.01);assert.equal(e.mode,'windup');assert.equal(game.projectiles.length,0);game.updateEnemies(.9);assert.equal(game.projectiles.length,1);assert.equal(e.mode,'recover');game.updateProjectiles(4);assert.equal(game.projectiles.length,0);
});
check('Keeper commits to telegraphs and changes its attack below half health',()=>{
 place(5,1700,400);const e=game.world[5].enemies[2];e.hp=8;e.x=e.home;e.timer=0;e.mode='patrol';game.invincible=10;
 game.updateEnemies(.01);game.updateEnemies(1.1);assert.equal(game.projectiles.length,3);
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

game.destroy();console.log(`\n${tests} gameplay checks passed.`);
