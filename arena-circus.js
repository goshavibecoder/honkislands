import * as THREE from 'three';
import {prepareTrophy} from './trophy.js?v=8';
import {decorateCircusArena} from './circus-decor.js?v=46';
import {createArenaClownArrival} from './arena-clown-arrival.js?v=168';
import {createClownHorn} from './clown-horn.js?v=31';
import {prepareArenaSurfaces} from './arena-surfaces.js?v=46';
import {finishArenaFacade} from './arena-facade.js?v=37';

const RAINBOW=['#ed3346','#ff982e','#ffe15a','#37b86d','#498cf0','#aa56d7'];
const COLORS={
 'Castle obsidian violet':'#956049','Castle deep violet':'#d9bc8c','Castle amethyst':'#e5ca9d','Castle purple steel':'#eddbb4','Castle lavender edge':'#fff0cb',
 'Arena graphite violet floor':'#ebd29d','Arena violet velvet cushion':'#c72b43','Interior midnight basalt':'#e4bf7c','Interior indigo stone':'#d9bb8d','Interior edge stone':'#f1dab0',
 'Passage dark paving':'#b68560','Passage charcoal paving':'#9b7257','Portal dressed charcoal stone':'#f3d9a3',
 'Island violet basalt':'#6b574d','Island violet rock':'#a17858','Island mauve rock':'#c39870',
 'Arena neon cyan':'#ffd46b','Arena neon magenta':'#ed3346','Castle neon cyan':'#ffd46b','Castle neon pink':'#ed3346','Castle neon violet':'#ff9b3e'
};

