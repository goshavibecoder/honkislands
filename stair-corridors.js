import * as THREE from 'three';

// Subtract a stairwell from only the rock and terrace surfaces that intersect
// it. The new solid flight fills the cut to its underside; unrelated scenery,
// the statue, columns and banners retain their original geometry.
export function clearStairCorridors(root,flights,navigation=false){
 const corridors=flights.map(f=>{
  if(f.polygon){
   const polygon=f.polygon,area=polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length];return sum+a[0]*b[1]-b[0]*a[1]},0),sign=Math.sign(area);
   const planes=polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length];return p=>sign*((b[0]-a[0])*(p[2]-a[1])-(b[1]-a[1])*(p[0]-a[0]))+1e-7});
   planes.push(p=>p[1]-(f.top-.32),p=>f.top+3-p[1]);
   const bounds=new THREE.Box3();for(const [x,z] of polygon)for(const y of [f.top-.32,f.top+3])bounds.expandByPoint(new THREE.Vector3(x,y,z));return {id:f.id,planes,bounds};
  }
  const start=new THREE.Vector3(...f.start);start.y-=.006;const dir=new THREE.Vector3(...f.direction),side=new THREE.Vector3(...f.side),length=f.spacing*f.count,slope=f.rise/f.spacing,half=f.width/2+.18;
  const run=p=>(p[0]-start.x)*dir.x+(p[2]-start.z)*dir.z,across=p=>(p[0]-start.x)*side.x+(p[2]-start.z)*side.z;
  const planes=[p=>run(p)+.26,p=>length+.26-run(p),p=>half-across(p),p=>half+across(p),p=>p[1]-(start.y-.30+run(p)*slope),p=>start.y+run(p)*slope+3-p[1]];
  const bounds=new THREE.Box3();for(const s of [-.26,length+.26])for(const a of [-half,half])for(const h of [-.30,3])bounds.expandByPoint(new THREE.Vector3(start.x+dir.x*s+side.x*a,start.y+s*slope+h,start.z+dir.z*s+side.z*a));return {id:f.id,planes,bounds};
 });
 const retired=new Set();let trimmed=0;
 root.traverse(object=>{
  if(!object.isMesh||(!navigation&&! /^(Mountain_retaining_wall|Faceted_mountain_|Angular_flank_rock|Shrine_rock_support|Stone_landing_buttress|Unified_supported_landing_|Landing_neon_edge|Shrine_balcony_light|Summit_circular_terrace|Summit_luminous_ring|Summit_radial_paving_joint)/.test(object.name.replace(/\s+/g,'_'))))return;
  const candidates=corridors.filter(c=>c.id!==object.userData.mountainFlight&&!(object.userData.mountainLanding!==undefined&&String(c.id).startsWith(`landing-${object.userData.mountainLanding}-`))&&c.bounds.intersectsBox(new THREE.Box3().setFromObject(object)));if(!candidates.length)return;
  const world=object.geometry.clone().applyMatrix4(object.matrixWorld),p=world.attributes.position,n=world.attributes.normal,uv=world.attributes.uv,index=world.index;
  const positions=[],normals=[],uvs=[];let changed=false;
  const vertex=i=>[p.getX(i),p.getY(i),p.getZ(i),n?.getX(i)||0,n?.getY(i)||0,n?.getZ(i)||0,uv?.getX(i)||0,uv?.getY(i)||0];
  for(let i=0,total=index?index.count:p.count;i<total;i+=3){
   let fragments=[[vertex(index?index.getX(i):i),vertex(index?index.getX(i+1):i+1),vertex(index?index.getX(i+2):i+2)]];
   for(const corridor of candidates){const remaining=[];for(const polygon of fragments){const cut=subtractConvex(polygon,corridor.planes);changed ||=cut.changed;remaining.push(...cut.polygons)}fragments=remaining;if(!fragments.length)break}
   for(const polygon of fragments)for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]]){positions.push(...v.slice(0,3));normals.push(...v.slice(3,6));uvs.push(...v.slice(6,8))}
  }
  world.dispose();if(!changed)return;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));if(!n)geometry.computeVertexNormals();geometry.applyMatrix4(object.matrixWorld.clone().invert());geometry.computeBoundingSphere();retired.add(object.geometry);object.geometry=geometry;trimmed++;
 });
 root.traverse(object=>{if(object.geometry)retired.delete(object.geometry)});for(const geometry of retired)geometry.dispose();return trimmed;
}

function subtractConvex(polygon,planes){
 // Fast paths preserve original triangles entirely outside or inside the cut.
 const distances=planes.map(plane=>polygon.map(plane));
 if(distances.some(ds=>ds.every(d=>d<0)))return {changed:false,polygons:[polygon]};
 if(distances.every(ds=>ds.every(d=>d>=0)))return {changed:true,polygons:[]};
 let inside=polygon;const outside=[];
 for(const plane of planes){const yes=[],no=[];
  for(let i=0;i<inside.length;i++){
   const a=inside[i],b=inside[(i+1)%inside.length],da=plane(a),db=plane(b),aInside=da>=0,bInside=db>=0;
   (aInside?yes:no).push(a);
   if(aInside!==bInside){const t=da/(da-db),v=a.map((value,k)=>value+(b[k]-value)*t);yes.push(v);no.push(v)}
  }
  if(no.length>=3)outside.push(no);inside=yes;if(inside.length<3)break;
 }
 return {changed:inside.length>=3,polygons:outside};
}

