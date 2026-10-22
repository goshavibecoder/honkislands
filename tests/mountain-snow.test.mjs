import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url))),{rebuildMountainStairs}=await import(moduleURL(new URL('../mountain-stairs.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const manifest=JSON.parse(readFileSync(new URL('../models/goat-mountain.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),root=gltf.scene;const stairs=rebuildMountainStairs(root,JSON.parse(gunzipSync(readFileSync(new URL('../models/goat-mountain-shell-v22.bin',import.meta.url)))));root.updateMatrixWorld(true);

const {prepareMountainSnow}=await import(moduleURL(new URL('../mountain-snow.js',import.meta.url)));
const {createMountainNavigation,createMountainCollision,MountainWalkPhysics}=await import(moduleURL(new URL('../mountain-walk.js',import.meta.url)));
const {createFloorIndex}=await import(moduleURL(new URL('../walk-physics.js',import.meta.url)));
const {prepareBalloonWorld}=await import(moduleURL(new URL('../balloon-world.js',import.meta.url)));
const {prepareIslandTransport}=await import(moduleURL(new URL('../island-transport-world.js',import.meta.url)));
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const balloon=prepareBalloonWorld(root,'goat-mountain'),transport=prepareIslandTransport(root,'goat-mountain');
const snow=prepareMountainSnow(root,{flagTexture:new THREE.Texture(),balloonExit:balloon.exit}),nav=createMountainNavigation(root),positions=[...nav.geometry.attributes.position.array,...snow.navPositions,...balloon.navPositions,...transport.navPositions];
nav.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
const index=createFloorIndex(nav,{minNormalY:.3}),ray=new THREE.Ray(),boxes=[...manifest.collisionBoxes.map(([a,b])=>new THREE.Box3(new THREE.Vector3(...a),new THREE.Vector3(...b))),...snow.extraBoxes,...balloon.extraBoxes,...transport.extraBoxes];
const floorAt=(x,z,top,far)=>{ray.set(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0));const hit=index.rayIntersect(ray);return hit&&hit.distance<=far?hit.position.y:null};
const canStand=(x,z,floor)=>transport.canStand(x,z,floor)&&!boxes.some(b=>floor+1.53>b.min.y&&floor+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17);
const physics=new MountainWalkPhysics({floorAt,canStand,eye:1.65,collision:createMountainCollision(root)});
test('rear snow descent connects the summit and is walkable both ways across its full width',()=>{
 for(const offset of [-1,0,1])for(const direction of [1,-1]){
  const ordered=snow.centerline.map((p,i)=>p.clone().addScaledVector(snow.side[i],offset*(snow.widths[i]-.45)));if(direction<0)ordered.reverse();
  let foot=ordered[0].y;
  for(let i=0;i<ordered.length-1;i++)for(let j=0;j<3;j++){
   const p=ordered[i].clone().lerp(ordered[i+1],j/3),next=physics.step(p.x,p.z,foot);
   assert.notEqual(next,null,JSON.stringify({offset,direction,i,j,p:p.toArray(),foot,clear:physics.clearAt(p.x,p.z,p.y),box:canStand(p.x,p.z,p.y),support:Array.from({length:8},(_,n)=>floorAt(p.x+Math.cos(n*Math.PI/4)*.17,p.z+Math.sin(n*Math.PI/4)*.17,p.y+.42,.84)),hit:physics.collision.capsuleIntersect(physics.capsule)}));foot=next;
  }
 }
 let foot=11.14;for(let z=-3.3;z>=-5.3;z-=.025){const next=physics.step(0,z,foot);assert.notEqual(next,null,'summit approach '+z);foot=next}
 assert.ok(snow.finish.y<1.4,'snow must reach the rear foothills');
});
test('route reaches the balloon, has GRAM flags throughout and stays within the mobile geometry budget',()=>{
 assert.equal(snow.flags.length,27);assert.equal(snow.extraBoxes.length,27);assert.ok(snow.start.z<0);assert.ok(snow.widths.filter(w=>w>1.8).length>snow.widths.length*.7);assert.ok(snow.finish.distanceTo(new THREE.Vector3(-3.154,.253,15.254))<.03);assert.ok(snow.flags.some(f=>f.position.z>10));
 let triangles=0;snow.group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3});
 assert.ok(triangles<30000);assert.ok(snow.bounds.containsPoint(snow.start));assert.ok(snow.bounds.containsPoint(snow.finish));
});

