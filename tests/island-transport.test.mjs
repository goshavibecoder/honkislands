import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {CableTransit,KartDrive,KartTraffic,CABLE_STATIONS,KART_TRACK,KART_RAILS,KART_PROFILES,kartCanDrive,kartJoystickInput,cablePosition} from '../island-transport-motion.js';
import {createTouchStick} from '../touch-stick.js';
import {WalkMotion} from '../walk-motion.js';
const driverHead=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url))));
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,prefix,q,path)=>`${prefix}'${path==='three'?threeURL:moduleURL(new URL(path,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {prepareIslandTransport}=await import(moduleURL(new URL('../island-transport-world.js',import.meta.url)));
const {mountIslandTransport}=await import(moduleURL(new URL('../island-transport.js',import.meta.url)));
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {rebuildMountainStairs}=await import(moduleURL(new URL('../mountain-stairs.js',import.meta.url)));
const {createMountainNavigation,MountainWalkPhysics,createMountainCollision}=await import(moduleURL(new URL('../mountain-walk.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
function advance(controller,seconds,hz=60,input){let left=seconds;while(left>1e-8){const dt=Math.min(1/hz,left);controller.update(dt,input);left-=dt}}

test('both asphalt lanes stay open and only the rendered rail segments stop the kart',()=>{
 for(let i=0;i<128;i++){
  const a=i*Math.PI/64,yaw=Math.atan2(KART_TRACK.rx*Math.cos(a),-KART_TRACK.rz*Math.sin(a));
  for(const offset of [-.95,0,.95])assert.ok(kartCanDrive(Math.sin(a)*(KART_TRACK.rx+offset),Math.cos(a)*(KART_TRACK.rz+offset),yaw),`invisible obstacle at angle ${a}, lane ${offset}`);
 }
 for(const r of KART_RAILS)assert.equal(kartCanDrive((r.ax+r.bx)/2,(r.az+r.bz)/2,0),false);
 for(let z=6;z<9;z+=.1)assert.ok(kartCanDrive(0,z,0),'the visible entrance must remain open');
 const wall={min:{x:-.1,y:0,z:6},max:{x:.1,y:3,z:6.2}};assert.equal(kartCanDrive(0,6.8,0,[wall]),false);
});

test('cable rides have gentle starts, exact station stops, and matching refresh rates',()=>{
 const journeys=[30,60,120].map(hz=>{const t=new CableTransit();assert.equal(t.travel(-1),false);assert.equal(t.travel(0),false);assert.equal(t.travel(1),true);assert.equal(t.travel(0),false);advance(t,4,hz);return t});
 for(const t of journeys)assert.ok(Math.abs(t.t-journeys[0].t)<1e-10);
 for(const t of journeys){advance(t,10);assert.equal(t.moving,false);assert.deepEqual(t.position,CABLE_STATIONS[1]);assert.equal(t.travel(0),true);advance(t,14);assert.deepEqual(t.position,CABLE_STATIONS[0])}
 const t=new CableTransit();t.travel(1);t.update(1/60);assert.ok(t.t<.00001);advance(t,3);t.reset();assert.equal(t.moving,false);assert.equal(t.t,0);
});

test('kart driving, reversing, braking and steering remain stable across frame rates',()=>{
 const states=[30,60,120].map(hz=>{const k=new KartDrive();advance(k,1.5,hz,{throttle:.7,steer:.3});return k});
 for(const k of states){assert.ok(Math.abs(k.position.x-states[0].position.x)<.002);assert.ok(Math.abs(k.position.z-states[0].position.z)<.002)}
 for(const k of states){assert.ok(k.speed>0);advance(k,1,60,{brake:true});assert.ok(Math.abs(k.speed)<.001);advance(k,.5,60,{throttle:-1});assert.ok(k.speed< -1);assert.ok(k.position.y===.06)}
 const k=new KartDrive();for(let i=0;i<15000;i++){k.update(1/120,{throttle:i%2000<1600?1:-1,steer:Math.sin(i/80)});assert.ok(kartCanDrive(k.position.x,k.position.z,k.yaw));assert.ok(Object.values(k.position).every(Number.isFinite))}
});

test('a kart can complete full circuits and the lap counter requires an entire loop',()=>{
 const k=new KartDrive();for(let i=0;i<60*60;i++){const p=k.position,a=Math.atan2(p.x/KART_TRACK.rx,p.z/KART_TRACK.rz)+.18,yaw=Math.atan2(Math.sin(a)*KART_TRACK.rx-p.x,Math.cos(a)*KART_TRACK.rz-p.z),error=Math.atan2(Math.sin(yaw-k.yaw),Math.cos(yaw-k.yaw));k.update(1/60,{throttle:.7,steer:-error*4})}assert.ok(k.laps>=2);assert.equal(k.warning,0);k.reset();assert.equal(k.laps,0);
});

class Element{
 constructor(){this.events={};this.nodes=new Map();this.children=[];this.style={};this.ownerDocument=globalThis.document;this.captures=new Set();this.classes=new Set();this.classList={add:(...a)=>a.forEach(s=>this.classes.add(s)),remove:(...a)=>a.forEach(s=>this.classes.delete(s)),toggle:(s,on)=>on?this.classes.add(s):this.classes.delete(s)}}
 addEventListener(t,f){(this.events[t]??=[]).push(f)}removeEventListener(t,f){this.events[t]=(this.events[t]||[]).filter(x=>x!==f)}
 fire(t,e={}){for(const f of this.events[t]||[])f({preventDefault(){},...e})}click(){if(!this.disabled)this.fire('click')}append(c){this.child=c;this.children.push(c)}remove(){this.removed=true}setAttribute(){}setPointerCapture(id){this.captures.add(id)}hasPointerCapture(id){return this.captures.has(id)}releasePointerCapture(id){this.captures.delete(id);this.fire('lostpointercapture',{pointerId:id})}getBoundingClientRect(){return {left:0,top:0,width:150}}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s)}
}
function setup(kind='cable',options={}){
 const host=new Element(),window=new Element(),doc=new Element();globalThis.window=window;doc.defaultView=window;doc.createElement=()=>new Element();doc.getElementById=()=>host;globalThis.document=doc;
 const root=new THREE.Group(),world=prepareIslandTransport(root,kind==='cable'?'goat-mountain':'arcade-district',{driverHead}),camera=new THREE.PerspectiveCamera();camera.rotation.order='YXZ';camera.position.set(kind==='cable'?CABLE_STATIONS[0].x-1.7:1.6,kind==='cable'?1.84:1.69,kind==='cable'?13.25:9.4);
 const viewer={active:true,mode:'walk',camera,foot:kind==='cable'?.19:.04,yaw:0,pitch:0,motion:new WalkMotion(),config:{eye:1.65},keys:new Set(),stick:{x:0,y:0},boxes:[],floorAt:()=>.04,canStand:(x,z)=>world.canStand(x,z),clearWalkInput(){this.keys.clear();this.stick.x=this.stick.y=0;this.motion.stop()}};
 const controller=mountIslandTransport(viewer,world,options);return {viewer,world,controller,panel:host.children.find(e=>e.className==='ride-controls'),window,host};
}
test('kart and cable controllers unlock engine audio on boarding, report motion and stop on exit',()=>{
 for(const kind of ['kart','cable']){
  const calls=[],audio={unlock(){calls.push('unlock')},prepare(){calls.push('prepare');return Promise.resolve(true)},update(s){this.state=s},stop(){calls.push('stop')},dispose(){calls.push('dispose')}},e=setup(kind,{makeAudio:()=>audio});e.controller.update(0);assert.equal(audio.state.active,false);e.panel.querySelector('.ride-board').click();assert.ok(calls.includes('unlock')&&calls.includes('prepare'));e.viewer.keys.add('KeyW');advance(e.controller,1);assert.equal(audio.state.active,true);assert.ok(audio.state.speed>0);if(kind==='kart')assert.ok(audio.state.throttle>0);
  e.controller.cancel();assert.equal(calls.at(-1),'stop');e.controller.update(0);assert.equal(audio.state.active,false);e.controller.dispose();assert.ok(calls.includes('dispose'));
 }
});
test('cabin doors open on arrival and automatically restore walking without an Exit click',()=>{
 const {viewer,world,controller,panel,host}=setup();assert.equal(world.doorOpen,1);panel.querySelector('.ride-board').click();assert.equal(controller.active,true);assert.equal(panel.querySelector('.ride-exit').disabled,true);
 advance(controller,2);assert.equal(world.doorOpen,0);assert.ok(controller.model.moving);advance(controller,12);assert.equal(controller.model.station,1);assert.equal(controller.model.door,0);
 advance(controller,1.2);assert.equal(world.doorOpen,1);assert.equal(controller.active,false);assert.equal(viewer.foot,CABLE_STATIONS[1].y+.10);assert.equal(viewer.camera.position.x,CABLE_STATIONS[1].x);assert.equal(viewer.yaw,Math.PI/2);assert.equal(host.classes.has('in-island-ride'),false);
 viewer.foot=.19;viewer.camera.position.set(CABLE_STATIONS[0].x-1.7,1.84,13.25);advance(controller,.2);panel.querySelector('.ride-board').click();assert.equal(controller.active,false);assert.equal(controller.model.moving,true);advance(controller,14.6);assert.equal(controller.model.station,0);assert.equal(world.doorOpen,1);
 panel.querySelector('.ride-board').click();assert.equal(controller.active,true);advance(controller,3);controller.cancel();assert.equal(controller.active,false);assert.equal(viewer.foot,.19);assert.equal(controller.model.station,0);assert.equal(world.doorOpen,1);controller.dispose();assert.equal(panel.removed,true);
});
test('the visible speed button doubles the cable trip and keeps doors closed until the destination',()=>{
 const {viewer,world,controller,panel}=setup();panel.querySelector('.ride-board').click();const speed=panel.querySelector('.ride-speed');assert.equal(speed.hidden,false);speed.click();assert.equal(controller.model.speedMultiplier,2);
 advance(controller,3.5);assert.ok(controller.model.t>0&&controller.model.t<1);assert.equal(world.doorOpen,0);assert.equal(controller.active,true);advance(controller,3.5);assert.equal(controller.model.station,1);assert.equal(world.doorOpen,0);advance(controller,1.2);assert.equal(world.doorOpen,1);assert.equal(controller.active,false);assert.equal(viewer.foot,CABLE_STATIONS[1].y+.10);
 panel.querySelector('.ride-board').click();speed.click();assert.equal(controller.model.speedMultiplier,1);advance(controller,7);assert.ok(controller.model.moving);advance(controller,8.2);assert.equal(controller.model.station,0);assert.equal(controller.active,false);controller.dispose();
});
test('speed changes keep the cabin position continuous and match across refresh rates',()=>{
 for(const hz of [30,60,120]){
  const model=new CableTransit();model.travel(1);advance(model,.2,hz);assert.equal(model.t,0);assert.equal(model.door,1);advance(model,.6,hz);assert.equal(model.t,0);assert.ok(model.door>0&&model.door<1);advance(model,2.2,hz);const p=model.t;model.setSpeed(2);assert.equal(model.t,p);advance(model,5.5,hz);assert.equal(model.station,1);assert.equal(model.moving,false);advance(model,.6,hz);assert.equal(model.door,1);model.reset();assert.equal(model.phase,'parked');assert.equal(model.door,1);
 }
});
test('outside cable camera uses the spatial collision index without scanning the whole mountain',()=>{
 const {viewer,controller,panel}=setup();let indexed=0;
 viewer.walkCollision={rayIntersect(){indexed++;return {distance:3}}};
 viewer.staticGroup=new THREE.Group();viewer.staticGroup.raycast=()=>{throw Error('full mountain raycast')};
 panel.querySelector('.ride-board').click();panel.querySelector('.ride-camera').click();advance(controller,2);
 assert.ok(indexed>5&&indexed<25);assert.ok(viewer.camera.position.toArray().every(Number.isFinite));controller.dispose();
});
test('kart touch driving, brake hold, camera change, exit and cancellation release controls',()=>{
 const {viewer,controller,panel,world,window,host}=setup('kart');panel.querySelector('.ride-board').click();assert.equal(controller.active,true);viewer.stick.y=-1;viewer.stick.x=.2;advance(controller,1);assert.ok(controller.model.speed>2);panel.querySelector('.ride-camera').click();advance(controller,.5);assert.ok(viewer.camera.position.toArray().every(Number.isFinite));
 panel.querySelector('.ride-brake').fire('pointerdown',{pointerId:1});advance(controller,.7);assert.ok(controller.model.speed<.01);window.fire('blur');assert.equal(viewer.stick.y,0);panel.querySelector('.ride-exit').click();advance(controller,.7);assert.equal(controller.active,false);assert.equal(host.classes.has('in-island-ride'),false);assert.ok(world.canStand(viewer.camera.position.x,viewer.camera.position.z));
 advance(controller,.2);panel.querySelector('.ride-board').click();assert.equal(controller.active,true);advance(controller,.5);controller.cancel();assert.equal(controller.active,false);assert.deepEqual(controller.model.position,world.cars[0].spawn);controller.dispose();assert.equal(window.events.blur.length,0);
});

test('real touch joystick separates throttle from steering and stops when released',()=>{
 for(const [dx,dy] of [[29,0],[20,-20],[-29,0]]){
  const {viewer,controller,panel,window}=setup('kart'),joystick=new Element(),doc=new Element(),knob={style:{}};doc.defaultView=window;joystick.ownerDocument=doc;joystick.getBoundingClientRect=()=>({left:0,top:0,width:100});let captured=null;joystick.setPointerCapture=id=>{captured=id};joystick.hasPointerCapture=id=>captured===id;joystick.releasePointerCapture=()=>{captured=null};
  const stick=createTouchStick(joystick,knob,(x,y)=>{viewer.stick.x=x;viewer.stick.y=y});panel.querySelector('.ride-board').click();
  joystick.fire('pointerdown',{pointerId:7,pointerType:'touch',clientX:50+dx,clientY:50+dy});const start=controller.model.position.x;advance(controller,1);
  if(dy===0){assert.equal(controller.model.speed,0);assert.equal(controller.model.position.x,start);assert.equal(controller.model.yaw,Math.PI/2);assert.ok(controller.model.steer*Math.sign(dx)>.9)}
  else{assert.ok(controller.model.speed>1);assert.ok(controller.model.position.x>start+.5);assert.ok(controller.model.yaw<Math.PI/2)}
  window.fire('pointerup',{pointerId:7});assert.equal(viewer.stick.x,0);assert.equal(viewer.stick.y,0);advance(controller,1);assert.equal(controller.model.speed,0);stick.destroy();controller.dispose();
 }
});

test('without driver steering the kart keeps its heading and stops at a barrier instead of following the track',()=>{
 const k=new KartDrive(),yaw=k.yaw;advance(k,15,60,{throttle:1});assert.equal(k.yaw,yaw);assert.equal(k.speed,0);assert.equal(k.laps,0);assert.ok(k.warning>0);
 const stopped={...k.position};advance(k,2);assert.deepEqual(k.position,stopped);assert.equal(k.yaw,yaw);
 advance(k,1,60,{throttle:-1});assert.ok(k.position.x<stopped.x-.5);assert.equal(k.yaw,yaw);
 const right=new KartDrive(),left=new KartDrive();advance(right,1,60,{throttle:.6,steer:.6});advance(left,1,60,{throttle:.6,steer:-.6});assert.ok(right.yaw<yaw);assert.ok(left.yaw>yaw);assert.ok(Math.abs((right.yaw-yaw)+(left.yaw-yaw))<1e-10);
});

test('separate game joystick and gas pedal allow full-lock turning, show HONK at the wheel and clean up after exit',()=>{
 const {controller,panel,window,world,host}=setup('kart'),controls=controller.gameControls,ui=controls.element,stick=ui.querySelector('.kart-game-stick'),gas=ui.querySelector('[data-kart-pedal="1"]'),reverse=ui.querySelector('[data-kart-pedal="-1"]');
 assert.equal(ui.hidden,true);assert.equal(world.driver.group.visible,false);assert.ok(world.driver.head.children.length>5);
 panel.querySelector('.ride-board').click();assert.equal(ui.hidden,false);assert.ok(host.classes.has('driving-kart'));assert.equal(world.driver.group.visible,true);
 stick.fire('pointerdown',{pointerId:20,pointerType:'touch',clientX:118.5,clientY:75});gas.fire('pointerdown',{pointerId:21,pointerType:'touch'});advance(controller,.8);
 assert.ok(controller.model.steer>.99);assert.ok(controller.model.speed>2);assert.ok(Math.PI/2-controller.model.yaw>.30,'full joystick steering is too weak');assert.equal(stick.hasPointerCapture(20),true);assert.equal(gas.hasPointerCapture(21),true);
 panel.querySelector('.ride-camera').click();assert.equal(world.driver.head.visible,false);assert.equal(world.driver.group.visible,true);panel.querySelector('.ride-camera').click();assert.equal(world.driver.head.visible,true);
 window.fire('blur');assert.equal(controls.state.x,0);assert.equal(controls.state.pedal,0);advance(controller,1);assert.equal(controller.model.speed,0);
 reverse.fire('pointerdown',{pointerId:22,pointerType:'touch'});advance(controller,.5);assert.ok(controller.model.speed< -.7);reverse.fire('pointerup',{pointerId:22});panel.querySelector('.ride-exit').click();advance(controller,.7);assert.equal(ui.hidden,true);assert.equal(world.driver.group.visible,false);assert.equal(host.classes.has('driving-kart'),false);controller.dispose();assert.equal(ui.removed,true);
});

test('HONK shoulders stay inside his torso, arm joints meet and hands remain on the turning wheel',()=>{
 const {world,controller}=setup('kart'),driver=world.driver,wheel=world.vehicle.getObjectByName('Kart_steering_wheel');
 for(const steer of [-1,-.5,0,.5,1]){
  world.setPose({x:2,y:.06,z:8},.7,1.4,steer,2);world.group.updateMatrixWorld(true);
  for(const arm of driver.arms){
   assert.equal(arm.arm.parent,driver.torso);
   const shoulder=new THREE.Vector3(0,-.5,0).applyMatrix4(arm.upper.matrixWorld),inside=driver.suit.worldToLocal(shoulder.clone());assert.ok(inside.length()<.95,'shoulder detached from torso');
   const elbowA=new THREE.Vector3(0,.5,0).applyMatrix4(arm.upper.matrixWorld),elbowB=new THREE.Vector3(0,-.5,0).applyMatrix4(arm.forearm.matrixWorld);assert.ok(elbowA.distanceTo(elbowB)<1e-6);
   const wrist=new THREE.Vector3(0,.5,0).applyMatrix4(arm.forearm.matrixWorld),hand=arm.hand.getWorldPosition(new THREE.Vector3()),rim=wheel.localToWorld(new THREE.Vector3(arm.sign*.14,0,0));assert.ok(wrist.distanceTo(hand)<1e-6);assert.ok(hand.distanceTo(rim)<1e-6);
  }
 }controller.dispose();
});

test('joystick right points both front wheels toward the driver right, while rear wheels stay straight',()=>{
 const {world,controller}=setup('kart'),up=new THREE.Vector3(0,1,0);
 for(const yaw of [0,.7,Math.PI])for(const steer of [-1,0,1]){
  world.setPose({x:0,y:.06,z:9.4},yaw,1.8,steer,2.5);world.group.updateMatrixWorld(true);
  const forward=world.vehicle.getWorldDirection(new THREE.Vector3()),right=forward.clone().cross(up);
  for(const side of ['left','right']){
   const front=world.vehicle.getObjectByName(`Kart_front_${side}_wheel`).getWorldDirection(new THREE.Vector3()),rear=world.vehicle.getObjectByName(`Kart_rear_${side}_wheel`).getWorldDirection(new THREE.Vector3());
   if(steer)assert.ok(front.dot(right)*steer>.3);else assert.ok(front.distanceTo(forward)<1e-6);assert.ok(rear.distanceTo(forward)<1e-6);
  }
 }controller.dispose();
});

async function loadMountain(){const manifest=JSON.parse(readFileSync(new URL('../models/goat-mountain.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');rebuildMountainStairs(gltf.scene,JSON.parse(gunzipSync(readFileSync(new URL('../models/goat-mountain-shell-v22.bin',import.meta.url)))));return gltf.scene}
test('the complete cabin clears the actual mountain and both station exits connect to walking surfaces',async()=>{
 const root=await loadMountain(),world=prepareIslandTransport(root,'goat-mountain'),nav=createMountainNavigation(root),extra=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(world.navPositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),rocks=[];root.updateMatrixWorld(true);extra.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh&&/^(Faceted_mountain_(?!cloud)|Angular_flank_rock|Shrine_rock_support)/.test(o.name))rocks.push(o)});
 const deck=root.getObjectByName('Cable_summit_bridge'),vertices=deck.geometry.attributes.position;
 for(let i=0;i<vertices.count;i++)assert.ok(vertices.getX(i)<=CABLE_STATIONS[1].x-2.4+1e-5,'bridge overlaps the station floor');
 const surfaces=[];root.traverse(o=>{if(o.isMesh&&!o.userData.islandRide)surfaces.push(o)});const surfaceRay=new THREE.Raycaster();
 for(const [x,z,y] of [[1,13.25,CABLE_STATIONS[0].y],[CABLE_STATIONS[1].x-1.5,4.3,CABLE_STATIONS[1].y],[0,1.5,CABLE_STATIONS[1].y]]){
  surfaceRay.set(new THREE.Vector3(x,y+.1,z),new THREE.Vector3(0,-1,0));surfaceRay.far=.2;const hits=surfaceRay.intersectObjects(surfaces,false),tops=[...new Set(hits.map(h=>h.point.y.toFixed(5)))].map(Number);
  assert.ok(Math.abs(tops[0]-y)<1e-5);if(tops.length>1)assert.ok(tops[0]-tops[1]>.025,'station or bridge floor fights with the mountain surface');
 }
 // Check the full cabin, its hanging arm, and the cable pickup against every
 // opaque source object and the new station rails, not just terrain heights.
 const solids=surfaces.filter(o=>!o.material.transparent&&!/cloud|rainbow|Cable_guide_wire|Cable_station_pulley/i.test(o.name)).map(mesh=>({mesh,bounds:new THREE.Box3().setFromObject(mesh)}));
 const envelopes=[new THREE.Box3(new THREE.Vector3(-.84,.005,-.86),new THREE.Vector3(.84,2.30,.96)),new THREE.Box3(new THREE.Vector3(-.08,2.30,-.08),new THREE.Vector3(.08,3.56,.08)),new THREE.Box3(new THREE.Vector3(-.65,3.38,-.08),new THREE.Vector3(.65,3.57,.08))],probe=new THREE.Box3(),triangle=new THREE.Triangle(),offset=new THREE.Vector3();
 for(let n=0;n<=200;n++){
  const p=cablePosition(n/200);offset.set(p.x,p.y,p.z);
  for(const envelope of envelopes){probe.copy(envelope).translate(offset);for(const {mesh,bounds} of solids){
   if(!bounds.intersectsBox(probe))continue;const attr=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:attr.count;
   for(let j=0;j<count;j+=3){triangle.a.fromBufferAttribute(attr,index?index.getX(j):j).applyMatrix4(mesh.matrixWorld);triangle.b.fromBufferAttribute(attr,index?index.getX(j+1):j+1).applyMatrix4(mesh.matrixWorld);triangle.c.fromBufferAttribute(attr,index?index.getX(j+2):j+2).applyMatrix4(mesh.matrixWorld);assert.equal(probe.intersectsTriangle(triangle),false,`cabin intersects ${mesh.name} (${mesh.material.name}, bounds ${bounds.min.toArray()} / ${bounds.max.toArray()}) at ${n/200}`)}
  }}
 }
 const ray=new THREE.Raycaster(),floorAt=(x,z,top,far)=>{ray.set(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0));ray.far=far;const terrain=ray.intersectObjects([nav,extra])[0]?.point.y??null,cabin=world.floorAt(x,z,top,far);return cabin===null?terrain:terrain===null?cabin:Math.max(terrain,cabin)};
 for(let i=0;i<=100;i++){const p=cablePosition(i/100);for(const x of [p.x-.76,p.x,p.x+.76])for(const z of [p.z-.76,p.z,p.z+.76]){ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));ray.far=40;const rock=ray.intersectObjects(rocks)[0];assert.ok(!rock||rock.point.y<p.y+.04,'cabin enters the mountain')}}
 const boxes=world.extraBoxes,physics=new MountainWalkPhysics({eye:1.65,floorAt,canStand:(x,z,f)=>world.canStand(x,z,f)&&!boxes.some(b=>x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17&&f+1.5>b.min.y&&f+.22<b.max.y),collision:createMountainCollision(root)});
 for(const [from,to,y] of [[[CABLE_STATIONS[0].x-1.65,13.25],[0,13.25],CABLE_STATIONS[0].y],[[CABLE_STATIONS[1].x-1.55,4.8],[0,1.5],CABLE_STATIONS[1].y]]){assert.ok(Math.abs(floorAt(...from,y+.3,.6)-y)<1e-5);for(let i=0;i<=100;i++){const x=from[0]+(to[0]-from[0])*i/100,z=from[1]+(to[1]-from[1])*i/100;assert.ok(physics.clearAt(x,z,y),`blocked station path at ${x},${z}`)}}
 for(const x of [-.3,0,.3]){let foot=CABLE_STATIONS[0].y;for(let i=0;i<=100;i++){const z=13.25-1.5*i/100,next=physics.step(x,z,foot);assert.notEqual(next,null,`stair entrance blocked at ${x},${z}`);foot=next}assert.ok(foot>CABLE_STATIONS[0].y+.1,'route never reached the stairs')}
 for(const station of CABLE_STATIONS){
  world.setPose(station);world.setDoors(1);let foot=station.y+.10;
  for(let i=0;i<=80;i++){const x=station.x-1.55*i/80,z=station.z-.10,next=physics.step(x,z,foot);assert.notEqual(next,null,`open cabin exit blocked at ${x},${z}`);foot=next}
  assert.ok(Math.abs(foot-station.y)<1e-5);
  world.setDoors(0);assert.equal(world.floorAt(station.x,station.z,station.y+.5,1),null);assert.equal(world.canStand(station.x-.72,station.z,station.y),false);
 }
 physics.dispose();
});

test('the track has continuous floors, an open entrance and solid edge barriers',()=>{
 const world=prepareIslandTransport(new THREE.Group(),'arcade-district'),nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(world.navPositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();
 for(let i=0;i<128;i++){const a=i*Math.PI/64,x=Math.sin(a)*KART_TRACK.rx,z=Math.cos(a)*KART_TRACK.rz;ray.set(new THREE.Vector3(x,1,z),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(nav).length);assert.equal(world.canStand(Math.sin(a)*(KART_TRACK.rx+1.92),Math.cos(a)*(KART_TRACK.rz+1.92)),i===0)}
 for(let z=5.2;z<8;z+=.1)assert.ok(world.canStand(0,z));for(let x=-1.2;x<=1.2;x+=.05)assert.equal(kartCanDrive(x,KART_TRACK.rz+KART_TRACK.railOffset,0,world.extraBoxes),false,'visible bollards must keep the kart on the circuit');let dynamic=0;world.vehicle.traverse(o=>{if(o.isMesh){dynamic++;assert.equal(o.userData.islandRide,true)}});assert.ok(dynamic>5&&dynamic<45);
});

test('classic and speed cars board independently and release touch controls on exit',()=>{
 const {viewer,world,controller,panel,window,host}=setup('kart'),classic=controller.models[0],fast=controller.models[1];
 assert.equal(controller.models.length,2);assert.equal(world.cars.length,2);viewer.camera.position.x=.5;advance(controller,.2);
 assert.equal(panel.querySelector('.ride-board').hidden,false);assert.equal(panel.querySelector('.ride-board-fast').hidden,false);
 panel.querySelector('.ride-board-fast').click();assert.equal(controller.active,true);assert.equal(controller.model,fast);assert.equal(world.vehicle,world.cars[1].vehicle);
 assert.equal(panel.querySelector('strong').textContent,'HONK • SPEED KART ×3');assert.equal(world.cars[0].driver.group.visible,false);
 const controls=controller.gameControls,stick=controls.element.querySelector('.kart-game-stick'),gas=controls.element.querySelector('[data-kart-pedal="1"]');
 stick.fire('pointerdown',{pointerId:30,pointerType:'touch',clientX:81.525,clientY:75});gas.fire('pointerdown',{pointerId:31,pointerType:'touch'});advance(controller,.4);
 assert.ok(fast.speed>5);assert.ok(fast.steer>.19);assert.equal(classic.speed,0);assert.deepEqual(classic.position,world.cars[0].spawn);
 window.fire('blur');assert.equal(controls.state.pedal,0);assert.equal(controls.state.x,0);advance(controller,1);assert.equal(fast.speed,0);
 panel.querySelector('.ride-exit').click();advance(controller,.7);assert.equal(controller.active,false);assert.equal(controls.element.hidden,true);assert.equal(world.cars[1].driver.group.visible,false);
 viewer.camera.position.set(1.6,1.69,9.4);viewer.foot=.04;advance(controller,.2);panel.querySelector('.ride-board').click();
 assert.equal(controller.model,classic);assert.equal(world.vehicle,world.cars[0].vehicle);assert.equal(panel.querySelector('strong').textContent,'HONK • CLASSIC KART');
 controller.cancel();assert.equal(controller.active,false);assert.deepEqual(classic.position,world.cars[0].spawn);assert.equal(host.classes.has('driving-kart'),false);
 controller.dispose();assert.equal(window.events.blur.length,0);
});
test('speed kart triples both speeds, responds sooner, brakes and stays inside barriers',()=>{
 for(const throttle of [-1,1]){
  const a=new KartDrive({canDrive:()=>true}),b=new KartDrive({profile:KART_PROFILES.speed,canDrive:()=>true});advance(a,5,60,{throttle});advance(b,5,60,{throttle});assert.ok(Math.abs(b.speed/a.speed-3)<1e-10);
  advance(b,1,60,{brake:true});assert.equal(b.speed,0);
 }
 assert.ok(kartJoystickInput(.15,0,KART_PROFILES.speed).steer>kartJoystickInput(.15,0).steer*3);
 const results=[30,60,120].map(hz=>{const k=new KartDrive({profile:KART_PROFILES.speed,canDrive:()=>true});advance(k,2,hz,{throttle:1,steer:.2});return k});
 for(const k of results){assert.ok(Math.abs(k.position.x-results[0].position.x)<.002);assert.ok(Math.abs(k.position.z-results[0].position.z)<.002)}
 const k=new KartDrive({profile:KART_PROFILES.speed});for(let i=0;i<6000;i++){k.update(1/120,{throttle:i%1400<1000?1:-1,steer:Math.sin(i/60)});assert.ok(kartCanDrive(k.position.x,k.position.z,k.yaw))}
});

test('bumping a parked car transfers momentum, turns glancing contacts and respects walls',()=>{
 function collide(hz,offset=0,reverse=false,wall=false){
  const obstacles=wall?[{min:{x:2.1,y:0,z:8},max:{x:2.3,y:2,z:11}}]:[],a=new KartDrive({profile:KART_PROFILES.speed,spawn:{x:-3,y:.06,z:9.4+offset},obstacles}),b=new KartDrive({spawn:{x:0,y:.06,z:9.4},obstacles}),traffic=new KartTraffic([a,b]);
  if(reverse){a.position.x=3;a.yaw=-Math.PI/2}
  for(let i=0;i<hz*3;i++){traffic.update(1/hz,0,{throttle:i<hz*.6?1:0});for(const m of [a,b])assert.ok(kartCanDrive(m.position.x,m.position.z,m.yaw,obstacles),'collision pushed a car through a barrier')}
  assert.ok(traffic.contacts>0);assert.ok(Math.hypot(traffic.bodies[1].x,traffic.bodies[1].z)<.01,'parked car should settle');return {a,b,traffic};
 }
 const runs=[30,60,120].map(hz=>collide(hz));for(const r of runs){assert.ok(r.b.position.x>.15&&r.b.position.x<2.1);assert.ok(Math.abs(r.b.position.x-runs[0].b.position.x)<.002)}
 assert.ok(collide(60,0,true).b.position.x<-.15);
 assert.ok(Math.abs(collide(60,-.75).b.yaw-Math.PI/2)>.01,'off-centre impact should turn the other car');
 assert.ok(collide(60,0,false,true).b.position.x<1.1,'parked car must stop at a wall');
 const a=new KartDrive({spawn:{x:-3,y:.06,z:9.4}}),b=new KartDrive(),traffic=new KartTraffic([a,b]);advance(traffic,2);assert.equal(a.position.x,-3);assert.equal(b.position.x,0);
 traffic.bodies[0].x=2;traffic.reset(0);assert.equal(traffic.bodies[0].x,0);
});
test('reverse steering escapes a parked car pinned against a curved rail at every refresh rate',()=>{
 for(const profile of Object.values(KART_PROFILES))for(const angle of [.1,1,3,5,6]){
  const results=[30,60,120].map(hz=>{
   const a=new KartDrive({profile,spawn:{x:Math.sin(angle)*8,y:.06,z:Math.cos(angle)*10.2}}),b=new KartDrive({spawn:{x:Math.sin(angle+.24)*8,y:.06,z:Math.cos(angle+.24)*10.2}});
   a.yaw=Math.atan2(Math.cos(angle)*8,-Math.sin(angle)*10.2);b.yaw=a.yaw-.45;
   const traffic=new KartTraffic([a,b]),check=()=>{for(const m of [a,b])assert.ok(kartCanDrive(m.position.x,m.position.z,m.yaw),'escape crossed a solid rail')};check();
   for(let i=0;i<2*hz;i++){traffic.update(1/hz,0,{throttle:1});check()}
   assert.ok(traffic.contacts>0,'test must include contact with the parked kart');
   const start={...a.position};
   for(let i=0;i<3*hz;i++){traffic.update(1/hz,0,{throttle:-1,steer:angle===6?1:-1});check()}
   assert.ok(Math.hypot(a.position.x-start.x,a.position.z-start.z)>.65,`${profile.id} stayed pinned at curve ${angle}`);
   return {...a.position,yaw:a.yaw};
  });
  for(const p of results)for(const key of ['x','z','yaw'])assert.ok(Math.abs(p[key]-results[0][key])<.002,'escape depends on refresh rate');
 }
});
test('a rail may limit steering without disabling safe reverse translation',()=>{
 const k=new KartDrive({profile:KART_PROFILES.speed,spawn:{x:0,y:.06,z:10.2}});advance(k,1.5,60,{throttle:1});const start={...k.position};assert.equal(k.speed,0);
 for(let i=0;i<360;i++){k.update(1/120,{throttle:-1,steer:-1});assert.ok(kartCanDrive(k.position.x,k.position.z,k.yaw))}
 assert.ok(Math.hypot(k.position.x-start.x,k.position.z-start.z)>.65,'steering locked reverse against the rail');
});
test('parked-car rebound stays visible after the driver exits and camera ownership stays with the selected car',()=>{
 const {viewer,world,controller,panel}=setup('kart'),classic=controller.models[0],fast=controller.models[1];
 classic.position={x:0,y:.06,z:9.4};fast.position={x:-3,y:.06,z:9.4};viewer.camera.position.set(-2,1.69,9.4);advance(controller,.2);
 panel.querySelector('.ride-board-fast').click();assert.equal(controller.model,fast);viewer.keys.add('KeyW');advance(controller,.5);
 assert.ok(classic.position.x>.05,'parked car did not move');assert.equal(world.activeCar,1);assert.equal(world.cars[0].vehicle.position.x,classic.position.x);assert.equal(world.vehicle,world.cars[1].vehicle);
 viewer.keys.clear();panel.querySelector('.ride-exit').click();advance(controller,.7);assert.equal(controller.active,false);
 const x=classic.position.x;advance(controller,.5);assert.ok(classic.position.x>=x);assert.equal(world.cars[0].vehicle.position.x,classic.position.x);controller.dispose();
});
test('the sports racer keeps the original footprint and all moving meshes remain dynamic',()=>{
 const before=prepareIslandTransport(new THREE.Group(),'arcade-district'),classic=before.cars[0],sport=before.cars[1],size=new THREE.Vector3(),classicSize=new THREE.Vector3();
 classic.bounds.getSize(classicSize);sport.bounds.getSize(size);assert.ok(size.x<=classicSize.x+.03);assert.ok(size.z<=classicSize.z+.03);assert.ok(size.y<=classicSize.y+.03);
 assert.ok(sport.vehicle.getObjectByName('Speed_low_windscreen'));assert.ok(sport.vehicle.getObjectByName('Speed_kart_rear_wing'));
 for(const car of before.cars){let count=0;car.vehicle.traverse(o=>{if(o.isMesh){count++;assert.equal(o.userData.islandRide,true);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite))}});assert.ok(count<45)}
});
test('real wall and car contacts produce impact events without repeated wall-pushing sounds',()=>{
 for(const hz of [30,60,120]){
  const k=new KartDrive({canDrive:x=>x<1});advance(k,2,hz,{throttle:1});assert.ok(k.impactSerial>0);assert.ok(k.impactStrength>.35);const hits=k.impactSerial;advance(k,2,hz,{throttle:1});assert.equal(k.impactSerial,hits);
  const a=new KartDrive({spawn:{x:-3,y:.06,z:9.4}}),b=new KartDrive(),t=new KartTraffic([a,b]);for(let i=0;i<hz;i++)t.update(1/hz,0,{throttle:1});assert.ok(a.impactSerial>0&&b.impactSerial>0);
 }
});
test('controller plays a collision only for its occupied car and does not replay it on boarding',()=>{
 const hits=[],audio={unlock(){},prepare(){return Promise.resolve(true)},update(s){this.state=s},impact(s){hits.push(s)},stop(){},dispose(){}},e=setup('kart',{makeAudio:()=>audio});
 e.controller.model.recordImpact(2);e.controller.update(0);assert.equal(hits.length,0);e.panel.querySelector('.ride-board').click();e.controller.update(0);assert.equal(hits.length,0);
 e.controller.models[1].position.x=-100;e.controller.model.canDrive=x=>x<1;e.viewer.keys.add('KeyW');advance(e.controller,2);assert.equal(hits.length,1,JSON.stringify(hits));assert.ok(hits[0]>.35);advance(e.controller,2);assert.equal(hits.length,1,JSON.stringify(hits));e.controller.dispose();
});
test('lower cable bridge leaves the staircase mouth open while retaining its outer guardrails',()=>{
 const root=new THREE.Group(),world=prepareIslandTransport(root,'goat-mountain'),ray=new THREE.Raycaster();root.updateMatrixWorld(true);
 for(const x of [-.45,0,.45,1.15])for(const height of [.42,.70,.95,1]){
  ray.set(new THREE.Vector3(x,CABLE_STATIONS[0].y+height,13.4),new THREE.Vector3(0,0,-1));ray.far=1.4;
  assert.equal(ray.intersectObject(world.group,true).length,0,`fence blocks stair entrance at ${x},${height}`);
 }
 for(const [x,z,dir] of [[2,13.25,-1],[.5,13.25,1],[2,13.25,1]]){
  ray.set(new THREE.Vector3(x,CABLE_STATIONS[0].y+.95,z),new THREE.Vector3(0,0,dir));ray.far=1;
  assert.ok(ray.intersectObject(world.group,true).length>0,'remaining bridge edge lost its handrail');
 }
});

test('both karts use the actual uploaded head and preserve its facing direction, neck fit and wheel grip',()=>{
 const current=JSON.parse(gunzipSync(readFileSync(new URL('../models/honk-current-v168.bin',import.meta.url)))),map=new THREE.Texture(),world=prepareIslandTransport(new THREE.Group(),'arcade-district',{driverHead:{current,material:new THREE.MeshStandardMaterial({map})}});
 for(let i=0;i<world.cars.length;i++){world.selectCar(i);const driver=world.driver;driver.setSeated(true);const mesh=driver.head.children[0];assert.equal(mesh.material.map,map);assert.ok(mesh.geometry.attributes.uv.count>1000);
  for(const steer of [-1,0,1]){world.setPose({x:2,y:.06,z:8},.7,1.4,steer,2);world.group.updateMatrixWorld(true);const face=new THREE.Vector3(0,0,1).transformDirection(driver.head.matrixWorld),forward=new THREE.Vector3(0,0,1).transformDirection(world.vehicle.matrixWorld);assert.ok(face.dot(forward)>.999);const headBox=new THREE.Box3().setFromObject(driver.head),neck=driver.torso.children.find(o=>o!==driver.suit&&o.isMesh);assert.ok(headBox.intersectsBox(new THREE.Box3().setFromObject(neck)),'uploaded head misses neck');
   for(const arm of driver.arms){const wrist=new THREE.Vector3(0,.5,0).applyMatrix4(arm.forearm.matrixWorld),hand=arm.hand.getWorldPosition(new THREE.Vector3()),rim=world.vehicle.getObjectByName('Kart_steering_wheel').localToWorld(new THREE.Vector3(arm.sign*.14,0,0));assert.ok(wrist.distanceTo(hand)<1e-6);assert.ok(hand.distanceTo(rim)<1e-6)}
  }driver.setSeated(true,true);assert.equal(driver.head.visible,false);driver.setSeated(true,false);assert.equal(driver.head.visible,true);
 }
});
