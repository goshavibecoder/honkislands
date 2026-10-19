import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {WalkMotion} from '../walk-motion.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {prepareAntiqueRoom}=await import(moduleURL(new URL('../antique-room.js',import.meta.url)));
const {mountWardrobeAmbush}=await import(moduleURL(new URL('../wardrobe-ambush.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
async function parse(bytes){return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene}

test('the original rigged GROYP replaces grandma, fits inside the wardrobe and holds the shovel in both hands',async()=>{
 const manifest=JSON.parse(readFileSync(new URL('../models/groyp-air-v74.json',import.meta.url))),actor=await parse(gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url)))))),root=await parse(gunzipSync(readFileSync(new URL('../models/honkhub.0.bin',import.meta.url)))),room=prepareAntiqueRoom(root,{balloonDoor:true,wardrobeActor:actor}),world=room.wardrobe;
 assert.ok(world.groyp);assert.equal(world.arms.length,2);assert.equal(root.getObjectByName('Grandma_HONK_seated_storyteller'),undefined);assert.ok(root.getObjectByName('GROYP_shovel_blade'));let skins=0;actor.traverse(o=>{if(o.isSkinnedMesh)skins++});assert.ok(skins>0,'use the supplied GROYP model');
 for(const swing of [0,-.72,1.24]){
  world.pose(1,swing,.4);root.updateMatrixWorld(true);
  for(const arm of world.arms){const hand=arm.hand.getWorldPosition(new THREE.Vector3()),target=world.grip.localToWorld(arm.target.clone());assert.ok(hand.distanceTo(target)<.085,`hand slips off shovel at ${swing}: ${hand.distanceTo(target)}`)}
 }
 world.pose();root.updateMatrixWorld(true);const inverse=world.group.matrixWorld.clone().invert(),body=new THREE.Box3();actor.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();o.computeBoundingBox();const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)body.expandByPoint(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).applyMatrix4(inverse))});
 assert.ok(body.min.x>-.76&&body.max.x<.76,`body intersects the sides ${body.min.x},${body.max.x}`);assert.ok(body.min.z>-.435&&body.max.z<.48,`body intersects the back or closed door ${body.min.z},${body.max.z}`);assert.ok(body.min.y>.25&&body.max.y<2.285);
 const camera=new THREE.PerspectiveCamera(66,1,.035,100);camera.position.set(4.0,1.55,2.83);camera.lookAt(5.42,1.55,2.83);camera.updateMatrixWorld();assert.equal(world.pick(camera,new THREE.Vector2(),[root]),true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(),camera);assert.ok(ray.intersectObjects(world.doors,true).length);world.pose(1);root.updateMatrixWorld(true);assert.equal(ray.intersectObjects(world.doors,true).length,0,'open doors still cover GROYP');
 world.pose();const wall=new THREE.Mesh(new THREE.BoxGeometry(.1,3,2),new THREE.MeshBasicMaterial());wall.position.set(4.6,1.5,2.83);wall.updateMatrixWorld();assert.equal(world.pick(camera,new THREE.Vector2(),[wall]),false);camera.position.x=1;assert.equal(world.pick(camera,new THREE.Vector2(),[]),false);room.dispose();
});

class Element{constructor(){this.events={};this.children=[];this.style={};this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)}}append(...children){this.children.push(...children)}setAttribute(){}addEventListener(k,f){(this.events[k]??=[]).push(f)}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(g=>g!==f)}remove(){this.removed=true}}
function setup(){
 const host=new Element();globalThis.document={getElementById:()=>host,createElement:()=>new Element()};const camera=new THREE.PerspectiveCamera();camera.position.set(4,1.628,2.83);camera.rotation.order='YXZ';camera.lookAt(5.42,1.65,2.83);
 const viewer={camera,active:true,mode:'walk',foot:.028,yaw:camera.rotation.y,pitch:camera.rotation.x,motion:new WalkMotion(),controls:{enabled:false},clearWalkInput(){this.cleared=(this.cleared||0)+1},onWardrobeKnockout(){this.transfers=(this.transfers||0)+1;assert.equal(host.children[1].style.opacity,'1');assert.ok(this.camera.position.y<.27)}};
 const world={groyp:{},nearby:()=>true,facePosition:()=>new THREE.Vector3(5.42,1.65,2.83),lungeDistance:()=>.5,pose(...args){this.last=args}},controller=mountWardrobeAmbush(viewer,world);return {host,viewer,world,controller,black:host.children[1],button:host.children[0]};
}
function advance(c,seconds,hz=60){for(let left=seconds;left>1e-8;){const dt=Math.min(1/hz,left);c.update(dt);left-=dt}}
test('doors open, shovel swings, player falls, blackout completes and the arena transfer fires exactly once at every refresh rate',()=>{
 for(const hz of [30,60,120]){const e=setup(),c=e.controller;c.update(0);assert.equal(e.button.hidden,false);assert.ok(c.begin());assert.equal(c.begin(),false);advance(c,.8,hz);assert.equal(e.world.last[0],1);assert.equal(Number(e.black.style.opacity),0);advance(c,.6,hz);assert.ok(e.world.last[1]<-.6);advance(c,.6,hz);assert.ok(e.world.last[1]>1);assert.ok(e.viewer.camera.position.y<1.628);assert.ok(Number(e.black.style.opacity)>0);assert.equal(e.viewer.transfers,undefined);advance(c,1.1,hz);assert.equal(e.viewer.transfers,1);assert.equal(c.transferring,true);assert.equal(e.black.style.opacity,'1');advance(c,3,hz);assert.equal(e.viewer.transfers,1);c.dispose()}
});
test('leaving mid-swing restores camera, doors, input and the blackout without firing a transfer',()=>{
 const e=setup(),position=e.viewer.camera.position.clone(),quaternion=e.viewer.camera.quaternion.clone();e.controller.begin();advance(e.controller,2);e.controller.cancel();assert.equal(e.controller.active,false);assert.ok(e.viewer.camera.position.equals(position));assert.ok(e.viewer.camera.quaternion.equals(quaternion));assert.equal(e.black.hidden,true);assert.deepEqual(e.world.last,[]);assert.equal(e.viewer.transfers,undefined);assert.equal(e.host.classes.has('wardrobe-ambushed'),false);assert.ok(e.controller.begin());e.controller.dispose();assert.ok(e.black.removed&&e.button.removed);assert.equal(e.button.events.click.length,0);
});
