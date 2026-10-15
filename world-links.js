import * as THREE from 'three';
import {createPickSet} from './arcade-links.js?v=8';

// Destinations read from https://linktr.ee/honkhonkler on 2026-10-15.
export const NOTE_LINKS=Object.freeze({
 X:'https://x.com/HonklerX',
 TG:'https://t.me/HonkHonkler',
 GroypFi:'https://groypfi.io/swap/ton/EQAmWanX8ohlsG6qBpfL2ritCQ7tr7MlJpEK64Khm-O4742K?amount=100',
 NFT:'https://getgems.io/honklicense',
 IG:'https://www.instagram.com/honkhonkler',
 TikTok:'https://tiktok.com/@honk.honkler',
 Chart:'https://dexscreener.com/ton/EQAmWanX8ohlsG6qBpfL2ritCQ7tr7MlJpEK64Khm-O4742K',
 Lore:'https://tiny-duckanoo-d07164.netlify.app',
 ADL:'https://www.adl.org/resources/hate-symbol/honk-honkler',
 Meme:'https://knowyourmeme.com/sensitive/memes/clown-pepe-honk-honk-clown-world',
 Honkster:'https://t.me/Honkster_Bot',
 Goat:'https://t.me/goattrending',
 DeDust:'https://dedust.io/swap/GRAM/EQAmWanX8ohlsG6qBpfL2ritCQ7tr7MlJpEK64Khm-O4742K',
 Topblast:'https://topblast.lol/?token=EQAmWanX8ohlsG6qBpfL2ritCQ7tr7MlJpEK64Khm-O4742K',
 HonkHub:'https://honkler.org'
});
export function createWorldTargets(root,slug){
 root.updateMatrixWorld(true);
 const targets=[],material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 root.traverse(o=>{
  if(!o.isMesh)return;let title,url;
  if(slug==='goat-mountain'&&(/^Goat_/.test(o.name)||/^Rider_Museum_HONK_/.test(o.name)||/^(Purple_saddle|Saddle_side|Gold_saddle|Rider_(stirrup|closed))/.test(o.name))){title='Goat Trending';url=NOTE_LINKS.Goat}
  if(slug==='carnival'&&/^(Original_HONK_framed_meme_|Picture_frame_|Gallery_picture_label_|Upper_gallery_neon_picture|Upper_neon_picture_sun)/.test(o.name)){title='HONK Memes';url='https://t.me/honklermemes'}
  if(slug==='honkhub'){
   const note=o.name.match(/^Highlighted_(?:post-it|exact_text)_(.+)$/);
   if(note&&NOTE_LINKS[note[1]]){title=note[1];url=NOTE_LINKS[title]}
  }
  if(!url)return;
  const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
  for(const name of Object.keys(geometry.attributes))if(name!=='position')geometry.deleteAttribute(name);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=o.name;mesh.userData={title,url};mesh.updateMatrixWorld();targets.push(mesh);
 });
 return createPickSet(targets,material);
}
