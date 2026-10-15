import * as THREE from 'three';
import {clearStairCorridors} from './stair-corridors.js?v=17';

const UP=new THREE.Vector3(0,1,0);
const normalizedName=object=>object.name.replace(/\s+/g,'_');

// The source mountain was widened after the stairs were built. Rebuild each
// flight in world coordinates so its run and width remain perpendicular.
export function rebuildMountainStairs(root){
 root.updateMatrixWorld(true);
 const flights=new Map(),obsolete=[];let stone=null,nosing=null,edge=null,landingMaterial=null;
 root.traverse(object=>{
  if(!object.isMesh)return;
  const name=normalizedName(object),match=name.match(/^Solid_stair_riser_(\d+)_(\d+)$/);
  if(match){
   const box=new THREE.Box3().setFromObject(object),center=box.getCenter(new THREE.Vector3());center.y=box.max.y;
   if(!flights.has(Number(match[1])))flights.set(Number(match[1]),[]);
   flights.get(Number(match[1])).push({order:Number(match[2]),center});stone??=object.material;
  }
  if(name.startsWith('Unified_supported_landing_'))landingMaterial??=object.material;
  if(/^Neon_stair_nosing(?:_\d+)?$/.test(name))nosing??=object.material;
  if(/^Continuous_stair_side_light(?:_\d+)?$/.test(name))edge??=object.material;
  if(/^(Solid_stair_riser_\d+_\d+|Stair_solid_supporting_stringer_\d+|Neon_stair_nosing(?:_\d+)?|Continuous_stair_side_light(?:_\d+)?)$/.test(name))obsolete.push(object);
 });
 if(flights.size!==5||!stone||!nosing||!edge)throw Error('Mountain staircase source is incomplete');
 const inverse=root.matrixWorld.clone().invert(),group=new THREE.Group();group.name='Rebuilt_mountain_staircases';
 const navPositions=[],specs=[];
 const addGeometry=(geometry,material,name)=>{
  geometry.applyMatrix4(inverse);geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.name=name;group.add(mesh);
 };
 const box=(size,center,basis,material,name)=>{
  const geometry=new THREE.BoxGeometry(...size);geometry.applyMatrix4(basis);geometry.translate(center.x,center.y,center.z);addGeometry(geometry,material,name);
 };
 for(const [id,steps] of [...flights].sort((a,b)=>a[0]-b[0])){
  steps.sort((a,b)=>a.order-b.order);
  const first=steps[0].center,last=steps.at(-1).center,count=steps.length;
  const direction=last.clone().sub(first);direction.y=0;const spacing=direction.length()/(count-1);direction.normalize();
  const rise=(last.y-first.y)/(count-1),width=1.46,length=spacing*count;
  if(!(spacing>.1&&rise>.08&&rise<.22))throw Error(`Invalid mountain stair flight ${id}`);
  const side=new THREE.Vector3(direction.z,0,-direction.x),start=first.clone().addScaledVector(direction,-spacing/2);
  const base=first.y-rise,end=start.clone().addScaledVector(direction,length);end.y=last.y;
  // One closed extrusion: treads cannot float apart or expose a sloping ramp
  // through their top faces. The supporting underside stays below every tread.
  const shape=new THREE.Shape();shape.moveTo(0,base-.30);shape.lineTo(0,first.y);
  for(let i=0;i<count;i++){
   const top=first.y+i*rise;shape.lineTo((i+1)*spacing,top);
   if(i<count-1)shape.lineTo((i+1)*spacing,top+rise);
  }
  shape.lineTo(length,last.y-.30);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:false,curveSegments:1});
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
   const run=position.getX(i),height=position.getY(i),across=width/2-position.getZ(i);
   position.setXYZ(i,start.x+direction.x*run+side.x*across,height,start.z+direction.z*run+side.z*across);
  }
  geometry.computeVertexNormals();addGeometry(geometry,stone,`Mountain_solid_stair_flight_${id}`);
  const basis=new THREE.Matrix4().makeBasis(side,UP,direction);
  for(let i=0;i<count;i++){
   const top=first.y+i*rise,front=start.clone().addScaledVector(direction,i*spacing+.016);front.y=top+.012;
   box([width-.08,.022,.030],front,basis,nosing,`Mountain_stair_nosing_${id}_${i}`);
   for(const sign of [-1,1]){
    const rail=start.clone().addScaledVector(direction,(i+.5)*spacing).addScaledVector(side,sign*(width/2-.025));rail.y=top+.012;
    box([.024,.022,spacing+.002],rail,basis,edge,`Mountain_stair_edge_${id}_${i}_${sign}`);
    const vertical=start.clone().addScaledVector(direction,i*spacing+.012).addScaledVector(side,sign*(width/2-.025));vertical.y=top-rise/2;
    box([.024,rise,.024],vertical,basis,edge,`Mountain_stair_edge_riser_${id}_${i}_${sign}`);
   }
  }
  // The navigation ramp spans both full end treads, ending at landing height.
  // Its footprint uses the same orthogonal basis as the visible staircase.
  const half=width/2-.19,low=start.clone().addScaledVector(direction,-.02);low.y=base+.006-.02*rise/spacing;const high=end.clone().addScaledVector(direction,.02);high.y+=.006+.02*rise/spacing;
  const a=low.clone().addScaledVector(side,half),b=low.clone().addScaledVector(side,-half),c=high.clone().addScaledVector(side,half),d=high.clone().addScaledVector(side,-half);
  navPositions.push(...a.toArray(),...b.toArray(),...c.toArray(),...b.toArray(),...d.toArray(),...c.toArray());
  specs.push({id,count,width,spacing,rise,start:[start.x,base+.006,start.z],end:[end.x,end.y+.006,end.z],direction:direction.toArray(),side:side.toArray()});
 }
 // Flat turn landings join the complete widths of adjacent stair mouths.
 // They also replace the old rock floor through the middle of these turns.
 const landingCuts=[],landingPaths=[];
 for(let i=0;i<specs.length-1;i++){
  const previous=specs[i],next=specs[i+1],a=new THREE.Vector3(...previous.end),b=new THREE.Vector3(...next.start);
  const top=Math.max(a.y,b.y)-.006+.012;
  // Continue beyond the incoming top tread before turning back. A direct
  // diagonal across a switchback would cover the last few lower treads.
  const path=[a,a.clone().addScaledVector(new THREE.Vector3(...previous.direction),1.15),b.clone().addScaledVector(new THREE.Vector3(...next.direction),-1.15),b];
  const outline=pathOutline(path,.73),shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(p.x,-p.y)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.28,steps:1,bevelEnabled:false,curveSegments:1}),position=geometry.attributes.position;
  for(let n=0;n<position.count;n++){const x=position.getX(n),z=-position.getY(n),y=top-.28+position.getZ(n);position.setXYZ(n,x,y,z)}
  geometry.computeVertexNormals();addGeometry(geometry,landingMaterial||stone,`Mountain_stair_turn_landing_${i}`);
  for(const triangle of THREE.ShapeUtils.triangulateShape(outline,[])){
   const points=triangle.map(n=>new THREE.Vector3(outline[n].x,top+.006,outline[n].y));
   if(new THREE.Triangle(...points).getNormal(new THREE.Vector3()).y<0)[points[1],points[2]]=[points[2],points[1]];
   for(const point of points)navPositions.push(...point.toArray());
  }
  for(let n=0;n<path.length-1;n++){
   const from=path[n],to=path[n+1],dir=to.clone().sub(from);dir.y=0;const length=dir.length();dir.normalize();const side=new THREE.Vector3(dir.z,0,-dir.x);
   landingCuts.push({id:`landing-${i}-${n}`,count:1,width:1.46,spacing:length,rise:0,start:[from.x,top+.006,from.z],end:[to.x,top+.006,to.z],direction:dir.toArray(),side:side.toArray()});
  }
  landingPaths.push(path.map(p=>[p.x,top+.006,p.z]));
 }
 const corridors=[...specs,...landingCuts];
 const disposed=new Set(obsolete.map(mesh=>mesh.geometry));for(const mesh of obsolete)mesh.removeFromParent();
 // Some original neon boxes share geometry; dispose only after checking that
 // no surviving mountain object still references it.
 root.traverse(object=>{if(object.geometry)disposed.delete(object.geometry)});for(const geometry of disposed)geometry.dispose();
 const trimmed=clearStairCorridors(root,corridors);root.add(group);root.updateMatrixWorld(true);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(navPositions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const nav=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));nav.name='Mountain_stair_navigation';nav.userData.flights=specs;nav.userData.corridors=corridors;nav.userData.landingPaths=landingPaths;nav.userData.trimmedSurfaces=trimmed;nav.updateMatrixWorld(true);return nav;
}

function pathOutline(path,half){
 const normals=[];for(let i=0;i<path.length-1;i++){const d=path[i+1].clone().sub(path[i]);d.y=0;d.normalize();normals.push(new THREE.Vector2(d.z,-d.x))}
 const left=[],right=[];
 for(let i=0;i<path.length;i++){
  let offset;if(i===0)offset=normals[0].clone().multiplyScalar(half);else if(i===path.length-1)offset=normals.at(-1).clone().multiplyScalar(half);else{offset=normals[i-1].clone().add(normals[i]).normalize();offset.multiplyScalar(Math.min(half*2.5,half/Math.max(.1,offset.dot(normals[i]))))}
  left.push(new THREE.Vector2(path[i].x+offset.x,path[i].z+offset.y));right.push(new THREE.Vector2(path[i].x-offset.x,path[i].z-offset.y));
 }
 return left.concat(right.reverse());
}
