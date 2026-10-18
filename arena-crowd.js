import * as THREE from 'three';

// Only compact posed geometry is loaded, once per island visit. Five draw calls
// cover the entire audience; no per-spectator rigs, textures or frame updates.
export async function loadArenaCrowd(){
 const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`Crowd asset ${r.status}: ${url}`);return r.json()},manifest=await read('./models/arena-crowd-v82.json');
 const parts=await Promise.all(manifest.parts.map(name=>read('./models/'+name))),encoded=parts.join(''),raw=atob(encoded),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
}

export function createArenaCrowd(root,characters){
 root.updateMatrixWorld(true);const seats=[];
 root.traverse(o=>{if(o.isMesh&&/^Individual_seat_red_cushion(?:_|$)/.test(o.name.replaceAll(' ','_'))){const b=new THREE.Box3().setFromObject(o),p=b.getCenter(new THREE.Vector3());p.y=b.max.y+.006;seats.push({name:o.name,position:p})}});
 const group=new THREE.Group();group.name='Colosseum_seated_audience';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const names=['groyper','fast','teledog','honk','zoich'],buckets=new Map(names.map(name=>[name,[]])),extraBoxes=[],placements=[];
 for(let i=0;i<seats.length;i++){
  const seat=seats[i],name=names[(i*3+Math.floor(i/7))%names.length],p=seat.position;
  // Faces look into the oval arena, with small reproducible differences in pose.
  const yaw=Math.atan2(-p.x,-p.z)+(Math.sin(i*7.13)*.045),scale=.94+.08*(.5+.5*Math.sin(i*3.71));
  const matrix=new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(scale,scale,scale));
  buckets.get(name).push(matrix);placements.push({name,seat:seat.name,position:p.clone(),yaw,scale});
  extraBoxes.push(new THREE.Box3(new THREE.Vector3(p.x-.25,p.y-.12,p.z-.25),new THREE.Vector3(p.x+.25,p.y+.62,p.z+.25)));
 }
 const material=new THREE.MeshStandardMaterial({name:'Original Teledog cast / baked crowd colours',vertexColors:true,roughness:.85,metalness:0}),meshes=[];let triangles=0;
 for(const [name,matrices] of buckets){
  if(!matrices.length)continue;const data=characters[name];if(!data)throw Error('Missing crowd character: '+name);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));geometry.setIndex(data.indices);geometry.computeVertexNormals();
  const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);mesh.name='Arena_spectators_'+name;mesh.userData.arenaCrowd=true;
  for(let i=0;i<matrices.length;i++)mesh.setMatrixAt(i,matrices[i]);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);meshes.push(mesh);triangles+=data.indices.length/3*matrices.length;
 }
 return {group,meshes,placements,extraBoxes,count:seats.length,triangles,dispose(){for(const mesh of meshes){mesh.dispose();mesh.geometry.dispose()}material.dispose();group.removeFromParent()}};
}
