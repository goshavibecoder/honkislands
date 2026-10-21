import * as THREE from 'three';

export function mountainSnowPlatforms(root,terraces){
 const highest=Math.max(...terraces.map(o=>new THREE.Box3().setFromObject(o).max.y)),meshes=terraces.filter(o=>Math.abs(new THREE.Box3().setFromObject(o).max.y-highest)<.001);
 root.traverse(o=>{if(!o.isMesh)return;if(o.name==='Balloon_access_walkway'||o.parent?.name==='Balloon_boarding_deck'&&o.geometry.parameters?.height<.25)meshes.push(o)});
 return meshes.map(o=>{
  const top=new THREE.Box3().setFromObject(o).max.y,p=o.geometry.attributes.position,points=[];
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(Math.abs(v.y-top)<.001)points.push(v)}
  const sorted=[...new Map(points.map(p=>[`${p.x.toFixed(5)},${p.z.toFixed(5)}`,p])).values()].sort((a,b)=>a.x-b.x||a.z-b.z),cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),lower=[],upper=[];
  for(const v of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),v)<=0)lower.pop();lower.push(v)}for(const v of [...sorted].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),v)<=0)upper.pop();upper.push(v)}
  const polygon=lower.slice(0,-1).concat(upper.slice(0,-1));return {name:o.name,polygon,bounds:new THREE.Box3().setFromPoints(polygon)};
 }).filter(p=>p.polygon.length>=3);
}

// Subtract each convex platform footprint from triangles. New vertices retain
// the original face colours; the same cut is used for snow and navigation.
export function trimSnowTriangles(positions,platforms,colors=null){
 const output=[],tints=[];
 const side=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
 function half(poly,a,b,inside){const result=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],d=side(a,b,p.p),e=side(a,b,q.p),keep=inside?d>=-1e-8:d<=1e-8,next=inside?e>=-1e-8:e<=1e-8;if(keep)result.push(p);if(keep!==next){const t=d/(d-e);result.push({p:p.p.clone().lerp(q.p,t),c:p.c?.clone().lerp(q.c,t)})}}return result}
 for(let i=0;i<positions.length;i+=9){
  let pieces=[[0,1,2].map(k=>({p:new THREE.Vector3().fromArray(positions,i+k*3),c:colors?new THREE.Color().fromArray(colors,i+k*3):null}))];
  for(const cut of platforms){const next=[];for(const poly of pieces){const bounds=new THREE.Box3().setFromPoints(poly.map(v=>v.p));if(bounds.max.x<cut.bounds.min.x||bounds.min.x>cut.bounds.max.x||bounds.max.z<cut.bounds.min.z||bounds.min.z>cut.bounds.max.z){next.push(poly);continue}let remainder=poly;for(let j=0;j<cut.polygon.length&&remainder.length>=3;j++){const a=cut.polygon[j],b=cut.polygon[(j+1)%cut.polygon.length],outside=half(remainder,a,b,false);if(outside.length>=3)next.push(outside);remainder=half(remainder,a,b,true)}}pieces=next}
  for(const poly of pieces)for(let j=1;j<poly.length-1;j++){const triangle=[poly[0],poly[j],poly[j+1]];if(new THREE.Triangle(...triangle.map(v=>v.p)).getArea()<1e-10)continue;for(const v of triangle){output.push(...v.p.toArray());if(v.c)tints.push(v.c.r,v.c.g,v.c.b)}}
 }
 return {positions:output,colors:tints};
}

export function trimMountainSnow(group,nav,platforms){
 group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),meshes=[];group.traverse(o=>{if(o.isMesh&&/^Snow_(walkable_rear_descent|raised_safety_banks|terrain_supported_ice_sides|faceted_mountain_support|parallel_ski_tracks|snowboard_carve_track|finish_landing)$/.test(o.name))meshes.push(o)});
 for(const o of meshes){const old=o.geometry,g=old.index?old.toNonIndexed():old,positions=g.attributes.position.array,world=[];for(let i=0;i<positions.length;i+=3)world.push(...new THREE.Vector3().fromArray(positions,i).applyMatrix4(o.matrixWorld).toArray());const cut=trimSnowTriangles(world,platforms,g.attributes.color?.array),geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(cut.positions,3));geometry.applyMatrix4(inverse);if(cut.colors.length)geometry.setAttribute('color',new THREE.Float32BufferAttribute(cut.colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();o.geometry=geometry;o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);if(g!==old)g.dispose();old.dispose();if(!cut.positions.length){o.removeFromParent();geometry.dispose()}}
 return trimSnowTriangles(nav,platforms).positions;
}
