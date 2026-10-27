import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {WalkMotion} from '../walk-motion.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {mountMountainSki}=await import(moduleURL(new URL('../mountain-ski.js',import.meta.url)));
class Element{
 constructor(){this.events={};this.nodes=new Map();this.classes=new Set();this.hidden=false;this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k)}}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}
 removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(g=>g!==f)}
 emit(k,data={}){for(const f of this.events[k]||[])f({preventDefault(){},pointerId:1,...data})}
 append(child){this.child=child}querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k)}
 setPointerCapture(){}remove(){this.removed=true}
}
function setup(){
 const host=new Element();globalThis.window=new Element();globalThis.document={getElementById:()=>host,createElement:()=>new Element()};
 const world={centerline:[new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,10),new THREE.Vector3(0,0,20)],start:new THREE.Vector3(0,1,0)};
 const viewer={active:true,mode:'walk',foot:1,yaw:.4,pitch:.1,keys:new Set(),stick:{x:0,y:0},config:{eye:1.65},camera:new THREE.PerspectiveCamera(),motion:new WalkMotion(),physics:{clearAt:()=>true},canStand:()=>true,clearWalkInput(){this.keys.clear();this.stick.x=this.stick.y=0;this.motion.stop()}};
 viewer.camera.position.set(.1,2.65,0);const skier={group:new THREE.Group(),pose(p){this.group.position.copy(p)}};
 const controller=mountMountainSki(viewer,world,skier);return {viewer,world,controller,host,skier,panel:host.child};
}
test('touch start, push, brake hold, pointer cancellation and exit restore a supported walking pose',()=>{
 const {viewer,controller,panel,host,skier}=setup();assert.equal(skier.group.visible,false);panel.querySelector('.ski-start').emit('click');assert.ok(controller.active);assert.equal(skier.group.visible,true);assert.ok(host.classes.has('skiing'));
 viewer.stick.y=-1;for(let i=0;i<60;i++)controller.update(1/60);assert.ok(controller.model.speed>1);assert.ok(controller.model.position.z>0);
 panel.querySelector('.ski-brake').emit('pointerdown');for(let i=0;i<60;i++)controller.update(1/60);assert.equal(controller.model.speed,0);
 panel.querySelector('.ski-brake').emit('pointercancel');for(let i=0;i<30;i++)controller.update(1/60);assert.ok(controller.model.speed>0);
 const position={...controller.model.position};panel.querySelector('.ski-exit').emit('click');assert.equal(controller.active,false);assert.equal(viewer.camera.position.y,position.y+viewer.config.eye);assert.equal(viewer.camera.position.z,position.z);assert.equal(viewer.stick.y,0);assert.ok(!host.classes.has('skiing'));assert.equal(skier.group.visible,false);
 controller.dispose();assert.ok(panel.removed);
});
test('cancelling a run restores the pre-ski pose and disposed controls remove global handlers',()=>{
 const {viewer,controller,panel}=setup(),position=viewer.camera.position.clone();panel.querySelector('.ski-start').emit('click');viewer.keys.add('KeyW');controller.update(.08);controller.cancel();assert.ok(viewer.camera.position.equals(position));assert.equal(viewer.yaw,.4);assert.equal(viewer.pitch,.1);assert.equal(viewer.foot,1);
 controller.dispose();assert.equal(window.events.blur.length,0);assert.equal(window.events.keydown.length,0);
});

test('dragging rotates the ski camera independently of steering and keeps the view finite at its pitch limits',()=>{
 const {viewer,controller,panel,skier}=setup();controller.look(300,100);assert.equal(skier.group.visible,false);
 panel.querySelector('.ski-start').emit('click');controller.update(.08);const position=viewer.camera.position.clone(),heading=controller.model.yaw;
 controller.look(300,100);controller.update(.08);assert.ok(Math.abs(viewer.camera.position.x-position.x)>.2);assert.equal(controller.model.yaw,heading);assert.equal(viewer.motion.targetYaw,viewer.motion.yaw);
 controller.look(100000,100000);controller.update(.08);assert.ok(viewer.camera.position.toArray().every(Number.isFinite));assert.ok(viewer.camera.position.y>controller.model.position.y);
 controller.cancel();assert.equal(skier.group.visible,false);controller.dispose();
});

