import * as THREE from 'three';
import {batchRideMeshes} from './ride-performance.js?v=59';
import {MAFIA_RULES} from './mafia-combat.js?v=132';
import {mafiaStepAhead,MAFIA_ENEMY_RULES} from './mafia-ai.js?v=131';
import {createKalashnikov} from './mafia-weapon.js?v=127';
const clamp=t=>THREE.MathUtils.clamp(t,0,1),ease=t=>{t=clamp(t);return t*t*(3-2*t)};
const Y=new THREE.Vector3(0,1,0),X=new THREE.Vector3(1,0,0);

export function prepareMafiaGroyp(enemy,source,m){
 const body=new THREE.Group();body.name='Groyp animated body';body.position.y=.68;enemy.add(body);
 const bones={},rest=new Map(),arms=[],feet=[];
 function mesh(geometry,mat,parent,x,y,z,name){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.name=name;parent.add(o);return o}
 function ball(parent,x,y,z,sx,sy,sz,mat=m.skin,name='Groyp detail'){const o=mesh(new THREE.SphereGeometry(1,12,8),mat,parent,x,y,z,name);o.scale.set(sx,sy,sz);return o}
 if(source){
  const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=1.8/size.y,model=new THREE.Group();model.name='Original textured Groyp';model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale-.68,-center.z*scale);model.add(source);body.add(model);
  source.traverse(o=>{
   if(o.isBone){bones[o.name]=o;rest.set(o,o.quaternion.clone())}
   if(!o.isSkinnedMesh)return;o.frustumCulled=false;
   // Preserve the authored diffuse/normal maps. Skin must not shade like metal.
   for(const mat of Array.isArray(o.material)?o.material:[o.material]){mat.metalness=0;mat.roughness=.9;mat.normalScale?.set(.65,.65);mat.envMapIntensity=.35;for(const t of [mat.map,mat.normalMap,mat.roughnessMap])if(t)t.anisotropy=4}
   // There are no finger bones in the source rig. Only replace the open palms.
   const g=o.geometry.clone(),idx=g.index,handVertex=[];
   for(let i=0;i<g.attributes.position.count;i++){handVertex[i]=false;for(let k=0;k<4;k++)if(g.attributes.skinWeight.getComponent(i,k)>.5&&/^hand_[lr]$/.test(o.skeleton.bones[g.attributes.skinIndex.getComponent(i,k)].name))handVertex[i]=true}
   const kept=[];for(let i=0;i<(idx?.count||g.attributes.position.count);i+=3){const tri=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);if(!tri.some(v=>handVertex[v]))kept.push(...tri)}g.setIndex(kept);o.geometry.dispose();o.geometry=g;
  });
 }else{
  ball(body,0,.15,0,.41,.63,.3);ball(body,0,.80,.04,.37,.29,.3);
  for(const x of [-.2,.2]){ball(body,x,1.0,.19,.14,.11,.08,m.skin);ball(body,x,1.0,.26,.08,.07,.025,m.edge);ball(body,x,1.0,.282,.035,.05,.012,m.dark);ball(body,x,-.40,0,.12,.27,.16)}
 }
 enemy.updateWorldMatrix(true,true);
 for(const side of ['l','r']){
  const upper=bones['upperarm_'+side],lower=bones['lowerarm_'+side],hand=bones['hand_'+side],thigh=bones['thigh_'+side],calf=bones['calf_'+side],foot=bones['foot_'+side];
  if(upper&&lower&&hand)arms.push({upper,lower,end:hand,side});
  if(thigh&&calf&&foot){const home=enemy.worldToLocal(foot.getWorldPosition(new THREE.Vector3())),homeQ=enemy.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(foot.getWorldQuaternion(new THREE.Quaternion()));feet.push({upper:thigh,lower:calf,end:foot,side,home,homeQ,plant:new THREE.Vector3(),start:new THREE.Vector3(),goal:new THREE.Vector3(),plantQ:new THREE.Quaternion(),startQ:new THREE.Quaternion(),goalQ:new THREE.Quaternion(),lastPhase:0,stepId:0,planted:false,ready:false})}
 }
 const hat=new THREE.Group();hat.name='Groyp fitted fedora';hat.position.set(0,1.77-.68,-.015);hat.rotation.z=-.035;body.add(hat);
 for(const [r0,r1,h,y,sz,mat] of [[.34,.34,.025,0,.84,m.fabric],[.225,.25,.17,.09,.88,m.fabric],[.239,.249,.035,.035,.88,m.wood]]){const o=mesh(new THREE.CylinderGeometry(r0,r1,h,24),mat,hat,0,y,0,'Fedora felt and leather');o.scale.z=sz}
 batchRideMeshes(hat);
 const rifle=createKalashnikov(m);rifle.scale.setScalar(.78);body.add(rifle);
 const grips={};for(const side of ['l','r']){
  const g=new THREE.Group();g.name='Groyp '+(side==='r'?'right':'left')+' hand grip';body.add(g);grips[side]=g;
  ball(g,0,0,.005,.046,.052,.039,m.skin,'Groyp closed '+side+' palm');for(const y of [-.032,-.011,.011,.032])ball(g,0,y,.031,.046,.013,.018);ball(g,(side==='r'?-1:1)*.037,.021,.003,.018,.03,.022);batchRideMeshes(g);
 }
 const starMat=new THREE.MeshBasicMaterial({color:0xffdf63,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),stars=new THREE.Group();stars.name='Groyp knockout stars';body.add(stars);
 const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.026:.062,x=Math.sin(a)*r,y=Math.cos(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y)}starShape.closePath();
 for(let i=0;i<3;i++)mesh(new THREE.ExtrudeGeometry(starShape,{depth:.009,bevelEnabled:false}),starMat,stars,0,0,0,'Knockout star');
 const dustMat=new THREE.MeshBasicMaterial({color:0x9e9177,transparent:true,opacity:0,depthWrite:false}),dust=new THREE.Group();dust.name='Groyp landing dust';enemy.add(dust);for(let i=0;i<7;i++)ball(dust,0,0,0,1,1,1,dustMat,'Landing dust puff');
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),axis=new THREE.Vector3(),pole=new THREE.Vector3(),elbow=new THREE.Vector3(),wanted=new THREE.Vector3(),p=new THREE.Vector3(),q=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),turn=new THREE.Quaternion(),worldQ=new THREE.Quaternion();
 function rotate(joint,from,to){turn.setFromUnitVectors(from.normalize(),to.normalize());joint.parent.getWorldQuaternion(parentQ);turn.premultiply(parentQ.clone().invert()).multiply(parentQ);joint.quaternion.premultiply(turn);joint.updateWorldMatrix(false,true)}
 function solve(chain,target,kneePole){
  body.updateWorldMatrix(true,true);chain.upper.getWorldPosition(a);chain.lower.getWorldPosition(b);chain.end.getWorldPosition(c);const l1=a.distanceTo(b),l2=b.distanceTo(c),d=THREE.MathUtils.clamp(a.distanceTo(target),Math.abs(l1-l2)+.001,l1+l2-.002);axis.copy(target).sub(a).normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along));pole.copy(kneePole).addScaledVector(axis,-kneePole.dot(axis)).normalize();wanted.copy(a).addScaledVector(axis,d);elbow.copy(a).addScaledVector(axis,along).addScaledVector(pole,bend);rotate(chain.upper,b.clone().sub(a),elbow.clone().sub(a));chain.lower.getWorldPosition(b);chain.end.getWorldPosition(c);rotate(chain.lower,c.clone().sub(b),wanted.clone().sub(b));
 }
 function flatFoot(leg,desiredQ){leg.end.parent.getWorldQuaternion(parentQ);leg.end.quaternion.copy(parentQ.invert().multiply(desiredQ));leg.end.updateWorldMatrix(false,true)}
 function boneTurn(bone,axis,angle){if(!bone)return;body.getWorldQuaternion(q);pole.copy(axis).applyQuaternion(q);bone.parent.getWorldQuaternion(parentQ);pole.applyQuaternion(parentQ.invert());bone.quaternion.premultiply(turn.setFromAxisAngle(pole,angle));bone.updateWorldMatrix(false,true)}
 let lastClock=-1,wasDefeated=false,gaitOrigin=0,dropReady=false,lastVX=0,lastVZ=0;const dropOrigin=new THREE.Vector3();
 function pose(model,enemyKick=0){
  const defeated=['victory','capture','return','done'].includes(model.phase),t=defeated?(model.phase==='victory'?model.elapsed:MAFIA_RULES.victory):0,kneel=ease((t-.26)/.73),collapse=ease((t-1.05)/.83),speed=Math.hypot(model.enemy.vx||0,model.enemy.vz||0),walk=model.phase==='fight'?ease(model.elapsed/.20)*ease(speed/.30):0,distance=model.enemy.distance||0;
  const oldSpeed=Math.hypot(lastVX,lastVZ),turning=speed>.18&&oldSpeed>.18&&((model.enemy.vx||0)*lastVX+(model.enemy.vz||0)*lastVZ)/(speed*oldSpeed)<.5;lastVX=model.enemy.vx||0;lastVZ=model.enemy.vz||0;
  if(turning||model.clock<lastClock||model.phase==='wake'||(!defeated&&wasDefeated)||(model.phase==='fight'&&speed<.18)){gaitOrigin=distance;for(const leg of feet)leg.ready=false}lastClock=model.clock;wasDefeated=defeated;const cycle=(distance-gaitOrigin)/.48;
  if(!defeated)dropReady=false;for(const [bone,r] of rest)bone.quaternion.copy(r);
  body.position.set(0,.68-.125*walk+.008*Math.cos(cycle*4*Math.PI)*walk,0);body.rotation.set(0,0,.018*Math.sin(cycle*2*Math.PI)*walk);
  if(defeated){body.position.y=.68-.255*kneel;body.rotation.set(-.13*Math.sin(Math.PI*ease(t/.4))+.16*kneel,0,-.065*kneel+.045*Math.sin(t*18)*(1-kneel))}
  body.updateWorldMatrix(true,true);enemy.getWorldQuaternion(worldQ);
  for(const leg of feet){
   const home=enemy.localToWorld(leg.home.clone()),homeQ=worldQ.clone().multiply(leg.homeQ),phase=(cycle+(leg.side==='l'?.30:.80))%1;
   if(!leg.ready){leg.plant.copy(home);leg.start.copy(home);leg.goal.copy(home);leg.plantQ.copy(homeQ);leg.startQ.copy(homeQ);leg.goalQ.copy(homeQ);leg.lastPhase=phase;leg.ready=true;leg.stepId++}
   let target=leg.plant.clone(),footQ=leg.plantQ.clone();leg.planted=false;
   if(defeated){const local=leg.home.clone();local.z+=leg.side==='r'?-.14:.07;target.lerpVectors(leg.plant,enemy.localToWorld(local),kneel);footQ.copy(homeQ)}
   else if(walk<.01){leg.plant.copy(home);leg.start.copy(home);leg.goal.copy(home);leg.plantQ.copy(homeQ);leg.startQ.copy(homeQ);leg.goalQ.copy(homeQ);target.copy(home);footQ.copy(homeQ)}
   else{
    // Predict the landing point through the patrol turn; stance feet stay in world space.
    if(phase>=.56&&(leg.lastPhase<.56||!leg.goal.distanceTo(leg.start))){leg.start.copy(leg.plant);leg.startQ.copy(leg.plantQ);leg.goal.copy(home);if(speed>.01){const next=mafiaStepAhead(model.enemy,Math.min(.45,(.48*(1-phase)+.06)/Math.max(speed,.4)));leg.goal.x+=next.x-model.enemy.x;leg.goal.z+=next.z-model.enemy.z}leg.goalQ.copy(homeQ)}
    if(phase<.56&&leg.lastPhase>=.56){leg.plant.copy(leg.goal);leg.plantQ.copy(leg.goalQ);leg.stepId++}
    if(phase>=.56){const f=(phase-.56)/.44;target.lerpVectors(leg.start,leg.goal,ease(f));target.y+=Math.sin(Math.PI*f)*.095*walk;footQ.slerpQuaternions(leg.startQ,leg.goalQ,ease(f))}
    else{target.copy(leg.plant);footQ.copy(leg.plantQ);leg.planted=walk>.999}
    target.lerp(home,1-walk);footQ.slerp(homeQ,1-walk);
   }
   leg.lastPhase=phase;const knee=new THREE.Vector3(leg.side==='l'?.12:-.12,0,1).transformDirection(enemy.matrixWorld);solve(leg,target,knee);flatFoot(leg,footQ);
  }
  const reload=model.enemy.reloadTime>0?Math.sin(Math.PI*model.enemy.reloadTime/MAFIA_ENEMY_RULES.reload):0;
  rifle.position.set(-.035,1.38-.68-.12*reload,.30-enemyKick*.025);rifle.rotation.set(-enemyKick*.035+.35*reload,.60,-.025-.18*reload);if(rifle.parent!==body)body.add(rifle);
  boneTurn(bones.spine_03,X,-enemyKick*.03);
  for(const chain of arms){
   const target=rifle.localToWorld(rifle.userData[chain.side==='r'?'rightGrip':'leftGrip'].clone());
   if(defeated){const dropped=new THREE.Vector3(chain.side==='r'?-.30:.30,.55,.12);enemy.localToWorld(dropped);target.lerp(dropped,ease((t-.24)/.45))}
   const armPole=new THREE.Vector3(chain.side==='l'?1:-1,-.35,-.15).transformDirection(enemy.matrixWorld);solve(chain,target,armPole);
  }
  boneTurn(bones.head,Y,.42*(1-kneel));
  if(defeated){boneTurn(bones.head,X,.14*kneel);boneTurn(bones.head,Y,Math.sin(t*13)*.13*(1-collapse));body.position.lerp(new THREE.Vector3(.18,.38,-.035),collapse);body.position.y+=.09*Math.sin(Math.PI*collapse);body.rotation.x=THREE.MathUtils.lerp(body.rotation.x,-.10,collapse);body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,-1.49,collapse)}
  body.updateWorldMatrix(true,true);
  for(const side of ['l','r']){const hand=bones['hand_'+side];if(hand){hand.getWorldPosition(p);grips[side].position.copy(body.worldToLocal(p));grips[side].rotation.set(0,defeated?0:.60,0)}else grips[side].position.set(side==='r'?-.2:.05,.53,.33)}
  if(defeated&&t>.30){if(!dropReady){rifle.getWorldPosition(dropOrigin);enemy.worldToLocal(dropOrigin);dropReady=true}enemy.add(rifle);const f=clamp((t-.30)/.76),bounce=Math.max(0,1-(t-1.06)/.18);rifle.position.set(dropOrigin.x+.55*f,THREE.MathUtils.lerp(dropOrigin.y,.066,f)+.32*Math.sin(Math.PI*f)+(t>1.06?.035*Math.sin(Math.PI*bounce):0),dropOrigin.z+.26*f);rifle.rotation.set(-.18*Math.sin(Math.PI*f),.60+.45*f,f*(2*Math.PI+Math.PI/2))}
  hat.rotation.z=-.035+(defeated?Math.sin(t*11)*.09*(1-collapse):0);
  stars.visible=defeated&&t>.22&&t<2.15;starMat.opacity=.95*ease((t-.22)/.15)*(1-ease((t-1.65)/.5));stars.children.forEach((star,i)=>{const angle=t*4+i*2*Math.PI/3;star.position.set(Math.cos(angle)*.30,1.97-.68+Math.sin(angle*2)*.025,Math.sin(angle)*.22);star.rotation.set(.1,angle,.18*Math.sin(angle))});
  const puff=ease((t-1.66)/.14),fade=1-ease((t-1.90)/.55);dust.visible=defeated&&t>1.66&&t<2.45;dustMat.opacity=.24*puff*fade;dust.children.forEach((o,i)=>{const angle=i*2.4;o.position.set(.54+Math.cos(angle)*(.12+puff*.30),.08+puff*.06,.02+Math.sin(angle)*(.10+puff*.24));o.scale.setScalar(.045+puff*.085)});
 }
 return {body,bones,feet,rifle,hat,pose};
}