const {SnowboardMotion:SkiMotion}=await import(moduleURL(new URL('../snowboard-motion.js',import.meta.url)));
test('manual steering can complete the broad sweep and reach the balloon using real collision geometry',()=>{
 for(const fps of [30,60]){
  const model=new SkiMotion(snow.centerline,{widthAt:(i,t)=>THREE.MathUtils.lerp(snow.widths[i],snow.widths[i+1],t),canStand:(x,z,y)=>physics.clearAt(x,z,y)});
  for(let frame=0;frame<fps*240&&!model.finished;frame++){
   const goal=snow.centerline[Math.min(model.segment+5,snow.centerline.length-1)],yaw=Math.atan2(goal.x-model.position.x,goal.z-model.position.z),error=Math.atan2(Math.sin(yaw-model.yaw),Math.cos(yaw-model.yaw));
   model.update(1/fps,{steer:-Math.max(-1,Math.min(1,error*3)),drive:1,brake:model.speed>1.5});
  }
  assert.ok(model.finished,JSON.stringify({fps,progress:model.progress,position:model.position,warning:model.warning}));
  assert.ok(Math.hypot(model.position.x-snow.finish.x,model.position.z-snow.finish.z)<.4);
 }
});
test('fast snowboard runs with speed-dependent jumps reach the balloon on the real mountain',()=>{
 for(const fps of [30,60,120]){
  const model=new SkiMotion(snow.centerline,{widthAt:(i,t)=>THREE.MathUtils.lerp(snow.widths[i],snow.widths[i+1],t),canStand:(x,z,y)=>physics.clearAt(x,z,y)});let peakSpeed=0,peakHeight=0,jumps=0,time=0,wasAir=false;
  for(let frame=0;frame<fps*100&&!model.finished;frame++){
   const goal=snow.centerline[Math.min(model.segment+Math.max(5,Math.round(model.speed*4)),snow.centerline.length-1)],yaw=Math.atan2(goal.x-model.position.x,goal.z-model.position.z),error=Math.atan2(Math.sin(yaw-model.yaw),Math.cos(yaw-model.yaw)),jump=jumps<2&&!model.airborne&&model.speed>4&&Math.abs(error)<.10&&model.progress>(jumps===0?.12:.43)&&model.progress<.8;
   model.update(1/fps,{steer:-Math.max(-1,Math.min(1,error*2.2)),drive:1,jump});if(model.airborne&&!wasAir)jumps++;wasAir=model.airborne;peakSpeed=Math.max(peakSpeed,model.speed);peakHeight=Math.max(peakHeight,model.airHeight);time+=1/fps;
   assert.ok(model.position.y>=model.groundY-1e-6);assert.ok(model.nearest(model.position.x,model.position.z).distance<4);
  }
  assert.ok(model.finished,JSON.stringify({fps,time,progress:model.progress,position:model.position,speed:model.speed,warning:model.warning}));assert.ok(peakSpeed>6,'the new board should be substantially faster than skis');assert.equal(jumps,2);assert.ok(peakHeight>.5);assert.ok(time<75);
 }
});
test('snowboard braking, boundaries and stationary steering keep the rider on the snow',()=>{
 const model=new SkiMotion([{x:0,y:1,z:0},{x:0,y:0,z:10},{x:0,y:0,z:20}]);
 for(let i=0;i<60;i++)model.update(1/60,{drive:1});assert.ok(model.speed>1);
 for(let i=0;i<60;i++)model.update(1/60,{brake:true});assert.equal(model.speed,0);
 model.update(.1,{steer:1,brake:true});assert.ok(model.yaw<0);
 for(let i=0;i<120;i++)model.update(1/60,{drive:1});assert.ok(Math.abs(model.position.x)<=.49);assert.ok(model.warning>0);
});

test('the widened top stair threshold is passable through the outside notch',()=>{
 const flight=stairs.userData.flights[4],dir=new THREE.Vector3(...flight.direction);
 for(const offset of [-.48,-.25,0,.25,.48]){
  const start=new THREE.Vector3(...flight.start).addScaledVector(new THREE.Vector3(...flight.side),offset);let foot=start.y;
  for(let distance=-.05;distance<2.5;distance+=.025){const p=start.clone().addScaledVector(dir,distance),next=physics.step(p.x,p.z,foot);assert.notEqual(next,null,JSON.stringify({offset,distance}));foot=next}
 }
});
const {createSkiHonk}=await import(moduleURL(new URL('../ski-honk.js',import.meta.url)));
test('the snowboarder keeps the original HONK face, one twin-tip board and two sideways bindings',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url)))),skier=createSkiHonk(new THREE.Group(),data);
 assert.ok(skier.head.children.length);assert.ok(skier.group.getObjectByName('HONK twin-tip snowboard'));assert.equal(skier.group.getObjectByName('Honk_right_ski'),undefined);assert.equal(skier.bindings.length,2);
 skier.board.geometry.computeBoundingBox();const size=skier.board.geometry.boundingBox.getSize(new THREE.Vector3());assert.ok(size.z>1.7&&size.x<.40);
 for(const state of [{},{airborne:true,verticalSpeed:4,clock:1},{landing:1,clock:2}]){skier.pose(snow.start,.8,9,.7,.5,state);skier.group.updateMatrixWorld(true);skier.group.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh){assert.ok(o.userData.islandRide);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite))}})}
});

