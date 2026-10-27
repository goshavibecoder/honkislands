import {loadCurrentHonk,currentHonkMaterial,currentHonkGeometry} from './honk-model.js?v=169';
import * as THREE from 'three';
import {createSeatedHonkLegs} from './arena-seated-legs.js?v=88';

export async function loadArenaCrowd(){
 const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`Crowd asset ${r.status}: ${url}`);return r.json()},packed=async url=>{const manifest=await read(url),parts=await Promise.all(manifest.parts.map(name=>read('./models/'+name))),raw=atob(parts.join('')),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json()};
 const [data,honk]=await Promise.all([packed('./models/arena-crowd-v84.json'),packed('./models/arena-honk-seated-v88.json')]);data.honk=honk;const current=await loadCurrentHonk(),material=await currentHonkMaterial(current);honk.map=material.map;material.dispose();for(const lod of ['high','low']){const g=currentHonkGeometry(current[lod==='high'?'medium':'low'],{height:1.2,minY:.30}),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)-.36);honk[lod]={positions:Array.from(p.array),normals:Array.from(g.attributes.normal.array),uv:Array.from(g.attributes.uv.array),colors:Array.from(g.attributes.color.array),indices:Array.from(g.index.array)};g.dispose()}
 const pixels=Uint8Array.from(atob(data.texture),c=>c.charCodeAt(0)),image=await createImageBitmap(new Blob([pixels],{type:'image/webp'}));
 data.groyper.map=new THREE.Texture(image);data.groyper.map.flipY=false;data.groyper.map.colorSpace=THREE.SRGBColorSpace;data.groyper.map.needsUpdate=true;return data;
}

// A decorative audience must never prevent entering the actual island.
export async function prepareArenaAudience(root,{load=loadArenaCrowd,onError=error=>console.warn('Audience could not load',error)}={}){
 let data;
 try{data=await load();return createArenaCrowd(root,data)}catch(error){
  const group=root.getObjectByName('Colosseum_seated_audience'),materials=new Set();
  if(group){group.traverse(o=>{o.geometry?.dispose();o.dispose?.();if(o.material)materials.add(o.material)});for(const material of materials)material.dispose();group.removeFromParent()}
  data?.groyper?.map?.dispose();data?.groyper?.map?.image?.close?.();onError(error);return null;
 }
}

// Return the vertical clearance above the cushion, in world metres. The GLB
// chairs are Z-up and scaled, so a normalised local direction loses the scale.
function cushionClearance(source,matrix,cushion){
 cushion.geometry.computeBoundingBox();const box=cushion.geometry.boundingBox,inverse=cushion.matrixWorld.clone().invert(),worldUp=[inverse.elements[4],inverse.elements[5],inverse.elements[6]],axis=worldUp.reduce((best,v,i)=>Math.abs(v)>Math.abs(worldUp[best])?i:best,0),horizontal=[0,1,2].filter(i=>i!==axis),lo=box.min.toArray(),hi=box.max.toArray(),e=inverse.multiply(matrix).elements,positions=source.positions,top=worldUp[axis]>0?hi[axis]:lo[axis];let gap=Infinity;
 const a=horizontal[0],b=horizontal[1];for(let i=0;i<positions.length;i+=3){const x=positions[i],y=positions[i+1],z=positions[i+2],u=e[a]*x+e[4+a]*y+e[8+a]*z+e[12+a];if(u<lo[a]||u>hi[a])continue;const v=e[b]*x+e[4+b]*y+e[8+b]*z+e[12+b];if(v<lo[b]||v>hi[b])continue;const height=e[axis]*x+e[4+axis]*y+e[8+axis]*z+e[12+axis];gap=Math.min(gap,(height-top)/worldUp[axis])}
 return Number.isFinite(gap)?gap:0;
}

