import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {createOriginalHonkActor,createOriginalKartDriver}=await import(moduleURL(new URL('../original-honk-actors.js?v=177',import.meta.url)));
const {createSkiHonk}=await import(moduleURL(new URL('../ski-honk.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const manifest=JSON.parse(readFileSync(new URL('../models/arena-original-honk-v171.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),template=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),''),source=template.scene.children[0];
test('the full rig preserves every triangle, UV and material map and has an undistorted rest pose',()=>{
 const actor=createOriginalHonkActor(template,{height:1.4});actor.group.position.set(2,3,4);actor.group.rotation.y=.7;actor.group.updateMatrixWorld(true);actor.mesh.skeleton.update();const g=actor.mesh.geometry,p=g.attributes.position,point=new THREE.Vector3();
 assert.equal(g.index.count/3,378840);assert.deepEqual(g.index.array,source.geometry.index.array);assert.deepEqual(g.attributes.uv.array,source.geometry.attributes.uv.array);for(const key of ['map','normalMap','roughnessMap','metalnessMap'])assert.equal(actor.mesh.material[key],source.material[key]);
 for(let i=0;i<p.count;i+=37){actor.mesh.getVertexPosition(i,point);assert.ok(point.distanceTo(new THREE.Vector3().fromBufferAttribute(p,i))<1e-5,'rest pose changes the mesh');const w=g.attributes.skinWeight;assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6)}actor.dispose();
});
test('hands reach steering grips after actor translation and rotation',()=>{
 const vehicle=new THREE.Group(),driver=createOriginalKartDriver(vehicle,template);vehicle.position.set(3,1,-2);vehicle.rotation.y=.8;
 for(const turn of [-1,0,1]){driver.steer(turn);vehicle.updateMatrixWorld(true);for(const side of [-1,1]){const grip=new THREE.Vector3(side*.14,0,0).applyEuler(new THREE.Euler(-.5,0,turn*.65)).add(driver.fit.steeringCenter);vehicle.localToWorld(grip);assert.ok(driver.hand(side).distanceTo(grip)<1e-5,'hand leaves the steering wheel')}}
 driver.setSeated(true,true);driver.steer(.7);assert.ok(driver.head.scale.x<.001);driver.setSeated(true,false);assert.equal(driver.head.scale.x,1);driver.dispose();
});
test('walking keeps the full connected mesh finite and the original shoe soles above the floor',()=>{
 const actor=createOriginalHonkActor(template,{height:1.05}),p=actor.mesh.geometry.attributes.position,v=new THREE.Vector3();
 for(const time of [0,.3,.7,1.1]){actor.walk(time);actor.group.updateMatrixWorld(true);for(let i=0;i<p.count;i+=53){actor.mesh.getVertexPosition(i,v);assert.ok(v.toArray().every(Number.isFinite));if(p.getY(i)<.045)assert.ok(v.y>-.004,'walking sole enters the ground')}}actor.dispose();
});
test('the snowboarder uses one complete original mesh and no detached legacy body parts',()=>{
 const skier=createSkiHonk(new THREE.Group(),{original:template});assert.ok(skier.actor);assert.equal(skier.actor.mesh.geometry.index.count/3,378840);
 for(const airborne of [false,true])for(const turn of [-1,0,1]){skier.pose(new THREE.Vector3(3,4,-2),.8,10,turn,.2,{airborne,landing:.5});skier.group.updateMatrixWorld(true);const face=new THREE.Vector3(0,0,1).transformDirection(skier.actor.mesh.matrixWorld),chest=new THREE.Vector3(1,0,0).transformDirection(skier.board.parent.matrixWorld);assert.ok(face.dot(chest)>.99);assert.ok(skier.actor.bones.root.position.y<.31)}
 for(const binding of skier.bindings)assert.equal(binding.boot.parent,null);skier.dispose();
});

test('snowboard hands stay below the shoulders and arm surfaces retain their original lengths',()=>{
 const skier=createSkiHonk(new THREE.Group(),{original:template}),actor=skier.actor,g=actor.mesh.geometry,p=g.attributes.position,weights=g.attributes.skinWeight,indices=g.attributes.skinIndex,armBones=new Set(actor.mesh.skeleton.bones.map((b,i)=>/_(?:shoulder|elbow|hand)/.test(b.name)?i:-1)),fullArm=[];
 for(let i=0;i<p.count;i++){let armWeight=0;for(const component of ['X','Y','Z','W'])if(armBones.has(indices['get'+component](i)))armWeight+=weights['get'+component](i);fullArm[i]=armWeight>.99999}
 const a=new THREE.Vector3(),b=new THREE.Vector3(),pa=new THREE.Vector3(),pb=new THREE.Vector3();let checked=0;
 for(const speed of [0,6,12])for(const airborne of [false,true])for(const turn of [-1,0,1]){
  skier.pose(new THREE.Vector3(3,4,-2),.7,speed,turn,.2,{airborne,landing:.5});skier.group.updateMatrixWorld(true);
  for(const side of [-1,1]){const shoulder=actor.mesh.worldToLocal(actor.bones['shoulder'+side].getWorldPosition(new THREE.Vector3())),elbow=actor.mesh.worldToLocal(actor.bones['elbow'+side].getWorldPosition(new THREE.Vector3())),hand=actor.mesh.worldToLocal(actor.hand(side));assert.ok(elbow.y<shoulder.y-.10,'elbows must hang below shoulders');assert.ok(hand.y<shoulder.y-.14,'hands must not be raised beside the face')}
  for(let k=0;k<g.index.count;k+=3){const i=g.index.getX(k),j=g.index.getX(k+1);if(!fullArm[i]||!fullArm[j])continue;a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,j);const before=a.distanceTo(b);if(before<.00001)continue;actor.mesh.getVertexPosition(i,pa);actor.mesh.getVertexPosition(j,pb);const ratio=pa.distanceTo(pb)/before;assert.ok(Math.abs(ratio-1)<.003,'arm triangles stretch or collapse');checked++}
 }
 assert.ok(checked>10000);skier.dispose();
});

