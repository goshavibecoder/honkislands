import * as THREE from 'three';
import {createArchitectureCollision} from './walk-architecture.js?v=77';
import {prepareGroypAir} from './groyp-air.js?v=78';
import {prepareVisualQuality} from './visual-quality.js?v=72';
import {prepareBalloonWorld,loadBalloonMapImages} from './balloon-world.js?v=72';
import {mountBalloonTravel} from './balloon-travel.js?v=78';
import {MobileRenderQuality} from './mobile-render-quality.js?v=59';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import {createArcadeTargets} from './arcade-links.js?v=8';
import {WalkPhysics,createGalleryCollision,createFloorIndex} from './walk-physics.js?v=76';
import {rebuildMountainStairs} from './mountain-stairs.js?v=23';
import {repairLandingPad} from './landing-pad.js?v=19';
import {addClownHelicopter} from './clown-helicopter.js?v=59';
import {mountHelicopterFlight} from './helicopter-flight.js?v=72';
import {createHelicopterCollision,createHelicopterExplosion} from './helicopter-world.js?v=40';
import {createMountainNavigation,createMountainCollision,MountainWalkPhysics} from './mountain-walk.js?v=21';
import {createWorldTargets} from './world-links.js?v=75';
import {prepareArenaCircus} from './arena-circus.js?v=72';
import {attachTapGesture} from './tap-gesture.js?v=27';
import { createTouchStick } from './touch-stick.js?v=6';
import { WalkMotion } from './walk-motion.js?v=33';
import {loadHonkFamilyPictures} from './family-wall.js?v=72';
import {prepareAntiqueRoom} from './antique-room.js?v=72';
import {prepareGalleryInterior} from './gallery-interior.js?v=72';
import {mountMountainStorm,findMountainStormAnchor} from './mountain-storm.js?v=49';
import {mountGalleryLift} from './gallery-lift.js?v=72';
import {prepareIslandTransport} from './island-transport-world.js?v=71';
import {mountIslandTransport} from './island-transport.js?v=72';
import {loadHonkKartHead} from './kart-driver.js?v=59';
import { createPanoramicSky } from './sky360.js?v=5';
const DOWN=new THREE.Vector3(0,-1,0),UP=new THREE.Vector3(0,1,0),clamp=THREE.MathUtils.clamp;
const configPromise=fetch('./worlds.json?v=7').then(r=>{if(!r.ok)throw Error('World configuration unavailable');return r.json()});
export class IslandViewer {
 constructor(host){
  this.host=host;this.active=false;this.mode='walk';this.keys=new Set();this.stick={x:0,y:0};this.yaw=0;this.pitch=0;this.motion=new WalkMotion();this.drag=null;this.foot=0;this.previous=0;this.frame=0;this.navRay=new THREE.Raycaster();
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});this.renderQuality=new MobileRenderQuality(this.renderer,{mobile:matchMedia('(pointer:coarse)').matches,pixelRatio:devicePixelRatio});this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.domElement.setAttribute('aria-label','Interactive 3D scene');host.append(this.renderer.domElement);
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.035,1100);this.camera.rotation.order='YXZ';
  this.skyTarget=createPanoramicSky(this.renderer);this.scene.background=this.skyTarget.texture;
  this.scene.backgroundRotation.set(0,0,0);this.scene.backgroundIntensity=1;
  this.scene.add(new THREE.HemisphereLight(0xe7f5ff,0x80717f,1.7));const sun=new THREE.DirectionalLight(0xfff1d2,2.2);sun.position.set(10,22,14);this.scene.add(sun);const fill=new THREE.DirectionalLight(0xb5dfff,.65);fill.position.set(-12,7,-8);this.scene.add(fill);
  const pmrem=new THREE.PMREMGenerator(this.renderer),environment=new RoomEnvironment();this.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();this.scene.environment=this.environment;this.scene.environmentIntensity=.55;
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enabled=false;this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minDistance=.8;this.controls.maxPolarAngle=Math.PI*.49;
  this.resize=()=>{const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()};window.addEventListener('resize',this.resize);this.resize();this.bindInput();
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.setActive(false);document.getElementById('error-message').textContent='3D rendering was paused. Return to the map and open the island again.';document.getElementById('error').hidden=false});
 }
 async fetchBinary(url,onChunk=()=>{}){const response=await fetch(url);if(!response.ok)throw Error(`Asset ${response.status}: ${url}`);if(!response.body)return new Uint8Array(await response.arrayBuffer());const reader=response.body.getReader(),chunks=[];let n=0;while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);n+=value.length;onChunk(value.length)}const data=new Uint8Array(n);let off=0;for(const chunk of chunks){data.set(chunk,off);off+=chunk.length}return data}
 async open(slug,progress){
  this.setActive(false);this.clear();this.slug=slug;this.camera.near=slug==='arena'?.10:.035;this.camera.far=slug==='arena'?180:1100;this.camera.updateProjectionMatrix();this.config=(await configPromise)[slug];if(!this.config)throw Error('Unknown island');this.renderQuality.configure(this.config.pixelRatio||1.6);
  const response=await fetch(`./models/${slug}.json?v=9`);if(!response.ok)throw Error('Model manifest unavailable');this.manifest=await response.json();let downloaded=0;const payloads=await Promise.all(this.manifest.parts.map(part=>this.fetchBinary(`./models/${part}?v=9`,n=>{downloaded+=n;progress(downloaded/this.manifest.bytes*.72,'Flying to the island…')})));
  const bytes=new Uint8Array(payloads.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of payloads){bytes.set(a,offset);offset+=a.length}
  if(!('DecompressionStream' in window))throw Error('Update browser to support compressed scenes');
  const buffer=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();progress(.78,'Opening the 3D world…');
  const gltf=await new GLTFLoader().parseAsync(buffer,'');this.root=gltf.scene;this.root.updateMatrixWorld(true);this.antiqueRoom=slug==='honkhub'?prepareAntiqueRoom(this.root,{familyTextures:await loadHonkFamilyPictures(),balloonDoor:true}):null;this.gallery=slug==='carnival'?prepareGalleryInterior(this.root):null;this.arenaCircus=slug==='arena'?prepareArenaCircus(this.root,this.environment):null;this.arcadeTargets=slug==='arcade-district'?createArcadeTargets(this.root):slug==='arena'?this.arenaCircus.picker:createWorldTargets(this.root,slug);
  let mountainShell=null;if(slug==='goat-mountain'){const sealed=await this.fetchBinary('./models/goat-mountain-shell-v22.bin?v=22');mountainShell=await new Response(new Blob([sealed]).stream().pipeThrough(new DecompressionStream('gzip'))).json()}
  this.stairNav=slug==='goat-mountain'?rebuildMountainStairs(this.root,mountainShell):null;this.padNav=slug==='citadel'?repairLandingPad(this.root):null;
  this.islandTransportWorld=prepareIslandTransport(this.root,slug,{driverHead:slug==='arcade-district'?await loadHonkKartHead():null});
  this.helicopter=slug==='citadel'?addClownHelicopter(this.root):null;
  this.balloonWorld=prepareBalloonWorld(this.root,slug,{mapImages:await loadBalloonMapImages()});
  if(slug==='arcade-district'){
   const manifest=await (await fetch('./models/groyp-air-v74.json')).json(),chunks=await Promise.all(manifest.parts.map(part=>this.fetchBinary('./models/'+part))),size=chunks.reduce((n,c)=>n+c.length,0),bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
   const buffer=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),groyper=await new GLTFLoader().parseAsync(buffer,'');this.groypAir=prepareGroypAir(this.root,this.balloonWorld,groyper.scene);
  }
  this.helicopterCollision=this.helicopter?createHelicopterCollision(this.root,this.helicopter.scale):null;
  this.walkCollision=slug==='carnival'?createGalleryCollision(this.root):slug==='goat-mountain'?createMountainCollision(this.root):null;
  this.architectureCollision=createArchitectureCollision(this.root,slug);
  if(slug==='goat-mountain')this.nav=createMountainNavigation(this.root);if(this.antiqueRoom)this.nav=this.antiqueRoom.nav;
  this.visualQuality=prepareVisualQuality(this.root,{maxAnisotropy:this.renderer.capabilities.getMaxAnisotropy()});
  const stormAnchor=slug==='goat-mountain'?findMountainStormAnchor(this.root):null;
  // Bake static geometry into material batches. Animated nodes remain attached
  // to their original hierarchy, so original animation tracks still work.
  const animated=new Set();for(const clip of gltf.animations)for(const track of clip.tracks){try{const name=THREE.PropertyBinding.parseTrackName(track.name).nodeName;const node=this.root.getObjectByName(name);node?.traverse(o=>animated.add(o.uuid))}catch{}}
  const buckets=new Map(),remove=[];this.root.traverse(o=>{
   if(o.isLight){remove.push(o);return}if(!o.isMesh)return;
   // Keep the existing open-roof presentation while restoring the missing wall.
   if(slug==='carnival'&&/^(Upper_landing_black_balustrade|Upper_end_landing_luminous_handrail)/.test(o.name)){remove.push(o);return}
   if(this.config.openRoof&&o.name.startsWith('Suspended_acoustic_ceiling_tile')){remove.push(o);return}
   const mats=Array.isArray(o.material)?o.material:[o.material];for(const mat of mats){if(mat.map)mat.map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());if(mat.emissiveIntensity>2.2)mat.emissiveIntensity=2.2}
   if(o.userData.honkNose||o.userData.galleryDynamic||o.userData.helicopterDynamic||o.userData.arenaArrival||o.userData.islandRide||animated.has(o.uuid)||o.isSkinnedMesh||Array.isArray(o.material))return;
   // Clipped terrain and extruded stairs are non-indexed; the original GLB
   // also contains indexed meshes using the same material. Keep them separate.
   const colored=o.material.vertexColors&&!!o.geometry.attributes.color;
   const key=o.material.uuid+':order'+o.renderOrder+(o.geometry.index?':indexed':':triangles')+(colored?':colored':'');let bucket=buckets.get(key);if(!bucket){bucket={material:o.material,renderOrder:o.renderOrder,geometries:[]};buckets.set(key,bucket)}
   const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv',...(colored?['color']:[])].includes(name))geometry.deleteAttribute(name);if(!geometry.attributes.normal)geometry.computeVertexNormals();if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));bucket.geometries.push(geometry);remove.push(o);
  });
  this.staticGroup=new THREE.Group();for(const bucket of buckets.values()){
   const merged=mergeGeometries(bucket.geometries,false);if(!merged)throw Error('Could not prepare geometry');merged.computeBoundingSphere();const mesh=new THREE.Mesh(merged,bucket.material);mesh.name='Static material batch';mesh.renderOrder=bucket.renderOrder;this.staticGroup.add(mesh);bucket.geometries.forEach(g=>g.dispose());
  }
  const originalGeometries=new Set();for(const o of remove){if(o.geometry)originalGeometries.add(o.geometry);o.removeFromParent()}const retainedGeometries=new Set();this.root.traverse(o=>{if(o.geometry)retainedGeometries.add(o.geometry)});for(const g of originalGeometries)if(!retainedGeometries.has(g))g.dispose();this.scene.add(this.root,this.staticGroup);
  this.mixers=[];if(gltf.animations.length){const mixer=new THREE.AnimationMixer(this.root);for(const clip of gltf.animations)mixer.clipAction(clip).play();this.mixers.push(mixer)}
  if(!this.nav){const navBytes=await this.fetchBinary(`./models/${slug}.nav.bin?v=9`);const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.BufferAttribute(new Float32Array(navBytes.buffer,navBytes.byteOffset,navBytes.byteLength/4),3));ng.computeBoundingSphere();this.nav=new THREE.Mesh(ng,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));this.nav.updateMatrixWorld()}
  if(this.gallery){const bridge=new THREE.BufferGeometry();bridge.setAttribute('position',new THREE.Float32BufferAttribute(this.gallery.bridgePositions,3));const old=this.nav.geometry;this.nav.geometry=mergeGeometries([old,bridge],false);old.dispose();bridge.dispose();this.nav.geometry.computeBoundingSphere()}
  for(const extension of [this.islandTransportWorld,this.balloonWorld,this.groypAir].filter(Boolean)){const extra=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(extension.navPositions,3)),old=this.nav.geometry;this.nav.geometry=mergeGeometries([old,extra],false);old.dispose();extra.dispose();this.nav.geometry.computeBoundingSphere()}
  this.boxes=this.manifest.collisionBoxes.map(([lo,hi])=>new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi)));this.boxes.push(...(this.arenaCircus?.extraBoxes||[]),...(this.gallery?.extraBoxes||[]),...(this.helicopter?.extraBoxes||[]),...(this.antiqueRoom?.extraBoxes||[]));this.bounds=this.antiqueRoom?.bounds.clone()||new THREE.Box3(new THREE.Vector3(...this.manifest.bounds[0]),new THREE.Vector3(...this.manifest.bounds[1]));
  this.floorIndex=['carnival','goat-mountain','arena'].includes(slug)?createFloorIndex(this.nav,{doubleSided:slug==='arena'}):null;
  for(const extension of [this.islandTransportWorld,this.balloonWorld,this.groypAir].filter(Boolean)){this.boxes.push(...extension.extraBoxes);this.bounds.union(extension.bounds)}
  const Physics=slug==='goat-mountain'?MountainWalkPhysics:WalkPhysics;
  this.physics=['carnival','goat-mountain'].includes(slug)?new Physics({floorAt:(...args)=>this.floorAt(...args),canStand:(...args)=>this.canStand(...args),eye:this.config.eye,collision:this.walkCollision}):null;
  // Reset the lighting on every visit so the mountain's warm circus light
  // cannot tint the other rooms after returning to the map.
  const circus=slug==='goat-mountain'||slug==='arena';for(const light of this.scene.children){
   if(light.isHemisphereLight){light.color.set(circus?0xfff1da:0xe7f5ff);light.groundColor.set(circus?0x8a6b54:0x80717f)}
   else if(light.isDirectionalLight)light.color.set(light.position.x>0?(circus?0xffdfaa:0xfff1d2):(circus?0xffe5c2:0xb5dfff));
  }
  this.antiqueRoom?.mountLights(this.scene);
  this.renderer.toneMappingExposure=this.config.exposure;this.mountainStorm=slug==='goat-mountain'?mountMountainStorm(this,stormAnchor):null;this.reset();this.setMode('walk');this.galleryLift=this.gallery?mountGalleryLift(this,this.gallery):null;this.helicopterExplosion=this.helicopter?createHelicopterExplosion(this.root):null;this.helicopterFlight=this.helicopter?mountHelicopterFlight(this,this.helicopter,{collision:this.helicopterCollision,effects:this.helicopterExplosion}):null;this.islandTransport=this.islandTransportWorld?mountIslandTransport(this,this.islandTransportWorld):null;this.balloonTravel=this.balloonWorld?mountBalloonTravel(this,this.balloonWorld):null;this.resize();progress(.96,'Almost there…');await this.renderer.compileAsync(this.scene,this.camera);this.renderer.render(this.scene,this.camera);progress(1,'Welcome');
 }
 reset(){
  if(!this.config||!this.nav)return;this.balloonTravel?.cancel();this.galleryLift?.cancel();this.helicopterFlight?.cancel();this.islandTransport?.cancel();this.camera.position.fromArray(this.config.spawn);const floor=this.floorAt(this.camera.position.x,this.camera.position.z,this.physics?this.config.spawn[1]-this.config.eye+.43:100,200);this.foot=floor??(this.config.spawn[1]-this.config.eye);this.camera.position.y=this.foot+this.config.eye;
  this.physics?.reset();this.mountainStorm?.reset();this.arenaCircus?.arrival.reset({x:this.config.spawn[0],z:this.config.spawn[2]});this.walkPosition=null;this.camera.lookAt(new THREE.Vector3(...this.config.look));this.yaw=this.camera.rotation.y;this.pitch=this.camera.rotation.x;this.motion.reset(this.yaw,this.pitch);this.clearWalkInput();
 }
 clearWalkInput(){const drag=this.drag;this.drag=null;this.keys.clear();this.stick.x=this.stick.y=0;this.motion.stop();this.touchStick?.reset();this.gameTaps?.reset();if(drag){const canvas=this.renderer.domElement;try{if(canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id)}catch{}}}
 setMode(mode){if(!this.bounds||this.mode===mode)return;this.balloonTravel?.cancel();this.galleryLift?.cancel();this.helicopterFlight?.cancel();this.islandTransport?.cancel();this.clearWalkInput();this.mode=mode;this.controls.enabled=mode==='orbit';document.getElementById('knob').style.transform='';
  if(mode==='orbit'){
   this.walkPosition=this.camera.position.clone();this.walkRotation=this.camera.rotation.clone();const size=this.bounds.getSize(new THREE.Vector3());const center=this.bounds.getCenter(new THREE.Vector3());center.y=Math.max(.8,this.bounds.min.y+size.y*.55);this.controls.target.copy(center);const extent=Math.max(size.x,size.z,size.y*.8);this.camera.position.set(center.x+extent*.92,center.y+extent*.58,center.z+extent*1.25);this.controls.maxDistance=extent*3.8;this.controls.minDistance=extent*.08;this.camera.lookAt(center);this.controls.update();
  }else if(this.walkPosition){this.camera.position.copy(this.walkPosition);this.camera.rotation.copy(this.walkRotation);this.yaw=this.camera.rotation.y;this.pitch=this.camera.rotation.x;this.motion.reset(this.yaw,this.pitch);this.walkPosition=null}
 }
 setActive(value){if(!value){this.mountainStorm?.stop();this.arenaCircus?.stop();this.galleryLift?.cancel();this.helicopterFlight?.cancel();this.islandTransport?.cancel()}this.active=value;this.previous=0;this.clearWalkInput();if(value&&!this.frame){this.resize();this.frame=requestAnimationFrame(t=>this.tick(t))}else if(!value&&this.frame){cancelAnimationFrame(this.frame);this.frame=0}}
 floorAt(x,z,top,far=2){
  this.navRay.set(new THREE.Vector3(x,top,z),DOWN);this.navRay.near=0;this.navRay.far=far;
  let floor=null;if(this.floorIndex){const hit=this.floorIndex.rayIntersect(this.navRay.ray);if(hit&&hit.distance<=far)floor=hit.position.y}else floor=this.navRay.intersectObjects(this.padNav?[this.nav,this.padNav]:[this.nav],false)[0]?.point.y??null;
  const cabin=this.gallery?.floorAt(x,z,top,far);return cabin!==null&&cabin!==undefined?floor===null?cabin:Math.max(floor,cabin):floor;
 }
 canStand(x,z,floor){if(this.architectureCollision&&!this.architectureCollision.canStand(x,z,floor,this.config.eye))return false;if(this.islandTransportWorld&&!this.islandTransportWorld.canStand(x,z,floor))return false;if(this.arenaCircus&&!this.arenaCircus.canStand(x,z,floor,this.config.eye))return false;if(this.gallery&&!this.gallery.canStand(x,z,floor))return false;const r=.17,lo=floor+.22,hi=floor+this.config.eye-.12;for(const b of this.boxes){if(hi>b.min.y&&lo<b.max.y&&x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r)return false}return true}
 stepTo(x,z){if(this.physics){const floor=this.physics.step(x,z,this.foot);if(floor===null)return false;this.camera.position.x=x;this.camera.position.z=z;this.foot=floor;return true}const floor=this.floorAt(x,z,this.foot+.49,1.2);if(floor===null||floor-this.foot>.48||this.foot-floor>.65||!this.canStand(x,z,floor))return false;this.camera.position.x=x;this.camera.position.z=z;this.foot=floor;return true}
 tick(time){this.frame=0;if(!this.active)return;const dt=Math.min((time-(this.previous||time))/1000,.08);this.previous=time;this.renderQuality?.update(dt);
  const ballooning=this.balloonTravel?.active;this.balloonTravel?.update(dt);
  const riding=this.galleryLift?.active;this.galleryLift?.update(dt);
  const flying=this.helicopterFlight?.active;this.helicopterFlight?.update(dt);
  const transporting=this.islandTransport?.active;this.islandTransport?.update(dt);
  if(this.mode==='walk'&&this.nav&&!riding&&!flying&&!transporting&&!ballooning&&!this.balloonTravel?.mapOpen){
   let sx=this.stick.x+(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0),sy=-this.stick.y+(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0);const length=Math.hypot(sx,sy);if(length>1){sx/=length;sy/=length}
   const motion=this.motion.update(dt,sx,sy,this.config.speed*(this.keys.has('ShiftLeft')?1.5:1));this.yaw=motion.yaw;this.pitch=motion.pitch;
   const {dx,dz}=motion;
   if(dx||dz){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));for(let i=0;i<steps;i++){const x=dx/steps,z=dz/steps;if(!this.stepTo(this.camera.position.x+x,this.camera.position.z+z)){const a=this.stepTo(this.camera.position.x+x,this.camera.position.z);const b=this.stepTo(this.camera.position.x,this.camera.position.z+z);if(!a&&!b)break}}
   }
   if(this.physics){this.foot=this.physics.fall(this.camera.position.x,this.camera.position.z,this.foot,dt);if(this.foot<this.bounds.min.y-8)this.reset()}
   this.camera.position.y=this.physics&&!this.physics.grounded?this.foot+this.config.eye:THREE.MathUtils.damp(this.camera.position.y,this.foot+this.config.eye,17,dt);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
  }else if(this.mode==='walk'&&riding){this.motion.update(dt,0,0,0);this.yaw=this.motion.yaw;this.pitch=this.motion.pitch;this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ')}else if(!flying&&!transporting&&!ballooning)this.controls.update();for(const mixer of this.mixers||[])mixer.update(dt);this.groypAir?.update(dt,this.mode==='walk'&&!ballooning?this.camera.position:null);this.arenaCircus?.update(dt,this.mode==='walk'?this.camera.position:null);this.mountainStorm?.update(dt,this.mode==='walk'?this.camera.position:null);this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 gameAt(clientX,clientY){
  if(!this.active)return null;
  const r=this.renderer.domElement.getBoundingClientRect();const point=new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);
  if(this.groypAir?.pick(this.camera,point))return {action:'balloon-map',title:'GROYP AIR flight desk'};
  if(this.balloonWorld?.pick(this.camera,point))return {action:'balloon-map',title:'Flight map'};
  return this.arcadeTargets?.pick(this.camera,point,[this.staticGroup,this.root].filter(Boolean),this.mode==='walk'&&this.slug!=='goat-mountain'?12:Infinity);
 }
 launchGame(clientX,clientY){
  if(this.balloonTravel?.active||this.galleryLift?.active||this.helicopterFlight?.active||this.islandTransport?.active||Math.hypot(this.stick.x,this.stick.y)>.05||this.keys.size||Math.hypot(this.motion.vx,this.motion.vz)>.12)return;
  const game=this.gameAt(clientX,clientY);if(!game)return;
  this.clearWalkInput();
  if(game.action==='balloon-map')return this.balloonTravel?.openMap();
  if(game.action==='honk'){
   const circus=this.arenaCircus;return circus?.honk(game.nose).then(ok=>{if(!ok&&this.active&&this.arenaCircus===circus&&circus.soundError){const hint=document.getElementById('hint');hint.textContent='Tap the nose again to enable the horn';hint.classList.remove('fade')}return ok});
  }
  const link=document.createElement('a');link.href=game.url;link.target='_blank';link.rel='noopener noreferrer';link.style.display='none';document.body.append(link);link.click();link.remove();
 }
 bindInput(){
  const canvas=this.renderer.domElement;canvas.style.touchAction='none';
  let lastHover=0;this.gameTaps=attachTapGesture(canvas,(x,y)=>this.launchGame(x,y),{enabled:()=>this.active&&!!this.arcadeTargets,tapPolicy:e=>this.slug==='arena'&&this.gameAt(e.clientX,e.clientY)?.action==='honk'?{distance:14,duration:800}:null,onHover:(x,y)=>{const now=performance.now();if(now-lastHover<100)return;lastHover=now;const game=this.gameAt(x,y);canvas.style.cursor=game?'pointer':'';canvas.title=game?(game.action==='honk'?game.title:'Open '+game.title):''}});
  this.host.addEventListener('keydown',e=>{if(e.key==='Enter'&&this.active&&this.arcadeTargets){const r=canvas.getBoundingClientRect();e.preventDefault();this.launchGame(r.left+r.width/2,r.top+r.height/2)}});
  canvas.addEventListener('pointerdown',e=>{if(!this.active||this.mode!=='walk'||this.drag||(e.pointerType==='mouse'&&e.button!==0))return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!this.active||!this.drag||e.pointerId!==this.drag.id||this.mode!=='walk')return;this.motion.turn(e.clientX-this.drag.x,e.clientY-this.drag.y);this.drag.x=e.clientX;this.drag.y=e.clientY});
  const end=e=>{if(this.drag?.id===e.pointerId)this.drag=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  window.addEventListener('keydown',e=>{if(!this.active||this.mode!=='walk')return;if(/^(Key[WASD]|Arrow(Up|Down|Left|Right)|ShiftLeft)$/.test(e.code)||(this.helicopterFlight?.active&&/^(Space|KeyC)$/.test(e.code))||(this.islandTransport?.active&&e.code==='Space')){e.preventDefault();this.keys.add(e.code)}});window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clearWalkInput());
  this.touchStick=createTouchStick(document.getElementById('joystick'),document.getElementById('knob'),(x,y)=>{this.stick.x=x;this.stick.y=y});
  const codes={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);this.keys.add(codes[b.dataset.move])});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>this.keys.delete(codes[b.dataset.move]))});
 }
 clear(){
  this.groypAir?.dispose();this.groypAir=null;
  this.balloonTravel?.dispose();this.balloonTravel=null;this.balloonWorld?.dispose();this.balloonWorld=null;
  this.islandTransport?.dispose();this.islandTransport=null;this.islandTransportWorld=null;
  this.antiqueRoom?.dispose();this.antiqueRoom=null;
  this.mountainStorm?.dispose();this.mountainStorm=null;
  this.helicopterFlight?.dispose();this.helicopterFlight=null;this.galleryLift?.dispose();this.galleryLift=null;this.gallery=null;this.helicopter=null;
  this.helicopterCollision?.dispose();this.helicopterCollision=null;this.helicopterExplosion?.dispose();this.helicopterExplosion=null;
  if(this.padNav){this.padNav.geometry.dispose();this.padNav.material.dispose();this.padNav=null}
  this.architectureCollision?.dispose();this.architectureCollision=null;
  this.physics?.dispose();this.physics=null;this.floorIndex?.clear();this.floorIndex=null;this.walkCollision=null;if(this.stairNav){this.stairNav.geometry.dispose();this.stairNav.material.dispose();this.stairNav=null}
  if(this.arenaCircus){this.arenaCircus.dispose();this.arenaCircus=null}else this.arcadeTargets?.dispose();this.arcadeTargets=null;this.gameTaps?.reset();this.renderer.domElement.title='';this.renderer.domElement.style.cursor='';
  for(const mixer of this.mixers||[])mixer.stopAllAction();const geometries=new Set(),materials=new Set(),textures=new Set();for(const root of [this.root,this.staticGroup,this.clouds,this.nav]){if(!root)continue;root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture&&v!==this.environment)textures.add(v)}});root.removeFromParent()}
  textures.forEach(t=>{t.dispose();if(t.source?.data?.close)t.source.data.close()});materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());this.root=this.staticGroup=this.clouds=this.nav=null;this.mixers=[];this.boxes=[];this.walkPosition=null;this.renderer.renderLists.dispose();
 }
}


