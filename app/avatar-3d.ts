import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Frame3D} from './renderer-3d';
/** CDmir's CC0 skinned rabbit, adapted with Luma's sunblade and scarf. */
export class Avatar3D {
 readonly root=new T.Group();
 private model?:T.Group;private mixer?:T.AnimationMixer;
 private actions=new Map<string,T.AnimationAction>();private current?:T.AnimationAction;
 private materials=new Set<T.MeshStandardMaterial>();private geometries=new Set<T.BufferGeometry>();private textures=new Set<T.Texture>();
 private arm?:T.Object3D;private paw?:T.Object3D;private neck?:T.Object3D;
 private disposed=false;private ready=false;
 private readonly tilt=new T.Group();
 get loaded(){return this.ready;}
 async load(){
  try{
   const asset=await new GLTFLoader().loadAsync('/art/3d/luma-rabbit.glb');
   this.model=asset.scene;this.model.traverse(o=>{if(o instanceof T.Mesh){this.geometries.add(o.geometry);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){this.materials.add(m);m.color.setRGB(1.3,1.19,1.04);if(m.transparent){m.transparent=false;m.alphaTest=.45;m.depthWrite=true;m.side=T.DoubleSide;}for(const t of Object.values(m))if(t instanceof T.Texture){t.anisotropy=4;this.textures.add(t);}}}});
   if(this.disposed){this.dispose();return;}
   this.mixer=new T.AnimationMixer(this.model);
   for(const clip of asset.animations)this.actions.set(clip.name,this.mixer.clipAction(clip));
   this.current=this.actions.get('Guarding');this.current?.play();this.mixer.update(0);
   this.model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(this.model,true),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   const scale=.95/size.y;const normalized=new T.Group();normalized.add(this.model);this.model.position.sub(new T.Vector3(center.x,box.min.y,center.z));normalized.scale.setScalar(scale);normalized.rotation.y=Math.PI/2;
   this.tilt.add(normalized);this.root.add(this.tilt);
   this.arm=this.model.getObjectByName('FrontUpLeg_R');this.paw=this.model.getObjectByName('FrontPaw_R');this.neck=this.model.getObjectByName('Neck');
   // Accessories use the source skeleton's units and follow the actual paw/neck.
   if(this.paw){const sword=new T.Group();sword.position.set(0,1.8,0);sword.rotation.x=-.8;this.paw.add(sword);
    const add=(geo:T.BufferGeometry,color:string,y:number,metalness:number,glow=0)=>{this.geometries.add(geo);const mat=new T.MeshStandardMaterial({color,metalness,roughness:.3,emissive:color,emissiveIntensity:glow});this.materials.add(mat);const mesh=new T.Mesh(geo,mat);mesh.position.y=y;sword.add(mesh);};
    add(new T.CylinderGeometry(.25,.25,2,8),'#624332',0,.1);add(new T.BoxGeometry(2,.3,.55),'#e4b968',1,.65);add(new T.ConeGeometry(.60,6,4),'#fff1b6',4,.75,.18);
   }
   if(this.neck){const geo=new T.TorusGeometry(2,.42,6,20),mat=new T.MeshStandardMaterial({color:'#b75c45',roughness:.9});this.geometries.add(geo);this.materials.add(mat);const scarf=new T.Mesh(geo,mat);scarf.rotation.x=Math.PI/2;this.neck.add(scarf);}
   this.ready=true;
  }catch{this.dispose();}
 }
 update(f:Frame3D,dt:number){
  if(!this.ready||!this.mixer)return;
  const p=f.player;this.root.visible=f.started;this.root.position.set(p.x*.01,8.1-p.y*.01,0);
  const target=p.face<0?Math.PI:0;let diff=target-this.root.rotation.y;while(diff>Math.PI)diff-=Math.PI*2;while(diff< -Math.PI)diff+=Math.PI*2;this.root.rotation.y+=diff*Math.min(1,dt*24);
  const name=f.attack>0?'Guarding':!p.grounded||f.dash?'Jump':Math.abs(p.vx)>35?'Running':'Guarding';const action=this.actions.get(name);
  if(action&&action!==this.current){this.current?.fadeOut(.12);action.reset().setEffectiveWeight(1).fadeIn(.12).play();this.current=action;}
  if(this.current){this.current.timeScale=name==='Running'?Math.max(.55,Math.abs(p.vx)/280):1;}
  this.mixer.update(f.reduced&&name==='Guarding'&&f.attack<=0?0:dt);
  const u=Math.min(1,Math.max(0,(.29-f.attack)/.29));
  if(f.attack>0&&this.arm){this.arm.rotateX((f.combo===2?-1:1)*(.7-Math.sin(u*Math.PI)*1.7));}
  this.tilt.rotation.z=f.dash?-.22:f.attack>0?Math.sin(u*Math.PI)*-.14:0;
  this.tilt.scale.y=f.landing>0?.94:1;
  for(const material of this.materials)if(material.name==='Rabbit_PBR'||material.name==='Fur_PBR'){material.emissive.set('#b1e7d9');material.emissiveIntensity=f.invincible>0?.23:0;}
 }
 dispose(){this.disposed=true;this.ready=false;this.mixer?.stopAllAction();if(this.model)this.mixer?.uncacheRoot(this.model);for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.geometries.clear();this.materials.clear();this.textures.clear();this.actions.clear();this.root.clear();}
}
