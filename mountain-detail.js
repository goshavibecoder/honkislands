import * as THREE from 'three';

// The flag emblems contain over a million triangles in shallow relief.
// Reduce only their tiny untextured parts; the summit statue and player keep
// their original geometry. Bounds, materials and placement stay unchanged.
export function optimizeMountainFlags(root){
 const cache=new Map(),retired=new Set(),stats={before:0,after:0,meshes:0};
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.name.startsWith('Flag_HONK_')||Array.isArray(mesh.material)||mesh.material.map||mesh.material.vertexColors)return;
  const source=mesh.geometry,p=source.attributes.position,index=source.index,total=index?index.count:p.count;stats.before+=total/3;
  if(source.userData.mountainFlagOptimized||total<1800){stats.after+=total/3;return}
  let reduced=cache.get(source);
  if(!reduced){
   const bounds=new THREE.Box3().setFromBufferAttribute(p),size=bounds.getSize(new THREE.Vector3()),clusters=new Map(),vertices=[],remap=[];
   const normals=source.attributes.normal;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),key=[(x-bounds.min.x)/(size.x||1),(y-bounds.min.y)/(size.y||1),(z-bounds.min.z)/(size.z||1)].map(v=>Math.round(v*10)).join(',');
    let c=clusters.get(key);if(!c){c={index:vertices.length,x:0,y:0,z:0,nx:0,ny:0,nz:0,n:0};vertices.push(c);clusters.set(key,c)}
    c.x+=x;c.y+=y;c.z+=z;c.n++;if(normals){c.nx+=normals.getX(i);c.ny+=normals.getY(i);c.nz+=normals.getZ(i)}remap.push(c.index);
   }
   const positions=[],normalValues=[],indices=[];
   for(const c of vertices){positions.push(c.x/c.n,c.y/c.n,c.z/c.n);const n=Math.hypot(c.nx,c.ny,c.nz)||1;normalValues.push(c.nx/n,c.ny/n,c.nz/n)}
   for(let i=0;i<total;i+=3){const a=remap[index?index.getX(i):i],b=remap[index?index.getX(i+1):i+1],c=remap[index?index.getX(i+2):i+2];if(a!==b&&b!==c&&c!==a)indices.push(a,b,c)}
   reduced=new THREE.BufferGeometry();reduced.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));reduced.setIndex(indices);
   if(normals)reduced.setAttribute('normal',new THREE.Float32BufferAttribute(normalValues,3));else reduced.computeVertexNormals();
   // Keep each part's silhouette extents exactly aligned with its neighbours.
   const small=new THREE.Box3().setFromBufferAttribute(reduced.attributes.position),span=small.getSize(new THREE.Vector3()),out=reduced.attributes.position;
   for(let i=0;i<out.count;i++)out.setXYZ(i,span.x?(out.getX(i)-small.min.x)*size.x/span.x+bounds.min.x:bounds.min.x,span.y?(out.getY(i)-small.min.y)*size.y/span.y+bounds.min.y:bounds.min.y,span.z?(out.getZ(i)-small.min.z)*size.z/span.z+bounds.min.z:bounds.min.z);
   reduced.userData.mountainFlagOptimized=true;reduced.computeBoundingSphere();cache.set(source,reduced);
  }
  if(reduced.index.count<total*.8){mesh.geometry=reduced;retired.add(source);stats.meshes++}stats.after+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;
 });
 // Some source geometries can also belong to the untouched summit sculpture.
 root.traverse(o=>{if(o.geometry)retired.delete(o.geometry)});for(const geometry of retired)geometry.dispose();
 return stats;
}
