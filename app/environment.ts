import { roomComposition, sceneryPlans } from './scenery';
import { terrainFrames, terrainTops, propFrames } from './environment-atlas';

type Platform = {x:number;y:number;w:number;h:number;moving?:unknown};
const palettes = [
 ['#284d38','#698654','#d8dba0'],['#234a50','#639d97','#c8e5c9'],['#4f3d35','#a0864c','#f3d092'],
 ['#224d3a','#70a575','#d9eab2'],['#393a58','#8b90b8','#e3d3f2'],['#4f4939','#a39b6b','#f5e0aa'],
];
// Stable selections: scenery must not flicker or change as moving platforms travel.
export function terrainVariant(stage:number,room:number,index:number,p?:Platform){
 const plan=sceneryPlans[stage];
 if(!p||p.h>=100)return plan.ground;
 if(p.moving)return stage===3?1:plan.raised;
 if(stage===0&&p.y<430)return 1; // Upper glade paths are boughs, low paths are stone.
 if(stage===4&&p.w>=250)return 5; // Wide sanctuary terraces are the old temple foundations.
 return plan.raised;
}
export function parallaxOffset(camera:number,depth:number,reduced:boolean){return reduced?0:camera*depth;}

/** Painted scenery is independent of collision geometry. All caches have fixed bounds. */
export class Environment {
 private terrain=new Image();private props=new Image();private foliage=new Image();
 private plants=new Map<number,HTMLCanvasElement>();
 private platforms=new Map<string,HTMLCanvasElement>();private cachedRoom=-1;
 private planes:HTMLCanvasElement[]=[];private planeKey='';
 private makeCanvas(w:number,h:number){if(typeof document.createElement!=='function')return null;const canvas=document.createElement('canvas');canvas.width=Math.ceil(w);canvas.height=Math.ceil(h);return canvas;}
 destroy(){for(const c of [...this.platforms.values(),...this.planes,...this.plants.values()]){c.width=0;c.height=0;}this.platforms.clear();this.plants.clear();this.planes=[];this.planeKey='';}

