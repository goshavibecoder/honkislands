import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';

// Resolve the browser's existing import map for Node without npm packages.
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){
 if(modules.has(url.href))return modules.get(url.href);
 const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,prefix,quote,path)=>`${prefix}'${path==='three'?threeURL:moduleURL(new URL(path,url))}'`);
 const result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result;
}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {createArenaCrowd,loadArenaCrowd,prepareArenaAudience}=await import(moduleURL(new URL('../arena-crowd.js',import.meta.url)));
const {writeFileSync}=await import('node:fs');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const bytes=gunzipSync(readFileSync(new URL('../models/arena.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');

const manifest=JSON.parse(readFileSync(new URL('../models/arena-crowd-v84.json',import.meta.url))),data=JSON.parse(gunzipSync(Buffer.from(manifest.parts.map(p=>JSON.parse(readFileSync(new URL('../models/'+p,import.meta.url)))).join(''),'base64')));
const honkManifest=JSON.parse(readFileSync(new URL('../models/arena-honk-seated-v88.json',import.meta.url)));data.honk=JSON.parse(gunzipSync(Buffer.from(honkManifest.parts.map(p=>JSON.parse(readFileSync(new URL('../models/'+p,import.meta.url)))).join(''),'base64')));const crowd=createArenaCrowd(gltf.scene,data);
test('the real colosseum seats are filled with all five original characters without covering the arena or aisles',()=>{
 assert.equal(crowd.count,154);assert.equal(crowd.meshes.length,10);assert.ok(crowd.triangles<1400000);assert.ok(manifest.bytes<3000000);
 for(const name of ['groyper','fast','teledog','honk','zoich'])assert.ok(crowd.placements.filter(p=>p.name===name).length>=25);
 for(const p of crowd.placements){assert.ok(Math.hypot(p.position.x,p.position.z/.8)>5.3);assert.ok(p.position.y>2.8);const direction=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw);const back=gltf.scene.getObjectByName(p.seat.replace('red_cushion','low_carved_back')),center=new THREE.Box3().setFromObject(back).getCenter(new THREE.Vector3()),expected=p.position.clone().sub(center);expected.y=0;assert.ok(direction.dot(expected.normalize())>.998)}
 for(const b of crowd.extraBoxes)assert.equal(b.containsPoint(new THREE.Vector3(0,1,2.5)),false);
});
test('instanced geometry is finite, bounded, coloured, and retained by the production batching pass',()=>{
 assert.match(readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),/o.userData.arenaCrowd\|\|/);
 for(const m of crowd.meshes){assert.equal(m.isInstancedMesh,true);assert.equal(m.userData.arenaCrowd,true);const g=m.geometry;assert.ok(g.attributes.position.array.every(Number.isFinite));assert.equal(g.attributes.color.count,g.attributes.position.count);g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x<.70);assert.ok(g.boundingBox.max.y<1.2);assert.ok(g.boundingBox.min.y>-.6);for(let i=0;i<m.count;i++){const matrix=new THREE.Matrix4();m.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite))}}
});
test('the browser loader reassembles local chunks and releases crowd resources',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async path=>new Response(readFileSync(new URL('../'+path.slice(2),import.meta.url)));try{const loaded=await loadArenaCrowd();assert.ok(loaded.groyper.map.isTexture);assert.equal(loaded.groyper.map.flipY,false);assert.ok(loaded.groyper.high.uv.length>10000)}finally{globalThis.fetch=original}
 const copy=createArenaCrowd(gltf.scene,data);let disposed=0;copy.meshes.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));copy.dispose();assert.equal(disposed,10);assert.equal(copy.group.parent,null);
});
test('production textured HONK faces stay within the complete audience triangle budget',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async path=>new Response(readFileSync(new URL('../'+path.slice(2),import.meta.url)));
 let actual;try{actual=createArenaCrowd(gltf.scene,await loadArenaCrowd());assert.ok(actual.sources.honk.map?.isTexture);assert.ok(actual.sources.honk.high.indices.length>50000,'nearby HONK must keep the detailed face');for(const p of actual.placements){actual.update(1,p.position.clone().add(new THREE.Vector3(0,1,2)));assert.ok(actual.triangles<1400000,'textured audience exceeds the mobile budget')}}finally{actual?.dispose();globalThis.fetch=original}
});

