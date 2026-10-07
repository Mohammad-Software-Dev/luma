// Development-only review harness; never writes adventure progress.
import {Game} from '../app/game';import {stageRooms} from '../app/campaign';
let game:any,runId=0;
const canvas=document.querySelector('canvas')!,result=document.querySelector('#result')!;
async function load(stage=0,boss=false){runId++;game?.destroy();const proto=Game.prototype as any;proto.save=()=>{};proto.readSave=()=>null;game=new Game(canvas,()=>{});await game.ready;game.start();game.setMuted(true);game.state.room=boss?stageRooms(stage)[3]:stage;game.state.bosses=Array.from({length:stage},(_,i)=>i);game.state.dash=true;game.state.doubleJump=true;game.state.message='';game.player={x:boss?1100:720,y:705,vx:0,vy:0,face:1,grounded:true};game.camera=300;game.invincible=600;await game.loadBackdrop(stage);game.publish();game.setPaused(false);canvas.focus();result.textContent=`Updated · Stage ${stage+1}${boss?' boss':''}`;}
async function benchmark(native=false,boss=false,stage=boss?5:0){await load(stage,boss);if(boss&&stage===1){game.player.x=1015;game.world[11].enemies[0].cycle=2;game.input('Space',true);}if(boss&&stage===2){game.player.x=1000;game.world[14].enemies[0].cycle=1;}if(native){canvas.width=2560;canvas.height=1440;game.scale=1440/810;game.viewport=1440;}const id=runId;cancelAnimationFrame(game.raf);game.paused=true;game.ctx.canvas.width=canvas.width;let last=0,frames:number[]=[],cpu:number[]=[],renders=0;function frame(now:number){if(id!==runId)return;if(last&&renders>30)frames.push(now-last);last=now;game.elapsed+=1/60;game.camera=300+Math.sin(renders/110)*220;const before=performance.now();if(boss){game.update(1/120);game.update(1/120);}game.render();const elapsed=performance.now()-before;if(renders>30)cpu.push(elapsed);renders++;if(renders<(boss?510:210))requestAnimationFrame(frame);else{const quantile=(a:number[],p:number)=>[...a].sort((x,y)=>x-y)[Math.floor(a.length*p)];const data={version:'updated',scenario:boss?(stage===1?'Tidewing combat':stage===2?'Amberback combat':'Solwarden combat'):'glade camera sweep',width:canvas.width,height:canvas.height,dpr:devicePixelRatio,frames:frames.length,frameMedian:quantile(frames,.5),frameP95:quantile(frames,.95),renderMedian:quantile(cpu,.5),renderP95:quantile(cpu,.95),over25ms:frames.filter(n=>n>25).length};result.textContent=JSON.stringify(data,null,2);}}requestAnimationFrame(frame);}
function button(text:string,fn:()=>void){const b=document.createElement('button');b.textContent=text;b.onclick=fn;document.querySelector('#controls')!.appendChild(b)}
button('Benchmark updated',()=>void benchmark(false));button('Benchmark updated native',()=>void benchmark(true));button('Benchmark boss',()=>void benchmark(false,true));button('Benchmark Tidewing',()=>void benchmark(false,true,1));button('Benchmark Amberback',()=>void benchmark(false,true,2));
for(let i=0;i<6;i++)button(`Stage ${i+1}`,()=>void load(i));for(let i=0;i<6;i++)button(`Boss ${i+1}`,()=>void load(i,true));
button('Ember Veins seals',()=>void loadAmberTrial());
button('Freeze crystal crash',()=>void freezeCrash());
button('Spillway current',()=>void loadSpillway());
button('Tidewing flood',()=>void loadSurge());
button('Freeze flood preview',()=>void freezeSurge());
button('Ride / release current',()=>{game.input('Space',!game.keys.has('Space'));canvas.focus()});
button('Pause',()=>game.setPaused(!game.paused));button('Low health phase',()=>{const e=game.world[game.state.room].enemies.find((e:any)=>e.boss!==undefined);if(e)e.hp=Math.ceil(e.maxHp*.3)});
button('Pan',()=>{game.camera=game.camera>400?250:850;game.render()});
void load();

async function loadSpillway(){await load(1);game.state.room=9;game.settlePlayer(700);game.state.doubleJump=false;game.publish();result.textContent='Spillway · hold jump to rise, release to land. No double jump.';}
async function loadSurge(){await load(1,true);game.player.x=1010;const e=game.world[11].enemies[0];e.cycle=2;e.timer=0;game.publish();result.textContent='Tidewing · flood rehearsal';}

async function freezeSurge(){await loadSurge();cancelAnimationFrame(game.raf);game.input('Space',true);for(let i=0;i<120*4;i++){game.elapsed+=1/120;game.update(1/120);}game.paused=true;game.render();result.textContent='Tidewing flood · paused after four seconds of real simulation';canvas.focus();}

async function loadAmberTrial(){await load(2);game.state.room=12;game.settlePlayer(920,415);game.publish();result.textContent='Ember Veins · dash through both crystal seals';canvas.focus();}
async function freezeCrash(){await load(2,true);cancelAnimationFrame(game.raf);game.player.x=1000;const e=game.world[14].enemies[0];e.cycle=1;e.timer=0;for(let i=0;i<120*6;i++){game.elapsed+=1/120;game.update(1/120);if(game.amberRegrowth.get(1080)>0)break;}game.invincible=0;game.paused=true;game.render();result.textContent='Amberback · paused at a real charge impact';canvas.focus();}