 readonly ready:Promise<void>;
 constructor(){this.ready=Promise.all([
  this.load(this.terrain,'terrain'),this.load(this.props,'props'),this.load(this.foliage,'foliage'),
 ]).then(()=>{});}
 private load(image:HTMLImageElement,name:string){return new Promise<void>(resolve=>{image.onload=()=>resolve();image.onerror=()=>resolve();image.src=`/art/environment-${name}.webp`;});}
 private prop(c:CanvasRenderingContext2D,index:number,x:number,base:number,w:number,h?:number,flip=false){
  if(!this.props.naturalWidth)return false;
  const [sx,sy,sw,sh]=propFrames[index];c.save();c.translate(x,base);if(flip)c.scale(-1,1);c.drawImage(this.props,sx,sy,sw,sh,-w/2,-(h??w*sh/sw),w,h??w*sh/sw);c.restore();return true;
 }
 private plant(c:CanvasRenderingContext2D,index:number,x:number,y:number,w:number,h:number,stage:number,alpha=1){
  if(!this.foliage.naturalWidth)return;
  let atlas=this.plants.get(stage);
  if(!atlas){atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;const a=atlas.getContext('2d')!;a.drawImage(this.foliage,0,0);a.globalCompositeOperation='source-in';const g=a.createLinearGradient(0,0,0,512);g.addColorStop(0,palettes[stage][2]);g.addColorStop(.45,palettes[stage][1]);g.addColorStop(1,palettes[stage][0]);a.fillStyle=g;a.fillRect(0,0,1024,512);this.plants.set(stage,atlas);}
  c.save();c.globalAlpha*=alpha;c.drawImage(atlas,(index%4)*256,Math.floor(index/4)*256,256,256,x-w/2,y-h,w,h);c.restore();
 }
 private buildPlanes(stage:number,part:number){
  const key=`${stage}:${part}`;if(this.planeKey===key)return;
  if(!this.props.naturalWidth||!this.foliage.naturalWidth)return;
  for(const p of this.planes){p.width=0;p.height=0;}this.planes=[];
  const plan=roomComposition(stage,part);
  for(let layer=0;layer<3;layer++){
   const canvas=this.makeCanvas(3200,850);if(!canvas)return;const a=canvas.getContext('2d')!;
   // Filtering is paid once when entering a room, never on the animation path.
   if(layer<2){a.filter=layer===0?'saturate(.45) brightness(.78)':'saturate(.72) brightness(.68)';
    for(const q of layer===0?plan.far:plan.middle)this.prop(a,q.kind,q.x+350,q.base,q.height*(q.kind===1?.52:1.1),q.height,q.flip);
    a.filter='none';
   }else{
    a.filter='brightness(.36) saturate(.7)';
    // Hanging edge vines form a near plane above the route, not across jumps.
    if(stage!==2&&stage!==5)for(const x of [180,1630,2760]){a.strokeStyle=palettes[stage][0];a.lineWidth=4;a.beginPath();a.moveTo(x,0);a.bezierCurveTo(x+24,24,x-16,53,x+8,88);a.stroke();a.save();a.translate(x+9,48);a.rotate(Math.PI);this.plant(a,6,0,0,36,60,stage);a.restore();}
    for(const x of [80,760,1470,2310]){this.plant(a,stage===1?1:stage===2?6:7,x+350,834,150,85,stage);this.plant(a,0,x+425,838,115,65,stage);}
   }
   this.planes.push(canvas);
  }this.planeKey=key;
 }
 background(c:CanvasRenderingContext2D,stage:number,camera:number,width:number,t:number,reduced:boolean,room=stage){
  const part=room<6?0:(room-6)%3+1;this.buildPlanes(stage,part);
  c.save();
  for(let i=0;i<2;i++){if(!this.planes[i])continue;c.globalAlpha=i===0?.28:.78;c.drawImage(this.planes[i],-350-parallaxOffset(camera,i===0?.16:.52,reduced),0);}
  c.restore();
  const weather=sceneryPlans[stage].weather,shift=parallaxOffset(camera,.32,reduced);
  // Sparse, stage-specific motion expresses depth without covering the route.
  c.save();c.globalAlpha=.2;c.strokeStyle=stage===2?'#ffc680':stage===4?'#d8c5ff':'#e2f0c4';c.fillStyle=c.strokeStyle;c.lineWidth=1.4;
  if(weather==='water'){
   c.globalAlpha=.18;for(const anchor of [500,1750])for(let i=0;i<9;i++){const x=anchor-shift+(i%3)*12,y=230+(reduced?i*45:(t*90+i*71)%420);c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+7,y+25,x+2,y+48);c.stroke();}
  }else for(let i=0;i<9;i++){const x=160+i*257-shift+(reduced?0:Math.sin(t*.22+i)*28),y=150+(i*89)%490+(reduced?0:Math.sin(t*.4+i*2)*22);if(x<0||x>width)continue;c.beginPath();c.ellipse(x,y,weather==='leaves'?5:2,weather==='leaves'?2:2,reduced?i:t*.35+i,0,Math.PI*2);c.fill();}
  c.restore();
 }
 foreground(c:CanvasRenderingContext2D,stage:number,camera:number,width:number,t:number,reduced:boolean){
  if(!this.planes[2])return;c.save();c.globalAlpha=.9;c.drawImage(this.planes[2],-350-parallaxOffset(camera,1.16,reduced),0);c.restore();
 }
 platform(c:CanvasRenderingContext2D,p:Platform,stage:number,room:number,index:number){
  if(this.cachedRoom!==room){for(const a of this.platforms.values()){a.width=0;a.height=0;}this.platforms.clear();this.cachedRoom=room;}
  const key=`${index}:${p.w}:${p.h}`;
  let surface=this.platforms.get(key);
  if(!surface&&this.terrain.naturalWidth&&this.foliage.naturalWidth&&this.platforms.size<24){
   const a=this.makeCanvas(p.w+32,380);if(a){this.paintPlatform(a.getContext('2d')!,{...p,x:16,y:110},stage,room,index,terrainVariant(stage,room,index,p));this.platforms.set(key,a);surface=a;}
  }
  if(surface){c.drawImage(surface,p.x-16,p.y-110);return;}this.paintPlatform(c,p,stage,room,index);
 }
 private paintPlatform(c:CanvasRenderingContext2D,p:Platform,stage:number,room:number,index:number,variant=terrainVariant(stage,room,index,p)){
  const [sx,sy,sw,sh]=terrainFrames[variant],top=terrainTops[variant];
  if(!this.terrain.naturalWidth){
   c.save();c.fillStyle=palettes[stage][0];c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+p.w,p.y);c.bezierCurveTo(p.x+p.w*.85,p.y+p.h,p.x+p.w*.3,p.y+p.h*1.5,p.x,p.y+15);c.closePath();c.fill();c.restore();return;
  }
  if(p.h<100){
   const scale=p.w/sw,height=sh*scale;
   c.drawImage(this.terrain,sx,sy,sw,sh,p.x,p.y-top*scale,p.w,height);
   if(p.moving){this.plant(c,6,p.x+p.w*.18,p.y+height*.75,23,48,stage,.8);}
  }else{
   // Solid earth below the walkable top, irregular exposed cliff ends.
   c.save();c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+p.w,p.y);c.bezierCurveTo(p.x+p.w-5,p.y+90,p.x+p.w-29,p.y+120,p.x+p.w-12,p.y+180);c.lineTo(p.x+18,p.y+190);c.bezierCurveTo(p.x+35,p.y+120,p.x-5,p.y+70,p.x,p.y);c.closePath();c.clip();
   const gradient=c.createLinearGradient(0,p.y,0,p.y+180);gradient.addColorStop(0,palettes[stage][0]);gradient.addColorStop(1,'#091b20');c.fillStyle=gradient;c.fillRect(p.x,p.y,p.w,200);
   for(let x=0;x<p.w;x+=280){const tileW=Math.min(300,p.w-x),scale=300/sw;c.drawImage(this.terrain,sx,sy+top,sw*(tileW/300),sh-top,p.x+x,p.y,tileW,(sh-top)*scale+65);}
   c.restore();
   // Individual crown pieces avoid stretching a single texture across an entire floor.
   for(let x=0,n=0;x<p.w;x+=320,n++){const w=Math.min(335,p.w-x),v=variant,f=terrainFrames[v],s=w/f[2];c.drawImage(this.terrain,f[0],f[1],f[2],f[3],p.x+x,p.y-terrainTops[v]*s,w,f[3]*s);}
  }
  // Biome dressing stays near the edges, leaving takeoff and landing positions clear.
  const seed=stage===1?1:stage===2?6:stage===4?4:0;
  this.plant(c,seed,p.x+p.w*.15,p.y+2,26+seed*2,25+seed*3,stage,.8);
  if(p.w>240)this.plant(c,(seed+4)%8,p.x+p.w*.79,p.y+2,34,32,stage,.7);
 }

 current(c:CanvasRenderingContext2D,q:{x:number;y:number;w:number;h:number},phase:string,t:number,reduced:boolean){
  const flowing=phase==='flowing';c.save();c.globalAlpha=flowing?.6:phase==='rising'?.32:.13;
  // Curved ribbons communicate upward flow without opaque walls across the route.
  c.fillStyle='#8edbd515';c.beginPath();c.ellipse(q.x+q.w/2,q.y+q.h,q.w*.6,13,0,0,Math.PI*2);c.fill();
  for(let i=0;i<5;i++){const x=q.x+12+i*(q.w-24)/4;c.strokeStyle=i%2?'#d7ffff':'#69c8cb';c.lineWidth=i%2?2:5;c.beginPath();c.moveTo(x,q.y+q.h);c.bezierCurveTo(x-18,q.y+q.h*.66,x+16,q.y+q.h*.3,x,q.y+15);c.stroke();
   if(flowing)for(let n=0;n<3;n++){const y=q.y+((n/3+i*.07+(reduced?0:-t*.45))%1+1)%1*q.h;c.lineWidth=1.6;c.beginPath();c.moveTo(x-5,y+6);c.quadraticCurveTo(x,y-6,x+5,y+6);c.stroke();}
  }
  c.strokeStyle='#d0fff2';c.lineWidth=2;c.beginPath();c.ellipse(q.x+q.w/2,q.y+q.h,q.w*.57,9,0,0,Math.PI*2);c.stroke();c.restore();
 }
 flood(c:CanvasRenderingContext2D,left:number,right:number,y:number,active:boolean,t:number,reduced:boolean){
  c.save();c.fillStyle=active?'#499ba654':'#b7f4ff12';c.strokeStyle=active?'#c4ffff':'#a9f6ecc0';c.lineWidth=active?3:1.5;if(!active)c.setLineDash([12,12]);
  c.beginPath();c.moveTo(left,810);c.lineTo(left,y);for(let x=left;x<=right;x+=20)c.lineTo(x,y+Math.sin(x*.024+(reduced?0:t*3))*5);c.lineTo(right,810);c.closePath();c.fill();c.beginPath();for(let x=left;x<=right;x+=20){const wave=y+Math.sin(x*.024+(reduced?0:t*3))*5;if(x===left)c.moveTo(x,wave);else c.lineTo(x,wave);}c.stroke();c.restore();
 }
 beacon(c:CanvasRenderingContext2D,x:number,y:number,lit:boolean,t:number,reduced:boolean){
  c.save();if(lit)c.filter='hue-rotate(35deg)';const bob=reduced?0:Math.sin(t*2)*1.5;
  if(!this.prop(c,3,x-4,y+41,62,99)){c.strokeStyle='#b6c879';c.lineWidth=4;c.beginPath();c.moveTo(x-15,y+40);c.bezierCurveTo(x-40,y-42,x+30,y-45,x,y);c.stroke();}
  c.restore();const g=c.createRadialGradient(x,y+bob,1,x,y+bob,lit?35:25);g.addColorStop(0,lit?'#caffad70':'#ffce7855');g.addColorStop(1,'transparent');c.fillStyle=g;c.beginPath();c.arc(x,y+bob,lit?35:25,0,Math.PI*2);c.fill();
 }
 portal(c:CanvasRenderingContext2D,x:number,y:number){
  c.save();c.globalAlpha=.8;this.prop(c,1,x-27,y,39,118,true);this.prop(c,1,x+27,y,39,118);c.restore();
 }
 shrine(c:CanvasRenderingContext2D,x:number,t:number,reduced:boolean){
  if(!this.prop(c,4,x,707,132,120)){c.fillStyle='#789987';c.beginPath();c.ellipse(x,680,38,18,0,0,Math.PI*2);c.fill();}
  c.save();c.strokeStyle='#d4ffe27a';c.lineWidth=1.4;for(let n=0;n<2;n++){const phase=reduced?.4:(t*.25+n*.5)%1;c.globalAlpha=1-phase;c.beginPath();c.ellipse(x,668,10+phase*25,3+phase*5,0,0,Math.PI*2);c.stroke();}c.restore();
 }
 brambles(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
  if(!this.prop(c,5,x+w/2,y+h,w,h)){c.strokeStyle='#ab8249';c.lineWidth=7;for(let i=0;i<4;i++){c.beginPath();c.moveTo(x+i*w/4,y+h);c.bezierCurveTo(x+w,y+h*.5,x,y+h*.5,x+i*w/4,y);c.stroke();}}
 }
 ability(c:CanvasRenderingContext2D,x:number,y:number,kind:'dash'|'doubleJump',t:number){
  c.save();c.translate(x,y);c.rotate(Math.sin(t*1.4)*.12);c.strokeStyle='#f8e4a7';c.lineWidth=2;c.fillStyle='#fff3c9';
  c.beginPath();c.moveTo(-12,23);c.bezierCurveTo(-23,-4,-7,-28,21,-32);c.bezierCurveTo(21,-10,17,12,-12,23);c.fill();c.stroke();c.strokeStyle='#b39656';c.beginPath();c.moveTo(-15,29);c.quadraticCurveTo(-1,5,16,-24);c.stroke();
  if(kind==='doubleJump')for(let i=0;i<5;i++){const y=15-i*8;c.beginPath();c.moveTo(-8+i*3,y);c.lineTo(9+i*2,y-2);c.stroke();}c.restore();
 }
 chargeWarning(c:CanvasRenderingContext2D,x:number,y:number,w:number,direction:number){
  c.save();c.translate(x,y);c.scale(direction,1);c.fillStyle='#ffd39425';c.strokeStyle='#ffe0a7aa';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-18);c.bezierCurveTo(w*.3,-31,w*.78,-18,w,0);c.bezierCurveTo(w*.78,18,w*.3,31,0,18);c.closePath();c.fill();c.stroke();
  c.setLineDash([]);for(let i=1;i<4;i++){const dx=w*i/4;c.beginPath();c.moveTo(dx-8,-5);c.quadraticCurveTo(dx+4,0,dx-8,5);c.stroke();}c.restore();
 }
 vent(c:CanvasRenderingContext2D,q:{x:number;y:number;w:number;h:number;active?:boolean;warning?:boolean},stage:number,t:number,reduced:boolean){
  const x=q.x+q.w/2,base=q.y+q.h,water=stage===1,color=water?'#b8f9f8':'#ffcb87';
  c.save();c.fillStyle=palettes[stage][0];c.beginPath();c.ellipse(x,base,q.w*.6,12,0,0,Math.PI*2);c.fill();c.strokeStyle=q.warning||q.active?color:palettes[stage][1];c.lineWidth=q.warning?3:1.5;c.beginPath();c.ellipse(x,base-3,q.w*.5,8,0,0,Math.PI*2);c.stroke();
  if(q.active){
   const g=c.createLinearGradient(0,q.y,0,base);g.addColorStop(0,water?'#c8ffff11':'#ffd39511');g.addColorStop(.5,water?'#acffff77':'#ffbf7377');g.addColorStop(1,water?'#e5ffffdd':'#fff2bddd');c.fillStyle=g;
   for(let i=0;i<5;i++){
    const offset=(i-2)*q.w*.17,sway=reduced?Math.sin(i)*q.w*.06:Math.sin(t*7+i)*q.w*.09,tip=q.y+(i%3)*6;
    c.beginPath();c.moveTo(x+offset-q.w*.07,base);c.bezierCurveTo(x+offset-q.w*.23,base-q.h*.35,x+offset+sway+q.w*.17,tip+q.h*.35,x+offset+sway,tip);c.bezierCurveTo(x+offset+sway-q.w*.05,tip+q.h*.35,x+offset+q.w*.2,base-q.h*.4,x+offset+q.w*.07,base);c.closePath();c.fill();
   }
   c.fillStyle=color;c.globalAlpha=.7;
   for(let i=0;i<12;i++){const rise=reduced?(i+.5)/12:(t*.85+i/12)%1,dx=Math.sin(i*4.7)*q.w*.44;c.beginPath();c.ellipse(x+dx,base-rise*q.h,water?1.8:2.5,water?4:2.5,.3,0,Math.PI*2);c.fill();}
  }else if(q.warning){c.globalAlpha=.6;for(let i=0;i<5;i++){c.fillStyle=color;c.beginPath();c.ellipse(x+(i-2)*q.w*.18,base-12-(reduced?0:(t*35+i*7)%30),2,4,0,0,Math.PI*2);c.fill();}}
  c.restore();
 }
}