test('both audience LODs clear the actual cushion, stone support and backrest on every seat',()=>{
 gltf.scene.updateMatrixWorld(true);
 for(const p of crowd.placements){
  const suffix=p.seat.slice('Individual_seat_red_cushion'.length);
  for(const prefix of ['Individual_seat_red_cushion','Individual_seat_solid_stone_support','Individual_seat_low_carved_back']){
   const chair=gltf.scene.getObjectByName(prefix+suffix);chair.geometry.computeBoundingBox();const box=chair.geometry.boundingBox.clone().expandByScalar(-.003);
   for(const lod of ['high','low']){const matrix=chair.matrixWorld.clone().invert().multiply(p.matrices[lod]),points=crowd.sources[p.variant][lod].positions;for(let i=0;i<points.length;i+=3){const v=new THREE.Vector3(points[i],points[i+1],points[i+2]).applyMatrix4(matrix);assert.equal(box.containsPoint(v),false,`${p.name} ${lod} intersects ${chair.name}`)}}
  }
 }
});
test('nearby spectators retain detailed source surfaces and Groyper UVs while distant detail stays bounded',()=>{
 assert.ok(data.teledog.high.indices.length>200000);assert.ok(data.groyper.high.uv.length>10000);
 const boundaries=d=>{const edges=new Map();for(let i=0;i<d.indices.length;i+=3){const t=d.indices.slice(i,i+3);for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=a<b?a+','+b:b+','+a;edges.set(key,(edges.get(key)||0)+1)}}return [...edges.values()].filter(n=>n===1).length};
 for(const name of manifest.characters)assert.ok(boundaries(data[name].low)<=boundaries(data[name].high),'simplification must not create additional open edges');
 for(const mesh of crowd.meshes)assert.equal(mesh.material.side,THREE.DoubleSide);
 for(const p of crowd.placements){crowd.update(1,p.position.clone().add(new THREE.Vector3(0,1,2)));assert.ok(crowd.nearCount<=10);assert.ok(crowd.triangles<1400000);assert.equal(crowd.meshes.reduce((n,m)=>n+m.count,0),154)}
});

test('seated feet retain depth instead of collapsing into a flickering plane',()=>{
 const points=data.teledog.high.positions,foot=[];let minimum=Infinity;for(let i=1;i<points.length;i+=3)minimum=Math.min(minimum,points[i]);for(let i=0;i<points.length;i+=3)if(points[i+1]<minimum+.06)foot.push(new THREE.Vector3(points[i],points[i+1],points[i+2]));const box=new THREE.Box3().setFromPoints(foot);assert.ok(box.max.z-box.min.z>.06);assert.ok(box.max.x-box.min.x>.15);
});

