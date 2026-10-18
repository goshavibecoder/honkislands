import * as THREE from 'three';

export const HONK_FAMILY_PICTURES=[
 {id:'grandma',title:'Бабушка HONK',file:'honk-grandma-v51.webp',w:.80,h:1.00,x:-2.775,y:2.20,z:3.50,angle:Math.PI/2},
 {id:'grandpa',title:'Дедушка HONK',file:'honk-grandpa-v51.webp',w:.80,h:1.00,x:-2.775,y:2.20,z:4.85,angle:Math.PI/2},
 {id:'family',title:'Семья HONK',file:'honk-family-v51.webp',w:1.60,h:1.20,x:-1.05,y:2.20,z:5.975,angle:Math.PI}
];
export async function loadHonkFamilyPictures(){
 const loader=new THREE.TextureLoader();return Promise.all(HONK_FAMILY_PICTURES.map(async picture=>{const texture=await loader.loadAsync(`./assets/${picture.file}`);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture}));
}

export function hangFamilyPictures(parent,materials,posters,familyTextures=[]){
 const pictures=[],posterPlacements=[],beadGeometry=new THREE.SphereGeometry(.021,10,6);
 function box(w,h,d,material,group,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);group.add(o);return o}
 function frame(name,w,h,x,y,z,angle){
  const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);
  box(w+.19,h+.19,.065,materials.dark,g,0,0,0);box(w+.055,h+.055,.018,materials.ivory,g,0,0,.045);
  for(const sign of [-1,1]){box(.076,h+.19,.045,materials.wood,g,sign*(w/2+.055),0,.05);box(w+.19,.076,.045,materials.wood,g,0,sign*(h/2+.055),.05);box(.012,h+.035,.010,materials.brass,g,sign*(w/2+.014),0,.066);box(w+.035,.012,.010,materials.brass,g,0,sign*(h/2+.014),.066)}
  for(const a of [-1,1])for(const b of [-1,1]){const bead=new THREE.Mesh(beadGeometry,materials.brass);bead.position.set(a*(w/2+.055),b*(h/2+.055),.083);g.add(bead)}
  return g;
 }
 for(let i=0;i<HONK_FAMILY_PICTURES.length;i++){
  const picture=HONK_FAMILY_PICTURES[i],texture=familyTextures[i];if(!texture)continue;
  const g=frame(`Antique_family_portrait_${picture.id}`,picture.w,picture.h,picture.x,picture.y,picture.z,picture.angle);
  const material=new THREE.MeshStandardMaterial({name:picture.title,map:texture,roughness:.95,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.10});
  const image=new THREE.Mesh(new THREE.PlaneGeometry(picture.w,picture.h),material);image.name='Honk_family_picture';image.position.z=.075;g.add(image);pictures.push({...picture,group:g,image});
 }
 const layout=[
  {match:'Freak_Show',x:.45,y:2.20,z:5.975,angle:Math.PI,scale:1,wall:'front'},
  {match:'Stupendous_Strongman',x:3.25,y:2.65,z:5.975,angle:Math.PI,scale:1,wall:'front'},
  {match:'Super_Circus',x:5.975,y:2.18,z:4.40,angle:-Math.PI/2,scale:1,wall:'right'},
  {match:'Mustache_of_Might',x:2.75,y:2.65,z:-1.575,angle:0,scale:1,wall:'rear'},
  {match:'Clown_Carnival',x:-2.775,y:2.70,z:.90,angle:Math.PI/2,scale:.8,wall:'left'}
 ];
 for(const placement of layout){
  const poster=posters.find(o=>o.name.includes(placement.match));if(!poster)continue;
  poster.updateWorldMatrix(true,false);const originalMatrix=poster.matrixWorld.clone(),bounds=new THREE.Box3().setFromObject(poster),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),normal=new THREE.Vector3().fromBufferAttribute(poster.geometry.attributes.normal,0).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(originalMatrix));
  const rotation=new THREE.Quaternion().setFromUnitVectors(normal,new THREE.Vector3(0,0,1)),w=Math.hypot(size.x,size.z)*placement.scale,h=size.y*placement.scale;
  const g=frame(`Antique_rehung_${placement.match}`,w,h,placement.x,placement.y,placement.z,placement.angle);
  const local=new THREE.Matrix4().makeTranslation(0,0,.075).multiply(new THREE.Matrix4().makeScale(placement.scale,placement.scale,placement.scale)).multiply(new THREE.Matrix4().makeRotationFromQuaternion(rotation)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z)).multiply(originalMatrix);
  g.add(poster);poster.matrix.copy(local);poster.matrixAutoUpdate=false;posterPlacements.push({...placement,poster,group:g,w,h});
 }
 parent.updateWorldMatrix(true,true);return {pictures,posters:posterPlacements};
}
