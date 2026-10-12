import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Room} from './game';
type Guardian=Room['enemies'][number];
/** A single owned, skinned Briarhorn. The existing combat controller remains authoritative. */
export class Guardian3D {
 readonly root=new T.Group();private model?:T.Group;private mixer?:T.AnimationMixer;private actions=new Map<string,T.AnimationAction>();private action?:T.AnimationAction;private head?:T.Object3D;
 private mats=new Set<T.MeshStandardMaterial>();private geos=new Set<T.BufferGeometry>();private textures=new Set<T.Texture>();private disposed=false;loaded=false;
 async load(){
  try{const gltf=await new GLTFLoader().loadAsync('/art/3d/briarhorn.glb');this.model=gltf.scene;
   this.model.traverse(o=>{if(o instanceof T.Mesh){this.geos.add(o.geometry);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){this.mats.add(m);if(m.name.startsWith('Horns')){m.color.set('#dfbd72');m.emissive.set('#c0903f');m.emissiveIntensity=.12;}for(const t of Object.values(m))if(t instanceof T.Texture){this.textures.add(t);t.anisotropy=4;}}}});
   if(this.disposed){this.dispose();return;}
   this.mixer=new T.AnimationMixer(this.model);for(const clip of gltf.animations){const a=this.mixer.clipAction(clip);if(clip.name.startsWith('Die')){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}this.actions.set(clip.name,a);}
   this.action=this.actions.get('Idle.000');this.action?.play();this.mixer.update(0);this.model.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(this.model,true),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   const normalized=new T.Group();normalized.add(this.model);this.model.position.sub(new T.Vector3(center.x,box.min.y,center.z));normalized.scale.setScalar(1.95/size.y);normalized.rotation.y=Math.PI/2;this.root.add(normalized);this.head=this.model.getObjectByName('Head');this.loaded=true;
  }catch{this.dispose();}
 }
 update(e:Guardian|undefined,dt:number,started:boolean,reduced:boolean){
  this.root.visible=!!e&&started&&(e.hp>0||e.defeat>0);if(!e||!this.loaded||!this.mixer)return;
  this.root.position.set(e.x*.01,8.1-(e.y+60)*.01,0);const target=e.direction<0?Math.PI:0;let diff=target-this.root.rotation.y;while(diff>Math.PI)diff-=Math.PI*2;while(diff< -Math.PI)diff+=Math.PI*2;this.root.rotation.y+=diff*Math.min(1,dt*15);
  const name=e.hp<=0?'Die.000':e.mode==='attack'||e.mode==='reposition'?'Run':e.mode==='windup'?'Eat.001':'Idle.000';const next=this.actions.get(name);
  if(next&&next!==this.action){this.action?.fadeOut(.13);next.reset().setEffectiveWeight(1).fadeIn(.13).play();this.action=next;}
  if(this.action)this.action.timeScale=name==='Run'?1.35:name==='Eat.001'?1.8:1;
  this.mixer.update(reduced&&name==='Idle.000'?0:dt);
  if(this.head&&e.mode==='recover')this.head.rotateX(.18);
  this.root.rotation.z=e.mode==='stagger'?-.045:0;
  for(const material of this.mats){const horn=material.name.startsWith('Horns');material.emissive.set(horn?'#c0903f':'#d8ead0');material.emissiveIntensity=e.hit>0?.3:horn?.12:0;}
 }
 dispose(){this.disposed=true;this.loaded=false;this.mixer?.stopAllAction();if(this.model)this.mixer?.uncacheRoot(this.model);for(const g of this.geos)g.dispose();for(const m of this.mats)m.dispose();for(const t of this.textures)t.dispose();this.geos.clear();this.mats.clear();this.textures.clear();this.root.clear();this.actions.clear();}
}
