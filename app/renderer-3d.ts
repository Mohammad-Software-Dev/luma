import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ModelKit,makeHero,makeCreature,type Rig} from './models-3d';
import {Guardian3D} from './guardian-3d';
import {Avatar3D} from './avatar-3d';
import {NaturalAssets} from './natural-assets';
import type {Room,Snapshot} from './game';
import {crystalSeals,amberFormations} from './hollow';

const H=8.1,unit=.01;
const palettes=[
 {fog:'#173e3d',rock:'#56655a',top:'#799354',leaf:'#547a4b',wood:'#465345',light:'#ffe6ac'},
 {fog:'#16414c',rock:'#4c696c',top:'#6eaaa0',leaf:'#477b73',wood:'#425e62',light:'#c9f9f0'},
 {fog:'#3b3030',rock:'#6c594b',top:'#a28c58',leaf:'#8d7543',wood:'#514a39',light:'#ffd297'},
 {fog:'#24493d',rock:'#54684e',top:'#96ae59',leaf:'#699449',wood:'#5e6350',light:'#f8eeb6'},
 {fog:'#302e4a',rock:'#615e76',top:'#9c83ad',leaf:'#77719b',wood:'#63556c',light:'#e5c9ff'},
 {fog:'#434337',rock:'#827a5d',top:'#c2b176',leaf:'#96935c',wood:'#71694f',light:'#fff2be'},
];
export type Frame3D={room:Room;state:Snapshot;camera:number;shakeX?:number;shakeY?:number;viewport:number;t:number;reduced:boolean;started:boolean;player:{x:number;y:number;vx:number;vy:number;face:number;grounded:boolean};attack:number;combo:number;dash:boolean;landing:number;invincible:number;broken:ReadonlySet<number>;regrowth:ReadonlyMap<number,number>};
/** Projection is exact on z=0: gameplay pixels map to the same overlay pixels. */
export function cameraDistance(height=H,fov=24){return height/2/Math.tan(fov*Math.PI/360);}
export class World3D {
 readonly canvas=document.createElement('canvas');
 readonly renderer:T.WebGLRenderer;
 readonly scene=new T.Scene();
 readonly camera=new T.PerspectiveCamera(24,16/9,.1,120);
 readonly kit=new ModelKit();
 readonly natural=new NaturalAssets();
 readonly avatar=new Avatar3D();
 readonly guardian=new Guardian3D();
 async loadAssets(){await Promise.all([this.natural.load(),this.avatar.load(),this.guardian.load()]);this.room=undefined;}
 readonly hero=makeHero(this.kit);
 private terrain=new T.Group();private scenery=new T.Group();private forest=new T.Group();private actors=new T.Group();private props=new T.Group();
 private vistas=new Map<number,T.Texture>();private vista:T.Mesh|undefined;private surfaceMaterials=new Map<number,{rock:T.MeshStandardMaterial;top:T.MeshStandardMaterial}>();
 private room?:Room;private stage=-1;private rigs:Rig[]=[];private platforms:T.Group[]=[];
 private seals:Array<{id:number;root:T.Group;h:number;arena:boolean}>=[];
 private roomGeometries=new Set<T.BufferGeometry>();
 private key=new T.DirectionalLight('#ffe8b7',3.2);private fill=new T.HemisphereLight('#c4ddd8','#253029',1.6);private rim=new T.DirectionalLight('#8fddcf',2.1);
 private focus=new T.Object3D();private lastTime=0;private disposed=false;
 active=true;private width=0;private height=0;
 private onLost=(e:Event)=>{e.preventDefault();this.active=false;this.canvas.style.visibility='hidden';this.host.dataset.renderer='canvas-fallback';};
 private onRestored=()=>{if(this.disposed)return;this.active=true;this.canvas.style.visibility='visible';this.host.dataset.renderer='webgl-2.5d';};
 constructor(private host:HTMLCanvasElement,createRenderer=(options:T.WebGLRendererParameters)=>new T.WebGLRenderer(options)){
  this.renderer=createRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.10;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
  this.canvas.setAttribute('aria-hidden','true');this.canvas.dataset.lumaScene='3d';
  Object.assign(this.canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'0'});
  Object.assign(host.style,{position:'relative',zIndex:'1'});host.parentElement!.insertBefore(this.canvas,host);host.dataset.renderer='webgl-2.5d';
  this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
  this.scene.add(this.terrain,this.scenery,this.forest,this.actors,this.props,this.hero.root,this.avatar.root,this.guardian.root,this.fill,this.key,this.rim,this.focus);
  this.key.castShadow=true;this.key.shadow.mapSize.set(1024,1024);Object.assign(this.key.shadow.camera,{left:-10,right:10,top:9,bottom:-9,near:1,far:50});this.key.shadow.bias=-.0005;this.key.shadow.normalBias=.035;this.key.target=this.focus;this.rim.position.set(-8,5,-10);
 }
 private mesh(parent:T.Object3D,g:T.BufferGeometry,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,metal=0,glow=0){return this.kit.mesh(parent,g,color,x,y,z,sx,sy,sz,metal,glow);}
 private geometry<G extends T.BufferGeometry>(g:G){this.roomGeometries.add(g);return g;}
 private merge(group:T.Group,shadow=true){
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),byMat=new Map<T.Material,T.BufferGeometry[]>();
  group.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;const geometry=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld));const list=byMat.get(o.material)||[];list.push(geometry);byMat.set(o.material,list);});
  group.clear();for(const [material,geometries] of byMat){const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;const mesh=new T.Mesh(this.geometry(merged),material);mesh.castShadow=shadow;mesh.receiveShadow=true;group.add(mesh);}
 }
 private crystal(parent:T.Group,x:number,y:number,h:number,w:number){
  const g=this.kit.joint(parent,x,y,0);for(let i=0;i<5;i++){const size=h*(i===2?1:.45+(i%2)*.22);const m=this.mesh(g,this.kit.cone,'#f4bd65',(i-2)*w*.15,size*.5,-.08+(i%2)*.06,w*.20,size,w*.16,.55,.18);m.rotation.z=(2-i)*.11;}
  this.mesh(g,this.kit.rock,'#554c40',0,.045,-.1,w*.55,.12,w*.4);return g;
 }
 private tree(parent:T.Group,x:number,y:number,z:number,h:number,stage:number){
  if(this.natural.place(this.forest,'pine',z<=-8?1:0,x,y,z,h*.6,h,undefined,x*.17))return;
  const p=palettes[stage],g=this.kit.joint(parent,x,y,z),k=this.kit;
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.16,h*.3,.10),new T.Vector3(.1,h*.65,-.2),new T.Vector3(-.3,h,0)]);
  const trunkGeo=this.geometry(new T.TubeGeometry(curve,9,h*.042,7,false));const points=trunkGeo.getAttribute('position');for(let i=0;i<points.count;i++){const center=curve.getPointAt(Math.floor(i/8)/9),factor=1-center.y/h*.82;points.setXYZ(i,center.x+(points.getX(i)-center.x)*factor,points.getY(i),center.z+(points.getZ(i)-center.z)*factor);}trunkGeo.computeVertexNormals();const trunk=new T.Mesh(trunkGeo,this.natural.bark||k.material(p.wood));trunk.castShadow=true;g.add(trunk);
  for(const side of [-1,1]){
   k.branch(g,new T.Vector3(0,h*.5,0),new T.Vector3(side*h*.22,h*.82,-.3),h*.020,p.wood);
   for(let i=0;i<14;i++){
    const n=Math.sin(i*17+x*3),px=side*h*(.07+(i%5)*.058),py=h*(.79+Math.floor(i/5)*.075)+n*.16;
    const leaf=this.mesh(g,k.leaf,i%4===0?'#899e60':p.leaf,px,py,-.3+(i%3)*.26,h*.10,h*.16,h*.10);leaf.rotation.z=side*(.8+n*.40);leaf.rotation.x=.4+n*.35;
   }
   k.branch(g,new T.Vector3(),new T.Vector3(side*h*.15,.02,.24),h*.04,p.wood);
  }
 }
 private arch(parent:T.Group,x:number,y:number,z:number,stage:number,scale=1){
  const p=palettes[stage],g=this.kit.joint(parent,x,y,z);g.scale.setScalar(scale);
  for(const side of [-1,1]){for(let i=0;i<5;i++)this.mesh(g,this.kit.rock,p.rock,side*1.15,i*.5,0,.26,.35,.38);}
  const ring=new T.Mesh(this.geometry(new T.TorusGeometry(1.15,.23,7,18,Math.PI)),this.kit.material(p.rock));ring.position.y=2.15;g.add(ring);
 }
 private build(f:Frame3D){
  for(const g of this.roomGeometries)g.dispose();this.roomGeometries.clear();this.terrain.clear();this.scenery.clear();this.forest.clear();this.props.clear();this.actors.clear();this.platforms=[];this.seals=[];this.rigs=[];
  this.room=f.room;this.stage=f.state.stage;const s=this.stage,p=palettes[s],k=this.kit;
  this.scene.background=new T.Color(p.fog);
  if(!this.surfaceMaterials.has(s))this.surfaceMaterials.set(s,{rock:k.surface(p.rock,41+s),top:k.surface(p.top,87+s)});
  const surfaces=this.surfaceMaterials.get(s)!;
  const ground=this.natural.ground||surfaces.top;
  // A distant matte painting complements the modeled foreground and depth layers.
  if(this.vista){this.scene.remove(this.vista);this.vista.geometry.dispose();(this.vista.material as T.Material).dispose();}
  const vistaMaterial=new T.MeshBasicMaterial({color:'#839994',fog:false});
  this.vista=new T.Mesh(new T.PlaneGeometry(76,38),vistaMaterial);this.vista.position.set(12,7,-48);this.scene.add(this.vista);
  const cached=this.vistas.get(s);if(cached){vistaMaterial.map=cached;vistaMaterial.color.set('#a8b6a3');}
  else{const names=['forest.png','falls.webp','hollow.webp','canopy.webp','sanctuary.webp','sunspire.webp'];const texture=new T.TextureLoader().load('/'+names[s],texture=>{if(this.disposed){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;if(this.stage===s&&this.vista){const material=this.vista.material as T.MeshBasicMaterial;material.map=texture;material.color.set('#a8b6a3');material.needsUpdate=true;if(this.active)this.renderer.render(this.scene,this.camera);}},undefined,()=>{});this.vistas.set(s,texture);}
  
  this.scene.fog=new T.FogExp2(p.fog,.019);this.key.color.set(p.light);this.rim.color.set(s===2?'#ffb45a':s===4?'#b69bfb':'#8ad6ca');
  // Long, layered vistas live at real depths; camera movement generates parallax.
  for(let layer=0;layer<2;layer++){
   const z=-9-layer*9;
   for(let i=0;i<5;i++){
    const x=-9+i*10+(layer%2)*4.4,y=-.6-layer*.1;
    if(s===2){this.crystal(this.scenery,x,y,4+(i%3)*1.4,2.4).position.z=z;}
    else if(s===4){const g=k.joint(this.scenery,x,y,z);this.mesh(g,k.cylinder,p.wood,0,2,0,.22,4,.22);k.ellipsoid(g,p.leaf,0,4,0,2.2,.6,1.7);this.mesh(g,k.sphere,'#b3a6d5',0,3.72,.1,1.7,.13,1.3,0,.15);}
    else if(s===5){this.arch(this.scenery,x,y,z,s,2.5+(i%2)*.7);}
    else this.tree(this.scenery,x,y,z,7+(i%3)*1.4,s);
   }
  }
  // Grounded ruins and off-lane roots provide recognizable room landmarks.
  for(const x of [-1.8,23.7]){if(s===2||s===5)this.arch(this.scenery,x,.4,-3.8,s,1.5);else this.tree(this.scenery,x,-.6,-4,7,s);}
  if(s===1){const water=this.kit.material('#72c8c8',.4,.08);for(const x of [5,17.5]){const m=new T.Mesh(this.geometry(new T.PlaneGeometry(.55,9)),water);m.position.set(x,3,-5);this.scenery.add(m);}}
  for(let i=0;i<10;i++){
   const x=-5+i*4;
   if(!this.natural.place(this.scenery,'rocks',i,x,-.7,-3.5,4,1.8,2.6,i*.7))this.mesh(this.scenery,k.rock,p.rock,x,-.3,-3.5,2.2,.65,1.4);
   if(s!==2&&s!==5)this.natural.place(this.scenery,'fern',i,x+1.2,.6,-3.1,1.6,undefined,undefined,i);
  }
  if(s!==2&&s!==5)for(const [x,y,z] of [[2,.7,-2.8],[17,.8,-3.4]])this.natural.place(this.scenery,'stump',0,x,y,z,2.8,2.3,2.1);

  this.merge(this.scenery,false);this.forest.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  f.room.platforms.forEach((q,index)=>{
   const g=k.joint(this.terrain,q.x*unit,H-q.y*unit,0),w=q.w*unit,depth=q.h>=100?2.1:1.05,h=q.h>=100?2:Math.max(.48,w*.20);
   const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(w,0);shape.lineTo(w-.05,-.19);shape.lineTo(w*.87,-h*.70);shape.lineTo(w*.65,-h);shape.lineTo(w*.30,-h*.78);shape.lineTo(.06,-h*.56);shape.closePath();
   const geo=this.geometry(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.04,bevelSize:.045,bevelSegments:1,steps:1}));geo.translate(0,0,-depth-.045);const points=geo.getAttribute('position');for(let v=0;v<points.count;v++){const x=points.getX(v),y=points.getY(v),z=points.getZ(v);if(y<-.055)points.setZ(v,z+Math.sin(x*4.7+index)*.06);}geo.computeVertexNormals();
   const body=new T.Mesh(geo,this.natural.rock||surfaces.rock);body.castShadow=true;body.receiveShadow=true;g.add(body);
   // Physical top is exactly y=0 and starts at z=0, matching the collision edge.
   const topGeo=this.geometry(new T.BoxGeometry(w,.045,depth));const pos=topGeo.getAttribute('position'),uv=topGeo.getAttribute('uv');for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)*.6,(Math.abs(topGeo.getAttribute('normal').getY(i))>.5?pos.getZ(i):pos.getY(i))*.6);
   const top=new T.Mesh(topGeo,ground);top.position.set(w/2,-.025,-depth/2);top.receiveShadow=true;g.add(top);
   const chunks=Math.max(1,Math.ceil(w/1.6));
   for(let i=0;i<chunks;i++){
    const span=w/chunks,x=span*(i+.5),rockHeight=h*(.78+Math.sin(index*5+i*3)*.12);
    // Scan tops sit just under the exact collision surface; variation stays below the feet.
    if(!this.natural.place(g,index%2?'stones':'rocks',index+i,x,-rockHeight-.035,-.18,span*1.15,rockHeight,.6))this.mesh(g,k.rock,p.rock,x,-.22,-.05,.3,.22,.18);
   }
   if(s!==2&&s!==5){
    // Plants occupy the rear ledge. Leave every landing edge and beacon unobscured.
    for(let i=0;i<Math.floor(w/1.5);i++)this.natural.place(g,'fern',index+i,.55+i*1.5,-.02,-depth*.72,.65+(i%2)*.18,.35+(i%2)*.12,undefined,i*.9);
   }
   if(q.h<100&&s===2)for(let i=0;i<3;i++)this.crystal(g,w*(i+1)/4,-h*.65,.26,.23).rotation.z=Math.PI;
   g.traverse(o=>{if(o instanceof T.Mesh){if(o.material===k.material(p.rock))o.material=surfaces.rock;else if(o.material===k.material(p.top))o.material=surfaces.top;}});
   this.merge(g);this.platforms.push(g);
  });
  for(const d of f.room.doors)this.arch(this.props,d.x*unit,H-d.y*unit,-.6,s,.48);
  if(f.room.shrine!==undefined){const x=f.room.shrine*unit,y=1.05;this.mesh(this.props,k.cylinder,p.rock,x,y+.1,-.4,.47,.2,.47);this.mesh(this.props,k.torus,'#b9daa0',x,y+.24,-.4,.34,.34,.34,.4,.6).rotation.x=Math.PI/2;this.mesh(this.props,k.sphere,'#fff1a9',x,y+.48,-.4,.11,.13,.11,.2,.8);}
  if(f.room.beacon){const b=f.room.beacon,x=b.x*unit,y=H-b.y*unit;this.mesh(this.props,k.cylinder,p.wood,x,y-.17,-.1,.07,.46,.07);this.mesh(this.props,k.sphere,'#ffde8f',x,y+.05,-.1,.12,.16,.12,.15,1);}
  this.merge(this.props);
  for(const q of crystalSeals[f.state.room]||[]){const root=this.crystal(this.props,(q.x+q.w/2)*unit,H-(q.y+q.h)*unit,q.h*unit,q.w*unit);this.seals.push({id:q.id,root,h:q.h*unit,arena:false});}
  if(f.state.room===2){const root=this.crystal(this.props,6.12,1.05,2.7,.68);this.seals.push({id:2,root,h:2.7,arena:false});}
  if(f.state.room===14)for(const x of amberFormations){const root=this.crystal(this.props,x*unit,1.05,1.55,.88);this.seals.push({id:x,root,h:1.55,arena:true});}
  for(const e of f.room.enemies){const rig=makeCreature(k,e.kind,e.boss);this.rigs.push(rig);this.actors.add(rig.root);}
 }
 render(f:Frame3D){
  if(!this.active||this.disposed)return;
  if(this.room!==f.room||this.stage!==f.state.stage)this.build(f);
  const w=this.host.width,h=this.host.height;if(this.width!==w||this.height!==h){this.width=w;this.height=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  const cx=(f.camera+f.viewport/2)*unit;this.camera.position.set(cx-(f.shakeX||0)*unit,H/2+(f.shakeY||0)*unit,cameraDistance());this.camera.rotation.set(0,0,0);
  this.focus.position.set(cx,2,0);this.key.position.set(cx-5,10,8);
  const dt=Math.min(.05,Math.max(0,f.t-this.lastTime));this.lastTime=f.t;
  f.room.platforms.forEach((q,i)=>this.platforms[i].position.set(q.x*unit,H-q.y*unit,0));
  for(const q of this.seals){const cooldown=f.regrowth.get(q.id)||0,broken=q.arena?cooldown>0:f.broken.has(q.id);q.root.visible=!(q.arena&&f.state.bosses.includes(2));q.root.scale.y=broken?(q.arena&&cooldown<2?.25+(2-cooldown)*.375:.12):1;}
  this.animateHero(f,dt);if(this.avatar.loaded){this.hero.root.visible=false;this.avatar.update(f,dt);}
  this.guardian.update(f.room.enemies.find(e=>e.boss===0),dt,f.started,f.reduced);
  f.room.enemies.forEach((e,i)=>{
   const r=this.rigs[i];r.root.visible=f.started&&(e.hp>0||e.defeat>0);if(e.boss===0&&this.guardian.loaded)r.root.visible=false;if(!r.root.visible)return;
   const motion=f.reduced?0:1,t=f.t,open=e.mode==='recover',wind=e.mode==='windup',attacking=e.mode==='attack',boss=e.boss!==undefined;
   r.root.position.set(e.x*unit,H-e.y*unit,0);r.root.rotation.y=e.direction<0?Math.PI-.16:.16;
   const scale=boss?(e.boss===0?2.3:e.boss===2?2.2:2.1):1;r.root.scale.setScalar(scale*(e.hp<=0?Math.max(.01,e.defeat/.65):1));
   r.body.rotation.y=(e.recoil||0)*1.7;
   r.body.rotation.z=(open?-.12:wind?-.18:attacking?.17:0)*e.direction;
   r.body.position.y=(boss?0:Math.sin(t*3+e.phase)*.025)*motion;
   r.head.rotation.z=wind?-.15:open?.18:Math.sin(t*2)*.04*motion;
   r.legs.forEach((l,n)=>{l.rotation.z=(attacking?Math.sin(t*24+n*Math.PI)*.6:Math.sin(t*6+n*Math.PI)*.10)*motion;});
   r.wings.forEach((wing,n)=>{if(e.kind==='sentry'||e.boss===4){wing.rotation.x=open?.55:wind?-.65:Math.sin(t*2+n)*.08*motion;}else wing.rotation.y=(n===0?1:-1)*(open?1.1:wind?.2:.45+Math.sin(t*(attacking?14:6))*.45*motion);});
   r.ears.forEach((ear,n)=>ear.rotation.z=(wind?-.12:Math.sin(t*2+n)*.025)*motion);
  });
  this.renderer.render(this.scene,this.camera);
 }
 private animateHero(f:Frame3D,dt:number){
  const r=this.hero,p=f.player,motion=f.reduced?0:1,moving=p.grounded&&Math.abs(p.vx)>35,cycle=f.t*15;
  r.root.position.set(p.x*unit,H-p.y*unit,0);
  const target=p.face<0?Math.PI-.18:.18;let diff=target-r.root.rotation.y;while(diff>Math.PI)diff-=Math.PI*2;while(diff< -Math.PI)diff+=Math.PI*2;r.root.rotation.y+=diff*Math.min(1,dt*22);
  const u=f.attack>0?Math.min(1,(.29-f.attack)/.29):0,attack=f.attack>0;
  r.body.rotation.z=f.dash?-.7:attack?-.15+Math.sin(u*Math.PI)*.35:!p.grounded?Math.max(-.2,Math.min(.18,p.vy*.0003)):moving?-.12:0;
  r.body.position.y=.35+(moving?Math.abs(Math.sin(cycle))*.025:Math.sin(f.t*2)*.009)*motion;
  r.body.scale.set(1,f.landing>0?.90:1,1);
  r.legs.forEach((leg,i)=>{leg.rotation.z=f.dash?(i===0?.8:-.5):!p.grounded?(i===0?-.6:.8):moving?Math.sin(cycle+i*Math.PI)*.65:0;});
  r.arms[0].rotation.z=moving?Math.sin(cycle+Math.PI)*.6:f.dash?-.9:0;
  r.arms[1].rotation.z=attack?(f.combo===2?-2.0+u*4.5:2.3-u*4.5):moving?Math.sin(cycle)*.4:-.35;
  r.arms[1].rotation.x=attack?Math.sin(u*Math.PI)*.65:0;
  r.head.rotation.z=f.dash?.35:attack?-.1:0;r.ears.forEach((ear,i)=>{ear.rotation.z=.32+i*.22+(f.dash?.6:Math.sin(f.t*5+i)*.07*motion);});
  if(r.scarf){r.scarf.rotation.z=(f.dash?.15:moving?Math.sin(cycle*.65)*.3:-.35)*motion;r.scarf.scale.x=f.dash?1.5:1;}
  // Stable tint instead of strobing; remains readable in reduced motion.
  const fur=this.kit.material('#fff1d0');fur.emissive.set('#96efd9');fur.emissiveIntensity=f.invincible>0?.35:0;
  r.root.visible=f.started;
 }
 stats(){return {renderer:this.active?'webgl-2.5d':'canvas-fallback',drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,naturalAssets:this.natural.loaded,skinnedHero:this.avatar.loaded,skinnedGuardian:this.guardian.loaded,assetFailures:this.natural.failures,width:this.width,height:this.height};}
 destroy(){if(this.disposed)return;this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);for(const g of this.roomGeometries)g.dispose();this.roomGeometries.clear();if(this.vista){this.vista.geometry.dispose();(this.vista.material as T.Material).dispose();}for(const t of this.vistas.values())t.dispose();this.vistas.clear();this.guardian.dispose();this.avatar.dispose();this.natural.dispose();this.kit.dispose();this.key.shadow.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();this.scene.clear();}
}
