import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {BALLOON_ISLANDS,BalloonJourney} from '../balloon-route.js';
import {WalkMotion} from '../walk-motion.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {prepareBalloonWorld}=await import(moduleURL(new URL('../balloon-world.js',import.meta.url)));
const {mountBalloonTravel}=await import(moduleURL(new URL('../balloon-travel.js',import.meta.url)));
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {prepareAntiqueRoom}=await import(moduleURL(new URL('../antique-room.js',import.meta.url)));
const {prepareIslandTransport}=await import(moduleURL(new URL('../island-transport-world.js',import.meta.url)));
const {rebuildMountainStairs}=await import(moduleURL(new URL('../mountain-stairs.js',import.meta.url)));
const {createMountainNavigation,createMountainCollision,MountainWalkPhysics}=await import(moduleURL(new URL('../mountain-walk.js',import.meta.url)));
const {createGalleryCollision,WalkPhysics}=await import(moduleURL(new URL('../walk-physics.js',import.meta.url)));
const {prepareGalleryInterior}=await import(moduleURL(new URL('../gallery-interior.js',import.meta.url)));
const {repairLandingPad}=await import(moduleURL(new URL('../landing-pad.js',import.meta.url)));
const {prepareArenaCircus}=await import(moduleURL(new URL('../arena-circus.js',import.meta.url)));
function advance(object,seconds,hz=60){let left=seconds;while(left>1e-9){const dt=Math.min(1/hz,left);object.update(dt);left-=dt}}
class Element{
 constructor(){this.events={};this.children=[];this.nodes=new Map();this.attributes={};this.classes=new Set();this.classList={add:(...a)=>a.forEach(k=>this.classes.add(k)),remove:(...a)=>a.forEach(k=>this.classes.delete(k)),toggle:(k,v)=>v?this.classes.add(k):this.classes.delete(k)}}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(g=>g!==f)}
 append(e){this.children.push(e)}setAttribute(k,v){this.attributes[k]=v}focus(){}remove(){this.removed=true}
 querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k)}
 click(){if(!this.disabled)for(const f of this.events.click||[])f({target:this})}
 getContext(){return {fillRect(){},fillText(){},beginPath(){},ellipse(){},fill(){}}}
}
function environment(){const host=new Element();globalThis.window=new Element();globalThis.document={createElement:()=>new Element(),getElementById:()=>host};return host}
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});

test('balloon takes off and lands smoothly with matching trajectories at every refresh rate',()=>{
 for(const hz of [30,60,120]){const model=new BalloonJourney({x:2,y:.1,z:10},{x:0,z:1});assert.ok(model.depart());advance(model,1,hz);assert.equal(model.phase,'ascending');advance(model,2.8,hz);assert.equal(model.phase,'departed');assert.deepEqual(model.position,model.raised);model.arrive();advance(model,3.8,hz);assert.equal(model.phase,'landed');assert.deepEqual(model.position,model.home);model.cancel();assert.equal(model.active,false)}
 const states=[30,60,120].map(hz=>{const m=new BalloonJourney({x:0,y:0,z:0},{x:1,z:0});m.depart();advance(m,2,hz);return m.position});for(const p of states)assert.ok(Math.abs(p.y-states[0].y)<1e-8);
});

test('every map offers the other five islands and boarding, arrival and cancellation restore walking',async()=>{
 for(const island of BALLOON_ISLANDS){const host=environment(),world=prepareBalloonWorld(new THREE.Group(),island.slug),camera=new THREE.PerspectiveCamera();camera.rotation.order='YXZ';camera.position.copy(world.exit).add(new THREE.Vector3(0,1.65,0));let chosen=null;
  const viewer={slug:island.slug,active:true,mode:'walk',camera,foot:world.exit.y,yaw:0,pitch:0,motion:new WalkMotion(),config:{eye:1.65},clearWalkInput(){},onBalloonTravel:slug=>chosen=slug},controller=mountBalloonTravel(viewer,world);
  assert.ok(controller.openMap());const dialog=host.children.find(o=>o.className==='balloon-map-overlay'),buttons=dialog.querySelector('.balloon-destinations').children;assert.equal(buttons.length,6);assert.equal(buttons.filter(b=>b.disabled).length,1);buttons.find(b=>!b.disabled).click();assert.ok(chosen&&chosen!==island.slug);assert.equal(controller.mapOpen,false);
  let fades=0;const saved=camera.position.clone(),departure=controller.depart(()=>{fades++;assert.equal(controller.model.phase,'ascending');assert.equal(controller.model.active,true)});advance(controller,.9);assert.equal(fades,0);advance(controller,.2);assert.equal(fades,1);advance(controller,2.7);assert.equal(fades,1);assert.equal(await departure,true);assert.equal(controller.active,true);assert.ok(camera.position.y>world.home.y+6);
  controller.cancel();assert.ok(camera.position.distanceTo(saved)<1e-8);assert.equal(controller.active,false);
  const landing=controller.arrive();advance(controller,3.8);assert.equal(await landing,true);assert.equal(controller.active,false);assert.equal(viewer.foot,world.exit.y);assert.ok(camera.position.distanceTo(world.exit.clone().add(new THREE.Vector3(0,1.65,0)))<1e-8);
  const cancelled=controller.depart();advance(controller,.2);controller.cancel();assert.equal(await cancelled,false);controller.dispose();world.dispose();assert.ok(dialog.removed);
 }
});

