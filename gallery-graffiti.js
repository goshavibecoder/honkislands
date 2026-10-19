import * as THREE from 'three';

// One curved, outward-facing paint layer follows the actual gallery shell.
// Transparent edges expose the original plaster, without a billboard or frame.
export function applyGalleryGraffiti(root,texture,{aspect=1.5}={}){
 root.updateMatrixWorld(true);const wall=root.getObjectByName('Curved_white_gallery_wall');
 if(!wall?.isMesh)throw Error('Gallery exterior wall is unavailable');
 const p=wall.geometry.attributes.position,point=new THREE.Vector3(),bounds=new THREE.Box3().setFromObject(wall);let radius=0;
 for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(wall.matrixWorld);radius=Math.max(radius,Math.hypot(point.x,point.z))}
 aspect=THREE.MathUtils.clamp(aspect,1.2,2.5);const width=Math.min(radius*1.92,(bounds.max.y-bounds.min.y-1.8)*aspect),height=width/aspect,span=width/radius,start=.80,centerY=(bounds.min.y+bounds.max.y)/2;
 const vertices=[],uv=[],indices=[],columns=96,rows=8;
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
  const u=x/columns,v=y/rows,angle=start+span*u,r=radius+.018;
  vertices.push(Math.sin(angle)*r,centerY+(v-.5)*height,Math.cos(angle)*r);uv.push(u,v);
 }
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.push(a,b,c,b,d,c)}
 const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)).setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const material=new THREE.MeshStandardMaterial({name:'HONK exterior spray-painted mural',map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.12,roughness:.94,metalness:0,transparent:true,alphaTest:.025,depthWrite:false,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const group=new THREE.Group();group.name='Gallery_exterior_HONK_graffiti';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Gallery_huge_outside_HONK_mural';mesh.renderOrder=1;group.add(mesh);group.updateWorldMatrix(true,true);
 return {group,mesh,texture,radius,width,height,start,span};
}

export async function prepareGalleryGraffiti(root){
 let texture;
 try{
  texture=await new THREE.TextureLoader().loadAsync('./assets/gallery-honk-graffiti-v99.webp');
  const image=texture.image,aspect=(image.naturalWidth||image.width)/(image.naturalHeight||image.height);
  return applyGalleryGraffiti(root,texture,{aspect});
 }catch(error){texture?.dispose();console.warn('Exterior graffiti could not be loaded; the gallery is still available.',error);return null}
}
