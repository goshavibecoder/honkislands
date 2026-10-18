import * as THREE from 'three';

// Rigid joint placement keeps cloth and shoes volumetric. Lengths come from
// each real tread, rather than stretching the whole character through a bend.
export function createSeatedHonkLegs(root,parent,placements,model){
 const actors=placements.filter(p=>p.name==='honk');if(!model.legRig||!actors.length)return {meshes:[],actors:[],extraBoxes:[],triangles:0,dispose(){}};
 const floors=[];root.traverse(o=>{if(o.isMesh&&/^(Wide_empty_seating_terrace|Interior_aisle_broad_stone_stair_tread|Arena_complete_sand_floor)/.test(o.name))floors.push(o)});root.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),up=new THREE.Vector3(0,1,0),normalMatrix=new THREE.Matrix3(),floorAt=(x,z,ceiling)=>{ray.set(new THREE.Vector3(x,ceiling,z),down);ray.far=ceiling+20;const hit=ray.intersectObjects(floors,false).find(h=>h.face.normal.clone().applyNormalMatrix(normalMatrix.getNormalMatrix(h.object.matrixWorld)).y>.5);return hit?.point.y};
 const material=new THREE.MeshStandardMaterial({name:'HONK continuous blue trousers and shoes',color:new THREE.Color().fromArray(model.legColor),roughness:.82}),tube=new THREE.CylinderGeometry(1,1,1,14,6),joints=new THREE.SphereGeometry(1,14,10);
 const position=tube.attributes.position;for(let i=0;i<position.count;i++){const t=position.getY(i)+.5,r=.91+.12*Math.sin(Math.PI*t);position.setX(i,position.getX(i)*r);position.setZ(i,position.getZ(i)*r)}tube.computeVertexNormals();
 const shoeGeometry=side=>{const d=model.legRig[side],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(d.positions,3));g.setIndex(d.indices);g.computeVertexNormals();return g};
 const make=(name,geometry,count)=>{const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name='Arena_seated_HONK_'+name;mesh.userData.arenaCrowd=true;mesh.frustumCulled=false;parent.add(mesh);return mesh},thighs=make('thighs',tube,actors.length*2),shins=make('shins',tube,actors.length*2),knees=make('connected_joints',joints,actors.length*4),left=make('left_shoes',shoeGeometry('left'),actors.length),right=make('right_shoes',shoeGeometry('right'),actors.length),meshes=[thighs,shins,knees,left,right],extraBoxes=[],records=[];
 const segment=(mesh,index,a,b,radius,lateral,sideways)=>{const direction=b.clone().sub(a),axis=direction.clone().normalize(),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(sideways,axis,sideways.clone().cross(axis))),m=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(lateral,direction.length(),radius));mesh.setMatrixAt(index,m);extraBoxes.push(new THREE.Box3().setFromPoints([a,b]).expandByScalar(Math.max(radius,lateral)));return m};
 for(let i=0;i<actors.length;i++){
  const p=actors[i],support=root.getObjectByName(p.seat.replace('red_cushion','solid_stone_support'));support.geometry.computeBoundingBox();const supportBox=support.geometry.boundingBox,toActor=p.matrix.clone().invert().multiply(support.matrixWorld);let front=-Infinity;for(const x of [supportBox.min.x,supportBox.max.x])for(const y of [supportBox.min.y,supportBox.max.y])for(const z of [supportBox.min.z,supportBox.max.z])front=Math.max(front,new THREE.Vector3(x,y,z).applyMatrix4(toActor).z);const kneeZ=front+.048,ankleZ=front+.053,rotation=new THREE.Quaternion().setFromAxisAngle(up,p.yaw),local=(x,y,z)=>new THREE.Vector3(x,y,z).applyMatrix4(p.matrix),record={seat:p.seat,position:p.position.clone(),feet:[]};
  for(const [side,sign] of [['left',-1],['right',1]]){
   const index=i*2+(sign>0?1:0),hip=local(sign*.104,.078,0),knee=local(sign*.104,.078,kneeZ),anchor=local(sign*.104,0,ankleZ),data=model.legRig[side],source=data.positions,lowest=Math.min(...source.filter((_,k)=>k%3===1)),bottom=[];
   for(let k=0;k<source.length;k+=3)if(source[k+1]<lowest+.025)bottom.push(k);
   let base=-Infinity,groundPoint=null;
   // Fit the original sole to the actual tread, including its angular seams.
   for(const k of bottom){const v=new THREE.Vector3(source[k],source[k+1],source[k+2]).multiplyScalar(p.scale).applyQuaternion(rotation).add(anchor),floor=floorAt(v.x,v.z,p.position.y-.02);if(!Number.isFinite(floor))continue;const needed=floor-source[k+1]*p.scale;if(needed>base){base=needed;groundPoint=new THREE.Vector3(v.x,floor,v.z)}}
   if(!Number.isFinite(base)){base=p.position.y-.42*p.scale;groundPoint=new THREE.Vector3(anchor.x,base,anchor.z)}
   const foot=new THREE.Vector3(anchor.x,base+.002,anchor.z),ankle=foot.clone().addScaledVector(up,.078*p.scale),shoeMatrix=new THREE.Matrix4().compose(foot,rotation,new THREE.Vector3(p.scale,p.scale,p.scale)),shoe=side==='left'?left:right;shoe.setMatrixAt(i,shoeMatrix);
   const sideways=new THREE.Vector3(1,0,0).applyQuaternion(rotation);segment(thighs,index,hip,knee,.057*p.scale,.068*p.scale,sideways);segment(shins,index,knee,ankle,.041*p.scale,.062*p.scale,sideways);
   for(const [joint,j] of [[hip,index*2],[knee,index*2+1]])knees.setMatrixAt(j,new THREE.Matrix4().compose(joint,rotation,new THREE.Vector3(.061*p.scale,.061*p.scale,.061*p.scale)));
   shoe.geometry.computeBoundingBox();extraBoxes.push(shoe.geometry.boundingBox.clone().applyMatrix4(shoeMatrix));record.feet.push({side,hip,knee,ankle,shoeMatrix,groundPoint,source:data});
  }
  records.push(record);
 }
 let triangles=0;for(const mesh of meshes){mesh.instanceMatrix.needsUpdate=true;triangles+=mesh.geometry.index.count/3*mesh.count}
 return {meshes,actors:records,extraBoxes,triangles,dispose(){for(const mesh of meshes){mesh.dispose();mesh.removeFromParent()}for(const g of new Set(meshes.map(m=>m.geometry)))g.dispose();material.dispose()}};
}
