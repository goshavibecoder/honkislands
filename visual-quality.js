import * as THREE from 'three';

// One inexpensive material pass, shared by the six islands. Data textures and
// the original palette are preserved; glass is readable from either side.
export function prepareVisualQuality(root,{maxAnisotropy=8}={}){
 const materials=new Set(),textures=new Set(),stats={materials:0,textures:0,glass:0,shadows:0};
 root.traverse(o=>{
  if(!o.isMesh||o.userData.arenaOriginalHonk)return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!m)continue;
   if(!materials.has(m)){
    materials.add(m);stats.materials++;
    for(const key of ['map','emissiveMap']){const t=m[key];if(!t||textures.has(t))continue;textures.add(t);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.max(1,Math.min(8,maxAnisotropy));stats.textures++}
    if(m.transparent&&/glass|crystal|liquid|medium/i.test(m.name)){m.side=THREE.DoubleSide;m.depthWrite=false;m.forceSinglePass=true;stats.glass++}
   }
   if(m.transparent&&/glass|crystal/i.test(m.name))o.renderOrder=2;
   else if(m.transparent&&/liquid|medium/i.test(m.name))o.renderOrder=1;
  }
 });
 const targets=[];root.traverse(o=>{if(o.isGroup&&/^(Antique_(worn_sofa|tufted_armchair|low_tea_table|full_bookcase|carved_wardrobe|glazed_clown_tea_cabinet)|Gallery_(wall_sofa|wall_flower_display|exhibit_plinth|reception_desk|display_cabinet))$/.test(o.name))targets.push(o)});
 if(!targets.length)return stats;
 // Soft floor contact adds depth without a shadow-map or postprocessing pass.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);
 gradient.addColorStop(0,'rgba(35,22,40,.32)');gradient.addColorStop(.42,'rgba(35,22,40,.20)');gradient.addColorStop(1,'rgba(35,22,40,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({name:'Soft furniture contact',map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false});
 const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
 root.updateMatrixWorld(true);
 for(const target of targets){
  const inverse=target.matrixWorld.clone().invert(),bounds=new THREE.Box3();
  target.traverse(o=>{if(!o.isMesh||o.userData.arenaOriginalHonk)return;o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)))});
  if(bounds.isEmpty())continue;const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),shadow=new THREE.Mesh(geometry,material);
  shadow.name='Furniture_soft_contact';shadow.position.set(center.x,.008,center.z);shadow.scale.set(size.x+.55,1,size.z+.55);target.add(shadow);stats.shadows++;
 }
 root.updateMatrixWorld(true);return stats;
}