test('Groyper keeps the source UV seams and triangle pairing, with smooth normals across the seams',async()=>{
 const {createHash}=await import('node:crypto'),g=data.groyper.high,hash=a=>createHash('sha256').update(new Uint8Array(a.buffer)).digest('hex');
 assert.equal(hash(new Float32Array(g.uv)),'a4448bb072e7dbd72e3b81cc3fd0f686396b35d17c7b0acbaa9c4eccddc78434');
 assert.equal(hash(new Uint32Array(g.indices)),'e3f587205430c3702ea83dde4654be46598cda17a97282cab7bf66633cd696db');
 const normals=new Map();for(let i=0;i<g.positions.length;i+=3){const key=g.positions.slice(i,i+3).join(','),n=g.normals.slice(i,i+3);if(normals.has(key))assert.deepEqual(n,normals.get(key));else normals.set(key,n)}
 assert.deepEqual(data.groyper.low.uv,g.uv);
});
test('Zoich keeps the original source foot proportions and vertex positions',()=>{
 const samples=[[.161042,.096023,-.072365],[-.206146,.023826,.104602],[-.222946,.00637,.090068],[.2052,.077831,.071973],[-.300743,.079161,-.124437],[-.194282,.038219,.171284],[-.215116,.067541,.090163],[-.235686,.032622,.183838],[-.203251,.055272,.103674],[-.306686,.01612,.149893],[.22269,.062879,.081712],[.180935,.022099,.18463],[.206524,.046377,.068371],[.252748,.005597,.204628],[.201697,.03234,.08519],[.2962,0,.165586]],p=data.zoich.high.positions,vertices=new Set();for(let i=0;i<p.length;i+=3)vertices.add(p.slice(i,i+3).join(','));for(const sample of samples)assert.ok(vertices.has(sample.join(',')),'original Zoich foot vertex missing: '+sample);
 assert.equal(data.zoich.seatLift,.008);
});

test('an unavailable audience cannot block entering the colosseum and a later attempt can recover',async()=>{
 const root=new THREE.Group(),wall=new THREE.Group();wall.name='Actual arena architecture';root.add(wall);let reported;
 const unavailable=await prepareArenaAudience(root,{load:async()=>{throw Error('Crowd asset 404')},onError:error=>reported=error});assert.equal(unavailable,null);assert.match(reported.message,/404/);assert.equal(root.children.length,1);assert.equal(root.children[0],wall);
 const scene=gltf.scene.clone(),recovered=await prepareArenaAudience(scene,{load:async()=>data});assert.equal(recovered.count,154);recovered.dispose();
});

test('every spectator actually touches the cushion in both levels of detail',()=>{
 const geometries={};for(const name of Object.keys(crowd.sources)){geometries[name]={};for(const lod of ['high','low']){const source=crowd.sources[name][lod],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(source.positions,3));g.setIndex(source.indices);geometries[name][lod]=g}}
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),ray=new THREE.Raycaster();
 for(const p of crowd.placements){const cushion=gltf.scene.getObjectByName(p.seat),top=new THREE.Box3().setFromObject(cushion).max.y;for(const lod of ['high','low']){
  const mesh=new THREE.Mesh(geometries[p.variant][lod],material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(p.matrices[lod]);mesh.updateMatrixWorld(true);
  const inverse=cushion.matrixWorld.clone().invert(),box=cushion.geometry.boundingBox,up=new THREE.Vector3(0,1,0).transformDirection(inverse),axis=['x','y','z'].sort((a,b)=>Math.abs(up[b])-Math.abs(up[a]))[0],horizontal=['x','y','z'].filter(k=>k!==axis);let closest=null;
  const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){const world=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld),local=world.clone().applyMatrix4(inverse);if(horizontal.every(k=>local[k]>box.min[k]+.0001&&local[k]<box.max[k]-.0001)&&(!closest||world.y<closest.y))closest=world}
  assert.ok(closest,`${p.name} has no seat contact`);assert.ok(closest.y-top>=-.001&&closest.y-top<.004,`${p.name} ${lod} floats ${(closest.y-top).toFixed(3)}m above cushion`);
  // An upward ray checks the real triangles, independently of the fitting pass.
  ray.set(new THREE.Vector3(closest.x,top-.01,closest.z),new THREE.Vector3(0,1,0));ray.far=.02;assert.ok(ray.intersectObject(mesh,false).length>0,`${p.name} ${lod} has no visible cushion contact`);
 }}
 for(const pair of Object.values(geometries))for(const geometry of Object.values(pair))geometry.dispose();material.dispose();
});


