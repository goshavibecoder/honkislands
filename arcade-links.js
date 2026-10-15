import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export const GAME_LINKS=Object.freeze({
 'HONK OF DUTY':'https://t.me/HONK_OF_DUTY_bot',
 'HONKEY HONK':'https://t.me/HonkeyHonkBot',
 'HONKSTERS':'https://t.me/Honksters_bot',
 'HONK ASSASSIN':'https://t.me/Honk_Assassin_bot',
 'HONKLER SPACE':'https://t.me/Honkler_space_bot',
 'HONK DRIVE':'https://t.me/Honkdrivebot',
 'BLIND HONK':'https://t.me/BlindHonkBot',
 'HONKT IT':'https://t.me/honkt_itbot',
 'HONK OFF':'https://t.me/HonkOffBot',
 'HONKEY HONKER':'https://t.me/Honkeyhonkerbot',
 'HONK ESCAPE ROOM':'https://t.me/HonkEscapeRoom_bot'
});

// Preserve each cabinet's exact geometry and GLB metadata before the visible
// room is batched by material. Picking these meshes cannot confuse neighbours.
export function createArcadeTargets(root){
 root.updateMatrixWorld(true);const groups=new Map(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 root.traverse(o=>{
  if(!o.isMesh)return;
  const title=o.userData.arcadeGame,url=GAME_LINKS[title],cabinet=o.name.match(/^Arcade[_ ](\d+)[_ ]/);
  if(!url||!cabinet)return;
  let entry=groups.get(cabinet[1]);if(!entry){entry={title,url,cabinet:Number(cabinet[1]),geometries:[]};groups.set(cabinet[1],entry)}
  const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
  for(const key of Object.keys(geometry.attributes))if(key!=='position')geometry.deleteAttribute(key);
  entry.geometries.push(geometry);
 });
 const targets=[];
 for(const entry of groups.values()){
  const geometry=mergeGeometries(entry.geometries,false);entry.geometries.forEach(g=>g.dispose());
  if(!geometry)throw Error('Game cabinet geometry unavailable');geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.userData={title:entry.title,url:entry.url,cabinet:entry.cabinet};mesh.updateMatrixWorld();targets.push(mesh);
 }
 const ray=new THREE.Raycaster();
 return {targets,
  pick(camera,point,blockers,maxDistance=Infinity){
   camera.updateMatrixWorld();ray.setFromCamera(point,camera);ray.near=0;ray.far=maxDistance;
   const hit=ray.intersectObjects(targets,false)[0];if(!hit)return null;
   ray.far=hit.distance+.04;const obstruction=ray.intersectObjects(blockers,true)[0];
   if(obstruction&&obstruction.distance<hit.distance-.035)return null;
   return hit.object.userData;
  },
  dispose(){targets.forEach(o=>o.geometry.dispose());material.dispose();targets.length=0}
 };
}