export function prepareArenaCircus(root,environment){
 root.updateMatrixWorld(true);const palette=new Map();
 // Exterior foliage, cloud puffs and tiny flowers were each high-resolution
 // unit spheres. Reuse lighter smooth spheres; the interior keeps its detail.
 const lightSpheres=[new THREE.SphereGeometry(1,12,8),new THREE.SphereGeometry(1,12,6),new THREE.SphereGeometry(1,8,4)],replaced=new Set();let removedTriangles=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material?.map)return;
  const type=/^(Garden_tall_cypress_canopy|Floating_island_billowing_cloud)(?:_|$)/.test(mesh.name)?0:/^Dense_island_garden_shrub(?:_|$)/.test(mesh.name)?1:/^Island_small_scarlet_flower(?:_|$)/.test(mesh.name)?2:-1;
  if(type<0)return;mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
  if(!b.min.equals(new THREE.Vector3(-1,-1,-1))||!b.max.equals(new THREE.Vector3(1,1,1)))return;
  const replacement=lightSpheres[type];removedTriangles+=((mesh.geometry.index?.count||mesh.geometry.attributes.position.count)-(replacement.index?.count||replacement.attributes.position.count))/3;replaced.add(mesh.geometry);mesh.geometry=replacement;
 });
 const oldFloorGuides=[];root.traverse(mesh=>{if(mesh.isMesh&&/^Arena_cyan_radial_floor_path/.test(mesh.name))oldFloorGuides.push(mesh)});for(const mesh of oldFloorGuides){replaced.add(mesh.geometry);mesh.removeFromParent()}
 const retained=new Set();root.traverse(mesh=>{if(mesh.isMesh)retained.add(mesh.geometry)});for(const geometry of replaced)if(!retained.has(geometry))geometry.dispose();root.userData.arenaTrianglesRemoved=removedTriangles;
 root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material))return;
  const name=mesh.name.replace(/\s+/g,'_'),source=mesh.material;let color=COLORS[source.name];
  const seat=name.match(/^Individual_seat_red_cushion(?:_(\d+))?$/),row=name.match(/^Seating_row_cyan_neon(?:_(\d+))?$/);
  if(seat||row)color=RAINBOW[Number((seat||row)[1]||0)%6];
  if(/^(Royal_throne_red_curtain|Royal_loggia_rear_throne_drape|Royal_rear_red_pitched_roof|Royal_box_large_hanging_banner|Royal_loggia_central_shield)/.test(name)&&!/(gold|gilded)/.test(name))color='#c5263d';
  if(!color)return;
  const key=source.uuid+color;let material=palette.get(key);
  if(!material){material=source.clone();material.name=`Circus arena ${source.name} ${color}`;material.color.set(color);if(/neon/.test(source.name)){material.emissive.set(color);material.emissiveIntensity=.5}palette.set(key,material)}
  mesh.material=material;
 });
 const facade=finishArenaFacade(root);
 // Preserve the polished gold trophy and its existing Telegram destination.
 const picker=prepareTrophy(root,environment),hitMaterial=picker.targets[0].material,horn=createClownHorn(),noses=[],extraBoxes=[];
 const red=new THREE.MeshPhysicalMaterial({name:'Circus glossy red noses',color:0xf51d30,roughness:.19,metalness:.05,clearcoat:.85,clearcoatRoughness:.1,envMapIntensity:1.1});
 const existing=[];root.traverse(mesh=>{if(mesh.isMesh&&/(RedClownNose|red_clown_nose)/i.test(mesh.name))existing.push(mesh)});
 const register=(mesh,squeeze=false)=>{
  mesh.userData.honkNose=true;if(!mesh.userData.currentHonkHit)mesh.material=red;mesh.updateWorldMatrix(true,false);
  const hit=new THREE.Mesh(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),hitMaterial),index=noses.length;
  hit.userData={title:'Clown horn — HONK!',action:'honk',nose:index};hit.updateMatrixWorld();picker.targets.push(hit);noses.push({mesh,scale:mesh.scale.clone(),time:0,squeeze});
 };
 for(const mesh of existing)register(mesh);
 const sphere=new THREE.SphereGeometry(.30,24,16),plate=new THREE.CylinderGeometry(.315,.315,.055,32),ring=new THREE.TorusGeometry(.30,.025,8,40);
 const ivory=new THREE.MeshStandardMaterial({name:'Nose rosette ivory',color:0xfff0ca,roughness:.5}),gold=new THREE.MeshStandardMaterial({name:'Nose rosette gold',color:0xffc74f,metalness:.75,roughness:.25});
 const inverse=root.matrixWorld.clone().invert(),rootRotation=new THREE.Quaternion();root.getWorldQuaternion(rootRotation);rootRotation.invert();
 const attach=(geometry,material,position,axis,name)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.copy(position).applyMatrix4(inverse);if(axis)mesh.quaternion.copy(rootRotation).multiply(new THREE.Quaternion().setFromUnitVectors(axis.from,axis.to));root.add(mesh);return mesh;
 };
 // Cardinal wall sections are solid; the diagonal main entrance stays open.
 for(let i=0;i<4;i++){
  const angle=i*Math.PI/2,position=new THREE.Vector3(5.15*Math.cos(angle),1.16,4.12*Math.sin(angle)),inward=new THREE.Vector3(-Math.cos(angle),0,-Math.sin(angle));
  const base=position.clone().addScaledVector(inward,.025);
  attach(plate,ivory,base,{from:new THREE.Vector3(0,1,0),to:inward},`Circus_nose_rosette_${i}`);
  attach(ring,gold,base.clone().addScaledVector(inward,.035),{from:new THREE.Vector3(0,0,1),to:inward},`Circus_nose_gold_ring_${i}`);
  const ball=attach(sphere,red,base.clone().addScaledVector(inward,.17),null,`Circus_red_nose_button_${i}`);register(ball,true);extraBoxes.push(new THREE.Box3().setFromObject(ball));
 }
 const decor=decorateCircusArena(root);for(const nose of decor.noses)register(nose);extraBoxes.push(...decor.extraBoxes);
 const surfaces=prepareArenaSurfaces(root),arrival=createArenaClownArrival(root);
 root.updateMatrixWorld(true);
 return {
  picker,extraBoxes,noses,decor,facade,arrival,surfaces,
  canStand:(x,z,floor,eye)=>surfaces.canStand(x,z,floor,eye),
  get soundError(){return horn.lastError},
  honk(index){const nose=noses[index];if(!nose)return Promise.resolve(false);nose.time=.24;return horn.play()},
  update(dt,player){arrival.update(dt,player);for(const nose of noses){if(nose.time<=0)continue;nose.time=Math.max(0,nose.time-dt);if(nose.squeeze){const squash=1-.18*Math.sin(nose.time/.24*Math.PI);nose.mesh.scale.copy(nose.scale).multiplyScalar(squash)}}},
  stop(){horn.stop();for(const nose of noses){nose.time=0;nose.mesh.scale.copy(nose.scale)}},
  dispose(){surfaces.dispose();arrival.dispose();horn.dispose();picker.dispose();noses.length=0}
 };
}
