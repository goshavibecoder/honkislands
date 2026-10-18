import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.min.js';

const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){
 if(modules.has(url.href))return modules.get(url.href);
 const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,prefix,quote,path)=>`${prefix}'${path==='three'?threeURL:moduleURL(new URL(path,url))}'`);
 const result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result;
}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {createArchitectureCollision}=await import(moduleURL(new URL('../walk-architecture.js',import.meta.url)));
const {prepareAntiqueRoom}=await import(moduleURL(new URL('../antique-room.js',import.meta.url)));
const {repairLandingPad}=await import(moduleURL(new URL('../landing-pad.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const fixtures=new Map();
for(const slug of ['citadel','arcade-district','honkhub']){
 const manifest=JSON.parse(readFileSync(new URL('../models/'+slug+'.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url)))));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const room=slug==='honkhub'?prepareAntiqueRoom(scene,{balloonDoor:true}):null;
 fixtures.set(slug,{scene,room,manifest,collision:createArchitectureCollision(scene,slug)});
}
const context=vm.createContext({THREE,fetch:async()=>({ok:true,json:async()=>({})})});
vm.runInContext(readFileSync(new URL('../viewer.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class IslandViewer','globalThis.IslandViewer=class IslandViewer'),context);

test('real castle walls, wings, towers and server partitions block a body from both sides',()=>{
 const {scene,collision}=fixtures.get('citadel');let checked=0;const kinds=new Set();
 scene.traverse(mesh=>{
  if(!mesh.isMesh||!/^(Hall_(side_wall|front_wall|rear_wall)|Laboratory_wing(?:_\d+)?$|Keep_tier_[234](?:_\d+)?$|Octagonal_side_tower|Server_service_wall_(infill|lining))/.test(mesh.name))return;
  const p=mesh.geometry.attributes.position,idx=mesh.geometry.index,t=new THREE.Triangle();let samples=0;
  for(let i=0;i<(idx?.count||p.count)&&samples<4;i+=3){
   for(const [v,j] of [[t.a,i],[t.b,i+1],[t.c,i+2]])v.fromBufferAttribute(p,idx?idx.getX(j):j).applyMatrix4(mesh.matrixWorld);
   const normal=t.getNormal(new THREE.Vector3());if(Math.abs(normal.y)>.1||t.getArea()<.1)continue;
   const point=t.getMidpoint(new THREE.Vector3());
   for(const side of [-1,1])assert.equal(collision.canStand(point.x+normal.x*.07*side,point.z+normal.z*.07*side,point.y-.8),false,mesh.name);
   samples++;checked++;kinds.add(mesh.name.split('_')[0]);
  }
 });
 assert.ok(checked>60);assert.deepEqual([...kinds].sort(),['Hall','Keep','Laboratory','Octagonal','Server']);
 assert.ok(collision.triangleCount>1000&&collision.triangleCount<50000);
});

test('arcade and antique room wall corners are solid while their open front passages stay clear',()=>{
 for(const slug of ['arcade-district','honkhub']){
  const {scene,collision}=fixtures.get(slug);let samples=0;
  scene.traverse(mesh=>{
   if(!mesh.isMesh||!(slug==='honkhub'?/^(Antique_sealed_right_wall|Antique_front_wall_beside_balloon_door|Left_plaster_wall|Rear_plaster_wall)/:/^(Side_wall_|Back_wall(?:_|$))/).test(mesh.name))return;
   const b=new THREE.Box3().setFromObject(mesh),c=b.getCenter(new THREE.Vector3());
   assert.equal(collision.canStand(c.x,c.z,0),false,mesh.name);samples++;
  });assert.ok(samples>=3);
 }
 assert.equal(fixtures.get('arcade-district').collision.canStand(0,5.5,.04),true);
 assert.equal(fixtures.get('honkhub').collision.canStand(1.65,6.11,.028),true);
});

test('the real viewer rejects wall steps but can enter the castle through its actual doorway',()=>{
 const {scene,manifest,collision}=fixtures.get('citadel'),v=Object.create(context.IslandViewer.prototype);
 const raw=readFileSync(new URL('../models/citadel.nav.bin',import.meta.url)),nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),pad=repairLandingPad(scene),ray=new THREE.Raycaster();
 Object.assign(v,{config:{eye:1.65},architectureCollision:collision,boxes:manifest.collisionBoxes.map(([a,b])=>new THREE.Box3(new THREE.Vector3(...a),new THREE.Vector3(...b))),camera:new THREE.PerspectiveCamera(),foot:.1,
  floorAt(x,z,top,far){ray.set(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0));ray.far=far;return ray.intersectObjects([nav,pad],false)[0]?.point.y??null}});
 // These checks use the production canStand and stepTo methods, not a parallel movement implementation.
 const wall=scene.getObjectByName('Hall_side_wall'),b=new THREE.Box3().setFromObject(wall),c=b.getCenter(new THREE.Vector3());
 assert.equal(v.canStand(c.x,c.z,.1),false);v.camera.position.set(c.x-.4,1.75,c.z);assert.equal(v.stepTo(c.x,c.z),false);
 v.foot=v.floorAt(0,6.9,.6,1);assert.notEqual(v.foot,null);v.camera.position.set(0,v.foot+1.65,6.9);
 for(let z=6.875;z>=-1;z-=.025)assert.equal(v.stepTo(0,z),true,`Blocked open castle entrance at z=${z}`);
});
