// Export original repository characters for the offline crowd LOD baker.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const source=process.argv[2],output=process.argv[3],modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const s=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:p==='three/addons/loaders/GLTFLoader.js'?moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)):moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(s).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const parse=async bytes=>(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
const hall=await parse(gunzipSync(readFileSync(source+'/assets/hall.glb.gz'))),frog=await parse(gunzipSync(readFileSync(source+'/assets/groyper_green.glb.gz')));
const head=JSON.parse(readFileSync(source+'/assets/clown-head.json'));hall.children[28].geometry.attributes.position.array.set(head.positions);hall.children[28].geometry.attributes.normal.array.set(head.normals);
if(process.argv.includes('--museum-news')){const {fixClownBrows}=await import(moduleURL(new URL('file://'+source+'/hall.js')));fixClownBrows(hall)}
// Lower the supplied frog's arms using its original connected skeleton.
frog.updateMatrixWorld(true);for(const [name,angle] of [['upperarm_l',-1.16],['upperarm_r',1.16]]){const bone=frog.getObjectByName(name),q=bone.parent.getWorldQuaternion(new THREE.Quaternion()),axis=new THREE.Vector3(0,0,1).applyQuaternion(q.invert());bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));bone.updateWorldMatrix(false,true)}
frog.updateMatrixWorld(true);hall.updateMatrixWorld(true);
function exportMeshes(nodes){const result=[];for(const node of nodes)node.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,positions=[],v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(o.isSkinnedMesh)o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);positions.push(v.x,v.y,v.z)}result.push({positions,indices:Array.from(o.geometry.index?.array||Array.from({length:p.count},(_,i)=>i)),uv:o.geometry.attributes.uv?Array.from(o.geometry.attributes.uv.array):null,color:o.material.color.toArray()})});return result}
writeFileSync(output,JSON.stringify({teledog:exportMeshes(hall.children.slice(4,9)),zoich:exportMeshes(hall.children.slice(10,19)),fast:exportMeshes(hall.children.slice(20,27)),honk:exportMeshes(hall.children.slice(27,43)),groyper:exportMeshes([frog])}));
