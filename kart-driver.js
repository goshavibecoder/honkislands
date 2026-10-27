import {loadCurrentHonk,currentHonkMaterial,currentHonkGeometry} from './honk-model.js?v=169';
import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export async function loadHonkKartHead(){const current=await loadCurrentHonk();return {current,material:await currentHonkMaterial(current)}}
export function createHonkKartDriver(vehicle,headData){
 const driver=new THREE.Group();driver.name='Honk_player_driver';driver.visible=false;vehicle.add(driver);
 const torso=new THREE.Group();torso.name='Honk_driver_torso';driver.add(torso);
 const head=new THREE.Group();head.name='Honk_driver_original_head';head.position.set(0,1.18,-.23);driver.add(head);
 // Reuse the exact HONK face and rainbow wig from the existing workshop toy.
 if(headData?.current){const mesh=new THREE.Mesh(currentHonkGeometry(headData.current.medium,{height:1.15,head:true}),headData.material);mesh.geometry.translate(0,-.167,0);mesh.name='Honk_driver_Meshy_face_and_wig';head.add(mesh)}
 const buckets=new Map();for(const part of headData?.meshes||[]){const key=part.color.join(','),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));g.setIndex(part.indices);if(!buckets.has(key))buckets.set(key,{color:part.color,geometries:[]});buckets.get(key).geometries.push(g)}
 for(const bucket of buckets.values()){const geometry=mergeGeometries(bucket.geometries,false),material=new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(...bucket.color),roughness:.58}),mesh=new THREE.Mesh(geometry,material);mesh.name='Honk_driver_face_and_wig';head.add(mesh);bucket.geometries.forEach(g=>g.dispose())}
 const material=(color,roughness=.6)=>new THREE.MeshStandardMaterial({color,roughness}),m={blue:material(0x174cdd),green:material(0x659b3e),white:material(0xf3f1e3),bow:material(0xa9d7fa),black:material(0x151729),red:material(0xe6232c)};
 function sphere(parent,x,y,z,sx,sy,sz,mat){const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o}
 function limb(a,b,r,mat,parent=driver){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,12),mat);parent.add(o);setLimb(o,a,b);return o}
 function setLimb(o,a,b){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from);o.position.copy(from.add(to).multiplyScalar(.5));o.scale.y=v.length();o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize())}
 const suit=sphere(torso,0,.78,-.24,.235,.235,.17,m.blue);suit.name='Honk_driver_suit_torso';sphere(torso,0,1.005,-.23,.09,.06,.09,m.green);
 for(const sign of [-1,1]){sphere(driver,sign*.105,.55,-.06,.095,.075,.21,m.blue);limb([sign*.105,.53,.09],[sign*.105,.34,.27],.065,m.blue);sphere(driver,sign*.11,.32,.34,.095,.06,.15,m.blue);sphere(driver,sign*.067,1.025,-.035,.075,.045,.023,m.bow);for(const x of [-.018,.018])sphere(driver,sign*.067+x,1.033,-.010,.010,.010,.006,m.white)}sphere(driver,0,1.025,-.013,.026,.026,.022,m.bow);
 const hands=[];for(const sign of [-1,1]){
  const arm=new THREE.Group();arm.name=sign<0?'Honk_driver_right_arm':'Honk_driver_left_arm';torso.add(arm);
  const shoulder=[sign*.16,.88,-.23],elbow=[sign*.25,.81,-.10];
  sphere(arm,sign*.19,.88,-.23,.09,.09,.10,m.blue);sphere(arm,...elbow,.066,.066,.066,m.blue);
  const upper=limb(shoulder,elbow,.064,m.blue,arm),forearm=limb(elbow,[sign*.14,.84,.17],.055,m.blue,arm),hand=sphere(arm,sign*.14,.84,.17,.052,.043,.035,m.green);hands.push({sign,arm,shoulder,elbow,upper,forearm,hand});
 }
 const grip=new THREE.Vector3(),rotation=new THREE.Euler(),wheelCenter=new THREE.Vector3(0,.84,.17);let lastSteer=Infinity;
 function steer(value){if(Math.abs(value-lastSteer)<.00001)return;lastSteer=value;rotation.set(-.5,0,value*.65,'XYZ');for(const h of hands){grip.set(h.sign*.14,0,0).applyEuler(rotation).add(wheelCenter);h.hand.position.copy(grip);setLimb(h.forearm,h.elbow,grip.toArray())}}
 return {group:driver,head,torso,suit,arms:hands,steer,setSeated(value,inside=false){driver.visible=value;head.visible=!inside}};
}
