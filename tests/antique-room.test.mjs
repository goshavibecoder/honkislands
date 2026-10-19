import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {BALLOON_ISLANDS,BalloonJourney} from '../balloon-route.js';

// Resolve the browser's existing import map for Node without npm packages.
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){
 if(modules.has(url.href))return modules.get(url.href);
 const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,prefix,quote,path)=>`${prefix}'${path==='three'?threeURL:moduleURL(new URL(path,url))}'`);
 const result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result;
}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {prepareAntiqueRoom}=await import(moduleURL(new URL('../antique-room.js',import.meta.url)));
const {createWorldTargets}=await import(moduleURL(new URL('../world-links.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const bytes=gunzipSync(readFileSync(new URL('../models/honkhub.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);const preserved=new Map();gltf.scene.traverse(o=>{if(o.isMesh&&/^(Highlighted_|Poster_artwork_|Clown_|Jester_|Left_desktop_|Rear_desktop_)/.test(o.name))preserved.set(o.uuid,{name:o.name,geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone()})});
const room=prepareAntiqueRoom(gltf.scene,{familyTextures:[new THREE.Texture(),new THREE.Texture(),new THREE.Texture()]}),manifest=JSON.parse(readFileSync(new URL('../models/honkhub.json',import.meta.url),'utf8')),boxes=[...manifest.collisionBoxes.map(([lo,hi])=>new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi))),...room.extraBoxes];
function canStand(x,z){return x>=-2.8&&x<=6&&z>=-1.6&&z<=6&&!boxes.some(b=>1.56>b.min.y&&.248<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17)}
const ray=new THREE.Raycaster();

test('the larger room is closed by solid walls, floor and a complete ceiling',()=>{
 gltf.scene.updateMatrixWorld(true);assert.ok((8.8*7.6)/(6.35*4.8)>2);
 for(const [x,z] of [[1.25,2],[4.4,.2],[4.2,4.2],[-2.4,4.0],[.8,5.7]]){
  ray.set(new THREE.Vector3(x,3.4,z),new THREE.Vector3(0,1,0));ray.far=5;const hit=ray.intersectObject(gltf.scene,true)[0];assert.ok(hit,`no ceiling above ${x},${z}`);assert.ok(hit.point.y>3.45&&hit.point.y<3.95);
  for(const direction of [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,-1,0)]){ray.set(new THREE.Vector3(x,1.65,z),direction);ray.far=20;assert.ok(ray.intersectObject(gltf.scene,true).length,'room shell has an open side')}
 }
 for(const [x,z] of [[6,2],[-2.8,4],[2,6],[4,-1.6]])assert.equal(canStand(x,z),false,'solid wall allows the walker through');
});

test('new floor navigation and furniture leave connected approaches to the original workshop and new displays',()=>{
 const step=.14,start=[Math.round(1.25/step),Math.round(2/step)],queue=[start],seen=new Set([start.join(',')]);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,key=`${a},${b}`;if(!seen.has(key)&&canStand(a*step,b*step)){seen.add(key);queue.push([a,b])}}}
 assert.ok(seen.size>1600);
 for(const [x,z] of [[1.25,2],[4.6,-.35],[4.5,2.8],[-1.2,4.35],[3.7,4.6],[-.9,2.1],[1.4,.2]]){let reachable=false;for(const [a,b] of queue)if(Math.hypot(a*step-x,b*step-z)<.25){reachable=true;break}assert.ok(reachable,`unreachable furniture approach ${x},${z}`)}
 for(const [x,z] of [[4.1,.2],[4.2,3.3],[-1.0,3.0],[.6,5.4]]){ray.set(new THREE.Vector3(x,1,z),new THREE.Vector3(0,-1,0));ray.far=2;assert.ok(Math.abs(ray.intersectObject(room.nav)[0].point.y-.028)<1e-6)}
 for(const item of room.furniture){assert.ok(item.bounds.min.x>-2.8&&item.bounds.max.x<6);assert.ok(item.bounds.min.z>-1.6&&item.bounds.max.z<6);assert.ok(item.bounds.max.y<3.3)}
});

test('original artwork and notes keep their images while desks and clowns retain their placement',()=>{
 let count=0;gltf.scene.traverse(o=>{const old=preserved.get(o.uuid);if(!old)return;count++;assert.equal(o.geometry,old.geometry);assert.equal(o.material,old.material);if(!/^(Poster_artwork_|Highlighted_)/.test(o.name))assert.ok(o.matrixWorld.equals(old.matrix))});assert.equal(count,preserved.size);
 const targets=createWorldTargets(gltf.scene,'honkhub');assert.ok(targets.targets.length>=30);assert.ok(targets.targets.some(o=>o.userData.title==='Lore'));targets.dispose();
 for(const name of ['Antique_worn_sofa','Antique_full_bookcase','Antique_leather_travelling_trunk','Antique_grandfather_clock','Antique_gramophone_cabinet'])assert.ok(room.group.getObjectByName(name));
});

