import * as THREE from 'three';

// Derive the walk surface from the visible platform, not the older island floor
// beneath it. Keep the H as a single face: overlapping raised strokes flicker.
export function repairLandingPad(root){
 root.updateMatrixWorld(true);let surface=null;const floors=[],marks=[];
 root.traverse(o=>{if(!o.isMesh)return;if(/^(Helipad_(purple_foundation|dark_landing_surface)|Irregular_island_plateau|Arrival_platform)$/.test(o.name))floors.push(o);if(o.name==='Helipad_dark_landing_surface')surface=o;if(/^Helipad_H_(vertical|central)_stroke(?:_\d+)?$/.test(o.name))marks.push(o)});
 if(!surface)return null;
 const positions=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
 for(const mesh of floors){const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),p=geometry.attributes.position,index=geometry.index,total=index?index.count:p.count;
  for(let i=0;i<total;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1);c.fromBufferAttribute(p,index?index.getX(i+2):i+2);new THREE.Triangle(a,b,c).getNormal(normal);if(normal.y>.99)positions.push(...a.toArray(),...b.toArray(),...c.toArray())}geometry.dispose();
 }
 if(marks.length){
  const bounds=new THREE.Box3().setFromObject(surface),top=bounds.max.y+.006;
  const markBounds=new THREE.Box3();for(const mark of marks)markBounds.union(new THREE.Box3().setFromObject(mark));
  const x0=markBounds.min.x,x1=markBounds.max.x,z0=markBounds.min.z,z1=markBounds.max.z,bar=(x1-x0)*.15,mid=(z0+z1)/2,half=(x1-x0)*.075;
  const outline=[[x0,z0],[x0+bar,z0],[x0+bar,mid-half],[x1-bar,mid-half],[x1-bar,z0],[x1,z0],[x1,z1],[x1-bar,z1],[x1-bar,mid+half],[x0+bar,mid+half],[x0+bar,z1],[x0,z1]].map(([x,z])=>new THREE.Vector2(x,z));
  const p=[];for(const triangle of THREE.ShapeUtils.triangulateShape(outline,[])){const points=triangle.map(i=>new THREE.Vector3(outline[i].x,top,outline[i].y));if(new THREE.Triangle(...points).getNormal(normal).y<0)[points[1],points[2]]=[points[2],points[1]];for(const point of points)p.push(...point.toArray())}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.computeVertexNormals();geometry.applyMatrix4(root.matrixWorld.clone().invert());
  const symbol=new THREE.Mesh(geometry,marks[0].material);symbol.name='Helipad_single_H_marking';root.add(symbol);
  const retired=new Set(marks.map(m=>m.geometry));for(const mark of marks)mark.removeFromParent();root.traverse(o=>{if(o.geometry)retired.delete(o.geometry)});for(const g of retired)g.dispose();
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeBoundingSphere();const nav=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));nav.name='Helipad_walk_surface';nav.updateMatrixWorld();root.updateMatrixWorld(true);return nav;
}
