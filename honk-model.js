import * as THREE from 'three';
import {createAssetCache,fetchGzipJSON} from './asset-loader.js?v=116';
export const loadCurrentHonk=createAssetCache(()=>fetchGzipJSON('./models/honk-current-v166.bin'));
export async function currentHonkMaterial(data){
 const bytes=Uint8Array.from(atob(data.texture),c=>c.charCodeAt(0)),image=await createImageBitmap(new Blob([bytes],{type:'image/webp'})),map=new THREE.Texture(image);map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;
 return new THREE.MeshStandardMaterial({name:'Meshy Rainbow Clown Frog',map,roughness:.78,metalness:0,side:THREE.DoubleSide});
}
export function currentHonkGeometry(source,{height=1,head=false,part=null,seated=false,minY=-Infinity,nose=false}={}){
 const positions=[],normals=[],uv=[],colors=[],indices=[],remap=new Map(),p=source.positions;
 const label=(x,y)=>y<.31?(x<0?'leftLeg':'rightLeg'):y<.60&&Math.abs(x)>.18?(x<0?'leftArm':'rightArm'):'body';
 for(let i=0;i<source.indices.length;i+=3){const ids=source.indices.slice(i,i+3),x=ids.reduce((s,j)=>s+p[j*3],0)/3,y=ids.reduce((s,j)=>s+p[j*3+1],0)/3;
  if(y<minY||head&&y<.56||part&&label(x,y)!==part)continue;
  if(nose&&(Math.abs(x)>.075||y<.605||y>.735||ids.reduce((sum,j)=>sum+p[j*3+2],0)/3<.19))continue;
  for(const j of ids){let k=remap.get(j);if(k===undefined){k=positions.length/3;remap.set(j,k);let x=p[j*3],y=p[j*3+1],z=p[j*3+2];if(head)y-=.56;
   // Blend rigid hip/knee rotations. Projecting a thigh onto a horizontal
   // plane would flatten its volume and collapse the original mesh.
   if(seated&&y<.34){
    const hip=1-THREE.MathUtils.smoothstep(y,.28,.34),knee=1-THREE.MathUtils.smoothstep(y,.115,.165);
    const thighY=.31+z,thighZ=.31-y,shinY=.17+y,shinZ=.17+z;
    y=THREE.MathUtils.lerp(y,THREE.MathUtils.lerp(thighY,shinY,knee),hip);
    z=THREE.MathUtils.lerp(z,THREE.MathUtils.lerp(thighZ,shinZ,knee),hip);
   }
   positions.push(x*height,y*height,z*height);normals.push(...source.normals.slice(j*3,j*3+3));uv.push(...source.uv.slice(j*2,j*2+2));colors.push(...source.colors.slice(j*3,j*3+3));}indices.push(k)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);if(seated)g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
// Ground by the actual posed bounds, then uniformly scale to the old height.
export function fitCurrentHonkGeometry(source,{height=1,seated=false}={}){
 const geometry=currentHonkGeometry(source,{seated}),box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3()),scale=height/(box.max.y-box.min.y);
 const fit=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
 geometry.applyMatrix4(fit);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.honkFit=fit.toArray();return geometry;
}
// This proxy follows the uploaded nose instead of the removed model's face.
export function currentHonkNoseGeometry(source,fit){
 const geometry=currentHonkGeometry(source,{nose:true});if(!geometry.index.count)throw Error('Uploaded HONK nose could not be located');geometry.applyMatrix4(new THREE.Matrix4().fromArray(fit));geometry.computeBoundingBox();return geometry;
}
// Fit by world height and foot position, preserving the new character's proportions.
export async function replaceIslandHonks(root,slug){
 if(!['arena','carnival','honkhub','goat-mountain'].includes(slug))return;
 const groups=new Map();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh||o.userData.currentHonk||o.userData.currentHonkHit)return;const m=/^(Museum_HONK_|Small_HONK_toy_|Rider_Museum_HONK_|Flag_HONK_(?:\d+_)?Museum_HONK_|Museum_miniature_HONK_\d+_Museum_HONK_)/.exec(o.name);if(m){const key=m[1];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o)}});
 if(!groups.size)return;const data=await loadCurrentHonk(),material=await currentHonkMaterial(data),inverse=root.matrixWorld.clone().invert();
 const fitted=[];for(const [prefix,objects] of groups){const heads=objects.filter(o=>/^Head(?:_\d+)?$/.test(o.name.slice(prefix.length)));if(heads.length<=1)fitted.push([prefix,objects]);else{const centers=heads.map(o=>new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())),parts=heads.map(()=>[]);for(const o of objects){const c=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());let nearest=0;for(let i=1;i<centers.length;i++)if(c.distanceToSquared(centers[i])<c.distanceToSquared(centers[nearest]))nearest=i;parts[nearest].push(o)}for(let i=0;i<parts.length;i++)fitted.push([prefix,parts[i]])}}
 for(const [prefix,old] of fitted){const box=new THREE.Box3();for(const o of old)box.expandByObject(o);const center=box.getCenter(new THREE.Vector3()),nose=old.find(o=>/RedClownNose/.test(o.name)),head=old.find(o=>/Head(?:_\d+)?$/.test(o.name)),direction=nose&&head?new THREE.Box3().setFromObject(nose).getCenter(new THREE.Vector3()).sub(new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3())):new THREE.Vector3(0,0,1),yaw=Math.atan2(direction.x,direction.z),height=box.max.y-box.min.y,rider=prefix.startsWith('Rider_'),geometry=fitCurrentHonkGeometry(data.high,{height,seated:rider});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=prefix+'CurrentMeshyModel';mesh.userData.currentHonk=true;mesh.userData.currentHonkData=data;const transform=new THREE.Matrix4().compose(new THREE.Vector3(center.x,box.min.y,center.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(1,1,1));mesh.matrix.copy(inverse.clone().multiply(transform));mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);root.add(mesh);
  if(slug==='arena'&&nose){const proxy=new THREE.Mesh(currentHonkNoseGeometry(data.high,geometry.userData.honkFit),new THREE.MeshBasicMaterial({visible:false}));proxy.name=prefix+'RedClownNose';proxy.userData.currentHonkHit=true;proxy.position.copy(mesh.position);proxy.quaternion.copy(mesh.quaternion);proxy.scale.copy(mesh.scale);root.add(proxy)}
  for(const o of old)o.removeFromParent();
 }
 root.updateMatrixWorld(true);
}