test('relocated sticky notes stay readable, clear the picture frames, and keep paired link targets',()=>{
 const linked=room.notes.filter(n=>!n.name.startsWith('sketch_'));assert.equal(linked.length,15);
 const art=[...room.wallArt.pictures,...room.wallArt.posters].map(p=>new THREE.Box3().setFromObject(p.group));
 for(const note of room.notes){
  const paper=new THREE.Box3().setFromObject(note.paper),image=new THREE.Box3().setFromObject(note.image),p=paper.getCenter(new THREE.Vector3()),q=image.getCenter(new THREE.Vector3());
  assert.ok(p.distanceTo(q)<.005,'text detached from its paper');
  const localNormal=new THREE.Vector3().fromBufferAttribute(note.image.geometry.attributes.normal,0).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(note.image.matrixWorld));
  if(p.z< -1.5)assert.ok(localNormal.z>.99);else assert.ok(localNormal.x>.99);
  assert.ok(art.every(a=>!a.intersectsBox(paper)),`note ${note.name} overlaps a picture frame`);
 }
 for(let i=0;i<linked.length;i++)for(let j=i+1;j<linked.length;j++)assert.ok(!new THREE.Box3().setFromObject(linked[i].paper).intersectsBox(new THREE.Box3().setFromObject(linked[j].paper)),'linked notes overlap');
 const targets=createWorldTargets(gltf.scene,'honkhub');assert.equal(targets.targets.length,30);const hub=targets.targets.filter(t=>t.userData.title==='HonkHub');assert.equal(hub.length,2);assert.ok(hub.every(t=>t.userData.url==='https://honkhub.io/'));
 for(const note of linked){const target=targets.targets.find(t=>t.name===note.paper.name);assert.ok(target);const a=new THREE.Box3().setFromObject(target),b=new THREE.Box3().setFromObject(note.paper);assert.ok(a.min.distanceTo(b.min)<1e-6&&a.max.distanceTo(b.max)<1e-6);assert.ok(target.userData.url.startsWith('https://'))}targets.dispose();
});

test('a closed glass cabinet holds hollow porcelain cups, a teapot and open crystal goblets',()=>{
 const counts={};room.teaCabinet.traverse(o=>{counts[o.name]=(counts[o.name]||0)+1;if(o.name.includes('glass_door')){assert.ok(o.material.transparent&&o.material.opacity<.2);assert.equal(o.material.depthWrite,false)}});
 assert.equal(counts.Antique_cabinet_glass_door,2);assert.equal(counts.Antique_hollow_teacup,4);assert.equal(counts.Antique_open_teapot_spout,1);assert.equal(counts.Antique_open_crystal_bowl,4);
 assert.ok(room.furniture.some(f=>f.name===room.teaCabinet.name));
});

test('indoor lighting is warm and restores the shared scene when leaving the room',()=>{
 const scene=new THREE.Scene(),sun=new THREE.DirectionalLight(0xfff1d2,2.2),hemi=new THREE.HemisphereLight(0xe7f5ff,0x80717f,1.7);scene.environmentIntensity=.55;scene.add(sun,hemi);const color=sun.color.clone();room.mountLights(scene);assert.equal(scene.children.filter(o=>o.isPointLight).length,3);assert.ok(sun.intensity<1);assert.equal(scene.environmentIntensity,.35);room.updateLighting(new THREE.Vector3(1.65,7.3,20.2));assert.ok(sun.intensity>2.2);assert.equal(scene.environmentIntensity,.72);assert.ok(sun.color.equals(color));room.updateLighting(new THREE.Vector3(1.65,1.7,6.2));const threshold=sun.intensity;assert.ok(threshold>1&&threshold<2.2);room.updateLighting(new THREE.Vector3(1.65,1.7,2));assert.ok(sun.intensity<1);assert.equal(scene.environmentIntensity,.35);room.dispose();assert.equal(scene.children.filter(o=>o.isPointLight).length,0);assert.equal(sun.intensity,2.2);assert.ok(sun.color.equals(color));assert.equal(scene.environmentIntensity,.55);
});

