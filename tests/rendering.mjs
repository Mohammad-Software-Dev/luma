import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.self=globalThis;
const compile=name=>ts.transpileModule(fs.readFileSync(new URL(`../app/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const modelURL=url(compile('models-3d').replace("'three'",JSON.stringify(import.meta.resolve('three'))));
const assetURL=url(compile('natural-assets').replace("'three'",JSON.stringify(import.meta.resolve('three'))).replace("'three/addons/loaders/GLTFLoader.js'",JSON.stringify(import.meta.resolve('three/addons/loaders/GLTFLoader.js'))));
const avatarURL=url(compile('avatar-3d').replace("'three'",JSON.stringify(import.meta.resolve('three'))).replace("'three/addons/loaders/GLTFLoader.js'",JSON.stringify(import.meta.resolve('three/addons/loaders/GLTFLoader.js'))));
const guardianURL=url(compile('guardian-3d').replace("'three'",JSON.stringify(import.meta.resolve('three'))).replace("'three/addons/loaders/GLTFLoader.js'",JSON.stringify(import.meta.resolve('three/addons/loaders/GLTFLoader.js'))));
const rendererURL=url(compile('renderer-3d').replace("'three'",JSON.stringify(import.meta.resolve('three'))).replace("'three/addons/utils/BufferGeometryUtils.js'",JSON.stringify(import.meta.resolve('three/addons/utils/BufferGeometryUtils.js'))).replace("'./models-3d'",JSON.stringify(modelURL)).replace("'./natural-assets'",JSON.stringify(assetURL)).replace("'./avatar-3d'",JSON.stringify(avatarURL)).replace("'./guardian-3d'",JSON.stringify(guardianURL)).replace("'./hollow'",JSON.stringify(url(compile('hollow')))));
const canvas=()=>({style:{},dataset:{},setAttribute(){},addEventListener(){},removeEventListener(){},remove(){this.removed=true},getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}}}});
globalThis.document={createElement:canvas};
T.TextureLoader.prototype.load=function(_url,loaded){const texture=new T.Texture();queueMicrotask(()=>loaded(texture));return texture;};
const {World3D,cameraDistance}=await import(rendererURL);
const host={...canvas(),width:1280,height:720,parentElement:{insertBefore(){}}};
let draws=0,disposed=0;
const fakeRenderer={shadowMap:{},info:{render:{calls:0,triangles:0},memory:{geometries:0,textures:0}},setSize(){},render(scene,camera){scene.updateMatrixWorld();camera.updateMatrixWorld();draws++},dispose(){disposed++},forceContextLoss(){}};
const world=new World3D(host,()=>fakeRenderer);
let count=0;function check(name,fn){fn();console.log('PASS '+name);count++;}
const room=()=>({name:'Test',tint:'#000',platforms:[{x:0,y:705,w:550,h:180},{x:600,y:450,w:240,h:55}],doors:[{x:50,y:705,to:0,label:'Exit'}],enemies:[{x:950,y:645,kind:'keeper',boss:0,hp:10,defeat:0,mode:'patrol',direction:1,phase:0,timer:0}],motes:[],shrine:230,beacon:{x:710,y:415}});
const frame=(stage=0)=>({room:room(),state:{stage,room:stage,bosses:[],time:0},camera:0,viewport:1440,t:1,reduced:false,started:true,player:{x:230,y:705,vx:0,vy:0,face:1,grounded:true},attack:0,combo:0,dash:false,landing:0,invincible:0,broken:new Set(),regrowth:new Map()});
check('Perspective projects gameplay-plane positions exactly at multiple viewport widths',()=>{
 for(const width of [720,1280,1920]){host.width=width;host.height=720;const f=frame();f.viewport=width/720*810;f.camera=425;world.render(f);for(const [x,y] of [[500,705],[920,450],[1200,190]]){const v=new T.Vector3(x*.01,8.1-y*.01,0).project(world.camera);assert.ok(Math.abs((v.x+1)/2*f.viewport-(x-f.camera))<1e-8);assert.ok(Math.abs((1-v.y)/2*810-y)<1e-8);}assert.ok(Number.isFinite(cameraDistance()));}
});
check('All six biomes produce finite, nonempty geometry and preserve platform anchors',()=>{
 const errors=[],old=console.error;console.error=(...a)=>errors.push(a.join(' '));try{for(let stage=0;stage<6;stage++){const f=frame(stage);f.room.enemies[0].boss=stage;world.render(f);let meshes=0;world.scene.traverse(o=>{if(o instanceof T.Mesh){meshes++;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));}});assert.ok(meshes>35);assert.equal(world.platforms.length,2);assert.ok(Math.abs(world.platforms[1].position.y-3.6)<1e-8);}}finally{console.error=old}assert.deepEqual(errors,[],'Batching must never silently discard incompatible geometry');
});
check('Moving platforms update without rebuilding or replacing room resources',()=>{const f=frame();world.render(f);const old=world.platforms[1],resources=world.roomGeometries.size;f.room.platforms[1].x+=35;f.room.platforms[1].y-=20;world.render(f);assert.equal(world.platforms[1],old);assert.ok(Math.abs(old.position.x-6.35)<1e-8);assert.ok(Math.abs(old.position.y-3.8)<1e-8);assert.equal(world.roomGeometries.size,resources);});
check('Room transitions release every previous room geometry',()=>{world.render(frame());let released=0;const expected=world.roomGeometries.size;for(const g of world.roomGeometries)g.addEventListener('dispose',()=>released++);world.render(frame(4));assert.equal(released,expected);assert.ok(world.roomGeometries.size<100);});
check('Crystal model state follows permanent breaks, regrowth, and boss victory',()=>{const f=frame(2);f.state.room=14;world.render(f);assert.equal(world.seals.length,2);f.regrowth.set(1080,8);world.render(f);assert.equal(world.seals[0].root.scale.y,.12);f.regrowth.set(1080,1);world.render(f);assert.equal(world.seals[0].root.scale.y,.625);f.state.bosses=[2];world.render(f);assert.equal(world.seals[0].root.visible,false);});
check('Hero attack, movement, and reduced-motion idle have distinct joint poses',()=>{const f=frame();world.render(f);const idle=world.hero.arms[1].rotation.z;f.attack=.15;f.combo=2;f.t+=.1;world.render(f);assert.notEqual(world.hero.arms[1].rotation.z,idle);f.attack=0;f.dash=true;world.render(f);assert.equal(world.hero.body.rotation.z,-.7);f.dash=false;f.reduced=true;f.t=5;world.render(f);const ear=world.hero.ears[0].rotation.z;f.t=8;world.render(f);assert.equal(world.hero.ears[0].rotation.z,ear);});
check('Context loss disables rendering; restoration retains the live scene',()=>{let prevented=false;world.onLost({preventDefault(){prevented=true}});assert.ok(prevented);assert.equal(host.dataset.renderer,'canvas-fallback');const before=draws;world.render(frame());assert.equal(draws,before);world.onRestored();assert.equal(world.active,true);world.render(frame());assert.ok(draws>before);});
const originalLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(path){const file=new URL('../public'+path,import.meta.url),data=fs.readFileSync(file);if(path.endsWith('.gltf')){const json=JSON.parse(data);for(const buffer of json.buffers)buffer.uri='data:application/octet-stream;base64,'+fs.readFileSync(new URL(buffer.uri,file)).toString('base64');return this.parseAsync(JSON.stringify(json),'');}return this.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');};
globalThis.ProgressEvent=class{constructor(type,options){this.type=type;Object.assign(this,options)}};
await world.avatar.load();
check('Imported skinned hero loads and blends real animation clips without invalid transforms',()=>{
 assert.ok(world.avatar.loaded);const avatar=world.avatar,f=frame();assert.deepEqual([...avatar.actions.keys()].sort(),['Guarding','Jump','Running']);
 for(const pose of ['idle','run','jump','attack']){f.player.grounded=pose!=='jump';f.player.vx=pose==='run'?280:0;f.attack=pose==='attack'?.15:0;for(let i=0;i<20;i++){f.t+=1/60;avatar.update(f,1/60);}avatar.root.updateMatrixWorld(true);avatar.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
 const bounds=new T.Box3().setFromObject(avatar.root,true),size=bounds.getSize(new T.Vector3());assert.ok(size.y>.5&&size.y<1.8,`hero height ${size.y} must match gameplay scale`);
});
await world.guardian.load();
check('Imported guardian maps combat states to finite skeletal poses',()=>{
 assert.ok(world.guardian.loaded);const e=room().enemies[0];
 for(const mode of ['patrol','windup','attack','recover','reposition','stagger']){e.mode=mode;for(let i=0;i<20;i++)world.guardian.update(e,1/60,true,false);world.guardian.root.updateMatrixWorld(true);world.guardian.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
 e.hp=0;e.defeat=.4;world.guardian.update(e,1/60,true,false);assert.equal(world.guardian.action.getClip().name,'Die.000');
 world.guardian.update(undefined,1/60,true,false);assert.equal(world.guardian.root.visible,false);
});
await world.natural.load();
check('All shipped scan variants load, batch without loss, and survive room transitions',()=>{
 assert.equal(world.natural.loaded,5);assert.deepEqual(world.natural.failures,[]);const errors=[],old=console.error;console.error=(...a)=>errors.push(a.join(' '));
 try{world.render(frame());const owned=world.natural.geometries.size;world.render(frame(2));world.render(frame());assert.equal(world.natural.geometries.size,owned);assert.ok(world.natural.rock.map);assert.ok(world.natural.rock.normalMap);}finally{console.error=old;}assert.deepEqual(errors,[]);
});
GLTFLoader.prototype.loadAsync=async()=>{throw new Error('simulated missing asset');};
const {NaturalAssets}=await import(assetURL);const missing=new NaturalAssets();await missing.load();
check('Missing models degrade independently and never prevent game startup',()=>{assert.equal(missing.loaded,0);assert.equal(missing.failures.length,5);assert.equal(missing.place(new T.Group(),'rocks',0,0,0,0,1),false);missing.dispose();});
GLTFLoader.prototype.loadAsync=originalLoad;
check('Destroy disposes resources once and removes the extra canvas',()=>{world.destroy();world.destroy();assert.equal(disposed,1);assert.equal(world.kit.geometries.size,0);assert.equal(world.roomGeometries.size,0);assert.equal(world.canvas.removed,true);assert.equal(world.natural.geometries.size,0);assert.equal(world.avatar.geometries.size,0);assert.equal(world.guardian.geos.size,0);});
console.log(`\n${count} 3D rendering checks passed (WebGL submission mocked; browser checks verify actual GPU rendering).`);
