import * as T from 'three';

/** Original, jointed mesh characters. No sprites or licensed game models. */
export class ModelKit {
 readonly geometries=new Set<T.BufferGeometry>();
 readonly textures=new Set<T.Texture>();
 readonly materials=new Map<string,T.MeshStandardMaterial>();
 readonly sphere=this.geometry(new T.SphereGeometry(1,16,12));
 readonly cone=this.geometry(new T.ConeGeometry(1,1,7));
 readonly cylinder=this.geometry(new T.CylinderGeometry(1,1,1,10));
 readonly torus=this.geometry(new T.TorusGeometry(1,.12,6,24));
 readonly rock:T.BufferGeometry;
 readonly leaf:T.BufferGeometry;
 constructor(){
  const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.35,.20,-.36,.62,0,1);leafShape.bezierCurveTo(.36,.62,.35,.20,0,0);
  this.leaf=this.geometry(new T.ExtrudeGeometry(leafShape,{depth:.025,bevelEnabled:false,curveSegments:4}));this.leaf.translate(0,-.5,0);
  this.rock=this.geometry(new T.IcosahedronGeometry(1,2));
  const p=this.rock.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+Math.sin(x*31+y*17+z*13)*.13;p.setXYZ(i,x*n,y*n,z*n);}this.rock.computeVertexNormals();
 }
 geometry<G extends T.BufferGeometry>(g:G):G{this.geometries.add(g);return g;}
 material(color:string,metalness=0,glow=0){const key=`${color}:${metalness}:${glow}`;let m=this.materials.get(key);if(!m){m=new T.MeshStandardMaterial({color,roughness:metalness?.36:.82,metalness,emissive:color,emissiveIntensity:glow});this.materials.set(key,m);}return m;}
 mesh(parent:T.Object3D,g:T.BufferGeometry,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,metal=0,glow=0){const m=new T.Mesh(g,this.material(color,metal,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 ellipsoid(parent:T.Object3D,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number){return this.mesh(parent,this.sphere,color,x,y,z,sx,sy,sz);}
 joint(parent:T.Object3D,x:number,y:number,z:number){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 branch(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,color:string){const d=b.clone().sub(a),m=this.mesh(parent,this.cylinder,color,...a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number],r,d.length(),r*.85);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
 surface(color:string,seed:number){
  const m=this.material(color).clone(),canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const c=canvas.getContext('2d')!,image=c.createImageData(128,128),base=new T.Color(color).convertLinearToSRGB();
  let value=seed;for(let y=0;y<128;y++)for(let x=0;x<128;x++){value=(value*1664525+1013904223)>>>0;const grain=(value/4294967296-.5)*.22,vein=Math.sin(x*.12+Math.sin(y*.05)*4)*.055;const v=.73+grain+vein,i=(y*128+x)*4;image.data[i]=Math.min(255,base.r*255*v+30);image.data[i+1]=Math.min(255,base.g*255*v+30);image.data[i+2]=Math.min(255,base.b*255*v+30);image.data[i+3]=255;}
  c.putImageData(image,0,0);const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1.5,1.5);texture.colorSpace=T.SRGBColorSpace;this.textures.add(texture);m.color.set('#ffffff');m.map=texture;m.bumpMap=texture;m.bumpScale=.065;this.materials.set(`surface:${color}:${seed}`,m);return m;
 }
 dispose(){for(const t of this.textures)t.dispose();this.textures.clear();for(const g of this.geometries)g.dispose();for(const m of this.materials.values())m.dispose();this.geometries.clear();this.materials.clear();}
}
export type Rig={root:T.Group;body:T.Group;head:T.Group;arms:T.Group[];legs:T.Group[];ears:T.Group[];wings:T.Group[];weapon?:T.Group;scarf?:T.Group};
export function makeHero(k:ModelKit):Rig{
 const root=new T.Group(),body=k.joint(root,0,.35,0),cream='#fff1d0',shade='#dfceb3',pink='#d99181';
 k.ellipsoid(body,cream,0,.12,0,.18,.27,.145);k.ellipsoid(body,'#f9f3df',.025,.08,.095,.13,.20,.08);
 const head=k.joint(body,.06,.39,0);k.ellipsoid(head,cream,0,0,0,.225,.195,.18);k.ellipsoid(head,cream,.15,-.05,.015,.16,.105,.145);
 k.ellipsoid(head,'#443b38',.29,-.015,.03,.034,.025,.04);
 for(const z of [-.15,.15]){k.ellipsoid(head,'#182b2a',.105,.04,z,.055,.064,.026);k.ellipsoid(head,'#fffbee',.121,.061,z*1.08,.017,.021,.012);}
 const ears=[k.joint(head,-.11,.13,-.075),k.joint(head,.015,.17,.07)];
 ears.forEach((e,i)=>{e.rotation.z=.32+i*.22;k.ellipsoid(e,cream,0,.18,0,.066,.24,.054);k.ellipsoid(e,pink,.005,.20,.041,.034,.16,.014);});
 const arms=[k.joint(body,.065,.23,-.13),k.joint(body,.065,.23,.16)];
 arms.forEach(a=>{k.ellipsoid(a,shade,0,-.105,0,.054,.13,.052);k.ellipsoid(a,cream,.014,-.215,0,.065,.065,.06);});
 const legs=[k.joint(root,-.035,.23,-.09),k.joint(root,.055,.23,.095)];
 legs.forEach(l=>{k.ellipsoid(l,shade,0,-.075,0,.075,.145,.071);k.ellipsoid(l,cream,.045,-.19,.013,.12,.06,.079);});
 k.ellipsoid(body,cream,-.18,-.02,-.025,.105,.10,.105);
 k.mesh(body,k.torus,pink,0,.295,0,.18,.15,.16).rotation.x=Math.PI/2;
 const scarf=k.joint(body,-.13,.29,0);k.ellipsoid(scarf,'#b85f4e',-.18,-.02,0,.23,.055,.045);
 const weapon=k.joint(arms[1],.035,-.205,.025);
 k.mesh(weapon,k.cylinder,'#735e40',0,-.01,0,.024,.18,.024);
 k.mesh(weapon,k.sphere,'#eab956',0,.09,0,.09,.025,.038,.65);
 const blade=k.mesh(weapon,k.cone,'#fff0ad',0,.31,0,.065,.42,.035,.65,.35);blade.rotation.z=-.04;
 return {root,body,head,arms,legs,ears,wings:[],weapon,scarf};
}
export function makeCreature(k:ModelKit,kind:string,boss?:number):Rig{
 const root=new T.Group(),body=k.joint(root,0,0,0),head=k.joint(body,.24,.10,0),arms:T.Group[]=[],legs:T.Group[]=[],ears:T.Group[]=[],wings:T.Group[]=[];
 const stage=boss??0,isBoss=boss!==undefined,beetle=kind==='charger'||stage===2&&isBoss,flower=kind==='sentry'||stage===4&&isBoss,stag=isBoss&&stage===0;
 const colors=['#738868','#79c5c4','#d49c4a','#79a877','#b59dce','#e7c47f'],color=isBoss?colors[stage]:beetle?'#b68854':flower?'#79b7a4':'#b2a2c7';
 const shell=isBoss&&stage===2?'#554434':'#405e53';
 k.ellipsoid(body,shell,0,0,0,.29,.23,.20);
 if(beetle){
  k.ellipsoid(body,color,-.045,.095,0,.32,.23,.25);k.ellipsoid(head,'#72533c',.05,-.015,0,.17,.15,.20);
  for(const side of [-1,1])for(let i=0;i<3;i++){const leg=k.joint(body,-.20+i*.20,-.10,side*.15);leg.rotation.z=(i-1)*.45;k.ellipsoid(leg,'#6b6047',0,-.14,side*.045,.042,.16,.04);legs.push(leg);}
  for(let i=0;i<5;i++){const crystal=k.mesh(body,k.cone,'#efbf67',-.23+i*.105,.32,0,.09,.27+(i%2)*.10,.11,.4,.14);crystal.rotation.z=.4-i*.18;}
  k.mesh(head,k.cone,color,.18,.18,0,.065,.30,.07,.35).rotation.z=-.45;
 }else if(flower){
  head.position.set(0,.16,0);k.ellipsoid(body,'#456f58',0,-.23,0,.08,.3,.08);
  for(let i=0;i<7;i++){const petal=k.joint(head,0,0,0);petal.rotation.z=i*Math.PI*2/7;const leaf=k.ellipsoid(petal,color,0,.24,0,.12,.27,.065);leaf.rotation.x=.35;wings.push(petal);}
  k.ellipsoid(head,'#ebd487',0,0,.1,.16,.16,.11);k.ellipsoid(head,'#fff3b9',0,0,.2,.07,.07,.04);
  for(const side of [-1,1])k.ellipsoid(body,'#689376',side*.18,-.3,0,.23,.075,.11).rotation.z=side*.3;
 }else{
  k.ellipsoid(head,color,0,0,0,.20,.18,.17);
  if(stag){
   k.ellipsoid(body,'#86956e',-.08,.04,0,.40,.23,.19);head.position.set(.34,.19,0);
   for(const side of [-1,1]){const antler=k.joint(head,-.07,.1,side*.1);k.branch(antler,new T.Vector3(),new T.Vector3(-.12,.42,0),.025,'#e0c591');for(let i=1;i<4;i++)k.branch(antler,new T.Vector3(-.03*i,.1*i,0),new T.Vector3(.1-i*.02,.14*i+.04,side*.06),.017,'#e0c591');ears.push(antler);}
   for(const x of [-.28,.22])for(const z of [-.12,.12]){const l=k.joint(body,x,-.10,z);k.ellipsoid(l,'#647a58',0,-.18,0,.052,.21,.055);legs.push(l);}
  }else{
   for(const side of [-1,1]){const wing=k.joint(body,side*.16,.08,-.03);wing.rotation.z=-side*.35;for(let i=0;i<4;i++){const feather=k.ellipsoid(wing,color,side*(.20+i*.067),-.04-i*.045,0,.31-i*.03,.12,.048);feather.rotation.z=side*(.3+i*.20);}wings.push(wing);}
   for(const side of [-1,1]){k.ellipsoid(head,'#efdb9d',side*.085,.04,.15,.088,.102,.04);k.ellipsoid(head,'#172f33',side*.085,.04,.186,.03,.056,.019);}
   k.mesh(head,k.cone,'#dcaf67',.03,-.10,.16,.06,.13,.06).rotation.z=.6;
   for(const x of [-.11,.12]){const l=k.joint(body,x,-.14,.03);k.ellipsoid(l,'#c7a86d',.04,-.11,0,.075,.12,.05);legs.push(l);}
  }
 }
 if(beetle||stag)for(const z of [-.15,.15]){k.ellipsoid(head,'#ffd88a',.10,.05,z,.05,.046,.028);k.ellipsoid(head,'#202e29',.12,.05,z*1.12,.021,.035,.014);}
 if(isBoss){root.scale.setScalar(stage===2?2.2:stage===0?2.3:2.1);for(let i=0;i<3;i++)k.mesh(body,k.cone,colors[stage],-.12+i*.12,.32,0,.07,.22,.08,.3,.18);}
 return {root,body,head,arms,legs,ears,wings};
}
