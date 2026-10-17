import * as THREE from 'three';
import {Octree} from './vendor/Octree.js';
import {Capsule} from './vendor/Capsule.js';

const SOLID=/^(Interior_retaining_wall_|Passage_staggered_masonry_|Entrance_continuous_thick_barrel_vault|Main_portal_(distinct|separate)_|Right_entrance_(masonry|true_open)_|Wide_empty_seating_terrace|Unified_masonry_pier_and_mouldings|True_open_facade_arch|Three_balcony_broad_stone_coping|Balcony_gold_baluster|Three_balcony_gilded_handrail|Arena_side_door_individual_oak_plank|Side_door_thick_stone_surround|Interior_aisle_broad_stone_stair_tread|Entrance_linked_gilded_fence|Entrance_gold_fence_post|Main_entrance_open_hinged_oak_door|Game_trophy_marble_plinth)/;
const STONE=/^(Wide_empty_seating_terrace|Unified_masonry_pier_and_mouldings|Interior_retaining_wall_|Passage_staggered_masonry_|Main_portal_(distinct|separate)_)/;

export function prepareArenaSurfaces(root){
 root.updateMatrixWorld(true);
 const seen=new Set(),retired=new Set(),offsetMaterials=new Map(),twoSided=new Map(),point=new THREE.Vector3();let removedTriangles=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  if(STONE.test(mesh.name)){
   const source=mesh.geometry,p=source.attributes.position,index=source.index,total=index?index.count:p.count,indices=[];
   for(let i=0;i<total;i+=3){
    const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),key=ids.map(id=>point.fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).toArray().map(v=>Math.round(v*100000)).join(',')).sort().join('|');
    if(seen.has(key)){removedTriangles++;continue}seen.add(key);indices.push(...ids);
   }
   if(indices.length!==total){mesh.geometry=source.clone();mesh.geometry.setIndex(indices);retired.add(source);
    // Opposite copies of a thin stone face become one double-sided face.
    const material=mesh.material;if(!twoSided.has(material)){const copy=material.clone();copy.side=THREE.DoubleSide;twoSided.set(material,copy)}mesh.material=twoSided.get(material);mesh.userData.arenaSurfaceDedup=true}
  }
  // Keep paint and paving reliably in front of their supporting surfaces.
  if(/^(Passage_real_stone_paving_tile|Arena_concentric_luminous_floor_ring|Circus_floor_paint)/.test(mesh.name)){
   const source=mesh.material;if(!offsetMaterials.has(source)){const material=source.clone();material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-2;offsetMaterials.set(source,material)}mesh.material=offsetMaterials.get(source);
  }
 });
 const retained=new Set();root.traverse(o=>{if(o.isMesh)retained.add(o.geometry)});for(const g of retired)if(!retained.has(g))g.dispose();
 const intersections=new Octree(),cells=new Map(),triangle=new THREE.Triangle(),reverse=new THREE.Triangle();let triangles=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||!SOLID.test(mesh.name))return;
  const p=mesh.geometry.attributes.position,index=mesh.geometry.index,total=index?index.count:p.count;
  for(let i=0;i<total;i+=3){
   triangle.a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);triangle.b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);triangle.c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
   const stored=triangle.clone(),lo=new THREE.Vector3().copy(triangle.a).min(triangle.b).min(triangle.c).floor(),hi=new THREE.Vector3().copy(triangle.a).max(triangle.b).max(triangle.c).floor();
   for(let x=lo.x;x<=hi.x;x++)for(let y=lo.y;y<=hi.y;y++)for(let z=lo.z;z<=hi.z;z++){const key=`${x},${y},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(stored)}triangles++;
  }
 });
 const capsule=new Capsule(),candidates=new Set();
 return {removedTriangles,triangles,
  canStand(x,z,floor,eye=1.65){
   capsule.set(new THREE.Vector3(x,floor+.176,z),new THREE.Vector3(x,floor+eye-.17,z),.17);candidates.clear();
   for(let a=Math.floor(x-.17);a<=Math.floor(x+.17);a++)for(let b=Math.floor(floor);b<=Math.floor(floor+eye);b++)for(let c=Math.floor(z-.17);c<=Math.floor(z+.17);c++)for(const t of cells.get(`${a},${b},${c}`)||[])candidates.add(t);
   for(const t of candidates){for(const face of [t,reverse.set(t.c,t.b,t.a)]){const hit=intersections.triangleCapsuleIntersect(capsule,face);if(hit&&hit.depth>.012&&!(hit.normal.y>.65&&hit.depth<.045))return false}}return true;
  },
  dispose(){cells.clear();candidates.clear()}
 };
}
