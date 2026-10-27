import * as THREE from 'three';
import {createOriginalHonkSpectator} from './arena-honk-spectators.js?v=173';

export function replaceWorldOriginalHonks(root,slug,template){
 if(!template||slug==='arena'||slug==='goat-mountain')return [];
 root.updateMatrixWorld(true);const groups=new Map(),replacements=[],source=template.scene.children.find(o=>o.isMesh);
 root.traverse(o=>{if(!o.isMesh||o.userData.arenaOriginalHonk)return;const match=/^(Museum_HONK_|Small_HONK_toy_|Rider_Museum_HONK_|Flag_HONK_(?:\d+_)?Museum_HONK_|Museum_miniature_HONK_\d+_Museum_HONK_)/.exec(o.name);if(match){if(!groups.has(match[1]))groups.set(match[1],[]);groups.get(match[1]).push(o)}});
 const instances=[];
 for(const [prefix,objects] of groups){const heads=objects.filter(o=>/^Head(?:_\d+)?$/.test(o.name.slice(prefix.length)));if(heads.length<=1){instances.push([prefix,objects]);continue}const centers=heads.map(o=>new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())),parts=heads.map(()=>[]);for(const o of objects){const c=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());let best=0;for(let i=1;i<centers.length;i++)if(c.distanceToSquared(centers[i])<c.distanceToSquared(centers[best]))best=i;parts[best].push(o)}for(const part of parts)instances.push([prefix,part])}
 let seated;
 for(const [prefix,old] of instances){
  const bounds=new THREE.Box3();for(const o of old)bounds.expandByObject(o);const center=bounds.getCenter(new THREE.Vector3()),head=old.find(o=>/Head(?:_\d+)?$/.test(o.name)),nose=old.find(o=>/RedClownNose/.test(o.name)),forward=head&&nose?new THREE.Box3().setFromObject(nose).getCenter(new THREE.Vector3()).sub(new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3())):new THREE.Vector3(0,0,1);
  if(prefix.startsWith('Rider_'))seated??=createOriginalHonkSpectator(template.scene);
  const geometry=prefix.startsWith('Rider_')?seated.geometry:source.geometry;geometry.computeBoundingBox();const box=geometry.boundingBox,origin=box.getCenter(new THREE.Vector3()),scale=(bounds.max.y-bounds.min.y)/(box.max.y-box.min.y),mesh=new THREE.Mesh(geometry,source.material);
  mesh.name=prefix+'Original_uploaded_model';mesh.userData.arenaOriginalHonk=true;const fit=new THREE.Matrix4().compose(new THREE.Vector3(center.x,bounds.min.y,center.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(forward.x,forward.z)),new THREE.Vector3(scale,scale,scale));fit.multiply(new THREE.Matrix4().makeTranslation(-origin.x,-box.min.y,-origin.z));mesh.matrix.copy(root.matrixWorld.clone().invert().multiply(fit));mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);root.add(mesh);for(const o of old)o.removeFromParent();replacements.push(mesh);
 }
 seated?.material.dispose();root.updateMatrixWorld(true);return replacements;
}
