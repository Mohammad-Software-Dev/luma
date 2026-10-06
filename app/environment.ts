import { terrainFrames, terrainTops, propFrames } from './environment-atlas';

type Platform = {x:number;y:number;w:number;h:number;moving?:unknown};
const palettes = [
 ['#284d38','#698654','#d8dba0'],['#234a50','#639d97','#c8e5c9'],['#4f3d35','#a0864c','#f3d092'],
 ['#224d3a','#70a575','#d9eab2'],['#393a58','#8b90b8','#e3d3f2'],['#4f4939','#a39b6b','#f5e0aa'],
];
// Stable selections: scenery must not flicker or change as moving platforms travel.
export function terrainVariant(stage:number,room:number,index:number){
 const choices=[[0,1,0,5],[2,0,2,1],[3,5,3,0],[1,0,1,4],[4,5,4,2],[5,3,5,0]][stage];
 return choices[(room+index)%choices.length];
}
export function parallaxOffset(camera:number,depth:number,reduced:boolean){return reduced?0:camera*depth;}

/** Painted scenery is independent of collision geometry. All caches have fixed bounds. */
export class Environment {
 private terrain=new Image();private props=new Image();private foliage=new Image();
 private plants=new Map<number,HTMLCanvasElement>();
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
 background(c:CanvasRenderingContext2D,stage:number,camera:number,width:number,t:number,reduced:boolean){
  // Transparent cutouts form real independently translated depth planes.
  const prop=stage===2||stage===5?1:stage===4?2:0;
  for(const layer of [{speed:.2,spacing:720,height:430,base:790,alpha:.28},{speed:.48,spacing:940,height:530,base:835,alpha:.62}]){
   const shift=parallaxOffset(camera,layer.speed,reduced),start=Math.floor((shift-700)/layer.spacing),end=Math.ceil((shift+width+700)/layer.spacing);
   c.save();c.globalAlpha=layer.alpha;c.filter='saturate(.65) brightness(.78)';
   for(let i=start;i<=end;i++){const x=i*layer.spacing-shift+160+(i%2)*95,h=layer.height+(Math.abs(i)%3)*55;this.prop(c,prop,x,layer.base,h*(prop===1?.52:1.15),h,i%2===0);}
   c.restore();
  }
  // A low mist plane separates silhouettes from the playable ledges.
  const drift=reduced?0:Math.sin(t*.07)*45;
  c.save();for(let i=0;i<3;i++){const x=i*width/2-parallaxOffset(camera,.1,reduced)+drift;const fog=c.createRadialGradient(x,645,0,x,645,350);fog.addColorStop(0,stage===2?'#e9b6790c':stage===4?'#b4a9e51a':'#c7e8dc19');fog.addColorStop(1,'transparent');c.fillStyle=fog;c.beginPath();c.ellipse(x,645,350,130,0,0,Math.PI*2);c.fill();}c.restore();
 }
 foreground(c:CanvasRenderingContext2D,stage:number,camera:number,width:number,t:number,reduced:boolean){
  const shift=parallaxOffset(camera,1.12,reduced),spacing=170;
  c.save();c.globalAlpha=.78;c.filter='brightness(.4) saturate(.7)';
  for(let i=Math.floor((shift-100)/spacing);i<=Math.ceil((shift+width+100)/spacing);i++){
   const n=Math.abs(i),x=i*spacing-shift,y=831+(n%3)*6,h=65+(n%3)*16,sway=reduced?0:Math.sin(t*.8+i)*3;
   // Foreground is confined below the walking surface; it cannot conceal hazards.
   this.plant(c,n%8,x+sway,y,100+(n%3)*35,h,stage);
  }c.restore();
 }
 platform(c:CanvasRenderingContext2D,p:Platform,stage:number,room:number,index:number){
  const variant=terrainVariant(stage,room,index),[sx,sy,sw,sh]=terrainFrames[variant],top=terrainTops[variant];
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
   for(let x=0,n=0;x<p.w;x+=320,n++){const w=Math.min(335,p.w-x),v=terrainVariant(stage,room,index+n),f=terrainFrames[v],s=w/f[2];c.drawImage(this.terrain,f[0],f[1],f[2],f[3],p.x+x,p.y-terrainTops[v]*s,w,f[3]*s);}
  }
  // Seeded dressing stays near the edges, leaving takeoff and landing positions clear.
  const seed=(index*13+room*7)%8;
  this.plant(c,seed,p.x+p.w*.15,p.y+2,26+seed*2,25+seed*3,stage,.8);
  if(p.w>240)this.plant(c,(seed+4)%8,p.x+p.w*.79,p.y+2,34,32,stage,.7);
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
