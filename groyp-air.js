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
 const bones=Object.fromEntries(['head','upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r','thigh_l','thigh_r','calf_l','calf_r'].map(name=>[name,actorScene.getObjectByName(name)]));
 const rest=Object.fromEntries(Object.entries(bones).filter(([,bone])=>bone).map(([name,bone])=>[name,bone.quaternion.clone()])),axis=new THREE.Vector3(),parentQ=new THREE.Quaternion(),actorQ=actor.getWorldQuaternion(new THREE.Quaternion());
 function worldPose(name,localAxis,angle,initial=rest[name]){const bone=bones[name];if(!bone)return null;bone.parent.getWorldQuaternion(parentQ);axis.copy(localAxis).applyQuaternion(actorQ).applyQuaternion(parentQ.invert());bone.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(axis,angle).multiply(initial));bone.updateWorldMatrix(false,true);return bone.quaternion.clone()}
 const xAxis=new THREE.Vector3(1,0,0),zAxis=new THREE.Vector3(0,0,1),yAxis=new THREE.Vector3(0,1,0),leftDown=worldPose('upperarm_l',zAxis,-1.16),rightDown=worldPose('upperarm_r',zAxis,1.16),headLeft=worldPose('head',yAxis,-.12),headRight=worldPose('head',yAxis,.12),headSleep=worldPose('head',xAxis,.28);
 const leftWave=worldPose('upperarm_l',zAxis,.26),elbowWave=worldPose('lowerarm_l',zAxis,1.12);
 const rightPresent=worldPose('upperarm_r',yAxis,.95,worldPose('upperarm_r',zAxis,.50)),elbowPresent=worldPose('lowerarm_r',yAxis,.35),rightStamp=worldPose('upperarm_r',yAxis,1.45,worldPose('upperarm_r',zAxis,.50));
 const legs={};for(const name of ['thigh_l','thigh_r','calf_l','calf_r']){legs[name]=[worldPose(name,xAxis,-.25),worldPose(name,xAxis,.25)];bones[name].quaternion.copy(rest[name])}
 if(bones.upperarm_l)bones.upperarm_l.quaternion.copy(leftDown);if(bones.lowerarm_l)bones.lowerarm_l.quaternion.copy(rest.lowerarm_l);if(bones.head)bones.head.quaternion.copy(rest.head);

 const ticketCanvas=document.createElement('canvas');ticketCanvas.width=1024;ticketCanvas.height=512;const ticketContext=ticketCanvas.getContext('2d'),ticketTexture=new THREE.CanvasTexture(ticketCanvas);ticketTexture.colorSpace=THREE.SRGBColorSpace;
 function printTicket(title,stamped=false){const c=ticketContext;c.fillStyle='#fff1ce';c.fillRect(0,0,1024,512);c.fillStyle='#bd304c';c.fillRect(0,0,38,512);c.fillRect(986,0,38,512);c.textAlign='center';c.font='900 95px system-ui';c.fillText('GROYP AIR',512,122);c.fillStyle='#493447';c.font='700 65px system-ui';c.fillText(title.toUpperCase(),512,235,880);c.font='35px system-ui';c.fillText('ONE HONK / ONE FLIGHT',512,310);c.fillStyle='#bd304c';c.font='900 63px system-ui';if(stamped)c.fillText('HONK APPROVED',512,430);ticketTexture.needsUpdate=true}
 printTicket('ISLAND TICKET');
 const ticketFace=new THREE.MeshBasicMaterial({map:ticketTexture}),deskTicket=new THREE.Mesh(new THREE.PlaneGeometry(.50,.25),ticketFace);deskTicket.name='GROYP_AIR_ticket_to_stamp';deskTicket.rotation.x=-Math.PI/2;deskTicket.position.set(.28,.912,-.77);deskTicket.visible=false;booth.add(deskTicket);
 const ticket=new THREE.Group();ticket.name='GROYP_AIR_ticket_in_hand';const paper=new THREE.Mesh(new THREE.BoxGeometry(.50,.25,.008),m.cream),printed=new THREE.Mesh(new THREE.PlaneGeometry(.49,.24),ticketFace);printed.position.z=.005;ticket.add(paper,printed);ticket.visible=false;
 const stamp=new THREE.Group();stamp.name='GROYP_AIR_hand_stamp';const ink=new THREE.Mesh(new THREE.BoxGeometry(.17,.035,.10),m.red),grip=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.20,12),m.dark);ink.position.y=-.08;stamp.add(ink,grip);stamp.visible=false;
 function handProp(prop,offset,worldRotation){root.updateMatrixWorld(true);const hand=bones.hand_r,p=hand.getWorldPosition(new THREE.Vector3()).add(offset),q=hand.getWorldQuaternion(new THREE.Quaternion());hand.add(prop);prop.position.copy(hand.worldToLocal(p));prop.quaternion.copy(q.invert().multiply(worldRotation))}
 handProp(stamp,new THREE.Vector3(0,-.11,-.10),new THREE.Quaternion());
 // Offer the paper flat from the fingertips; only its rear edge meets the hand.
 bones.upperarm_r.quaternion.copy(rightPresent);handProp(ticket,new THREE.Vector3(.025,-.08,-.30),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,Math.PI)));
 bones.upperarm_r.quaternion.copy(rightDown);bones.lowerarm_r.quaternion.copy(rest.lowerarm_r);
 actor.traverse(o=>o.userData.islandRide=true);deskTicket.userData.islandRide=true;
 const emoteCanvas=document.createElement('canvas');emoteCanvas.width=128;emoteCanvas.height=128;const emoteContext=emoteCanvas.getContext('2d'),emoteTexture=new THREE.CanvasTexture(emoteCanvas);emoteTexture.colorSpace=THREE.SRGBColorSpace;
 const emote=new THREE.Sprite(new THREE.SpriteMaterial({map:emoteTexture,depthWrite:false}));emote.scale.set(.34,.34,1);emote.position.set(0,1.98,-.22);actor.add(emote);emote.visible=false;let symbol='';
 function setEmote(value){emote.visible=!!value;if(!value||value===symbol)return;symbol=value;emoteCanvas.width=128;const c=emoteContext;c.textAlign='center';c.fillStyle='#fff1ce';c.font='900 110px system-ui';c.fillText(value,64,110);emoteTexture.needsUpdate=true}
 root.updateMatrixWorld(true);
 const actorBox=new THREE.Box3(new THREE.Vector3(base.x-.62,base.y,base.z-.40),new THREE.Vector3(base.x+.62,base.y+1.85,base.z+.55));extraBoxes.push(actorBox);
 const hit=new THREE.Mesh(new THREE.BoxGeometry(2.72,2.55,1.9),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));hit.position.copy(base).add(new THREE.Vector3(0,1.275,-.05));hit.updateMatrixWorld();
 const ray=new THREE.Raycaster(),interactionPosition=base.clone().add(new THREE.Vector3(0,0,-1.4));balloon.mapPositions=[balloon.mapPosition,interactionPosition];
 const bounds=new THREE.Box3().setFromObject(group),ticketView=base.clone().add(new THREE.Vector3(.15,1.55,-1.80)),ticketLook=base.clone().add(new THREE.Vector3(.12,1.13,-.15)),farewellLook=new THREE.Vector3();let time=0,presence=0,phase='idle',elapsed=0,idleTime=0,greeting=0,startle=0,lastDistance=Infinity,cooldown=0,stamped=false,destination='ISLAND TICKET',farewellFrom=.10;
 const path=[new THREE.Vector3(0,0,.10),new THREE.Vector3(2.2,0,.10),new THREE.Vector3(2.2,0,-1.35)],pathLength=3.65;
 function actorBounds(){actorBox.min.set(base.x+actor.position.x-.62,base.y,base.z+actor.position.z-.40);actorBox.max.set(base.x+actor.position.x+.62,base.y+1.85,base.z+actor.position.z+.55);farewellLook.set(base.x+actor.position.x,base.y+1.3,base.z+actor.position.z)}
 function resetService(){phase='idle';elapsed=0;actor.position.copy(path[0]);actor.rotation.y=Math.PI;ticket.visible=stamp.visible=deskTicket.visible=false;for(const [name,bone] of Object.entries(bones))bone.quaternion.copy(rest[name]);bones.upperarm_l.quaternion.copy(leftDown);bones.upperarm_r.quaternion.copy(rightDown);actorBounds()}
 actorBounds();
 return {group,booth,actor,bones,navPositions,extraBoxes,bounds,interactionPosition,ticketView,ticketLook,farewellLook,ticket,deskTicket,stamp,
  get phase(){return phase},get ticketReady(){return phase==='ticket'&&elapsed>=2.6},
  beginTicket(title){if(phase!=='idle')return false;phase='ticket';elapsed=0;stamped=false;greeting=startle=0;destination=title;printTicket(title);deskTicket.visible=true;return true},
  beginFarewell(){farewellFrom=actor.position.z;phase='farewell';elapsed=0;ticket.visible=stamp.visible=deskTicket.visible=false},
  cancelService:resetService,
  update(dt,player){dt=Math.min(.1,Math.max(0,dt));time+=dt;elapsed+=dt;cooldown=Math.max(0,cooldown-dt);const distance=player?Math.hypot(player.x-base.x,player.z-base.z):Infinity,near=distance<6;
   if(phase==='idle'&&near&&lastDistance>=6)greeting=2.8;
   if(phase==='idle'&&distance<1.75&&lastDistance>=1.75&&lastDistance<6&&cooldown===0){startle=.75;cooldown=8}
   lastDistance=distance;greeting=Math.max(0,greeting-dt);startle=Math.max(0,startle-dt);idleTime=near?0:idleTime+dt;presence=THREE.MathUtils.damp(presence,near?1:0,5,dt);
   const sleepy=phase==='idle'?ease((idleTime-12)/4):0;
   let wave=phase==='idle'?presence*ease(greeting/.5)*ease((2.8-greeting)/.5):0;
   actor.position.set(0,startle>0?Math.sin(startle/.75*Math.PI)*.045:0,.10);actor.rotation.y=Math.PI;
   if(phase==='farewell'){
    const walking=Math.max(0,elapsed-.35),distance=pathLength*ease(walking/2.15),first=Math.min(1,distance/2.2);actor.position.lerpVectors(path[0],path[1],first);if(distance>2.2)actor.position.lerpVectors(path[1],path[2],(distance-2.2)/1.45);if(elapsed<.35)actor.position.z=THREE.MathUtils.lerp(farewellFrom,path[0].z,ease(elapsed/.35));
    let heading=distance<2.2?Math.PI/2:Math.PI;
    if(distance>1.9&&distance<2.5){const t=(distance-1.9)/.6;actor.position.set(1.9+.6*t-.3*t*t,0,.10-.3*t*t);heading=Math.atan2(1-t,-t)}
    const turn=ease((walking-1.7)/.65),facing=Math.atan2(balloon.home.x-base.x-path[2].x,balloon.home.z-base.z-path[2].z);actor.rotation.y=THREE.MathUtils.lerp(THREE.MathUtils.lerp(Math.PI,heading,ease(walking/.35)),facing,turn);
    const walk=ease(walking/.25)*(1-ease((walking-1.85)/.3)),stride=Math.sin(walking*12)*walk;actor.position.y=Math.abs(Math.sin(walking*12))*.012*walk;
    for(const [name,sign] of [['thigh_l',1],['thigh_r',-1],['calf_l',-1],['calf_r',1]])bones[name].quaternion.copy(rest[name]).slerp(legs[name][stride*sign>0?1:0],Math.abs(stride)*(name.startsWith('calf')?.5:1));
    wave=ease((walking-1.65)/.6);
   }else for(const name of Object.keys(legs))bones[name].quaternion.copy(rest[name]);
   if(bones.head){bones.head.quaternion.slerpQuaternions(headLeft,headRight,near?THREE.MathUtils.clamp(.5-(player.x-base.x)*.10,0,1):(Math.sin(time*.55)+1)*.5);bones.head.quaternion.slerp(headSleep,sleepy)}
   if(startle>0)wave=Math.max(wave,Math.sin(startle/.75*Math.PI)*.8);
   if(bones.upperarm_l)bones.upperarm_l.quaternion.slerpQuaternions(leftDown,leftWave,wave);
   if(bones.lowerarm_l)bones.lowerarm_l.quaternion.slerpQuaternions(rest.lowerarm_l,elbowWave,wave);
   if(bones.hand_l){bones.hand_l.quaternion.copy(rest.hand_l);bones.hand_l.rotateX(Math.sin(time*8)*.16*wave)}
   bones.upperarm_r.quaternion.copy(rightDown);bones.lowerarm_r.quaternion.copy(rest.lowerarm_r);
   if(phase==='ticket'){
    const reach=ease((elapsed-.45)/.45),press=ease((elapsed-1)/.18)*(1-ease((elapsed-1.25)/.24));bones.upperarm_r.quaternion.slerpQuaternions(rightDown,rightPresent,reach).slerp(rightStamp,press);bones.lowerarm_r.quaternion.slerpQuaternions(rest.lowerarm_r,elbowPresent,reach);
    stamp.visible=elapsed>.55&&elapsed<1.55;deskTicket.visible=elapsed<1.65;ticket.visible=elapsed>=1.65;
    if(elapsed>=1.22&&!stamped){stamped=true;printTicket(destination,true)}
    bones.head.quaternion.slerp(headSleep,press*.6);actor.position.z=.10-ease(elapsed/.6)*.28;
   }
   setEmote(phase==='idle'?(startle>0?'!':sleepy>.4?'Z':greeting>2.1?'!':''):'');actorBounds();
  },
  pick(camera,point){camera.updateMatrixWorld();ray.setFromCamera(point,camera);ray.far=4.5;return !!ray.intersectObject(hit,false).length},
  dispose(){resetService();hit.geometry.dispose();hit.material.dispose();emote.material.dispose();emoteTexture.dispose();balloon.mapPositions=null}
 };
}
