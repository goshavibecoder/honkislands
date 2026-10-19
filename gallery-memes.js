import * as THREE from 'three';

// Nine unique channel images replace the nine repeated GLB paintings.
// One padded atlas preserves the frames, picture orientation and mobile draw budget.
export function applyGalleryMemes(root,manifest,texture){
 if(!manifest||!Array.isArray(manifest.pictures)||manifest.pictures.length!==9)throw Error('Incomplete gallery picture collection');
 const frames=new Map();root.traverse(o=>{if(!o.isMesh)return;const match=/^Original_HONK_framed_meme_(\d+)$/.exec(o.name.replace(/\s+/g,'_'));if(match)frames.set(Number(match[1]),o)});
 const seenSlots=new Set(),seenImages=new Set(),updates=[];
 for(const picture of manifest.pictures){
  const frame=frames.get(picture.slot),tile=picture.tile;
  if(!frame||!frame.geometry.attributes.uv||seenSlots.has(picture.slot)||seenImages.has(picture.sourceSha256)||!/^https:\/\/t\.me\/honklermemes\/\d+$/.test(picture.source))throw Error('Invalid or repeated gallery picture');
  if(!tile||tile.width<=0||tile.height<=0||tile.x<0||tile.y<0||tile.x+tile.width>manifest.width||tile.y+tile.height>manifest.height)throw Error('Invalid gallery atlas rectangle');
  seenSlots.add(picture.slot);seenImages.add(picture.sourceSha256);updates.push({frame,picture});
 }
 texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
 const material=updates[0].frame.material.clone();material.name='Unique HONK channel picture atlas';material.map=texture;material.emissiveMap=texture;
 const retired=new Set();
 for(const {frame,picture} of updates){
  const geometry=frame.geometry.clone(),uv=geometry.attributes.uv,tile=picture.tile;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(tile.x+uv.getX(i)*tile.width)/manifest.width,(tile.y+uv.getY(i)*tile.height)/manifest.height);
  uv.needsUpdate=true;retired.add(frame.geometry);frame.geometry=geometry;frame.material=material;frame.userData.memeSource=picture.source;frame.userData.memeImageHash=picture.sourceSha256;
 }
 const retained=new Set();root.traverse(o=>{if(o.geometry)retained.add(o.geometry)});for(const geometry of retired)if(!retained.has(geometry))geometry.dispose();
 return {count:updates.length,material,texture};
}

export async function prepareGalleryMemes(root){
 let texture;
 try{
  const response=await fetch('./assets/gallery-channel-memes-v93.json');if(!response.ok)throw Error(`Gallery collection ${response.status}`);
  const manifest=await response.json();texture=await new THREE.TextureLoader().loadAsync(`./assets/${manifest.atlas}`);return applyGalleryMemes(root,manifest,texture);
 }catch(error){texture?.dispose();console.warn('The gallery opened with its original pictures because the new collection was unavailable.',error);return null}
}
