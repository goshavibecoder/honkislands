import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {CableTransit,KartDrive,CABLE_STATIONS,KART_TRACK,KART_RAILS,kartCanDrive,cablePosition} from '../island-transport-motion.js';
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
function setup(kind='cable'){
 const host=new Element(),window=new Element(),doc=new Element();globalThis.window=window;doc.defaultView=window;doc.createElement=()=>new Element();doc.getElementById=()=>host;globalThis.document=doc;
 const root=new THREE.Group(),world=prepareIslandTransport(root,kind==='cable'?'goat-mountain':'arcade-district',{driverHead}),camera=new THREE.PerspectiveCamera();camera.rotation.order='YXZ';camera.position.set(kind==='cable'?1.1:1.6,kind==='cable'?1.84:1.69,kind==='cable'?13.25:9.4);
 const viewer={active:true,mode:'walk',camera,foot:kind==='cable'?.19:.04,yaw:0,pitch:0,motion:new WalkMotion(),config:{eye:1.65},keys:new Set(),stick:{x:0,y:0},boxes:[],floorAt:()=>.04,canStand:(x,z)=>world.canStand(x,z),clearWalkInput(){this.keys.clear();this.stick.x=this.stick.y=0;this.motion.stop()}};
 const controller=mountIslandTransport(viewer,world);return {viewer,world,controller,panel:host.children.find(e=>e.className==='ride-controls'),window,host};
}
test('cabin touch controls deliver to the summit, exit safely and summon from the other station',()=>{
 const {viewer,controller,panel}=setup();panel.querySelector('.ride-board').click();assert.equal(controller.active,true);assert.equal(panel.querySelector('.ride-exit').disabled,true);advance(controller,14);assert.equal(controller.model.station,1);assert.equal(panel.querySelector('.ride-exit').disabled,false);panel.querySelector('.ride-exit').click();advance(controller,.7);assert.equal(controller.active,false);assert.equal(viewer.foot,11.14);assert.equal(viewer.camera.position.x,1.25);
 viewer.foot=.19;viewer.camera.position.set(1.1,1.84,13.25);advance(controller,.2);panel.querySelector('.ride-board').click();assert.equal(controller.active,false);assert.equal(controller.model.moving,true);advance(controller,14);assert.equal(controller.model.station,0);panel.querySelector('.ride-board').click();assert.equal(controller.active,true);advance(controller,3);controller.cancel();assert.equal(controller.active,false);assert.equal(viewer.foot,.19);assert.equal(controller.model.station,0);controller.dispose();assert.equal(panel.removed,true);
});
test('kart touch driving, brake hold, camera change, exit and cancellation release controls',()=>{
 const {viewer,controller,panel,world,window,host}=setup('kart');panel.querySelector('.ride-board').click();assert.equal(controller.active,true);viewer.stick.y=-1;viewer.stick.x=.2;advance(controller,1);assert.ok(controller.model.speed>2);panel.querySelector('.ride-camera').click();advance(controller,.5);assert.ok(viewer.camera.position.toArray().every(Number.isFinite));
 panel.querySelector('.ride-brake').fire('pointerdown',{pointerId:1});advance(controller,.7);assert.ok(controller.model.speed<.01);window.fire('blur');assert.equal(viewer.stick.y,0);panel.querySelector('.ride-exit').click();advance(controller,.7);assert.equal(controller.active,false);assert.equal(host.classes.has('in-island-ride'),false);assert.ok(world.canStand(viewer.camera.position.x,viewer.camera.position.z));
 advance(controller,.2);panel.querySelector('.ride-board').click();assert.equal(controller.active,true);advance(controller,.5);controller.cancel();assert.equal(controller.active,false);assert.deepEqual(controller.model.position,{x:0,y:.06,z:9.4});controller.dispose();assert.equal(window.events.blur.length,0);
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
 const ray=new THREE.Raycaster(),floorAt=(x,z,top,far)=>{ray.set(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0));ray.far=far;return ray.intersectObjects([nav,extra])[0]?.point.y??null};
 for(let i=0;i<=100;i++){const p=cablePosition(i/100);for(const x of [p.x-.76,p.x,p.x+.76])for(const z of [p.z-.76,p.z,p.z+.76]){ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));ray.far=40;const rock=ray.intersectObjects(rocks)[0];assert.ok(!rock||rock.point.y<p.y+.04,'cabin enters the mountain')}}
 const boxes=world.extraBoxes,physics=new MountainWalkPhysics({eye:1.65,floorAt,canStand:(x,z,f)=>!boxes.some(b=>x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17&&f+1.5>b.min.y&&f+.22<b.max.y),collision:createMountainCollision(root)});
 for(const [from,to,y] of [[[1.15,13.25],[0,13.25],.19],[[1.25,4.8],[0,1.5],11.14]]){assert.ok(Math.abs(floorAt(...from,y+.3,.6)-y)<1e-5);for(let i=0;i<=100;i++){const x=from[0]+(to[0]-from[0])*i/100,z=from[1]+(to[1]-from[1])*i/100;assert.ok(physics.clearAt(x,z,y),`blocked station path at ${x},${z}`)}}physics.dispose();
});

test('the track has continuous floors, an open entrance and solid edge barriers',()=>{
 const world=prepareIslandTransport(new THREE.Group(),'arcade-district'),nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(world.navPositions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();
 for(let i=0;i<128;i++){const a=i*Math.PI/64,x=Math.sin(a)*KART_TRACK.rx,z=Math.cos(a)*KART_TRACK.rz;ray.set(new THREE.Vector3(x,1,z),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(nav).length);assert.equal(world.canStand(Math.sin(a)*(KART_TRACK.rx+1.92),Math.cos(a)*(KART_TRACK.rz+1.92)),false)}
 for(let z=5.2;z<8;z+=.1)assert.ok(world.canStand(0,z));let dynamic=0;world.vehicle.traverse(o=>{if(o.isMesh){dynamic++;assert.equal(o.userData.islandRide,true)}});assert.ok(dynamic>5&&dynamic<45);
});
