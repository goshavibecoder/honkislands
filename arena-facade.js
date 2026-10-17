import * as THREE from 'three';

const BANNERS=/^(Outside_red_royal_banner|Balcony_red_crown_tapestry|HONK_tower_long_crown_tapestry|Royal_box_large_hanging_banner|Royal_loggia_central_shield)(?:_(\d+))?$/;
const GOLDWORK=/^(Outside_red_royal_banner|Balcony_red_crown_tapestry|HONK_tower_long_crown_tapestry|Royal_box_large_hanging_banner|Royal_loggia_central_shield)_(?:gold_hanging_rail|gilded_crown_emblem|stitched_gold_border)(?:_\d+)?$/;
const CLOTH=['#d12645','#d12645','#245fae','#d12645','#168578','#d12645'];
const STONE=[
 [/^True_open_facade_arch(?:_|$)/,'#c29d78'],
 [/^Unified_masonry_pier_and_mouldings(?:_|$)/,'#d2af88'],
 [/^Arch_carved_voussoir(?:_|$)/,'#eed2a8'],
 [/^Top_square_stone_parapet_post(?:_|$)/,'#d3b28f'],
 [/^Exterior_oval_carved_upper_cornice(?:_|$)/,'#f0dcbc'],
 [/^Colosseum_grounded_foundation(?:_|$)/,'#94715b'],
 [/^Colosseum_paved_base_ring(?:_|$)/,'#b38c6d']
];

// Finish the original exterior meshes. No extra shells, occluders, lights or
// screen-space passes: the openings and navigation stay exactly as modelled.
export function finishArenaFacade(root){
 root.updateMatrixWorld(true);
 const materials=new Map(),retired=new Set(),point=new THREE.Vector3(),normal=new THREE.Vector3(),radial=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
 const stats={stone:0,banners:0,emblems:0,flags:0,rim:0};
 function paint(source,color,{occlusion=false,metalness=0,roughness=.82,glow=0}={}){
  const key=[source.uuid,color,occlusion,metalness,roughness,glow].join(':');
  if(!materials.has(key)){
   const material=source.clone();material.name=`Arena facade ${color}${occlusion?' / shaded stone':''}`;
   material.color.set(color);material.roughness=roughness;material.metalness=metalness;material.vertexColors=occlusion;
   material.emissive.set(color);material.emissiveIntensity=glow;materials.set(key,material);
  }
  return materials.get(key);
 }
 function shadeStone(mesh){
  // Bake the deeper returns, undersides and moulding recesses in vertex colour.
  // Use world-oriented normals because the glTF's source axes are Z-up.
  const source=mesh.geometry,geometry=source.clone();mesh.geometry=geometry;retired.add(source);
  if(!geometry.attributes.normal)geometry.computeVertexNormals();
  const p=geometry.attributes.position,n=geometry.attributes.normal,colors=new Float32Array(p.count*3);
  normalMatrix.getNormalMatrix(mesh.matrixWorld);let outer=-Infinity,bottom=Infinity;
  for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);outer=Math.max(outer,Math.hypot(point.x,point.z/.8));bottom=Math.min(bottom,point.y)}
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);normal.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);
   radial.set(point.x,0,point.z/.64).normalize();
   const outward=normal.dot(radial),returns=THREE.MathUtils.smoothstep(outward,.05,.85),underside=Math.max(0,-normal.y);
   const recess=THREE.MathUtils.clamp((outer-Math.hypot(point.x,point.z/.8))/.24,0,1),contact=Math.exp(-(point.y-bottom)/.10);
   const shade=THREE.MathUtils.clamp((.73+.27*returns)*(1-.30*underside)*(1-.14*recess)*(1-.07*contact),.43,1);
   colors.fill(shade,i*3,i*3+3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));stats.stone++;
 }
 root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material))return;
  const name=mesh.name.replace(/\s+/g,'_'),source=mesh.material,stone=STONE.find(([pattern])=>pattern.test(name)),banner=name.match(BANNERS);
  if(stone){mesh.material=paint(source,stone[1],{occlusion:true});shadeStone(mesh);return}
  if(banner){
   const index=Number(banner[2]||0),color=/Royal_/.test(banner[1])?'#d12645':CLOTH[index%CLOTH.length];
   mesh.material=paint(source,color,{roughness:.86});stats.banners++;return;
  }
  if(GOLDWORK.test(name)){mesh.material=paint(source,'#f4c650',{metalness:.52,roughness:.36});stats.emblems++;return}
  if(/^Waving_embroidered_crown_flag(?:_|$)/.test(name)&&source.map){
   // Keep the embroidered crown texture; increase its chroma before lighting.
   const key=`flag:${source.uuid}`;
   if(!materials.has(key)){
    const material=source.clone();material.name='Arena saturated embroidered flag';material.roughness=.86;
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat clothLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));\ndiffuseColor.rgb = max(mix(vec3(clothLuma), diffuseColor.rgb, 1.22), vec3(0.0));')};
    material.customProgramCacheKey=()=> 'arena-cloth-chroma-v1';materials.set(key,material);
   }
   mesh.material=materials.get(key);stats.flags++;return;
  }
  if(/^Exterior_oval_gold_rim(?:_|$)/.test(name)){mesh.material=paint(source,'#f1cf83',{metalness:.42,roughness:.4});stats.rim++;return}
  if(/^Neon_pink_upper_architectural_cornice(?:_|$)/.test(name)){mesh.material=paint(source,'#946747',{metalness:.2,roughness:.58});return}
  if(/^Neon_cyan_facade_arch_outline(?:_|$)/.test(name))mesh.material=paint(source,'#b98a4e',{metalness:.25,roughness:.52,glow:.06});
 });
 const retained=new Set();root.traverse(o=>{if(o.isMesh)retained.add(o.geometry)});for(const geometry of retired)if(!retained.has(geometry))geometry.dispose();
 return stats;
}
