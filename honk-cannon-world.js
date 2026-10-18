import * as THREE from 'three';
import {batchRideMeshes} from './ride-performance.js?v=59';
import {createHonkKartDriver} from './kart-driver.js?v=59';
import {CANNON_BASE,CANNON_NET,CANNON_RINGS} from './honk-cannon-motion.js?v=79';

// Share the uploaded model's geometry/textures while giving the second
// Groyper his own skeleton; animating one operator cannot move the other.
export function cloneGroyperRig(source){
 const copy=source.clone(true),original=[],cloned=[];source.traverse(o=>original.push(o));copy.traverse(o=>cloned.push(o));const map=new Map(original.map((o,i)=>[o,cloned[i]]));
 for(const mesh of original)if(mesh.isSkinnedMesh){const target=map.get(mesh);target.skeleton=new THREE.Skeleton(mesh.skeleton.bones.map(b=>map.get(b)),mesh.skeleton.boneInverses.map(m=>m.clone()));target.bindMatrix.copy(mesh.bindMatrix);target.bindMatrixInverse.copy(mesh.bindMatrixInverse);target.frustumCulled=false}
 return copy;
}
export function prepareHonkCannon(root,groyper,headData){
 root.updateMatrixWorld(true);const group=new THREE.Group();group.name='GROYP_CANNON_circus_platform';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const navPositions=[],extraBoxes=[],y=CANNON_BASE.y;
 const material=(name,color,roughness=.6,metalness=0)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness});
 const m={red:material('Cannon cherry lacquer',0xc3314d,.3,.15),cream:material('Cannon circus ivory',0xffedc8),gold:material('Cannon polished brass',0xd7a544,.3,.65),dark:material('Cannon midnight frame',0x29263b,.7),wood:material('Cannon aged decking',0x98714c,.86),blue:material('Cannon royal blue',0x3c62af,.4),rope:material('Cannon woven rope',0xe7d7aa,.96),white:material('Cannon warm white',0xfffae9)};
 function mesh(geometry,mat,parent=group,x=0,py=0,z=0,name='Cannon_detail'){const o=new THREE.Mesh(geometry,mat);o.name=name;o.position.set(x,py,z);parent.add(o);return o}
 const box=(w,h,d,mat,parent,x,py,z,name)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,py,z,name);
 function rod(a,b,r,mat,parent=group){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p),o=mesh(new THREE.CylinderGeometry(r,r,v.length(),10),mat,parent);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
 function solid(o){o.updateWorldMatrix(true,true);extraBoxes.push(new THREE.Box3().setFromObject(o))}
 function floor(cx,cz,w,d){box(w,.2,d,m.dark,group,cx,y-.10,cz);box(w-.06,.025,d-.06,m.wood,group,cx,y-.0085,cz);for(const [x,z] of [[-w/2,-d/2],[-w/2,d/2],[w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]])navPositions.push(cx+x,y,cz+z)}
 floor(-13,14.5,8,6.3);floor(-7.55,13.55,3.9,1.6);
 for(const z of [12.75,14.35]){rod([-9.5,y+.95,z],[-5.6,y+.95,z],.035,m.gold);rod([-9.5,y+.45,z],[-5.6,y+.45,z],.025,m.red);extraBoxes.push(new THREE.Box3(new THREE.Vector3(-9.5,y,z-.03),new THREE.Vector3(-5.6,y+1,z+.03)));for(const x of [-9.4,-7.5,-5.7])rod([x,y,z],[x,y+.95,z],.035,m.gold)}
 // A gap in the right rail aligns with the bridge. The kart lanes are over a
 // metre away from even the nearest edge of the new supported walkway.
 for(const [a,b] of [[[-17,11.35],[-9,11.35]],[[-17,17.65],[-9,17.65]],[[-17,11.35],[-17,17.65]],[[-9,11.35],[-9,12.65]],[[-9,14.45],[-9,17.65]]]){
  rod([a[0],y+.95,a[1]],[b[0],y+.95,b[1]],.04,m.gold);rod([a[0],y+.45,a[1]],[b[0],y+.45,b[1]],.028,m.red);const w=Math.max(.07,Math.abs(a[0]-b[0])),d=Math.max(.07,Math.abs(a[1]-b[1])),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;extraBoxes.push(new THREE.Box3(new THREE.Vector3(cx-w/2,y,cz-d/2),new THREE.Vector3(cx+w/2,y+1,cz+d/2)));
  for(const p of [a,b])rod([p[0],y,p[1]],[p[0],y+1.05,p[1]],.05,m.red);
 }
 const cannon=new THREE.Group();cannon.position.set(CANNON_BASE.x,y,CANNON_BASE.z);cannon.rotation.y=Math.PI;group.add(cannon);
 const carriage=box(1.45,.30,1.7,m.red,cannon,0,.45,0,'Cannon_closed_carriage');solid(carriage);
 for(const side of [-1,1]){const wheel=mesh(new THREE.CylinderGeometry(.43,.43,.18,28),m.dark,cannon,side*.78,.43,0);wheel.rotation.z=Math.PI/2;solid(wheel);const rim=mesh(new THREE.TorusGeometry(.33,.045,8,28),m.gold,cannon,side*.88,.43,0);rim.rotation.y=Math.PI/2;for(let i=0;i<6;i++){const a=i*Math.PI/3;rod([side*.88,.43,0],[side*.88,.43+Math.sin(a)*.30,Math.cos(a)*.30],.024,m.gold,cannon)}box(.12,.9,.40,m.blue,cannon,side*.47,.95,0)}
 const pivot=new THREE.Group();pivot.name='Cannon_aiming_cradle';pivot.position.y=1.4;cannon.add(pivot);
 // Hollow barrel with a real side-loading aperture; the operator pushes the
 // HONK through this opening rather than through an opaque painted surface.
 const vertices=[],normals=[],n=40,steps=28,z0=-.75,length=2.35,radii=[.58,.50];
 for(let surface=0;surface<2;surface++)for(let j=0;j<steps;j++)for(let i=0;i<n;i++){
  const za=z0+length*j/steps,zb=z0+length*(j+1)/steps,a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n,mid=(a+b)/2;if(Math.abs((za+zb)/2)<.42&&Math.cos(mid)>.65)continue;
  const r=radii[surface],p=[[Math.cos(a)*r,Math.sin(a)*r,za],[Math.cos(b)*r,Math.sin(b)*r,za],[Math.cos(a)*r,Math.sin(a)*r,zb],[Math.cos(b)*r,Math.sin(b)*r,zb]],faces=surface?[[0,2,1],[1,2,3]]:[[0,1,2],[1,3,2]];
  for(const face of faces)for(const k of face){vertices.push(...p[k]);normals.push(p[k][0]/r*(surface?-1:1),p[k][1]/r*(surface?-1:1),0)}
 }
 const barrelGeometry=new THREE.BufferGeometry();barrelGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));barrelGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));const barrel=mesh(barrelGeometry,m.red,pivot);barrel.name='Cannon_hollow_barrel';
 for(const z of [-.75,1.35,1.6])mesh(new THREE.TorusGeometry(.54,.055,10,40),m.gold,pivot,0,0,z);
 const back=mesh(new THREE.CircleGeometry(.50,32),m.dark,pivot,0,0,-.756);back.rotation.y=Math.PI;
 const hatch=new THREE.Group();hatch.position.x=.59;pivot.add(hatch);const hatchFrame=mesh(new THREE.TorusGeometry(.40,.035,8,28),m.gold,pivot,.59,0,0);hatchFrame.rotation.y=Math.PI/2;
 const hatchDoor=mesh(new THREE.CircleGeometry(.395,28),m.cream,hatch);hatchDoor.rotation.y=Math.PI/2;for(const z of [-.43,.43])rod([.59,-.42,z],[.59,1.0,z],.022,m.gold,pivot);
 // The muzzle recess and hoops stay visible at close range.
 const muzzle=mesh(new THREE.CylinderGeometry(.50,.50,.20,40,1,true),m.dark,pivot,0,0,1.49);muzzle.rotation.x=Math.PI/2;
 const flash=mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xffdc73}),pivot,0,0,1.74);flash.visible=false;
 batchRideMeshes(pivot,{keep:o=>o===flash||o===barrel});pivot.traverse(o=>o.userData.islandRide=true);
 const target=new THREE.Group();target.position.set(CANNON_NET.x,y,CANNON_NET.z);group.add(target);box(4.4,.25,4.4,m.blue,target,0,-.14,0);
 for(const x of [-1.9,1.9])for(const z of [-1.9,1.9])rod([x,0,z],[x,1.45,z],.065,m.red,target);
 const netGeometry=new THREE.PlaneGeometry(3.7,3.7,16,16);netGeometry.rotateX(-Math.PI/2);const net=mesh(netGeometry,new THREE.MeshStandardMaterial({name:'Cannon catching net',color:0xe8dbb2,wireframe:true,roughness:1,side:THREE.DoubleSide}),target,0,.88,0,'Cannon_flexible_safety_net');net.userData.islandRide=true;
 for(const z of [-1.85,1.85])rod([-1.85,1.0,z],[1.85,1.0,z],.035,m.rope,target);for(const x of [-1.85,1.85])rod([x,1.0,-1.85],[x,1.0,1.85],.035,m.rope,target);
 const rings=CANNON_RINGS.map((r,i)=>{const mat=m.gold.clone(),o=mesh(new THREE.TorusGeometry(r.radius,.065,10,48),mat,group,r.x,r.y,r.z,`Cannon_target_ring_${i}`);o.userData.islandRide=true;box(2.9,.18,.75,m.dark,group,r.x,y-.09,r.z);for(const sign of [-1,1])rod([r.x+sign*1.2,y,r.z],[r.x+sign*1.2,r.y+1.12,r.z],.045,m.red);rod([r.x-1.2,r.y+1.12,r.z],[r.x+1.2,r.y+1.12,r.z],.045,m.red);rod([r.x,r.y+r.radius,r.z],[r.x,r.y+1.12,r.z],.025,m.rope);return o});
 const actor=new THREE.Group();actor.name='Groyper_cannon_loader';actor.position.set(-15.2,y,14);actor.rotation.y=Math.PI/2;actor.add(groyper);group.add(actor);groyper.traverse(o=>{o.userData.islandRide=true;if(o.isSkinnedMesh)o.frustumCulled=false});
 const bones=Object.fromEntries(['head','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','thigh_l','thigh_r'].map(name=>[name,groyper.getObjectByName(name)])),rest=Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,b.quaternion.clone()]));root.updateMatrixWorld(true);
 function pose(name,axis,angle,start=rest[name]){const b=bones[name],parent=b.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),a=axis.clone().applyQuaternion(actor.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(parent);b.quaternion.setFromAxisAngle(a,angle).multiply(start);b.updateWorldMatrix(false,true);return b.quaternion.clone()}
 const xAxis=new THREE.Vector3(1,0,0),zAxis=new THREE.Vector3(0,0,1),yAxis=new THREE.Vector3(0,1,0),down={},carry={};
 for(const [side,sign] of [['l',-1],['r',1]]){const name='upperarm_'+side;down[name]=pose(name,zAxis,sign*1.16);carry[name]=pose(name,yAxis,sign*.95,pose(name,zAxis,sign*.50));carry['lowerarm_'+side]=pose('lowerarm_'+side,yAxis,sign*.35)}
 const wave=pose('upperarm_l',zAxis,.26),elbowWave=pose('lowerarm_l',zAxis,1.12),legForward=pose('thigh_l',xAxis,.20),legBack=pose('thigh_r',xAxis,-.20);for(const [name,b] of Object.entries(bones))b.quaternion.copy(rest[name]);
 const roundRoot=new THREE.Group();roundRoot.name='Cannon_HONK_projectile';group.add(roundRoot);const honk=createHonkKartDriver(roundRoot,headData);honk.group.visible=true;honk.group.scale.setScalar(.75);honk.group.position.y=-.67;const rigid=[];honk.group.traverse(o=>{if(o.isGroup)rigid.push(o)});for(const g of rigid.reverse())batchRideMeshes(g);honk.group.traverse(o=>o.userData.islandRide=true);
 const stool=box(.65,.10,.65,m.blue,group,-14.5,y+.65,14);for(const x of [-14.72,-14.28])for(const z of [13.78,14.22])rod([x,y,z],[x,y+.65,z],.04,m.gold);solid(stool);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffedc8';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#bd304b';ctx.font='900 104px system-ui';ctx.fillText('HONK CANNON',512,124);ctx.fillStyle='#493447';ctx.font='35px system-ui';ctx.fillText('GROYP LOADS / HONK FLIES',512,207);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sign=mesh(new THREE.PlaneGeometry(2.7,.675),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),group,-10.5,y+1.65,16.6);sign.rotation.y=Math.PI;box(2.9,.80,.12,m.gold,group,-10.5,y+1.65,16.67);solid(box(.12,1.2,.12,m.dark,group,-10.5,y+.60,16.65));
 const loaderBox=new THREE.Box3(),barrelBox=new THREE.Box3();barrel.geometry.computeBoundingBox();extraBoxes.push(loaderBox,barrelBox);
 const interact=new THREE.Vector3(-10.5,y,14.6),proxy=new THREE.Mesh(new THREE.BoxGeometry(4.8,2.7,3.2),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));proxy.position.set(-13,1.4,14);proxy.updateMatrixWorld();const ray=new THREE.Raycaster(),bounds=new THREE.Box3().setFromObject(group),roundStart=new THREE.Vector3(-14.5,y+1.14,14),hatchPoint=new THREE.Vector3(-13,y+1.4,14),tiltAxis=new THREE.Vector3(0,0,1),sideRotation=new THREE.Quaternion().setFromAxisAngle(yAxis,Math.PI/2);let idleTime=0;
 function render(state,dt=0){
  idleTime+=dt;pivot.rotation.x=-state.angle*Math.PI/180;hatch.position.y=0;flash.visible=false;const t=state.elapsed;let carryWeight=0,walking=0;
  actor.position.set(-15.2,y,14);actor.rotation.y=Math.PI/2;roundRoot.visible=true;roundRoot.scale.setScalar(1);roundRoot.rotation.set(0,Math.PI/2,0);
  if(state.phase==='loading'){const reach=THREE.MathUtils.smoothstep(t/.45,0,1),move=THREE.MathUtils.smoothstep((t-.45)/.9,0,1),load=THREE.MathUtils.smoothstep((t-1.6)/.40,0,1),tilt=THREE.MathUtils.smoothstep((t-1.35)/.30,0,1);carryWeight=reach;walking=Math.sin(t*12)*(1-move)*reach;actor.position.x+=.90*move;roundRoot.position.copy(roundStart).add(new THREE.Vector3(.65*move,0,0)).lerp(hatchPoint,load);roundRoot.quaternion.setFromAxisAngle(tiltAxis,-Math.PI/2*tilt).multiply(sideRotation);hatch.position.y=.95*THREE.MathUtils.smoothstep((t-.7)/.4,0,1)*(1-THREE.MathUtils.smoothstep((t-2)/.2,0,1));roundRoot.visible=t<2.0}
  else if(state.phase==='flying'||state.phase==='landing'||state.phase==='finished'){
   const retreat=state.phase==='flying'?THREE.MathUtils.smoothstep(t,0,1):1;actor.position.x+=.9*(1-retreat);roundRoot.position.copy(state.position);roundRoot.rotation.set(state.phase==='flying'?-Math.atan2(Math.sin(state.angle*Math.PI/180)*state.power-9*t,Math.cos(state.angle*Math.PI/180)*state.power):0,Math.PI,0,'YXZ');
   if(state.phase==='landing'||state.phase==='finished'){roundRoot.visible=state.landed;roundRoot.position.y+=Math.abs(Math.sin(Math.min(1.4,t)*Math.PI/1.4))*Math.exp(-t*1.2)*.9}
   flash.visible=state.phase==='flying'&&t<.16;flash.scale.set(.55,.55,.7);if(state.phase==='flying')bones.upperarm_l.quaternion.copy(down.upperarm_l).slerp(wave,THREE.MathUtils.smoothstep(t,.2,.8));
  }else roundRoot.position.copy(roundStart);
  for(const side of ['l','r']){const upper='upperarm_'+side,lower='lowerarm_'+side;if(!(side==='l'&&state.phase==='flying'))bones[upper].quaternion.copy(down[upper]).slerp(carry[upper],carryWeight);bones[lower].quaternion.copy(rest[lower]).slerp(carry[lower],carryWeight)}
  if(state.phase==='flying')bones.lowerarm_l.quaternion.slerp(elbowWave,THREE.MathUtils.smoothstep(t,.2,.8));bones.thigh_l.quaternion.copy(rest.thigh_l).slerp(legForward,Math.max(0,walking));bones.thigh_r.quaternion.copy(rest.thigh_r).slerp(legBack,Math.max(0,-walking));bones.head.quaternion.copy(rest.head);bones.head.rotateY(Math.sin(idleTime*.7)*.08);
  for(const [i,ring] of rings.entries()){ring.material.color.set(state.rings[i]?0x6bce91:0xd7a544);ring.material.emissive.set(state.rings[i]?0x226b40:0x000000);ring.material.emissiveIntensity=.35}
  const p=netGeometry.attributes.position,bounce=state.phase==='landing'&&state.landed?Math.sin(t*11)*Math.exp(-t*3)*.25:0;for(let i=0;i<p.count;i++){const nx=p.getX(i)/1.85,nz=p.getZ(i)/1.85;p.setY(i,.37*(1-(1-nx*nx)*(1-nz*nz))-.25-bounce*(1-nx*nx)*(1-nz*nz))}p.needsUpdate=true;
  loaderBox.min.set(actor.position.x-.50,y,actor.position.z-.62);loaderBox.max.set(actor.position.x+.50,y+1.85,actor.position.z+.62);
  barrel.updateWorldMatrix(true,false);barrelBox.copy(barrel.geometry.boundingBox).applyMatrix4(barrel.matrixWorld);
 }
 render({phase:'idle',angle:45,elapsed:0,rings:[false,false,false]},0);root.updateMatrixWorld(true);groyper.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingSphere();o.boundingSphere.radius+=.5;o.frustumCulled=true}});
 return {group,actor,bones,round:roundRoot,barrel,pivot,hatch,net,rings,navPositions,extraBoxes,bounds,interact,render,
  nearby(p){return Math.hypot(p.x-interact.x,p.z-interact.z)<4.3&&Math.abs(p.y-y-1.65)<.8},
  pick(camera,point){camera.updateMatrixWorld();ray.setFromCamera(point,camera);ray.far=5;return !!ray.intersectObject(proxy,false).length},
  dispose(){proxy.geometry.dispose();proxy.material.dispose();groyper.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose()})}
 };
}