test('every HONK has connected seated legs, soles on the real tread, and no chair or terrain penetration',async()=>{
 const {Octree}=await import(moduleURL(new URL('../vendor/Octree.js',import.meta.url))),floor=new Octree(),triangle=new THREE.Triangle(),normal=new THREE.Vector3(),downRay=new THREE.Ray(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
 gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(!o.isMesh||!/^(Wide_empty_seating_terrace|Interior_aisle_broad_stone_stair_tread|Arena_complete_sand_floor)/.test(o.name))return;const p=o.geometry.attributes.position,index=o.geometry.index;for(let i=0;i<(index?index.count:p.count);i+=3){for(const [corner,key] of [[0,'a'],[1,'b'],[2,'c']])triangle[key].fromBufferAttribute(p,index?index.getX(i+corner):i+corner).applyMatrix4(o.matrixWorld);triangle.getNormal(normal);if(normal.y>.5)floor.addTriangle(triangle.clone())}});floor.build();
 assert.equal(crowd.legs.actors.length,crowd.placements.filter(p=>p.name==='honk').length);assert.equal(crowd.legs.meshes.length,5);
 for(let actorIndex=0;actorIndex<crowd.legs.actors.length;actorIndex++){
  const actor=crowd.legs.actors[actorIndex],suffix=actor.seat.slice('Individual_seat_red_cushion'.length),chairs=['Individual_seat_red_cushion','Individual_seat_solid_stone_support','Individual_seat_low_carved_back'].map(n=>gltf.scene.getObjectByName(n+suffix));
  for(const foot of actor.feet){assert.ok(foot.knee.distanceTo(foot.ankle)>.2&&foot.knee.distanceTo(foot.ankle)<.65,'shins must reach the adjacent tread with natural lengths');assert.ok(Math.abs(foot.hip.y-foot.knee.y)<.002,'thighs must remain seated');let contact=Infinity;
   for(let k=0;k<foot.source.positions.length;k+=3){const world=new THREE.Vector3(...foot.source.positions.slice(k,k+3)).applyMatrix4(foot.shoeMatrix);downRay.origin.set(world.x,actor.position.y-.02,world.z);const hit=floor.rayIntersect(downRay);if(!hit)continue;assert.ok(world.y>=hit.position.y-.003,`shoe enters terrain at ${actor.seat}`);contact=Math.min(contact,world.y-hit.position.y)}assert.ok(contact<.004,'the actual shoe sole must touch its tread');
  }
  for(const mesh of crowd.legs.meshes){const ids=mesh.name.includes('shoes')?[actorIndex]:mesh.name.includes('joints')?[actorIndex*4,actorIndex*4+1,actorIndex*4+2,actorIndex*4+3]:[actorIndex*2,actorIndex*2+1];for(const id of ids){const m=new THREE.Matrix4();mesh.getMatrixAt(id,m);for(const chair of chairs){chair.geometry.computeBoundingBox();const box=chair.geometry.boundingBox.clone().expandByScalar(-.003),local=chair.matrixWorld.clone().invert().multiply(m),points=mesh.geometry.attributes.position;for(let k=0;k<points.count;k++){const v=new THREE.Vector3().fromBufferAttribute(points,k).applyMatrix4(local);assert.equal(box.containsPoint(v),false,`${mesh.name} enters ${chair.name}`)}}}}
 }
 // The other characters keep their original poses; check every lower
 // vertex in both LODs against the same real stone treads rather than guessed floor boxes.
 for(const p of crowd.placements){if(p.name==='honk')continue;for(const lod of ['high','low']){const a=crowd.sources[p.variant][lod].positions;for(let k=0;k<a.length;k+=3){if(a[k+1]>=0)continue;const world=new THREE.Vector3(a[k],a[k+1],a[k+2]).applyMatrix4(p.matrices.low);downRay.origin.set(world.x,p.position.y+.01,world.z);const hit=floor.rayIntersect(downRay);if(hit)assert.ok(world.y>=hit.position.y-.003,`${p.name} ${lod} enters the stone tread`)}}}
 floor.clear();
});
