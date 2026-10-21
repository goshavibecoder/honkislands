import * as THREE from 'three';
import {batchRideMeshes} from './ride-performance.js?v=59';

// Small deterministic material maps: no extra downloads on phones.
function surface(kind){
 const size=256,data=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);let seed=5721;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296-.5),i=(y*size+x)*4;
  let rgb,r;
  if(kind==='wood'){const grain=Math.sin(y*.30+Math.sin(x*.025)*3+Math.sin(y*.052)*1.7)*.5+Math.sin(y*1.7+x*.016)*.13,t=grain*17+noise*9;rgb=[113+t,53+t*.55,24+t*.3];r=147+noise*20+grain*12}
  else if(kind==='fabric'){const weave=((x+y)%2?5:-5)+(x%4===0?3:0)+noise*5;rgb=[28+weave,30+weave,33+weave];r=225+noise*15}
  else{const scratch=(y%39===0&&x%23<16?18:0)+noise*12;rgb=[72+scratch,79+scratch,83+scratch];r=135+noise*32}
  for(let c=0;c<3;c++){data[i+c]=Math.max(0,Math.min(255,rgb[c]));rough[i+c]=r}data[i+3]=rough[i+3]=255;
 }
 const map=new THREE.DataTexture(data,size,size),roughnessMap=new THREE.DataTexture(rough,size,size);map.colorSpace=THREE.SRGBColorSpace;
 for(const t of [map,roughnessMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true}
 return {map,roughnessMap};
}
export function createMafiaFinishes(){
 const steel=surface('steel'),wood=surface('wood'),fabric=surface('fabric');
 return {
  steel:new THREE.MeshStandardMaterial({name:'AK blued steel / brushed wear',color:0xb7c0c5,metalness:.85,roughness:.8,...steel}),
  edge:new THREE.MeshStandardMaterial({name:'AK polished edges',color:0x697279,metalness:.85,roughness:.34}),
  wood:new THREE.MeshStandardMaterial({name:'AK oiled walnut grain',color:0xffffff,metalness:0,roughness:.85,...wood}),
  dark:new THREE.MeshStandardMaterial({name:'AK blackened recesses',color:0x14191d,metalness:.7,roughness:.58}),
  fabric:new THREE.MeshStandardMaterial({name:'Groyp woven felt fedora',color:0xc9c4be,metalness:0,roughness:1,...fabric}),
  skin:new THREE.MeshStandardMaterial({name:'Groyp closed fingers',color:0x69782a,metalness:0,roughness:.9})
 };
}
export function createKalashnikov(m){
 const rifle=new THREE.Group();rifle.name='AK-47 / walnut and blued steel';
 const add=(geometry,material,x,y,z,name)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.name=name;rifle.add(mesh);return mesh};
 const box=(w,h,d,mat,x,y,z,name)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,name);
 function tube(r,h,mat,x,y,z,name){const mesh=add(new THREE.CylinderGeometry(r,r,h,12),mat,x,y,z,name);mesh.rotation.x=Math.PI/2;return mesh}
 function profile(points,width,material,name){const shape=new THREE.Shape();shape.moveTo(points[0][1],points[0][0]);for(const [y,z] of points.slice(1))shape.lineTo(z,y);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:1,steps:1,curveSegments:10});geometry.translate(0,0,-width/2);geometry.rotateY(-Math.PI/2);return add(geometry,material,0,0,0,name)}
 box(.088,.105,.37,m.steel,0,0,.025,'AK stamped receiver');tube(.047,.35,m.steel,0,.045,.025,'AK curved dust cover');
 profile([[.035,-.19],[.02,-.54],[-.15,-.54],[-.105,-.33],[-.055,-.19]],.075,m.wood,'AK walnut shoulder stock');
 box(.082,.18,.018,m.dark,0,-.055,-.545,'AK stock butt plate');
 const grip=box(.065,.18,.085,m.wood,0,-.135,-.085,'AK walnut pistol grip');grip.rotation.x=.26;
 box(.08,.085,.24,m.wood,0,-.012,.30,'AK lower walnut handguard');tube(.031,.215,m.wood,0,.067,.30,'AK upper walnut handguard');
 for(const z of [.193,.414])box(.088,.10,.018,m.steel,0,-.008,z,'AK handguard retaining band');
 tube(.016,.35,m.steel,0,.014,.58,'AK long barrel');tube(.019,.31,m.steel,0,.081,.49,'AK gas tube');
 box(.05,.14,.034,m.steel,0,.052,.678,'AK front sight block');tube(.032,.047,m.dark,0,.014,.765,'AK muzzle brake');tube(.010,.008,m.dark,0,.014,.792,'AK dark muzzle bore');
 box(.013,.046,.016,m.edge,0,.13,.678,'AK front sight post');for(const x of [-.025,.025])box(.011,.055,.016,m.steel,x,.12,.678,'AK sight ears');
 box(.07,.036,.035,m.dark,0,.094,.163,'AK rear iron sight');
 // The characteristic banana magazine is a solid curved extrusion, not a box.
 const mag=new THREE.Shape();mag.moveTo(.055,-.065);mag.lineTo(.16,-.065);mag.quadraticCurveTo(.16,-.22,.28,-.38);mag.lineTo(.195,-.425);mag.quadraticCurveTo(.055,-.28,.055,-.065);
 const magGeo=new THREE.ExtrudeGeometry(mag,{depth:.066,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:1,steps:1,curveSegments:12});magGeo.translate(0,0,-.033);magGeo.rotateY(-Math.PI/2);add(magGeo,m.steel,0,0,0,'AK curved 30 round magazine');
 for(const x of [-.039,.039])for(const z of [.084,.114,.144]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,-.105,z),new THREE.Vector3(x,-.24,z+.018),new THREE.Vector3(x,-.355,z+.107));add(new THREE.TubeGeometry(curve,8,.0035,4,false),m.edge,0,0,0,'AK magazine reinforcing rib')}
 const trigger=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.053,-.02),new THREE.Vector3(0,-.077,-.03),new THREE.Vector3(0,-.095,-.008)]);add(new THREE.TubeGeometry(trigger,6,.005,5,false),m.dark,0,0,0,'AK trigger');
 const guard=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.049,-.065),new THREE.Vector3(0,-.12,-.047),new THREE.Vector3(0,-.122,.035),new THREE.Vector3(0,-.055,.055)]);add(new THREE.TubeGeometry(guard,10,.006,5,false),m.steel,0,0,0,'AK trigger guard');
 box(.016,.045,.11,m.dark,.049,.005,.018,'AK ejection port');box(.048,.014,.019,m.edge,.069,.024,.003,'AK charging handle');
 for(const x of [-.047,.047])for(const z of [-.13,.11]){const rivet=add(new THREE.SphereGeometry(.009,6,4),m.edge,x,-.018,z,'AK receiver rivet');rivet.scale.x=.35}
 rifle.userData.rightGrip=new THREE.Vector3(0,-.12,-.085);rifle.userData.leftGrip=new THREE.Vector3(0,-.045,.20);rifle.userData.muzzle=new THREE.Vector3(0,.014,.80);
 rifle.userData.parts=rifle.children.map(o=>o.name);batchRideMeshes(rifle);
 return rifle;
}