test('armchair and sofa back upholstery stays clear of the rear arm faces',()=>{
 for(const [name,width] of [['Antique_tufted_armchair',1.13],['Antique_worn_sofa',2.60]]){
  const seat=room.group.getObjectByName(name),back=seat.getObjectByName('Antique_seat_back_cushion'),arms=seat.children.filter(o=>o.name==='Antique_seat_arm_cushion');
  assert.ok(back);assert.equal(arms.length,2);seat.updateWorldMatrix(true,true);
  for(const sign of [-1,1]){
   const origin=seat.localToWorld(new THREE.Vector3(sign*(width/2-.15),.67,1)),direction=new THREE.Vector3(0,0,-1).transformDirection(seat.matrixWorld),ray=new THREE.Raycaster(origin,direction),backHit=ray.intersectObject(back)[0],armHit=ray.intersectObjects(arms)[0];
   assert.ok(backHit&&armHit,'sample must cover the overlapping upholstery');assert.ok(armHit.distance-backHit.distance>.015,'back and arm must not share a depth plane');
  }
 }
});

test('the real viewer batches the expanded workshop without losing furniture geometry or texture coordinates',async()=>{
 const {mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url)));
 const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start),viewer={root:gltf.scene.clone(true),config:{},renderer:{capabilities:{getMaxAnisotropy:()=>4}}};
 let before=0;viewer.root.traverse(o=>{if(o.isMesh)before+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3});
 new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)).call(viewer,THREE,mergeGeometries,{animations:[]},'honkhub');
 let after=0,batches=0;viewer.staticGroup.traverse(o=>{if(!o.isMesh)return;batches++;after+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.equal(o.geometry.attributes.uv.count,o.geometry.attributes.position.count);o.geometry.dispose()});let moving=0;viewer.root.traverse(o=>{if(o.isMesh&&o.userData.wardrobeDynamic)moving+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3});assert.equal(after+moving,before);
 assert.ok(batches<=105,`workshop static batches: ${batches}`);
});

test('three cartoon family pictures and five original posters are framed around all four walls',()=>{
 assert.equal(room.wallArt.pictures.length,3);assert.equal(room.wallArt.posters.length,5);assert.equal(new Set(room.wallArt.posters.map(p=>p.wall)).size,4);
 const normal=new THREE.Vector3();for(const p of [...room.wallArt.pictures,...room.wallArt.posters]){
  const image=p.image||p.poster;image.updateWorldMatrix(true,false);const size=new THREE.Box3().setFromObject(image).getSize(new THREE.Vector3());assert.ok(Math.abs(size.y-p.h)<.001);normal.fromBufferAttribute(image.geometry.attributes.normal,0).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(image.matrixWorld));
  if(p.x< -2)assert.ok(normal.x>.99);else if(p.x>5)assert.ok(normal.x<-.99);else if(p.z>5)assert.ok(normal.z<-.99);else assert.ok(normal.z>.99);
  const center=new THREE.Box3().setFromObject(image).getCenter(new THREE.Vector3());assert.ok(center.y-p.h/2>1.5);assert.ok(center.y+p.h/2<3.49);
 }
 for(const picture of room.wallArt.pictures){assert.ok(picture.image.material.map);assert.ok(picture.image.material.emissiveIntensity<=.1)}
});

test('the generated family textures are bundled as small browser-readable WebP assets',()=>{
 for(const name of ['honk-grandma-v51.webp','honk-grandpa-v51.webp','honk-family-v51.webp']){const data=readFileSync(new URL('../assets/'+name,import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length>30000&&data.length<300000)}
});


test('the map castle has stacked storeys, eight domed towers and four mobile material batches',()=>{
 assert.equal(room.castle.towers.length,8);assert.equal(room.castle.tiers.length,3);for(const name of ['Castle_information_emblem','Castle_central_library_spire','Castle_gold_crown_emblem','Castle_open_book_emblem'])assert.ok(room.castle.group.getObjectByName(name));
 let triangles=0;const materials=new Set(),inside=new THREE.Box3(new THREE.Vector3(-2.79,.03,-1.59),new THREE.Vector3(5.99,3.74,5.99));
 room.castle.group.traverse(o=>{if(!o.isMesh)return;materials.add(o.material);triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.equal(o.geometry.attributes.color.count,o.geometry.attributes.position.count);
  const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert.ok(!inside.containsPoint(v),`castle detail enters the antique interior: ${o.name}`)}
 });
 assert.equal(materials.size,4);assert.ok(triangles<100000,`castle triangle budget: ${triangles}`);assert.ok(room.bounds.max.y>19);assert.ok(room.bounds.min.x< -4.5);assert.ok(room.bounds.max.x>7.5);
});