test('snow terrain and snowboard tracks leave the summit and boarding platforms uncovered',()=>{
 assert.ok(snow.platformExclusions.some(p=>p.name==='Summit_circular_terrace_2'));
 assert.ok(snow.platformExclusions.some(p=>p.name==='Balloon_access_walkway'));
 const terrain=[];snow.group.traverse(o=>{if(o.isMesh&&/^Snow_(walkable|raised|terrain|faceted|parallel|snowboard|finish)/.test(o.name))terrain.push(o)});
 let checked=0;
 for(const mesh of terrain){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=3){const vertices=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,i+k).applyMatrix4(mesh.matrixWorld));for(const cut of snow.platformExclusions){if(!vertices.some(v=>v.x>=cut.bounds.min.x&&v.x<=cut.bounds.max.x&&v.z>=cut.bounds.min.z&&v.z<=cut.bounds.max.z))continue;for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){const point=new THREE.Vector3();vertices.forEach((v,k)=>point.addScaledVector(v,weights[k]));const inside=cut.polygon.every((a,j)=>{const b=cut.polygon[(j+1)%cut.polygon.length];return (b.x-a.x)*(point.z-a.z)-(b.z-a.z)*(point.x-a.x)>2e-6*Math.hypot(b.x-a.x,b.z-a.z)});assert.equal(inside,false,JSON.stringify({mesh:mesh.name,cut:cut.name,point:point.toArray(),sides:cut.polygon.map((a,j)=>{const b=cut.polygon[(j+1)%cut.polygon.length];return (b.x-a.x)*(point.z-a.z)-(b.z-a.z)*(point.x-a.x)})}));checked++}}}}
 assert.ok(checked>100);
});

test('snowboard balancing and landing keep the wrists, elbows, knees and ankles connected',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url)))),skier=createSkiHonk(new THREE.Group(),data),endpoint=(mesh,y)=>new THREE.Vector3(0,y,0).applyMatrix4(mesh.matrix);
 for(const state of [{},{airborne:true,verticalSpeed:5},{airborne:true,verticalSpeed:-5},{landing:1}])for(const turn of [-1,0,1]){
  skier.pose(snow.start,.3,9,turn,.4,state);skier.group.updateMatrixWorld(true);
  for(const arm of skier.arms){assert.ok(endpoint(arm.upper,-.5).distanceTo(arm.shoulder)<1e-7);assert.ok(endpoint(arm.upper,.5).distanceTo(arm.elbow.position)<1e-7);assert.ok(endpoint(arm.forearm,-.5).distanceTo(arm.elbow.position)<1e-7);assert.ok(endpoint(arm.forearm,.5).distanceTo(arm.hand.position)<1e-7);assert.equal(arm.pole,undefined)}
  for(const leg of skier.legs){assert.ok(endpoint(leg.upper,-.5).distanceTo(leg.hip)<1e-7);assert.ok(endpoint(leg.upper,.5).distanceTo(leg.knee)<1e-7);assert.ok(endpoint(leg.lower,.5).distanceTo(leg.ankle)<1e-7)}
 }
});
test('snowboard boots stay on their bindings during carving and jumps',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url)))),skier=createSkiHonk(new THREE.Group(),data),raycaster=new THREE.Raycaster();
 for(const slope of [-.4,0,.7])for(const state of [{},{airborne:true,verticalSpeed:4},{landing:1}]){
  skier.pose(snow.start,.8,9,-.6,slope,state);skier.group.updateMatrixWorld(true);
  for(const binding of skier.bindings){
   const inverse=binding.group.matrixWorld.clone().invert();binding.sole.geometry.computeBoundingBox();binding.binding.geometry.computeBoundingBox();
   const sole=binding.sole.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(binding.sole.matrixWorld)),base=binding.binding.geometry.boundingBox.clone().applyMatrix4(binding.binding.matrix);
   assert.ok(Math.abs(sole.min.y-base.max.y)<1e-7,'both boots must stay seated on the same board');assert.ok(sole.min.x>=base.min.x&&sole.max.x<=base.max.x);
   const worldAnkle=binding.ankle.clone().applyMatrix4(skier.board.parent.matrixWorld),direction=new THREE.Vector3(0,1,0).transformDirection(binding.group.matrixWorld);
   for(const sign of [-1,1]){raycaster.set(worldAnkle.clone().addScaledVector(direction,sign*.3),direction.clone().multiplyScalar(-sign));const hit=raycaster.intersectObject(binding.boot,true)[0];assert.ok(hit&&hit.distance<.3,'the trouser cuff must enter its boot')}
  }
 }
});

