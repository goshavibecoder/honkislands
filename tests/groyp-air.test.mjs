import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {WalkMotion} from '../walk-motion.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url))),{prepareGroypAir}=await import(moduleURL(new URL('../groyp-air.js',import.meta.url))),{prepareBalloonWorld}=await import(moduleURL(new URL('../balloon-world.js',import.meta.url))),{prepareIslandTransport}=await import(moduleURL(new URL('../island-transport-world.js',import.meta.url))),{mountBalloonTravel}=await import(moduleURL(new URL('../balloon-travel.js',import.meta.url))),{mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url)));
class Element{constructor(){this.events={};this.nodes=new Map();this.children=[];this.attrs={};this.classList={add(){},remove(){},toggle(){}}}addEventListener(k,f){this.events[k]=f}removeEventListener(){}append(e){this.children.push(e)}querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k)}setAttribute(k,v){this.attrs[k]=v}focus(){}remove(){}getContext(){return {fillRect(){},fillText(){},beginPath(){},ellipse(){},fill(){}}}}
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.window=new Element();const host=new Element();globalThis.document={createElement:()=>new Element(),getElementById:()=>host};
const manifest=JSON.parse(readFileSync(new URL('../models/groyp-air-v74.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),actorScene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
const root=new THREE.Group(),balloon=prepareBalloonWorld(root,'arcade-district'),transport=prepareIslandTransport(root,'arcade-district'),station=prepareGroypAir(root,balloon,actorScene);root.updateMatrixWorld(true);
let skin;actorScene.traverse(o=>{if(o.isSkinnedMesh)skin=o});
function advance(seconds,player=station.interactionPosition){for(let t=0;t<seconds;t+=1/60)station.update(1/60,player);root.updateMatrixWorld(true)}
function preview(name){if(!process.env.GROYP_PREVIEW)return;const positions=[],uv=Array.from(skin.geometry.attributes.uv.array),indices=Array.from(skin.geometry.index.array),v=new THREE.Vector3(),inverse=station.actor.matrixWorld.clone().invert();for(let i=0;i<skin.geometry.attributes.position.count;i++){v.fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,v);v.applyMatrix4(skin.matrixWorld).applyMatrix4(inverse);positions.push(...v.toArray())}writeFileSync('/workspace/scratch/77f67eb7dcc9/groyper-'+name+'.json',JSON.stringify({positions,uv,indices}))}
async function fresh(){const model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene,root=new THREE.Group(),balloon=prepareBalloonWorld(root,'arcade-district'),station=prepareGroypAir(root,balloon,model);return {root,balloon,station}}
function tick(f,seconds,hz=60,player=null){for(let i=0;i<Math.round(seconds*hz);i++){f.controller?.update(1/hz);f.station.update(1/hz,player);f.root.updateMatrixWorld(true)}}

test('the supplied character keeps his connected rig, textured skin and smooth local joint animation',()=>{
 assert.ok(skin);assert.equal(skin.geometry.attributes.position.count,10487);assert.ok(skin.skeleton.bones.length>40);assert.ok(skin.material.map&&skin.material.normalMap&&skin.material.roughnessMap);assert.equal(skin.frustumCulled,false);
 const weights=skin.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<.02);
 advance(.05,null);preview('rest');const rest=station.bones.hand_l.getWorldPosition(new THREE.Vector3()),head=station.bones.head.quaternion.clone();advance(1.25);preview('wave');const wave=station.bones.hand_l.getWorldPosition(new THREE.Vector3());assert.ok(wave.y>rest.y+.5);assert.ok(station.bones.head.quaternion.angleTo(head)>.001);
 for(let frame=0;frame<180;frame++){station.update(1/60,station.interactionPosition);root.updateMatrixWorld(true);for(const bone of Object.values(station.bones)){assert.ok(bone);assert.ok(bone.matrixWorld.elements.every(Number.isFinite))}if(frame%30===0)for(let i=0;i<skin.geometry.attributes.position.count;i+=41){const p=new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,p);assert.ok(p.toArray().every(Number.isFinite));assert.ok(p.length()<4)}}
});

