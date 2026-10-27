import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createAssetCache,fetchAssetBytes,fetchAssetJSON,loadCompressedScene} from './asset-loader.js?v=116';

// Transport compression is lossless. Parse a fresh scene on each visit because
// the viewer releases its geometries, materials and ImageBitmaps on departure.
const loadBytes=createAssetCache(async()=>{
 const manifest=await fetchAssetJSON('./models/arena-original-honk-v171.json');
 return loadCompressedScene(manifest,(part,onChunk,cache)=>fetchAssetBytes('./models/'+part,onChunk,{cache}));
});
export async function loadArenaOriginalHonk(){return new GLTFLoader().parseAsync(await loadBytes(),'')}

export function installArenaOriginalHonk(root,gltf){
 root.updateMatrixWorld(true);const old=[];
 root.traverse(o=>{if(o.isMesh&&/^Museum_HONK_/.test(o.name))old.push(o)});
 if(!old.length)throw Error('Arena HONK statue not found');
 const target=new THREE.Box3();for(const mesh of old)target.expandByObject(mesh);
 const head=old.find(o=>/^Museum_HONK_Head(?:_\d+)?$/.test(o.name)),nose=old.find(o=>/RedClownNose/.test(o.name)),center=target.getCenter(new THREE.Vector3());
 const direction=head&&nose?new THREE.Box3().setFromObject(nose).getCenter(new THREE.Vector3()).sub(new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3())):new THREE.Vector3(0,0,1);
 const source=gltf.scene;source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),origin=bounds.getCenter(new THREE.Vector3()),height=bounds.max.y-bounds.min.y,scale=(target.max.y-target.min.y)/height;
 if(!(height>0&&Number.isFinite(scale)))throw Error('Invalid arena HONK model bounds');
 const group=new THREE.Group();group.name='Arena_original_uploaded_HONK';
 const fit=new THREE.Matrix4().compose(new THREE.Vector3(center.x,target.min.y,center.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(direction.x,direction.z)),new THREE.Vector3(scale,scale,scale));
 fit.multiply(new THREE.Matrix4().makeTranslation(-origin.x,-bounds.min.y,-origin.z));
 group.matrix.copy(root.matrixWorld.clone().invert().multiply(fit));group.matrix.decompose(group.position,group.quaternion,group.scale);
 // A separate invisible nose hit surface keeps the supplied PBR material intact.
 const positions=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),mid=new THREE.Vector3();
 source.traverse(o=>{
  o.userData.arenaOriginalHonk=true;if(!o.isMesh)return;
  const p=o.geometry.attributes.position,index=o.geometry.index,count=index?index.count:p.count;
  for(let i=0;i<count;i+=3){
   a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(o.matrixWorld);
   mid.copy(a).add(b).add(c).multiplyScalar(1/3);const x=(mid.x-origin.x)/height,y=(mid.y-bounds.min.y)/height,z=(mid.z-origin.z)/height;
   if(Math.abs(x)<.075&&y>.605&&y<.735&&z>.19)positions.push(...a.toArray(),...b.toArray(),...c.toArray());
  }
 });
 if(!positions.length)throw Error('Arena HONK nose not found');
 const hit=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
 hit.name='Arena_original_HONK_RedClownNose';hit.userData.arenaOriginalHonkHit=true;hit.userData.arenaOriginalHonk=true;
 group.add(source,hit);root.add(group);for(const mesh of old)mesh.removeFromParent();
 const retainedGeometry=new Set(),retainedMaterial=new Set();root.traverse(o=>{if(o.geometry)retainedGeometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)retainedMaterial.add(m)});
 for(const geometry of new Set(old.map(o=>o.geometry)))if(!retainedGeometry.has(geometry))geometry.dispose();
 for(const material of new Set(old.flatMap(o=>Array.isArray(o.material)?o.material:[o.material])))if(!retainedMaterial.has(material))material.dispose();
 root.updateMatrixWorld(true);return {group,source,nose:hit,targetBounds:target};
}
