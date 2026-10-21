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
test('the snowboarder has a rounded HONK head, one twin-tip board and two sideways bindings',()=>{
 const data=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url)))),skier=createSkiHonk(new THREE.Group(),data);
 assert.ok(skier.head.children.length);assert.ok(skier.head.getObjectByName('HONK rounded rainbow curls'));assert.ok(skier.head.getObjectByName('HONK red clown nose'));assert.ok(skier.group.getObjectByName('HONK twin-tip snowboard'));assert.equal(skier.group.getObjectByName('Honk_right_ski'),undefined);assert.equal(skier.bindings.length,2);
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

test('the rider squats before launch, tucks in flight and absorbs landing without stretching his legs',()=>{
 const rider=createSkiHonk(new THREE.Group()),position=new THREE.Vector3(),kneeAngle=leg=>new THREE.Vector3().subVectors(leg.hip,leg.knee).angleTo(new THREE.Vector3().subVectors(leg.ankle,leg.knee));
 rider.pose(position,0,8,0,0,{clock:1});rider.group.updateMatrixWorld(true);const standing=rider.head.getWorldPosition(new THREE.Vector3()),standingAngle=kneeAngle(rider.legs[0]);
 for(const state of [{jumpPrep:1,preparing:true},{airborne:true,airTime:.30,jumpImpulse:5,verticalSpeed:1},{landing:.9,landingTime:.08}]){
  rider.pose(position,0,8,0,0,state);rider.group.updateMatrixWorld(true);const head=rider.head.getWorldPosition(new THREE.Vector3());assert.ok(head.y<standing.y-.15,'the torso and head must follow the deep squat');
  for(const leg of rider.legs){assert.ok(kneeAngle(leg)<standingAngle-.5,'knees must visibly bend');assert.ok(Math.abs(leg.hip.distanceTo(leg.knee)-.32)<1e-7);assert.ok(Math.abs(leg.knee.distanceTo(leg.ankle)-.32)<1e-7)}
 }
 rider.pose(position,0,8,.4,0,{clock:1});rider.group.updateMatrixWorld(true);const first=rider.head.getWorldPosition(new THREE.Vector3()),rotation=rider.head.quaternion.clone(),hand=rider.arms[0].hand.position.clone();rider.pose(position,0,8,.4,0,{clock:1.4});rider.group.updateMatrixWorld(true);assert.ok(rider.head.getWorldPosition(new THREE.Vector3()).distanceTo(first)>.001);assert.ok(rider.head.quaternion.angleTo(rotation)>.001);assert.ok(rider.arms[0].hand.position.distanceTo(hand)>.001);rider.dispose();
});