test('the station is beyond the circuit, its counter is solid, and a continuous walking route reaches the dispatcher',()=>{
 assert.ok(station.bounds.min.z>12);const meshes=[transport,balloon,station].map(w=>{const m=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(w.navPositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.updateMatrixWorld();return m}),ray=new THREE.Raycaster(),boxes=[...transport.extraBoxes,...balloon.extraBoxes,...station.extraBoxes];
 const path=[[0,11.5],[0,13.55],[-3.8,13.55]],floorAt=(x,z)=>{ray.set(new THREE.Vector3(x,.5,z),new THREE.Vector3(0,-1,0));return ray.intersectObjects(meshes,false)[0]?.point.y};
 for(let segment=1;segment<path.length;segment++){const a=path[segment-1],b=path[segment];for(let n=0;n<=100;n++){const x=a[0]+(b[0]-a[0])*n/100,z=a[1]+(b[1]-a[1])*n/100,y=floorAt(x,z);assert.ok(Number.isFinite(y));assert.ok(transport.canStand(x,z));assert.equal(boxes.some(b=>y+1.5>b.min.y&&y+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17),false,`blocked at ${x},${z}`)}}
 assert.ok(station.extraBoxes.some(b=>b.containsPoint(new THREE.Vector3(-3.8,.5,14.23))));
 const camera=new THREE.PerspectiveCamera(66,1,.035,100);camera.position.copy(station.interactionPosition);camera.position.y+=1.65;camera.lookAt(station.interactionPosition.clone().add(new THREE.Vector3(0,1.4,1.4)));assert.ok(station.pick(camera,new THREE.Vector2()));
 const viewer={slug:'arcade-district',active:true,mode:'walk',camera,foot:station.interactionPosition.y,motion:new WalkMotion(),config:{eye:1.65},clearWalkInput(){}},controller=mountBalloonTravel(viewer,balloon);assert.ok(controller.openMap(),'clicking the dispatcher must open the nearby flight map');controller.dispose();
});

test('Groyper dozes when left alone, greets arrivals, and reacts when approached suddenly',async()=>{
 const f=await fresh(),s=f.station,head=s.bones.head.quaternion.clone();tick(f,17);
 assert.ok(s.bones.head.quaternion.angleTo(head)>.2);const low=s.bones.hand_l.getWorldPosition(new THREE.Vector3()).y;
 tick(f,1,60,s.interactionPosition);assert.ok(s.bones.hand_l.getWorldPosition(new THREE.Vector3()).y>low+.5);
 assert.ok(s.bones.head.quaternion.angleTo(head)<.15);
 tick(f,.2,60,s.interactionPosition.clone().add(new THREE.Vector3(0,0,-2)));tick(f,.2,60,s.interactionPosition);
 assert.ok(s.actor.position.y>.01,'sudden close approach should produce a small surprised hop');
});

test('one stamped ticket slides along the tray, lifts for reading and is stowed before boarding',async()=>{
 for(const hz of [30,60,120]){
  const f=await fresh(),s=f.station;assert.ok(s.beginTicket('Goat Mountain'));assert.equal(s.beginTicket('Neon Castle'),false);const parent=s.ticket.parent;
  tick(f,1.2,hz);assert.equal(s.stamp.visible,true);const ink=new THREE.Box3().setFromObject(s.stamp),paper=new THREE.Box3().setFromObject(s.ticket);assert.ok(Math.abs(ink.min.y-paper.min.y)<.02);assert.ok(ink.min.x<paper.max.x&&ink.max.x>paper.min.x&&ink.min.z<paper.max.z&&ink.max.z>paper.min.z);
  let previous=s.ticket.getWorldPosition(new THREE.Vector3()),previousQ=s.ticket.getWorldQuaternion(new THREE.Quaternion()),flatHeight=s.ticket.position.y,seenShow=false;
  for(let t=1.2;t<3.4;t+=1/hz){tick(f,1/hz,hz);const p=s.ticket.getWorldPosition(new THREE.Vector3()),q=s.ticket.getWorldQuaternion(new THREE.Quaternion());assert.equal(s.ticket.parent,parent);assert.ok(p.distanceTo(previous)<3.6/hz,'ticket should move continuously');assert.ok(q.angleTo(previousQ)<.18,'ticket should turn smoothly');if(t<1.9)assert.ok(Math.abs(s.ticket.position.y-flatHeight)<.002,'paper should stay on its tray while sliding');if(t>2.5&&t<2.75){seenShow=true;assert.ok(s.ticket.visible);assert.ok(s.ticket.position.y>1.2);assert.ok(s.ticket.position.z< -.8)}previous.copy(p);previousQ.copy(q)}
  assert.ok(seenShow);assert.equal(s.ticketReady,true);assert.equal(s.ticket.visible,false);s.cancelService();assert.equal(s.phase,'idle');assert.equal(s.ticket.visible,false);assert.equal(s.beginTicket('Honkster Arena'),true);assert.ok(s.ticket.position.distanceTo(new THREE.Vector3(.28,.914,-.77))<1e-8);s.cancelService();
 }
});

test('the displayed pass faces the player, stays readable in portrait and landscape, and clears the counter while stowing',async()=>{
 const f=await fresh(),s=f.station;s.beginTicket('Meme Gallery');tick(f,2.7);const center=s.ticket.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).applyQuaternion(s.ticket.getWorldQuaternion(new THREE.Quaternion()));assert.ok(normal.dot(s.ticketView.clone().sub(center).normalize())>.999);
 for(const aspect of [.46,9/16,4/3,16/9]){const camera=new THREE.PerspectiveCamera(66,aspect,.035,100);camera.position.copy(s.ticketView);camera.lookAt(s.ticketLook);camera.updateMatrixWorld(true);for(const x of [-.25,.25])for(const y of [-.125,.125]){const p=s.ticket.localToWorld(new THREE.Vector3(x,y,.005)).project(camera);assert.ok(Math.abs(p.x)<.98&&Math.abs(p.y)<.98,'ticket is cropped at aspect '+aspect+': '+p.toArray())}}
 const counter=s.booth.getObjectByName('GROYP_AIR_ticket_counter'),counterBounds=new THREE.Box3().setFromObject(counter);for(let t=2.7;t<3.35;t+=1/120){tick(f,1/120,120);assert.equal(new THREE.Box3().setFromObject(s.ticket).intersectsBox(counterBounds),false,'stowing ticket intersects the counter')}
 s.cancelService();
});

