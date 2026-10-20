import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {fetchAssetBytes,decodeGzip} from './asset-loader.js?v=116';
import {batchRideMeshes} from './ride-performance.js?v=59';

export async function loadCastleGuest(){
 const bytes=await fetchAssetBytes('./assets/castle-guest-v117.bin'),buffer=await decodeGzip(bytes);
 return (await new GLTFLoader().parseAsync(buffer,'')).scene;
}

// The uploaded face and hair use a shared skeleton. An opaque, knee-length
// costume replaces the source torso; sleeves and hands share arm joints.
export function createCastleGuest(parent,source){
 const group=new THREE.Group();group.name='Rias_castle_guest';group.visible=false;parent.add(group);group.add(source);source.updateMatrixWorld(true);
 const bones={};source.traverse(o=>{if(o.isBone)bones[o.name]=o;if(o.isMesh){o.frustumCulled=false;if(o.material.map){o.material.emissive.set(0xffffff);o.material.emissiveMap=o.material.map;o.material.emissiveIntensity=.12}}});
 for(const name of ['head','chest','neck','hips','upperArmL','forearmL','handL','upperArmR','forearmR','handR','thighL','shinL','footL','thighR','shinR','footR'])if(!bones[name])throw Error('Castle guest joint missing: '+name);
 const mat=(name,color)=>new THREE.MeshStandardMaterial({name,color,roughness:.82,metalness:0});
 const m={ivory:mat('Guest ivory blouse',0xfff6e5),navy:mat('Guest tailored navy waistcoat',0x20283e),wine:mat('Guest pleated wine skirt',0x852c43),gold:mat('Guest brass buttons',0xdab76a),shoe:mat('Guest closed shoes',0x272638),skin:mat('Guest neck',0xffd3c9)};
 const origin=new THREE.Vector3(),bind={};for(const [name,bone] of Object.entries(bones))bind[name]=bone.getWorldPosition(new THREE.Vector3());
 function add(geometry,material,name,bone='chest',position=null){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;bones[bone].add(mesh);if(position)mesh.position.copy(new THREE.Vector3(...position).sub(bind[bone]));return mesh}
 function form(rows,material,name,bone='chest',pleats=0){
  const positions=[],segments=48,rings=rows.map(([y,rx,rz])=>Array.from({length:segments},(_,j)=>{const a=j/segments*Math.PI*2,fold=1+pleats*Math.cos(a*18);return new THREE.Vector3(Math.sin(a)*rx*fold,y,Math.cos(a)*rz*fold).sub(bind[bone])}));
  const ascending=rows.at(-1)[0]>rows[0][0],triangle=(a,b,c)=>positions.push(...a.toArray(),...(ascending?c:b).toArray(),...(ascending?b:c).toArray());
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){const k=(j+1)%segments;triangle(rings[i][j],rings[i+1][j],rings[i][k]);triangle(rings[i][k],rings[i+1][j],rings[i+1][k])}
  for(const [ring,reverse] of [[rings[0],false],[rings.at(-1),true]]){const center=new THREE.Vector3(0,rows[reverse?rows.length-1:0][0],0).sub(bind[bone]);for(let j=0;j<segments;j++){const k=(j+1)%segments;triangle(center,reverse?ring[k]:ring[j],reverse?ring[j]:ring[k])}}
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return add(geometry,material,name,bone);
 }
 form([[.94,.155,.108],[1.08,.18,.116],[1.26,.185,.126],[1.35,.165,.105],[1.405,.075,.068]],m.ivory,'Rias_closed_blouse');
 form([[.936,.17,.123],[1.08,.195,.131],[1.26,.20,.14],[1.345,.177,.124]],m.navy,'Rias_tailored_waistcoat');
 form([[.935,.162,.116],[.88,.20,.14],[.70,.252,.17],[.52,.286,.19]],m.wine,'Rias_knee_length_pleated_skirt','hips',.035);
 form([[1.398,.073,.068],[1.451,.061,.059]],m.ivory,'Rias_high_collar','neck');
 add(new THREE.CylinderGeometry(.058,.062,.07,20),m.skin,'Rias_neck','neck',[0,1.47,0]);
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  add(new THREE.SphereGeometry(.067,16,12),m.ivory,'Rias_rounded_shoulder','upperArm'+side);
  for(const [bone,length,r0,r1] of [['upperArm'+side,.215,.066,.054],['forearm'+side,.185,.054,.041]]){const mesh=add(new THREE.CylinderGeometry(r1,r0,length,16),m.ivory,'Rias_long_sleeve',bone);mesh.rotation.z=-sign*Math.PI/2;mesh.position.set(sign*length/2,0,0)}
  const elbow=add(new THREE.SphereGeometry(.054,14,10),m.ivory,'Rias_sleeve_elbow','forearm'+side);
  const cuff=add(new THREE.CylinderGeometry(.043,.043,.04,16),m.ivory,'Rias_closed_cuff','hand'+side);cuff.rotation.z=Math.PI/2;
  const shoe=add(new THREE.SphereGeometry(1,16,10),m.shoe,'Rias_closed_shoe','foot'+side);shoe.position.set(0,-.043,.07);shoe.scale.set(.057,.040,.14);
  const bow=add(new THREE.SphereGeometry(1,12,8),m.wine,'Rias_ribbon','neck',[sign*.034,1.397,.081]);bow.scale.set(.038,.023,.012);bow.rotation.z=sign*.22;
 }
 for(const y of [1.02,1.11,1.20,1.28])add(new THREE.SphereGeometry(.009,8,6),m.gold,'Rias_waistcoat_button','chest',[0,y,y<1.24?.124:.134]);
 add(new THREE.SphereGeometry(.014,10,8),m.gold,'Rias_ribbon_center','neck',[0,1.397,.089]);
 for(const bone of Object.values(bones))batchRideMeshes(bone);
 const mouth=new THREE.Object3D();mouth.name='Rias_kiss_anchor';mouth.position.set(-.004,.014,.147);bones.head.add(mouth);
 group.traverse(o=>o.userData.islandRide=true);
 function pose({walk=0,clock=0,lean=0,wave=0}={}){
  for(const bone of Object.values(bones))bone.rotation.set(0,0,0);
  const stride=Math.sin(clock*7.4)*walk,step=Math.max(0,Math.sin(clock*7.4));
  bones.hips.position.y=.95+Math.abs(stride)*.012;
  bones.thighL.rotation.x=stride*.28;bones.thighR.rotation.x=-stride*.28;bones.shinL.rotation.x=Math.max(0,-stride)*.30;bones.shinR.rotation.x=Math.max(0,stride)*.30;
  bones.upperArmL.rotation.set(-stride*.19-lean*.50,0,-1.38+lean*.40);bones.upperArmR.rotation.set(stride*.19-lean*.50,0,1.38-lean*.40-wave*.72);
  bones.forearmL.rotation.set(-lean*.25,0,-.08);bones.forearmR.rotation.set(-lean*.25,0,.08+wave*(.18+Math.sin(clock*10)*.16));
  bones.chest.rotation.x=-lean*.025;bones.head.rotation.set(.035*lean,.02*Math.sin(clock*.6)*(1-lean),.11*lean);
  group.updateMatrixWorld(true);source.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
 }
 pose();
 return {group,bones,mouth,pose,mouthPosition(target=new THREE.Vector3()){return mouth.getWorldPosition(target)},
  dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();group.removeFromParent()}
 };
}