test('all six real islands have supported, unobstructed approaches to their balloon maps',async()=>{
 environment();
 for(const island of BALLOON_ISLANDS){
  const manifest=JSON.parse(readFileSync(new URL('../models/'+island.slug+'.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),root=gltf.scene;
  let room=null,collision=null,surfaces=null;const arena=island.slug==='arena'?prepareArenaCircus(root,null):null;const gallery=island.slug==='carnival'?prepareGalleryInterior(root):null,pad=island.slug==='citadel'?repairLandingPad(root):null;
  if(island.slug==='honkhub')room=prepareAntiqueRoom(root,{balloonDoor:true});
  if(island.slug==='goat-mountain')rebuildMountainStairs(root,JSON.parse(gunzipSync(readFileSync(new URL('../models/goat-mountain-shell-v22.bin',import.meta.url)))));
  const transport=prepareIslandTransport(root,island.slug),world=prepareBalloonWorld(root,island.slug);
  let nav;if(room)nav=room.nav;else if(island.slug==='goat-mountain')nav=createMountainNavigation(root);else{const raw=readFileSync(new URL('../models/'+island.slug+'.nav.bin',import.meta.url));nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))}
  const extra=[transport,world].filter(Boolean).map(w=>new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(w.navPositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})));if(gallery)extra.push(new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(gallery.bridgePositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})));if(pad)extra.push(pad);nav.updateMatrixWorld(true);extra.forEach(o=>o.updateMatrixWorld(true));
  const ray=new THREE.Raycaster(),floorAt=(x,z,top,far=1)=>{ray.set(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0));ray.far=far;return ray.intersectObjects([nav,...extra],false)[0]?.point.y??null},boxes=[...manifest.collisionBoxes.map(([a,b])=>new THREE.Box3(new THREE.Vector3(...a),new THREE.Vector3(...b))),...(room?.extraBoxes||[]),...(gallery?.extraBoxes||[]),...(arena?.extraBoxes||[]),...(transport?.extraBoxes||[]),...world.extraBoxes];
  if(island.slug==='carnival')collision=createGalleryCollision(root);if(island.slug==='goat-mountain')collision=createMountainCollision(root);if(island.slug==='arena')surfaces=arena.surfaces;
  const canStand=(x,z,y)=>!boxes.some(b=>y+1.5>b.min.y&&y+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17)&&(!transport||transport.canStand(x,z))&&(!surfaces||surfaces.canStand(x,z,y));
  const Physics=island.slug==='goat-mountain'?MountainWalkPhysics:WalkPhysics,physics=collision?new Physics({floorAt,canStand,eye:1.65,collision}):null;
  const start=new THREE.Vector3(...island.anchor),end=world.exit;
  for(let n=0;n<=100;n++){const p=start.clone().lerp(end,n/100),floor=floorAt(p.x,p.z,island.home[1]+.35,.8);assert.notEqual(floor,null,`${island.slug}: no boarding floor ${p.toArray()}`);assert.ok(canStand(p.x,p.z,floor),`${island.slug}: blocked boarding approach ${p.toArray()} ${JSON.stringify(boxes.filter(b=>floor+1.5>b.min.y&&floor+.22<b.max.y&&p.x>b.min.x-.17&&p.x<b.max.x+.17&&p.z>b.min.z-.17&&p.z<b.max.z+.17).map(b=>[b.min.toArray(),b.max.toArray()]))}`);if(physics)assert.ok(physics.clearAt?.(p.x,p.z,floor)??true,`${island.slug}: solid scenery blocks boarding ${p.toArray()} at floor ${floor}`)}
  if(island.slug==='arena'){
   // Walk from the actual disembarkation point through the gateway to the sand.
   const path=[end,new THREE.Vector3(...island.anchor),...[[7,5],[6.1,4],[5.8,3.6],[5.4,3.1],[5,2.65],[4.6,2.15],[4.35,1.85],[3.6,1.7],[2.5,1.8],[0,2.5]].map(([x,z])=>new THREE.Vector3(x,0,z))];
   let foot=end.y;
   for(let segment=1;segment<path.length;segment++){const a=path[segment-1],b=path[segment],steps=Math.ceil(a.distanceTo(b)/.025);for(let n=1;n<=steps;n++){const p=a.clone().lerp(b,n/steps),floor=floorAt(p.x,p.z,foot+.49,1.2);assert.notEqual(floor,null,`arena entrance has no floor at ${p.toArray()}`);assert.ok(floor-foot<=.48&&foot-floor<=.65,`arena entrance has an impassable step ${foot} -> ${floor}`);assert.ok(canStand(p.x,p.z,floor),`arena entrance blocks walking at ${p.toArray()}`);foot=floor}}
  }
  assert.ok(floorAt(end.x,end.z,end.y+.35,.8)!==null);assert.ok(world.bounds.containsPoint(world.home));let draws=0;world.vehicle.traverse(o=>{if(o.isMesh)draws++});assert.ok(draws<20,`balloon draw budget: ${draws}`);
  physics?.dispose();surfaces?.dispose();world.dispose();room?.dispose();
 }
});