test('farewell follows a supported route around the counter and posts, with an attached animated rig',async()=>{
 const f=await fresh(),s=f.station;s.beginTicket('Meme Gallery');tick(f,3.3);s.beginFarewell();
 const staticBoxes=s.extraBoxes.slice(0,-1),navs=[f.balloon,s].map(w=>{const m=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(w.navPositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.updateMatrixWorld();return m}),ray=new THREE.Raycaster();let skin;s.actor.traverse(o=>{if(o.isSkinnedMesh)skin=o});
 let previous=s.actor.position.clone();
 for(let frame=0;frame<210;frame++){
  tick(f,1/60);assert.ok(s.actor.position.distanceTo(previous)<.055);previous.copy(s.actor.position);
  const world=s.actor.getWorldPosition(new THREE.Vector3());ray.set(world.clone().add(new THREE.Vector3(0,.5,0)),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObjects(navs,false).length,'dispatcher steps off the harbour');
  if(frame%4===0)for(let i=0;i<skin.geometry.attributes.position.count;i+=17){const p=new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,p).applyMatrix4(skin.matrixWorld);assert.ok(p.toArray().every(Number.isFinite));assert.equal(staticBoxes.some(b=>b.containsPoint(p)),false,`Dispatcher clips booth at frame ${frame}: ${p.toArray()}`)}
 }
 assert.ok(s.actor.position.x>2);assert.ok(s.actor.position.z< -1.3);const hand=s.bones.hand_l.getWorldPosition(new THREE.Vector3());assert.ok(hand.y>1.5);
});

test('ticket service precedes boarding; departure shows the waving dispatcher and cancellation restores both actors',async()=>{
 for(const hz of [30,60,120]){
  const f=await fresh(),s=f.station,camera=new THREE.PerspectiveCamera(66,1,.035,100);camera.rotation.order='YXZ';camera.position.copy(s.interactionPosition).add(new THREE.Vector3(0,1.65,0));
  const viewer={slug:'arcade-district',active:true,mode:'walk',groypAir:s,camera,foot:s.interactionPosition.y,yaw:0,pitch:0,motion:new WalkMotion(),config:{eye:1.65},clearWalkInput(){}},controller=mountBalloonTravel(viewer,f.balloon);f.controller=controller;const original=camera.position.clone();let fades=0;
  const cancelled=controller.depart(()=>fades++,'goat-mountain');assert.equal(controller.active,true);assert.equal(await controller.depart(),false);tick(f,1,hz);assert.equal(controller.model.phase,'parked');assert.equal(fades,0);controller.cancel();assert.equal(await cancelled,false);assert.ok(camera.position.distanceTo(original)<1e-8);assert.equal(s.phase,'idle');
  const trip=controller.depart(()=>fades++,'goat-mountain');tick(f,2,hz);assert.equal(controller.model.phase,'parked');assert.equal(fades,0);tick(f,3.2,hz);assert.equal(controller.model.phase,'ascending');assert.equal(s.phase,'farewell');assert.equal(fades,1);assert.ok(s.actor.position.x>1);
  const direction=camera.getWorldDirection(new THREE.Vector3()),target=s.farewellLook.clone().sub(camera.position).normalize();assert.ok(direction.dot(target)>.98,'farewell must be visible from the basket');
  tick(f,3,hz);assert.equal(await trip,true);assert.equal(controller.active,true);controller.cancel();assert.equal(s.phase,'idle');assert.ok(camera.position.distanceTo(original)<1e-8);assert.ok(s.actor.position.distanceTo(new THREE.Vector3(0,0,.1))<1e-8);controller.dispose();
 }
});

test('static scenery batching preserves the dispatcher skin and bones while combining the booth materials',()=>{
 const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start),viewer={root,config:{},renderer:{capabilities:{getMaxAnisotropy:()=>8}}};
 new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)).call(viewer,THREE,mergeGeometries,{animations:[]},'arcade-district');assert.equal(skin.parent!==null,true);assert.ok(skin.skeleton.bones.every(b=>b.parent));assert.ok(viewer.staticGroup.children.some(o=>o.material.name==='GROYP AIR aged timber'));assert.equal(station.ticket.children.length,2,'animated paper must not be baked into static scenery');assert.ok(station.ticket.children.every(o=>o.parent===station.ticket&&o.userData.islandRide));
});
