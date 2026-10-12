import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export type NaturalKind='rocks'|'stones'|'fern'|'stump'|'pine';
const models:Record<NaturalKind,string>={rocks:'rock_moss_set_01.glb',stones:'rock_moss_set_02.glb',fern:'fern_02/fern_02.gltf',stump:'tree_stump_01.glb',pine:'pine/pine.gltf'};
const base='/art/3d/';
/** One asset owner for the renderer lifetime. Room instances share immutable resources. */
export class NaturalAssets {
 private models=new Map<NaturalKind,T.Object3D[]>();
 private geometries=new Set<T.BufferGeometry>();
 private materials=new Set<T.Material>();
 private textures=new Set<T.Texture>();
 private disposed=false;
 failures:string[]=[];
 rock?:T.MeshStandardMaterial;ground?:T.MeshStandardMaterial;bark?:T.MeshStandardMaterial;
 get loaded(){return this.models.size;}
 async load(){
  const gltf=new GLTFLoader();
  await Promise.allSettled((Object.entries(models) as [NaturalKind,string][]).map(async([kind,path])=>{
   try{
    const asset=await gltf.loadAsync(base+path);
    asset.scene.traverse(o=>{if(o instanceof T.Mesh){this.geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){this.materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture){value.anisotropy=4;this.textures.add(value);}}}});
    if(this.disposed){this.disposeResources();return;}
    const variants=asset.scene.children.map(source=>{
     const object=source.clone(true);object.position.set(0,0,0);object.updateMatrixWorld(true);
     const bounds=new T.Box3().setFromObject(object),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
     const root=new T.Group();root.add(object);object.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));root.scale.setScalar(1/Math.max(size.x,size.z,.001));
     root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=kind!=='fern';o.receiveShadow=true;}});return root;
    });this.models.set(kind,variants);
   }catch{this.failures.push(kind);}
  }));
  await Promise.allSettled([this.surface('forest_ground_04',false).then(m=>this.ground=m),this.surface('mossy_rock',false).then(m=>this.rock=m)]);
  if(this.disposed)this.disposeResources();
 }
 private async surface(id:string,packed:boolean){
  const loader=new T.TextureLoader();
  const load=async(suffix:string)=>{const t=await loader.loadAsync(`${base}${id}/textures/${id}_${suffix}_1k.jpg`);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;this.textures.add(t);return t;};
  // allSettled ensures successful maps are reclaimed even if another map fails.
  const result=await Promise.allSettled([load('diff'),load('nor_gl'),load(packed?'arm':'rough')]);
  if(result.some(r=>r.status==='rejected')){this.failures.push(id);return undefined;}
  const [map,normalMap,roughnessMap]=result.map(r=>(r as PromiseFulfilledResult<T.Texture>).value);map.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshStandardMaterial({map,normalMap,roughnessMap,roughness:1,normalScale:new T.Vector2(.7,.7)});this.materials.add(material);return material;
 }
 place(parent:T.Object3D,kind:NaturalKind,variant:number,x:number,y:number,z:number,width:number,height?:number,depth?:number,rotation=0){
  const variants=this.models.get(kind);if(!variants?.length)return false;
  const root=variants[Math.abs(variant)%variants.length].clone(true);root.updateMatrixWorld(true);
  const size=new T.Box3().setFromObject(root).getSize(new T.Vector3());
  const scale=new T.Group();scale.add(root);scale.scale.set(width/Math.max(size.x,.001),height===undefined?width/Math.max(size.x,.001):height/Math.max(size.y,.001),depth===undefined?width/Math.max(size.x,.001):depth/Math.max(size.z,.001));
  scale.position.set(x,y,z);scale.rotation.y=rotation;parent.add(scale);return true;
 }
 private disposeResources(){for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.geometries.clear();this.materials.clear();this.textures.clear();}
 dispose(){this.disposed=true;this.models.clear();this.disposeResources();}
}
