import * as THREE from 'three';
import {createHonkKartDriver} from './kart-driver.js?v=59';
import {batchRideMeshes} from './ride-performance.js?v=59';

export function createGrandmaHonk(parent,headData,seat){
 const group=new THREE.Group();group.name='Grandma_HONK_seated_storyteller';group.position.set(seat.x,.028,seat.z);group.rotation.y=Math.PI;parent.add(group);
 const upper=new THREE.Group();group.add(upper);const body=new THREE.Group();upper.add(body);
 const make=c=>new THREE.MeshStandardMaterial({color:c,roughness:.8}),m={dress:make(0x705763),lace:make(0xf0dfb7),skin:make(0x69933d),shoe:make(0x382d36),gold:make(0xbb913e),pearl:make(0xfff2d4),hair:make(0xd8d1b8),glass:new THREE.MeshStandardMaterial({color:0xc9e0c1,transparent:true,opacity:.12,depthWrite:false,roughness:.18,side:THREE.DoubleSide})};
 function ball(x,y,z,sx,sy,sz,mat,parent=body){const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o}
 function rod(a,b,r,mat,parent=body){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),12),mat);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(o);return o}
 const hip=seat.y-.028+.07;
 ball(0,hip+.27,-.10,.25,.32,.21,m.dress);ball(0,hip+.02,.06,.29,.14,.30,m.dress);
 for(const sign of [-1,1]){
  const knee=[sign*.15,hip-.03,.32],ankle=[sign*.15,.14,.42];rod([sign*.13,hip,.02],knee,.09,m.dress);rod(knee,ankle,.068,m.dress);ball(sign*.15,.085,.49,.10,.085,.17,m.shoe,group);
  ball(sign*.23,hip+.40,-.08,.11,.12,.115,m.dress);rod([sign*.23,hip+.40,-.08],[sign*.32,hip+.17,.08],.085,m.dress);rod([sign*.32,hip+.17,.08],[sign*.15,hip+.105,.27],.075,m.dress);
  ball(sign*.16,hip+.105,.27,.08,.07,.065,m.lace);ball(sign*.085,hip+.09,.315,.115,.044,.065,m.skin);
  for(let i=0;i<5;i++){const a=.25+i*.24;ball(sign*(.03+i*.045),hip+.48-i*.019,.095+Math.sin(a)*.065,.032,.032,.025,m.lace)}
 }
 ball(0,hip+.42,-.08,.09,.08,.08,m.skin);ball(0,hip+.425,.14,.048,.061,.018,m.gold);ball(0,hip+.425,.162,.032,.045,.012,m.pearl);
 const original=createHonkKartDriver(new THREE.Group(),headData),head=original.head;head.removeFromParent();head.position.set(0,hip+.76,-.07);head.scale.setScalar(1.26);upper.add(head);
 for(const mesh of head.children)if(mesh.material?.color){const c=mesh.material.color;if(Math.max(c.r,c.g,c.b)>.43&&Math.min(c.r,c.g,c.b)<.12)c.lerp(new THREE.Color(0xc8bda4),.18)}
 for(let i=0;i<11;i++){const x=-.225+i*.045,y=.145+Math.sin(i*Math.PI/10)*.028;ball(x,y,.12,.036,.035,.035,m.hair,head)}
 for(const sign of [-1,1]){
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.067,.007,8,32),m.gold);rim.position.set(sign*.10,.035,.205);head.add(rim);
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.061,24),m.glass);lens.position.set(sign*.10,.035,.206);head.add(lens);rod([sign*.16,.035,.205],[sign*.22,.03,.11],.006,m.gold,head);
 }
 rod([-.035,.035,.205],[.035,.035,.205],.006,m.gold,head);
 batchRideMeshes(body);batchRideMeshes(head);batchRideMeshes(group);group.traverse(o=>o.userData.grandmaDynamic=true);
 const geometry=new Set(),materials=new Set();original.group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material)});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 const ray=new THREE.Raycaster();
 return {group,head,upper,seat,
  update(time,speaking=false){upper.position.y=Math.sin(time*1.6)*.003;upper.rotation.z=speaking?Math.sin(time*1.3)*.006:0},
  pick(camera,point,blockers){camera.updateMatrixWorld();group.updateWorldMatrix(true,true);ray.setFromCamera(point,camera);ray.far=9;const hit=ray.intersectObject(group,true)[0];if(!hit)return false;ray.far=hit.distance+.02;const obstacle=ray.intersectObjects(blockers,true)[0];return !obstacle||obstacle.distance>=hit.distance-.025}
 };
}
