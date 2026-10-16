import * as THREE from 'three';
import {Octree} from './vendor/Octree.js';
import {Capsule} from './vendor/Capsule.js';

// Rock facets are scenery, never floors. Use the actual horizontal treads,
// connecting decks and terraces; the old nav file also included inner slopes.
export function createMountainNavigation(root){
 root.updateMatrixWorld(true);const positions=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
 root.traverse(o=>{
  if(!o.isMesh||!/^(Mountain_entry_landing$|Mountain_stair_mouth_|Mountain_solid_stair_flight_|Mountain_stair_turn_landing_|Unified_supported_landing_|Summit_circular_terrace(?:_\d+)?$|Shrine_rock_support(?:_\d+)?$)/.test(o.name))return;
  const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld),p=geometry.attributes.position,index=geometry.index,total=index?index.count:p.count;
  for(let i=0;i<total;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1);c.fromBufferAttribute(p,index?index.getX(i+2):i+2);new THREE.Triangle(a,b,c).getNormal(normal);if(normal.y>.99)positions.push(...a.toArray(),...b.toArray(),...c.toArray())}geometry.dispose();
 });
 if(!positions.length)throw Error('Mountain walk surfaces unavailable');
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.name='Mountain_verified_walk_surfaces';mesh.updateMatrixWorld(true);return mesh;
}

export function createMountainCollision(root){
 root.updateMatrixWorld(true);const tree=new Octree(),triangle=new THREE.Triangle();
 root.traverse(o=>{
  if(!o.isMesh||!/^(Faceted_mountain_(?!cloud)|Angular_flank_rock|Shrine_rock_support|Stone_landing_buttress|Gateway_(pier|flanking|outer)|Gate_arch_|Gatehouse_|Ruined_temple_column|Statue_pedestal_|Mountain_retaining_wall)/.test(o.name))return;
  const p=o.geometry.attributes.position,index=o.geometry.index,total=index?index.count:p.count;
  for(let i=0;i<total;i+=3){triangle.a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(o.matrixWorld);triangle.b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(o.matrixWorld);triangle.c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(o.matrixWorld);tree.addTriangle(triangle.clone())}
 });tree.build();return tree;
}

export class MountainWalkPhysics{
 constructor({floorAt,canStand,eye,collision}){Object.assign(this,{floorAt,canStand,eye,collision});this.capsule=new Capsule();this.radius=.17;this.reset()}
 reset(){this.grounded=true;this.velocity=0}
 clearAt(x,z,foot){
  if(!this.canStand(x,z,foot))return false;
  // Keep the entire body supported at an edge, including on diagonal moves.
  for(let i=0;i<8;i++){const angle=i*Math.PI/4,support=this.floorAt(x+Math.cos(angle)*this.radius,z+Math.sin(angle)*this.radius,foot+.42,.84);if(support===null||Math.abs(support-foot)>.42)return false}
  this.capsule.set(new THREE.Vector3(x,foot+this.radius+.01,z),new THREE.Vector3(x,foot+this.eye-this.radius,z),this.radius);
  const hit=this.collision.capsuleIntersect(this.capsule);return !hit||hit.depth<.02||(hit.normal.y>.7&&hit.depth<.035);
 }
 step(x,z,foot){
  const floor=this.floorAt(x,z,foot+.24,.50);if(floor===null||floor-foot>.23||foot-floor>.23||!this.clearAt(x,z,floor))return null;
  this.grounded=true;return floor;
 }
 // Mountain edges stop the walker. Gallery ledges retain their separate
 // gravity behavior; there is no 200 m ray which can select an inner rock face.
 fall(x,z,foot){this.grounded=true;this.velocity=0;return foot}
 dispose(){this.collision?.clear()}
}
