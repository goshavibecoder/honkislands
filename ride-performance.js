import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Bake siblings in their parent's local coordinates. Moving wheels, doors,
// rotors and transparent glass stay separate; no detail or lighting is lost.
export function batchRideMeshes(parent,{keep=()=>false}={}){
 const buckets=new Map();
 for(const o of parent.children){
  if(!o.isMesh||Array.isArray(o.material)||o.material.transparent||keep(o))continue;
  const key=o.material.uuid;let list=buckets.get(key);if(!list){list=[];buckets.set(key,list)}list.push(o);
 }
 for(const list of buckets.values()){
  if(list.length<2)continue;
  const geometries=list.map(o=>{o.updateMatrix();const g=o.geometry.clone().applyMatrix4(o.matrix),plain=g.index?g.toNonIndexed():g;if(plain!==g)g.dispose();for(const key of Object.keys(plain.attributes))if(!['position','normal','uv'].includes(key))plain.deleteAttribute(key);if(!plain.attributes.normal)plain.computeVertexNormals();if(!plain.attributes.uv)plain.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(plain.attributes.position.count*2),2));return plain});
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!geometry)continue;
  geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,list[0].material);mesh.name='Ride_rigid_material_batch';parent.add(mesh);
  for(const o of list)o.removeFromParent();
  for(const geometry of new Set(list.map(o=>o.geometry)))if(!parent.children.some(o=>o.geometry===geometry))geometry.dispose();
 }
}
