import * as THREE from 'three';

// Keep every triangle and every UV from the original upload. Only articulate
// the legs into a sitting pose; the head, torso and source PBR maps stay intact.
function seated(y,z){
 const hip=1-THREE.MathUtils.smoothstep(y,.28,.34),knee=1-THREE.MathUtils.smoothstep(y,.115,.165);
 return [THREE.MathUtils.lerp(y,THREE.MathUtils.lerp(.31+z,.17+y,knee),hip),THREE.MathUtils.lerp(z,THREE.MathUtils.lerp(.31-y,.17+z,knee),hip)];
}
export function createOriginalHonkSpectator(source){
 const mesh=source.children.find(o=>o.isMesh);if(!mesh)throw Error('Original HONK audience mesh unavailable');
 const geometry=mesh.geometry.clone(),p=geometry.attributes.position,n=geometry.attributes.normal;geometry.computeBoundingBox();
 const box=geometry.boundingBox,origin=box.getCenter(new THREE.Vector3()),span=box.max.y-box.min.y,height=1.2,epsilon=.00001;
 const normal=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const x=(p.getX(i)-origin.x)/span,y=(p.getY(i)-box.min.y)/span,z=(p.getZ(i)-origin.z)/span,[py,pz]=seated(y,z);
  p.setXYZ(i,x*height,(py-.31)*height,pz*height);
  if(y>=.34)continue;
  const ya=seated(y-epsilon,z),yb=seated(y+epsilon,z),za=seated(y,z-epsilon),zb=seated(y,z+epsilon),yy=(yb[0]-ya[0])/(2*epsilon),zy=(yb[1]-ya[1])/(2*epsilon),yz=(zb[0]-za[0])/(2*epsilon),zz=(zb[1]-za[1])/(2*epsilon),det=yy*zz-yz*zy;
  normal.fromBufferAttribute(n,i);if(Math.abs(det)>.000001)normal.set(normal.x,(zz*normal.y-zy*normal.z)/det,(-yz*normal.y+yy*normal.z)/det).normalize();
  n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const material=mesh.material.clone();material.name='Original uploaded HONK audience';
 const data={positions:p.array,normals:n.array,uv:geometry.attributes.uv.array,indices:geometry.index.array};
 return {high:data,low:data,geometry,material,map:material.map,seatLift:.002,frontOffset:.20,originalUpload:true};
}

// Some original chairs extend underneath the statue's solid balcony. Seating
// anybody there leaves disconnected heads and feet protruding through stone.
export function arenaSeatIsCovered(seat,platforms){
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(const [dx,dz] of [[0,0],[.20,0],[-.20,0],[0,.20],[0,-.20]]){
  ray.set(seat.position.clone().add(new THREE.Vector3(dx,1.15,dz)),down);ray.far=1.138;
  if(ray.intersectObjects(platforms,false).length)return true;
 }
 return false;
}