test('the complete balloon entrance stays open at walking height and has solid stone sides',()=>{
 const ray=new THREE.Raycaster();for(const x of [1.30,1.65,1.98])for(const y of [.32,1.10,1.75,2.35]){ray.set(new THREE.Vector3(x,y,7.8),new THREE.Vector3(0,0,-1));ray.far=2;assert.equal(ray.intersectObject(room.castle.group,true).length,0,`castle blocks the doorway at ${x},${y}`)}
 for(const x of [.25,3.05]){ray.set(new THREE.Vector3(x,1.2,7.8),new THREE.Vector3(0,0,-1));ray.far=2;assert.ok(ray.intersectObject(room.castle.group,true).length>0)}
});


test('the full map castle is framed during balloon arrival on a tablet viewport',()=>{
 const island=BALLOON_ISLANDS.find(i=>i.slug==='honkhub'),home=new THREE.Vector3(...island.home),outward=home.clone().sub(new THREE.Vector3(...island.anchor)).setY(0).normalize(),journey=new BalloonJourney(home,outward),p=journey.raised;
 const camera=new THREE.PerspectiveCamera(66,4/3,.035,1100);camera.position.set(p.x,p.y+1.78,p.z);camera.lookAt(p.x-outward.x*8,p.y+1.7,p.z-outward.z*8);camera.updateMatrixWorld();
 room.castle.group.traverse(o=>{if(!o.isMesh)return;const positions=o.geometry.attributes.position;for(let i=0;i<positions.count;i++){const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z> -1&&p.z<1,`arrival clips ${o.name}`)}});
});


test('the curved manuscript pages face the balloon and remain unobstructed above the entrance',()=>{
 const book=room.castle.group.getObjectByName('Castle_open_book_emblem'),pages=[];book.traverse(o=>{if(o.name==='Castle_curved_manuscript_page')pages.push(o)});assert.equal(pages.length,2);
 const bounds=new THREE.Box3().setFromObject(book),size=bounds.getSize(new THREE.Vector3());assert.ok(size.x>4.6&&size.y>1.75);assert.ok(bounds.min.y>3.7);
 const camera=new THREE.PerspectiveCamera(66,4/3,.035,1100);camera.position.set(1.65,7.345,20.2);camera.lookAt(1.65,7.265,12.2);camera.updateMatrixWorld();
 for(const page of pages){const p=page.geometry.attributes.position,center=[0,1,2].reduce((v,i)=>v.add(new THREE.Vector3().fromBufferAttribute(p,page.geometry.index.getX((4*18+8)*6+i))),new THREE.Vector3()).multiplyScalar(1/3).applyMatrix4(page.matrixWorld),ray=new THREE.Raycaster(camera.position,center.clone().sub(camera.position).normalize(),0,30),hit=ray.intersectObject(room.castle.group,true)[0];assert.equal(hit?.object.uuid,page.uuid,`a facade detail hides the book page: ${hit?.object.name}`);const b=new THREE.Box3().setFromObject(page),corners=[new THREE.Vector3(b.min.x,b.min.y,b.max.z),new THREE.Vector3(b.max.x,b.max.y,b.max.z)].map(p=>p.project(camera));assert.ok(Math.abs(corners[0].x-corners[1].x)>.12&&Math.abs(corners[0].y-corners[1].y)>.12,'manuscript is too small to read during arrival')}
});

test('the book has an opaque decorated rear, a closed spine, and outward-facing top and bottom edges',()=>{
 const book=room.castle.group.getObjectByName('Castle_open_book_emblem'),pages=[];book.traverse(o=>{if(o.name==='Castle_curved_manuscript_page')pages.push(o)});
 function hitFrom(a,b){const source=book.localToWorld(new THREE.Vector3(...a)),target=book.localToWorld(new THREE.Vector3(...b));return new THREE.Raycaster(source,target.sub(source).normalize(),0,6).intersectObject(book,true)[0]?.object.name}
 for(const page of pages){
  const sign=page.geometry.attributes.position.getX(0)>0?1:-1,p=page.geometry.attributes.position;
  for(const u of [2,8,14])for(const v of [1,4,7]){const center=[0,1,2].reduce((sum,i)=>sum.add(new THREE.Vector3().fromBufferAttribute(p,page.geometry.index.getX((v*18+u)*6+i))),new THREE.Vector3()).multiplyScalar(1/3);assert.match(hitFrom([center.x,center.y,-1.5],[center.x,center.y,1.5])||'',/^Castle_book_(solid_back_cover|back_cover_)/,'the back of a page is open')}
  const x=sign*1.20,z=.335;for(const y of [-2,2])assert.equal(hitFrom([x,y,z],[x,0,z]),'Castle_thick_book_page_edges','a top or bottom edge faces inward');
  assert.equal(hitFrom([sign*3,0,.17],[0,0,.17]),'Castle_thick_book_page_edges','the outer fore-edge is open');
 }
 assert.equal(hitFrom([0,0,-1.5],[0,0,1.5]),'Castle_book_closed_blue_spine');
});
