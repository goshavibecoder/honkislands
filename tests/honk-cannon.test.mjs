import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {HonkCannonShot,CANNON_NET} from '../honk-cannon-motion.js';
import {KART_TRACK} from '../island-transport-motion.js';
import {WalkMotion} from '../walk-motion.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url))),{cloneGroyperRig,prepareHonkCannon}=await import(moduleURL(new URL('../honk-cannon-world.js',import.meta.url))),{prepareBalloonWorld}=await import(moduleURL(new URL('../balloon-world.js',import.meta.url))),{prepareGroypAir}=await import(moduleURL(new URL('../groyp-air.js',import.meta.url))),{prepareIslandTransport}=await import(moduleURL(new URL('../island-transport-world.js',import.meta.url))),{mountHonkCannon}=await import(moduleURL(new URL('../honk-cannon.js',import.meta.url))),{mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url)));
class Element{constructor(){this.events={};this.nodes=new Map();this.children=[];this.classList={add(){},remove(){}}}addEventListener(k,f){this.events[k]=f}removeEventListener(){}append(e){this.children.push(e)}querySelector(k){if(!this.nodes.has(k)){const e=new Element();e.value=k==='.cannon-angle'?'45':k==='.cannon-power'?'122':'';this.nodes.set(k,e)}return this.nodes.get(k)}remove(){this.removed=true}getContext(){return {fillRect(){},fillText(){},beginPath(){},ellipse(){},fill(){}}}}
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.window=new Element();const host=new Element();globalThis.document={createElement:()=>new Element(),getElementById:()=>host};
const manifest=JSON.parse(readFileSync(new URL('../models/groyp-air-v74.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),source=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene,head=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url))));
const root=new THREE.Group(),copy=cloneGroyperRig(source),world=prepareHonkCannon(root,copy,head),balloon=prepareBalloonWorld(root,'arcade-district'),air=prepareGroypAir(root,balloon,source),transport=prepareIslandTransport(root,'arcade-district',{driverHead:head});root.updateMatrixWorld(true);
function advance(model,seconds,hz=60,render=false){for(let i=0;i<Math.round(seconds*hz);i++){model.update(1/hz);if(render){world.render(model,1/hz);root.updateMatrixWorld(true)}}}

test('a default shot passes all three rings and lands in the net at every refresh rate',()=>{
 const finals=[];for(const hz of [30,60,120]){const shot=new HonkCannonShot();assert.ok(shot.fire());assert.equal(shot.fire(),false);assert.equal(shot.aim(60,13),false);advance(shot,8,hz);assert.equal(shot.phase,'finished');assert.equal(shot.score,350);assert.ok(shot.landed);assert.deepEqual(shot.rings,[true,true,true]);assert.ok(Math.hypot(shot.position.x-CANNON_NET.x,shot.position.z-CANNON_NET.z)<.2);finals.push(shot.position)}assert.deepEqual(finals[0],finals[1]);assert.deepEqual(finals[1],finals[2]);
 for(const [a,p] of [[35,10.5],[60,13.5]]){const shot=new HonkCannonShot();shot.aim(a,p);shot.fire();advance(shot,9);assert.equal(shot.active,false);assert.ok(Object.values(shot.position).every(Number.isFinite));shot.cancel();assert.equal(shot.phase,'idle');assert.ok(shot.fire())}
});

test('the two Groypers share textures but have independent attached skeletons',()=>{
 let originalSkin,clonedSkin;source.traverse(o=>{if(o.isSkinnedMesh)originalSkin=o});copy.traverse(o=>{if(o.isSkinnedMesh)clonedSkin=o});assert.equal(originalSkin.geometry,clonedSkin.geometry);assert.equal(originalSkin.material,clonedSkin.material);assert.notEqual(originalSkin.skeleton,clonedSkin.skeleton);
 for(const [i,bone] of clonedSkin.skeleton.bones.entries()){assert.notEqual(bone,originalSkin.skeleton.bones[i]);assert.ok(bone.parent)}
 const original=air.bones.upperarm_r.quaternion.clone(),shot=new HonkCannonShot();shot.fire();advance(shot,1.1,60,true);assert.ok(air.bones.upperarm_r.quaternion.equals(original));assert.ok(world.bones.upperarm_r.quaternion.angleTo(original)>.1);
});

test('the cannon has an open barrel and a continuous protected approach beyond the kart circuit',()=>{
 const reset=new HonkCannonShot();world.render(reset,0);root.updateMatrixWorld(true);
 const navs=[air,balloon,world].map(w=>{const m=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(w.navPositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.updateMatrixWorld();return m}),ray=new THREE.Raycaster(),boxes=[...air.extraBoxes,...balloon.extraBoxes,...world.extraBoxes],path=[[-3.8,13.55],[-10.5,13.55],[-10.5,14.6]];
 for(let i=1;i<path.length;i++)for(let n=0;n<=150;n++){const a=path[i-1],b=path[i],x=a[0]+(b[0]-a[0])*n/150,z=a[1]+(b[1]-a[1])*n/150;ray.set(new THREE.Vector3(x,.5,z),new THREE.Vector3(0,-1,0));const y=ray.intersectObjects(navs,false)[0]?.point.y;assert.ok(Number.isFinite(y),`unsupported path at ${x},${z}`);assert.ok(transport.canStand(x,z));assert.equal(boxes.some(b=>y+1.5>b.min.y&&y+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17),false,`blocked path at ${x},${z}`)}
 for(let i=0;i<256;i++){const a=i*Math.PI/128,x=Math.sin(a)*KART_TRACK.rx,z=Math.cos(a)*KART_TRACK.rz;assert.equal(world.extraBoxes.some(b=>b.containsPoint(new THREE.Vector3(x,.6,z))),false,'cannon obstructs the race circuit')}
 world.pivot.updateWorldMatrix(true,true);const origin=new THREE.Vector3(0,0,2.4).applyMatrix4(world.pivot.matrixWorld),direction=new THREE.Vector3(0,0,-1).transformDirection(world.pivot.matrixWorld);ray.set(origin,direction);ray.far=2.8;assert.equal(ray.intersectObject(world.barrel,false).length,0,'muzzle is capped with an opaque face');
 assert.ok(world.extraBoxes.some(b=>b.containsPoint(new THREE.Vector3(-13,1.6,14))))
});

test('loading and flight keep a full-sized HONK, connected Groyper limbs and a deforming supported net',()=>{
 const shot=new HonkCannonShot();shot.fire();let skin;copy.traverse(o=>{if(o.isSkinnedMesh)skin=o});
 for(let frame=0;frame<330;frame++){shot.update(1/60);world.render(shot,1/60);root.updateMatrixWorld(true);assert.equal(world.round.scale.x,1);assert.ok(world.round.position.toArray().every(Number.isFinite));if(frame%12===0)for(let i=0;i<skin.geometry.attributes.position.count;i+=53){const p=new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,p);assert.ok(p.toArray().every(Number.isFinite));assert.ok(p.length()<4)}}
 assert.ok(shot.landed);assert.ok(world.round.visible);assert.ok(world.net.geometry.attributes.position.array.every(Number.isFinite));assert.ok(world.rings.every(r=>r.material.color.g>.5));
});

test('touch controls adjust aim, launch once, restore the camera and support repeated shots and cancellation',()=>{
 const camera=new THREE.PerspectiveCamera();camera.rotation.order='YXZ';camera.position.copy(world.interact).add(new THREE.Vector3(0,1.65,0));camera.lookAt(new THREE.Vector3(-13,1.2,14));const original=camera.position.clone(),viewer={camera,foot:.088,yaw:camera.rotation.y,pitch:camera.rotation.x,mode:'walk',active:true,motion:new WalkMotion(),clearWalkInput(){}};
 const c=mountHonkCannon(viewer,world);assert.ok(c.open());const panel=host.children.at(-1),angle=panel.querySelector('.cannon-angle'),power=panel.querySelector('.cannon-power');angle.value='48';angle.events.input();power.value='125';power.events.input();assert.equal(c.model.angle,48);assert.equal(c.model.power,12.5);assert.ok(c.fire());assert.equal(c.fire(),false);assert.equal(angle.disabled,true);for(let i=0;i<600;i++)c.update(1/60);assert.equal(c.active,false);assert.ok(camera.position.distanceTo(original)<1e-8);assert.equal(angle.disabled,false);assert.ok(c.fire());for(let i=0;i<80;i++)c.update(1/60);c.cancel();assert.equal(c.model.phase,'idle');assert.ok(camera.position.distanceTo(original)<1e-8);assert.equal(c.panelOpen,false);c.dispose();assert.ok(panel.removed);
});

test('production material batching retains both rigs, the moving barrel and the HONK projectile',()=>{
 const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start),viewer={root,config:{},renderer:{capabilities:{getMaxAnisotropy:()=>8}}};new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)).call(viewer,THREE,mergeGeometries,{animations:[]},'arcade-district');assert.ok(world.round.parent);assert.ok(world.barrel.parent);assert.ok(world.bones.head.parent);assert.ok(air.bones.head.parent);for(const o of viewer.staticGroup.children)assert.ok(o.geometry.attributes.position.count>0);
});

if(process.env.CANNON_PREVIEW){const meshes=[];world.render(new HonkCannonShot(),0);root.updateMatrixWorld(true);world.group.traverse(o=>{if(!o.isMesh||!o.visible)return;let parent=o.parent;while(parent&&parent!==world.group){if(!parent.visible)return;parent=parent.parent}const p=o.geometry.attributes.position,positions=[],v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(o.isSkinnedMesh)o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);positions.push(...v.toArray())}meshes.push({positions,indices:o.geometry.index?Array.from(o.geometry.index.array):null,color:o.material.map?[.35,.58,.17]:o.material.color.toArray()})});writeFileSync('/workspace/scratch/77f67eb7dcc9/cannon-scene.json',JSON.stringify(meshes))}