export function createArenaCrowd(root,characters){
 root.updateMatrixWorld(true);const seats=[];
 root.traverse(o=>{if(o.isMesh&&/^Individual_seat_red_cushion(?:_|$)/.test(o.name.replaceAll(' ','_'))){const b=new THREE.Box3().setFromObject(o),p=b.getCenter(new THREE.Vector3());p.y=b.max.y;seats.push({name:o.name,position:p,mesh:o})}});
 const group=new THREE.Group();group.name='Colosseum_seated_audience';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const names=['groyper','fast','teledog','honk','zoich'],extraBoxes=[],placements=[],meshes=[],batches=new Map(),materials=[],sources=Object.fromEntries(names.map(name=>[name,characters[name]]));
 for(let i=0;i<seats.length;i++){
  const seat=seats[i],name=names[(i*3+Math.floor(i/7))%names.length],variant=name,data=sources[variant],back=root.getObjectByName(seat.name.replace('red_cushion','low_carved_back')),backCenter=back?new THREE.Box3().setFromObject(back).getCenter(new THREE.Vector3()):seat.position.clone().multiplyScalar(1.1),inward=seat.position.clone().sub(backCenter);inward.y=0;inward.normalize();const p=seat.position.clone().addScaledVector(inward,data.frontOffset);
  const yaw=Math.atan2(inward.x,inward.z)+(name==='honk'?0:Math.sin(i*7.13)*.025),scale=.96+.06*(.5+.5*Math.sin(i*3.71));p.y+=data.seatLift*scale+.008;
  const matrix=new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(scale,scale,scale));
  const matrices={};for(const lod of ['high','low']){const fitted=matrix.clone();fitted.elements[13]-=cushionClearance(data[lod],fitted,seat.mesh)-.002;matrices[lod]=fitted}p.y=matrices.high.elements[13];
  placements.push({name,variant,seat:seat.name,position:p,yaw,scale,matrix:matrices.high,matrices});
  extraBoxes.push(new THREE.Box3(new THREE.Vector3(p.x-.25,p.y-.12,p.z-.25),new THREE.Vector3(p.x+.25,p.y+.65,p.z+.25)));
 }
 for(const name of Object.keys(sources)){
  const data=sources[name];if(!data)throw Error('Missing crowd character: '+name);const count=placements.filter(p=>p.variant===name).length;
  // Double-sided source surfaces remain closed from both sides. Full texture
  // and detailed geometry are retained for the spectators beside the player.
  const material=new THREE.MeshStandardMaterial({name:'Teledog cast / '+name,vertexColors:!data.map,map:data.map||null,side:THREE.DoubleSide,roughness:.82,metalness:0});materials.push(material);const pair={};
  for(const lod of ['high','low']){
   const source=data[lod],geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(source.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(source.colors,3));if(source.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(source.uv,2));geometry.setIndex(source.indices);if(source.normals)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(source.normals,3));else geometry.computeVertexNormals();
   const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=`Arena_spectators_${name}_${lod}`;mesh.userData.arenaCrowd=true;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);meshes.push(mesh);pair[lod]=mesh;
  }
  batches.set(name,pair);
 }
 const legs=createSeatedHonkLegs(root,group,placements,characters.honk);extraBoxes.push(...legs.extraBoxes);
 let elapsed=1,triangles=0,nearCount=0;
 function update(dt,camera){elapsed+=dt;if(elapsed<.25)return;elapsed=0;const nearby=placements.map((p,i)=>({i,d:p.position.distanceToSquared(camera)})).filter(p=>p.d<36).sort((a,b)=>a.d-b.d).slice(0,10),high=new Set();let detailBudget=0;for(const item of nearby){const cost=sources[placements[item.i].variant].high.indices.length/3;if(detailBudget+cost>240000)continue;high.add(item.i);detailBudget+=cost}nearCount=high.size;triangles=legs.triangles;
  for(const pair of batches.values())pair.high.count=pair.low.count=0;
  for(let i=0;i<placements.length;i++){const p=placements[i],lod=high.has(i)?'high':'low',mesh=batches.get(p.variant)[lod];mesh.setMatrixAt(mesh.count++,p.matrices[lod])}
  for(const mesh of meshes){mesh.instanceMatrix.needsUpdate=true;triangles+=mesh.count*mesh.geometry.index.count/3}
 }
 update(1,new THREE.Vector3(0,2.4,2.5));
 return {group,meshes,placements,sources,legs,extraBoxes,count:seats.length,get triangles(){return triangles},get nearCount(){return nearCount},update,dispose(){legs.dispose();for(const mesh of meshes){mesh.dispose();mesh.geometry.dispose()}for(const m of materials)m.dispose();for(const data of Object.values(sources)){data.map?.dispose();data.map?.image?.close?.()}group.removeFromParent()}};
}
