import * as THREE from 'three';
import {Octree} from './vendor/Octree.js';
import {Capsule} from './vendor/Capsule.js';

// The other islands already use mesh collision for the gallery, arena and
// mountain. These rooms previously relied on a partial list of box colliders.
const STRUCTURE={
 citadel:/^(Keep_(broad_connected_foundation|tier_)|Solid_inter-storey_|Raised_keep_corner_rib|Octagonal_side_tower|Side_tower_(octagonal_base|structural_collar|thick_coping)|Laboratory_wing(?:_|$)|Wing_(continuous_foundation|neon_purple_pier)|Window_solid_wall_mounting|Hall_(side_wall|front_wall|rear_wall)|True_open_arch_with_empty_passage|Entrance_fully_open_door_leaf|Server_(service_wall_(lining|infill)|rear_wall_cladding|rack_\d+_(load-bearing_side_wall|single_smoked_glass_door))|Grand_(gold_gate_post|gate_post)|Central_reactor_octagonal_masonry_spine|Angular_reactor_rail_solid_wall_backing)/,
 'arcade-district':/^(Side_wall_|Back_wall(?:_|$)|Wall_skirting|Back_wall_skirting|Room_grounded_foundation)/,
 honkhub:/^(Left_plaster_wall|Rear_plaster_wall|Antique_(sealed_|front_wall_|rear_wall_extension|left_wall_extension|balloon_door_lintel|timber_post))/
};

export function createArchitectureCollision(root,slug){
 const include=STRUCTURE[slug];if(!include)return null;
 root.updateMatrixWorld(true);const tree=new Octree(),triangle=new THREE.Triangle();let triangleCount=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||!include.test(mesh.name.replace(/\s+/g,'_')))return;
  const p=mesh.geometry.attributes.position,index=mesh.geometry.index,total=index?index.count:p.count;
  for(let i=0;i<total;i+=3){
   triangle.a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);triangle.b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);triangle.c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
   tree.addTriangle(triangle.clone());triangleCount++;
  }
 });tree.build();
 const capsule=new Capsule(),candidates=[],reverse=new THREE.Triangle();
 return {triangleCount,
  canStand(x,z,foot,eye=1.65){
   capsule.start.set(x,foot+.176,z);capsule.end.set(x,foot+eye-.17,z);capsule.radius=.17;
   candidates.length=0;tree.getCapsuleTriangles(capsule,candidates);
   // Check each face independently, including its back: opposing sides of a
   // thin wall must never cancel. Actual arch/door openings contain no faces.
   for(const face of candidates){
    for(let side=0;side<2;side++){
     const hit=tree.triangleCapsuleIntersect(capsule,side?reverse.set(face.c,face.b,face.a):face);
     if(hit&&hit.depth>.012&&!(hit.normal.y>.65&&hit.depth<.045))return false;
    }
   }
   return true;
  },
  dispose(){candidates.length=0;tree.clear()}
 };
}
