import * as THREE from 'three';

const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t)};

export function prepareGroypAir(root,balloon,actorScene){
 root.updateMatrixWorld(true);
 const group=new THREE.Group();group.name='GROYP_AIR_ticket_station';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const base=balloon.home.clone().add(new THREE.Vector3(-3.8,.013,-.5)),booth=new THREE.Group();booth.position.copy(base);group.add(booth);
 const m={wood:new THREE.MeshStandardMaterial({name:'GROYP AIR aged timber',color:0x966344,roughness:.8}),dark:new THREE.MeshStandardMaterial({color:0x493447,roughness:.7}),cream:new THREE.MeshStandardMaterial({color:0xffefd0,roughness:.7}),red:new THREE.MeshStandardMaterial({color:0xc63a52,roughness:.5}),gold:new THREE.MeshStandardMaterial({color:0xc99b4c,metalness:.6,roughness:.35}),green:new THREE.MeshStandardMaterial({color:0x438e75,roughness:.7})};
 const navPositions=[],extraBoxes=[];
 function box(w,h,d,material,x,y,z,name='GROYP_AIR_detail'){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.name=name;booth.add(mesh);return mesh}
 function solid(mesh){mesh.updateWorldMatrix(true,true);extraBoxes.push(new THREE.Box3().setFromObject(mesh))}
 function cylinder(r,h,material,x,y,z){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),material);mesh.position.set(x,y,z);booth.add(mesh);return mesh}
 box(4.2,.22,4.8,m.dark,0,-.123,0,'GROYP_AIR_side_deck');box(4.12,.035,4.72,m.cream,0,-.0175,0);
 for(const [x,z] of [[-2.05,-2.35],[-2.05,2.35],[2.05,-2.35],[2.05,-2.35],[-2.05,2.35],[2.05,2.35]])navPositions.push(base.x+x,base.y,base.z+z);
 for(const x of [-1.42,1.42])for(const z of [-.92,.92]){const post=box(.11,2.6,.11,m.dark,x,1.3,z);solid(post);box(.18,.12,.18,m.gold,x,.09,z)}
 const back=box(2.82,1.30,.12,m.wood,0,.65,.92);solid(back);
 box(3.1,.15,2.20,m.dark,0,2.58,0);for(let i=0;i<10;i++)box(.302,.045,2.26,i%2?m.red:m.cream,-1.36+i*.302,2.675,0);
 const counter=box(2.7,.82,.40,m.wood,0,.41,-.77,'GROYP_AIR_ticket_counter');solid(counter);box(2.86,.075,.56,m.dark,0,.8575,-.77);box(2.72,.025,.025,m.gold,0,.72,-.988);
 // Ticket stacks, a stamped ticket and an old suitcase belong to the desk.
 for(let i=0;i<3;i++){const ticket=box(.28,.014,.16,m.cream,-.72+i*.33,.906+i*.004,-.77);ticket.rotation.y=(i-1)*.17;box(.042,.018,.13,m.red,-.79+i*.33,.916+i*.004,-.77)}
 cylinder(.031,.014,m.gold,-.03,.925,-.77);
 cylinder(.10,.018,m.cream,.96,.91,-.72);cylinder(.072,.14,m.red,.96,.985,-.72);cylinder(.060,.005,m.dark,.96,1.058,-.72);
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.046,.012,6,14),m.red);handle.position.set(1.043,.985,-.72);booth.add(handle);
 const suitcase=box(.62,.58,.38,m.green,-1.81,.30,.22,'GROYP_AIR_old_suitcase');solid(suitcase);for(const x of [-2.00,-1.62])box(.05,.60,.40,m.gold,x,.30,.22);box(.22,.06,.08,m.dark,-1.81,.63,.22);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff0cc';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#bf304a';ctx.textAlign='center';ctx.font='900 113px system-ui';ctx.fillText('GROYP AIR',512,140);ctx.fillStyle='#6b4a32';ctx.font='32px system-ui';ctx.fillText('TICKETS  /  ISLAND FLIGHTS',512,208);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;box(2.80,.72,.10,m.gold,0,2.17,-.98);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.69,.67),new THREE.MeshBasicMaterial({map:texture}));sign.rotation.y=Math.PI;sign.position.set(0,2.17,-1.039);sign.name='GROYP_AIR_sign';booth.add(sign);

 const actor=new THREE.Group();actor.name='Groyper_dispatcher';actor.position.set(0,0,.10);actor.rotation.y=Math.PI;booth.add(actor);actor.add(actorScene);
 actorScene.traverse(o=>{o.userData.islandRide=true;if(o.isSkinnedMesh){o.frustumCulled=false;for(const mat of Array.isArray(o.material)?o.material:[o.material]){mat.roughness=Math.max(.8,mat.roughness);mat.envMapIntensity=.45}}});
 root.updateMatrixWorld(true);
 const bones=Object.fromEntries(['head','upperarm_l','lowerarm_l','hand_l','upperarm_r'].map(name=>[name,actorScene.getObjectByName(name)]));
 const rest=Object.fromEntries(Object.entries(bones).filter(([,bone])=>bone).map(([name,bone])=>[name,bone.quaternion.clone()])),axis=new THREE.Vector3(),parentQ=new THREE.Quaternion(),actorQ=actor.getWorldQuaternion(new THREE.Quaternion());
 function worldPose(name,localAxis,angle){const bone=bones[name];if(!bone)return null;bone.parent.getWorldQuaternion(parentQ);axis.copy(localAxis).applyQuaternion(actorQ).applyQuaternion(parentQ.invert());bone.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(axis,angle).multiply(rest[name]));bone.updateWorldMatrix(false,true);return bone.quaternion.clone()}
 const zAxis=new THREE.Vector3(0,0,1),yAxis=new THREE.Vector3(0,1,0),leftDown=worldPose('upperarm_l',zAxis,-1.16),rightDown=worldPose('upperarm_r',zAxis,1.16),headLeft=worldPose('head',yAxis,-.12),headRight=worldPose('head',yAxis,.12);
 const leftWave=worldPose('upperarm_l',zAxis,.26),elbowWave=worldPose('lowerarm_l',zAxis,1.12);
 if(bones.upperarm_l)bones.upperarm_l.quaternion.copy(leftDown);if(bones.lowerarm_l)bones.lowerarm_l.quaternion.copy(rest.lowerarm_l);if(bones.head)bones.head.quaternion.copy(rest.head);
 root.updateMatrixWorld(true);
 const actorBox=new THREE.Box3(new THREE.Vector3(base.x-.62,base.y,base.z-.40),new THREE.Vector3(base.x+.62,base.y+1.85,base.z+.55));extraBoxes.push(actorBox);
 const hit=new THREE.Mesh(new THREE.BoxGeometry(2.72,2.55,1.9),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));hit.position.copy(base).add(new THREE.Vector3(0,1.275,-.05));hit.updateMatrixWorld();
 const ray=new THREE.Raycaster(),interactionPosition=base.clone().add(new THREE.Vector3(0,0,-1.4));balloon.mapPositions=[balloon.mapPosition,interactionPosition];
 const bounds=new THREE.Box3().setFromObject(group);let time=0,presence=0;
 return {group,booth,actor,bones,navPositions,extraBoxes,bounds,interactionPosition,
  update(dt,player){dt=Math.min(.1,Math.max(0,dt));time+=dt;const near=player&&Math.hypot(player.x-base.x,player.z-base.z)<6;presence=THREE.MathUtils.damp(presence,near?1:0,5,dt);const phase=time%12,wave=presence*ease(phase/.6)*(1-ease((phase-2.6)/.6));
   if(bones.head)bones.head.quaternion.slerpQuaternions(headLeft,headRight,(Math.sin(time*.55)+1)*.5);
   if(bones.upperarm_l)bones.upperarm_l.quaternion.slerpQuaternions(leftDown,leftWave,wave);
   if(bones.lowerarm_l)bones.lowerarm_l.quaternion.slerpQuaternions(rest.lowerarm_l,elbowWave,wave);
   if(bones.hand_l){bones.hand_l.quaternion.copy(rest.hand_l);bones.hand_l.rotateX(Math.sin(time*8)*.16*wave)}
  },
  pick(camera,point){camera.updateMatrixWorld();ray.setFromCamera(point,camera);ray.far=4.5;return !!ray.intersectObject(hit,false).length},
  dispose(){hit.geometry.dispose();hit.material.dispose();balloon.mapPositions=null}
 };
}
