import * as THREE from 'three';
import {Octree} from './vendor/Octree.js';
import {Capsule} from './vendor/Capsule.js';

// Keep the walker's full height out of the gallery walls, ramp underside and
// railings. Build from the original mesh transforms before draw-call batching.
export function createGalleryCollision(root){
 const tree=new Octree(),triangle=new THREE.Triangle();root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!o.isMesh||! /^(Curved_white_gallery_wall|Continuous_walkable_spiral_ramp|Inner_opaque_black_spiral_balustrade|Upper_supported_gallery_end_landing|Black_museum_wall_inset)/.test(o.name))return;
  const pos=o.geometry.attributes.position,index=o.geometry.index,n=index?index.count:pos.count;
  for(let i=0;i<n;i+=3){triangle.a.fromBufferAttribute(pos,index?index.getX(i):i).applyMatrix4(o.matrixWorld);triangle.b.fromBufferAttribute(pos,index?index.getX(i+1):i+1).applyMatrix4(o.matrixWorld);triangle.c.fromBufferAttribute(pos,index?index.getX(i+2):i+2).applyMatrix4(o.matrixWorld);tree.addTriangle(triangle.clone())}
 });tree.build();return tree;
}

// A continuous invisible walk surface over the actual treads removes the
// repeated stop/start and avoids selecting the mountain behind the staircase.
export function createStairNavigation(root){
 const flights=new Map(),vertices=[];root.updateMatrixWorld(true);
 root.traverse(o=>{
  const match=o.isMesh&&o.name.match(/^Solid_stair_riser_(\d+)_(\d+)$/);if(!match)return;
  let flight=flights.get(match[1]);if(!flight){flight=[];flights.set(match[1],flight)}
  const box=new THREE.Box3().setFromObject(o),center=box.getCenter(new THREE.Vector3());center.y=box.max.y+.012;flight.push({order:Number(match[2]),center});
 });
 for(const flight of flights.values()){
  flight.sort((a,b)=>a.order-b.order);
  for(let i=0;i<flight.length-1;i++){
   const a=flight[i].center,b=flight[i+1].center,side=new THREE.Vector3(b.z-a.z,0,a.x-b.x).normalize().multiplyScalar(.68);
   const p=a.clone().add(side),q=a.clone().sub(side),r=b.clone().add(side),s=b.clone().sub(side);
   vertices.push(...p.toArray(),...r.toArray(),...q.toArray(),...q.toArray(),...r.toArray(),...s.toArray());
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();return mesh;
}

// Index upward-facing floor triangles once; queries do not scan the whole
// island on every movement substep. Undersides can never become walkable floors.
export function createFloorIndex(nav){
 const tree=new Octree(),p=nav.geometry.attributes.position,triangle=new THREE.Triangle(),normal=new THREE.Vector3();
 for(let i=0;i<p.count;i+=3){triangle.a.fromBufferAttribute(p,i);triangle.b.fromBufferAttribute(p,i+1);triangle.c.fromBufferAttribute(p,i+2);if(triangle.getNormal(normal).y>.5)tree.addTriangle(triangle.clone())}
 tree.build();return tree;
}

export class WalkPhysics{
 constructor({floorAt,canStand,eye,collision=null}){this.floorAt=floorAt;this.canStand=canStand;this.eye=eye;this.collision=collision;this.velocity=0;this.grounded=true;this.capsule=new Capsule();this.radius=.17}
 reset(){this.velocity=0;this.grounded=true}
 clearAt(x,z,foot){
  if(!this.canStand(x,z,foot))return false;
  if(!this.collision)return true;
  this.capsule.set(new THREE.Vector3(x,foot+this.radius+.006,z),new THREE.Vector3(x,foot+this.eye-this.radius,z),this.radius);
  const hit=this.collision.capsuleIntersect(this.capsule);
  return !hit||hit.depth<.012||(hit.normal.y>.65&&hit.depth<.045);
 }
 step(x,z,foot){
  const floor=this.floorAt(x,z,foot+(this.grounded?.43:.04),200);
  if(floor===null)return null;
  const delta=floor-foot;if(delta>(this.grounded?.42:.03))return null;
  // Small descents follow stairs; a real ledge keeps the current altitude and
  // starts gravity, rather than teleporting to the lower floor.
  const next=delta>=-.32?floor:foot;
  if(!this.clearAt(x,z,next))return null;
  if(delta<-.32)this.grounded=false;
  return next;
 }
 fall(x,z,foot,dt){
  const floor=this.floorAt(x,z,foot+.025,200);
  if(floor!==null&&Math.abs(foot-floor)<.035){this.velocity=0;this.grounded=true;return floor}
  this.grounded=false;this.velocity=Math.max(-24,this.velocity-14*dt);const next=foot+this.velocity*dt;
  if(floor!==null&&next<=floor){this.velocity=0;this.grounded=true;return floor}
  return next;
 }
 dispose(){this.collision?.clear()}
}