test('all front stair flights and turn landings stay connected in both directions',()=>{
 const points=[],flights=stairs.userData.flights,paths=stairs.userData.landingPaths;
 const segment=(a,b)=>{const count=Math.ceil(a.distanceTo(b)/.025);for(let i=0;i<=count;i++)points.push(a.clone().lerp(b,i/count))};
 for(let i=0;i<flights.length;i++){
  const f=flights[i];segment(new THREE.Vector3(...f.start),new THREE.Vector3(...f.end));
  if(paths[i])for(let j=0;j<paths[i].length-1;j++)segment(new THREE.Vector3(...paths[i][j]),new THREE.Vector3(...paths[i][j+1]));
 }
 for(const route of [points,[...points].reverse()]){let foot=floorAt(route[0].x,route[0].z,route[0].y+.3,.8);assert.notEqual(foot,null);for(const p of route){const next=physics.step(p.x,p.z,foot);assert.notEqual(next,null,`stair route blocked at ${p.toArray()}, foot ${foot}`);foot=next}}
});

test('column balconies have a continuous supported floor and a walkable route across the former gaps',()=>{
 const columns=[];root.traverse(o=>{if(o.isMesh&&/^Ruined_temple_column_base(?:_\d+)?$/.test(o.name))columns.push(new THREE.Box3().setFromObject(o))});assert.equal(columns.length,12);
 for(const b of columns){const p=b.getCenter(new THREE.Vector3()),floor=floorAt(p.x,p.z,b.min.y+.08,.4);assert.notEqual(floor,null,'column base floats over a hole');assert.ok(Math.abs(floor-b.min.y)<.025)}
 for(let i=1;i<=3;i++){
  const level=stairs.userData.repairedLandings[i].top,bases=columns.filter(b=>Math.abs(b.min.y-level)<.03),center=new THREE.Vector3();for(const b of bases)center.add(b.getCenter(new THREE.Vector3()));center.multiplyScalar(1/bases.length);const outside=Math.max(...bases.map(b=>b.max.z))+.36;
  const route=[new THREE.Vector3(...stairs.userData.landingPaths[i][1]),new THREE.Vector3(center.x,level,outside),new THREE.Vector3(center.x,level,center.z)];let foot=level;
  for(let j=0;j<route.length-1;j++){const count=Math.ceil(route[j].distanceTo(route[j+1])/.025);for(let n=0;n<=count;n++){const p=route[j].clone().lerp(route[j+1],n/count),next=physics.step(p.x,p.z,foot);assert.notEqual(next,null,`balcony ${i} blocked at ${p.toArray()}`);foot=next}}
 }
});

test('repaired landing decks are closed solids and their light trim stays attached to the deck perimeter',()=>{
 let decks=0,rims=0;root.traverse(o=>{
  if(o.userData.repairedLanding===undefined)return;
  const id=o.userData.repairedLanding,level=stairs.userData.repairedLandings[id].top,b=new THREE.Box3().setFromObject(o);
  if(/^Mountain_stair_turn_landing_/.test(o.name)){
   decks++;assert.ok(Math.abs(b.max.y-level)<1e-5);assert.ok(Math.abs(b.min.y-(level-.3))<1e-5);const p=o.geometry.attributes.position,edges=new Map();
   const key=v=>v.map(n=>n.toFixed(5)).join(',');for(let i=0;i<p.count;i+=3){const tri=[0,1,2].map(j=>key(new THREE.Vector3().fromBufferAttribute(p,i+j).toArray()));for(let j=0;j<3;j++){const pair=[tri[j],tri[(j+1)%3]].sort().join('|');edges.set(pair,(edges.get(pair)||0)+1)}}assert.ok([...edges.values()].every(n=>n===2),'landing has an open shell edge');
  }else{rims++;assert.ok(b.min.y<=level+.001&&b.max.y<level+.04,'rim floats above the landing')}
 });assert.equal(decks,4);assert.ok(rims>30);assert.equal(root.getObjectByName('Shrine_balcony_light'),undefined);
});