test('touch and Space trigger one jump, and stepping off in midair returns to supported snow',()=>{
 for(const touch of [true,false]){
  const {viewer,controller,panel}=setup(),fov=viewer.camera.fov;panel.querySelector('.ski-start').emit('click');viewer.keys.add('KeyW');for(let i=0;i<45;i++)controller.update(1/60);
  if(touch)panel.querySelector('.snowboard-jump').emit('pointerdown');else viewer.keys.add('Space');controller.update(1/60);assert.equal(controller.model.airborne,true);assert.ok(controller.model.airHeight>0);assert.ok(viewer.camera.fov>fov);const floor={...controller.model.lastGround};
  panel.querySelector('.ski-exit').emit('click');assert.equal(controller.active,false);assert.equal(viewer.foot,floor.y);assert.equal(viewer.camera.position.y,floor.y+viewer.config.eye);assert.equal(viewer.camera.fov,fov);controller.dispose();
 }
});
test('opening desktop controls pauses a jump and cannot leave a queued launch after closing',()=>{
 const {viewer,controller,panel}=setup();panel.querySelector('.ski-start').emit('click');viewer.keys.add('Space');controller.update(.08);assert.equal(controller.model.airborne,true);viewer.desktopControls={menuOpen:true};const position={...controller.model.position};controller.update(.08);assert.deepEqual(controller.model.position,position);viewer.keys.clear();viewer.desktopControls.menuOpen=false;controller.update(.08);assert.ok(controller.model.position.y!==position.y);controller.dispose();
});

const {createSkiHonk}=await import(moduleURL(new URL('../ski-honk.js',import.meta.url)));
const uploadedHonk=JSON.parse(gunzipSync(readFileSync(new URL('../models/honk-current-v166.bin',import.meta.url))));
test('the uploaded HONK head faces the snowboarder chest through turns, crouches and jumps',()=>{
 const material=new THREE.MeshStandardMaterial({map:new THREE.Texture()}),skier=createSkiHonk(new THREE.Group(),{current:uploadedHonk,material});
 for(const yaw of [0,.7,-1.3,Math.PI])for(const turn of [-1,0,1])for(const airborne of [false,true]){
  skier.pose(new THREE.Vector3(3,4,-2),yaw,10,turn,.25,{airborne,verticalSpeed:3,landing:.6});skier.group.updateMatrixWorld(true);
  const face=new THREE.Vector3(0,0,1).transformDirection(skier.head.matrixWorld),chest=new THREE.Vector3(1,0,0).transformDirection(skier.body.matrixWorld);assert.ok(face.dot(chest)>.99,'uploaded head faces sideways relative to the chest');
 }skier.dispose();
});
test('the actual uploaded head stays on the neck and boots stay on their bindings in each snowboard pose',()=>{
 const skier=createSkiHonk(new THREE.Group(),{current:uploadedHonk,material:new THREE.MeshStandardMaterial()});
 for(const speed of [0,6,12])for(const turn of [-1,0,1])for(const airborne of [false,true]){
  skier.pose(new THREE.Vector3(2,5,-3),.9,speed,turn,.35,{airborne,landing:.8});skier.group.updateMatrixWorld(true);
  const neck=skier.body.children.find(o=>o.isMesh&&o.material.color?.getHex()===0x659b3e),headBounds=new THREE.Box3().setFromObject(skier.head),neckBounds=new THREE.Box3().setFromObject(neck);assert.ok(headBounds.intersectsBox(neckBounds),'head detached from neck');
  for(const b of skier.bindings){b.binding.geometry.computeBoundingBox();b.sole.geometry.computeBoundingBox();const soleBottom=skier.board.parent.worldToLocal(b.sole.localToWorld(new THREE.Vector3(0,b.sole.geometry.boundingBox.min.y,0))),bindingTop=skier.board.parent.worldToLocal(b.binding.localToWorld(new THREE.Vector3(0,b.binding.geometry.boundingBox.max.y,0)));assert.ok(Math.abs(soleBottom.y-bindingTop.y)<1e-6,'boot detaches from its binding')}
 }assert.ok(skier.head.children[0].geometry.attributes.uv);skier.dispose();
});
