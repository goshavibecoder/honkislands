import * as THREE from 'three';
import {createPickSet} from './arcade-links.js?v=8';

export const TROPHY_URL='https://t.me/Honkster_Bot';

// Apply before batching so only the cup, stem, foot and two handles change.
export function prepareTrophy(root,environment){
 root.updateMatrixWorld(true);
 const gold=new THREE.MeshPhysicalMaterial({
  name:'Polished trophy gold',color:0xffd05a,metalness:1,roughness:.16,
  clearcoat:.65,clearcoatRoughness:.09,
  envMap:environment,envMapIntensity:1.35
 });
 const hitMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),targets=[];
 root.traverse(o=>{
  if(!o.isMesh||!/^Game[_ ]trophy[_ ]/.test(o.name))return;
  if(!/marble[_ ]plinth/.test(o.name))o.material=gold;
  const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
  const mesh=new THREE.Mesh(geometry,hitMaterial);
  mesh.userData={title:'Honkster',url:TROPHY_URL};mesh.updateMatrixWorld();targets.push(mesh);
 });
 if(!targets.length){gold.dispose();hitMaterial.dispose();throw Error('Arena trophy unavailable')}
 return createPickSet(targets,hitMaterial);
}
