import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';

const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){
 if(modules.has(url.href))return modules.get(url.href);
 const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,prefix,quote,path)=>`${prefix}'${path==='three'?threeURL:moduleURL(new URL(path,url))}'`);
 const result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result;
}
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {createWorldTargets,NOTE_LINKS}=await import(moduleURL(new URL('../world-links.js',import.meta.url)));
const bytes=gunzipSync(readFileSync(new URL('../models/citadel.0.bin',import.meta.url)));
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const picker=createWorldTargets(scene,'citadel');

test('the real castle emblems map to the supplied Gram and existing HONK social links',()=>{
 assert.deepEqual([...new Set(picker.targets.map(o=>o.userData.title))].sort(),['Gram','Telegram','X']);
 assert.equal(NOTE_LINKS.Gram,'https://gram.org/jetton/EQAmWanX8ohlsG6qBpfL2ritCQ7tr7MlJpEK64Khm-O4742K');
 assert.equal(NOTE_LINKS.TG,'https://t.me/HonkHonkler');assert.equal(NOTE_LINKS.X,'https://x.com/HonklerX');
 for(const title of ['Gram','Telegram','X'])assert.ok(picker.targets.some(o=>o.userData.title===title&&/hanging_flag|banner/.test(o.name)));
 assert.equal(createWorldTargets(scene,'honkhub').targets.length,0);
});

test('each castle link can be tapped on its visible geometry and is blocked by a nearer wall',()=>{
 const center=new THREE.Vector2(),camera=new THREE.PerspectiveCamera(66,1,.035,100);
 for(const title of ['Gram','Telegram','X']){
  let visible=null;
  for(const mesh of picker.targets.filter(o=>o.userData.title===title)){
   const p=mesh.geometry.attributes.position,idx=mesh.geometry.index,triangle=new THREE.Triangle();
   for(let i=0;i<(idx?.count||p.count)&&!visible;i+=3){
    for(const [v,j] of [[triangle.a,i],[triangle.b,i+1],[triangle.c,i+2]])v.fromBufferAttribute(p,idx?idx.getX(j):j);
    const mid=triangle.getMidpoint(new THREE.Vector3()),normal=triangle.getNormal(new THREE.Vector3());if(normal.lengthSq()<.5)continue;
    for(const side of [1,-1]){
     camera.position.copy(mid).addScaledVector(normal,side*1.5);camera.lookAt(mid);
     const result=picker.pick(camera,center,[scene],12);
     if(result?.title===title){visible={mid,camera:camera.clone()};break}
    }
   }
   if(visible)break;
  }
  assert.ok(visible,`No visible tap ray for ${title}`);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.1),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  wall.position.lerpVectors(visible.camera.position,visible.mid,.5);wall.quaternion.copy(visible.camera.quaternion);wall.updateMatrixWorld();
  assert.equal(picker.pick(visible.camera,center,[scene,wall],12),null,`${title} opens through a wall`);
  wall.geometry.dispose();wall.material.dispose();
 }
});