test('fingers below hip height never inherit leg motion',()=>{
 const actor=createOriginalHonkActor(template),g=actor.mesh.geometry,p=g.attributes.position,skin=g.attributes.skinIndex,w=g.attributes.skinWeight;let fingers=0;
 for(let i=0;i<p.count;i++){if(Math.abs(p.getX(i))<.235||p.getY(i)<.20||p.getY(i)>=.29)continue;for(const axis of ['X','Y','Z','W']){if(w['get'+axis](i)<.0001)continue;const bone=actor.mesh.skeleton.bones[skin['get'+axis](i)];assert.doesNotMatch(bone.name,/hip|knee|ankle/,'a finger is bound to a leg')}fingers++}
 assert.ok(fingers>100);actor.dispose();
});

test('both production karts support the complete driver at the seat and floor through steering',async()=>{
 const {prepareIslandTransport}=await import(moduleURL(new URL('../island-transport-world.js',import.meta.url))),world=prepareIslandTransport(new THREE.Group(),'arcade-district',{driverHead:{original:template}}),point=new THREE.Vector3(),posed=new THREE.Vector3(),standing=createOriginalHonkActor(template);
 for(const car of [0,1]){
  world.selectCar(car);const driver=world.driver,g=driver.mesh.geometry,p=g.attributes.position;
  assert.notEqual(g,standing.mesh.geometry,'the seated rig must not change the snowboard/walking rig');
  assert.deepEqual(g.index.array,source.geometry.index.array);assert.deepEqual(g.attributes.uv.array,source.geometry.attributes.uv.array);
  for(const turn of [-1,0,1]){
   driver.setSeated(true);world.setPose({x:3,y:2,z:-4},.8,0,turn,12);world.group.updateMatrixWorld(true);
   const wheel=world.cars[car].steering[0],joint=name=>driver.mesh.worldToLocal(driver.bones[name].getWorldPosition(new THREE.Vector3()));
   for(const side of [-1,1]){
    const grip=new THREE.Vector3(side*.14,0,0).applyEuler(wheel.rotation).add(driver.fit.steeringCenter);world.vehicle.localToWorld(grip);
    assert.ok(driver.hand(side).distanceTo(grip)<1e-5,'the actual palm surface must remain on the turning rim');
    const shoulder=joint('shoulder'+side),elbow=joint('elbow'+side),wrist=joint('hand'+side),hip=joint('hip'+side),knee=joint('knee'+side),ankle=joint('ankle'+side);
    assert.ok(elbow.y<shoulder.y-.035,'elbows must bend down rather than point beside the face');
    assert.ok(knee.z>hip.z+.08&&ankle.y<knee.y-.06,'thighs must extend forward with calves dropping to the floor');
    for(const [a,b,pa,pb]of [['shoulder','elbow',shoulder,elbow],['elbow','hand',elbow,wrist],['hip','knee',hip,knee],['knee','ankle',knee,ankle]])assert.ok(Math.abs(pa.distanceTo(pb)/driver.rest[a+side].distanceTo(driver.rest[b+side])-1)<.025,`car ${car}, turn ${turn}, side ${side}, ${a}-${b}: ${pa.distanceTo(pb)/driver.rest[a+side].distanceTo(driver.rest[b+side])}`);
   }
   let soleMin=Infinity,soleMax=-Infinity,torsoMin=Infinity,torsoCount=0,shoeCount=0;
   for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i);
    if(point.y<.045){driver.mesh.getVertexPosition(i,posed);posed.applyMatrix4(driver.mesh.matrixWorld);world.vehicle.worldToLocal(posed);soleMin=Math.min(soleMin,posed.y);soleMax=Math.max(soleMax,posed.y);assert.ok(posed.z<.235&&Math.abs(posed.x)<.30,'feet must stay inside the open footwell behind the bonnet');shoeCount++}
    if(point.y>.27&&point.y<.45&&Math.abs(point.x)<.16&&Math.abs(point.z)>.10){driver.mesh.getVertexPosition(i,posed);assert.ok(posed.distanceTo(point)<1e-5,'bending legs must not pull the belly into the knees');posed.applyMatrix4(driver.mesh.matrixWorld);world.vehicle.worldToLocal(posed);torsoMin=Math.min(torsoMin,posed.y);torsoCount++}
   }
   assert.ok(shoeCount>100&&torsoCount>100);
   assert.ok(Math.abs(soleMin-driver.fit.floorY-.003)<1e-5,'soles must touch the real floor');
   assert.ok(soleMax-soleMin<.06,'shoe soles must remain flat');
   assert.ok(torsoMin>=driver.fit.seatBounds.max.y&&torsoMin-driver.fit.seatBounds.max.y<.015,'the round body must rest on the cushion');
  }
 }
 standing.dispose();for(const car of world.cars)car.driver.dispose();
});
