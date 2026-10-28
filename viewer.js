import {replaceWorldOriginalHonks} from './original-honk-world.js?v=176';
import {loadArenaOriginalHonk} from './arena-original-honk.js?v=172';
import {prepareHonkNews} from './honk-news.js?v=178';
import {mountMafiaEncounter} from './mafia-encounter.js?v=145';
import {mountDesktopControls} from './desktop-controls.js?v=157';
import {mountCastleGreeting} from './castle-greeting.js?v=123';
import {createAssetCache,fetchAssetBytes,fetchAssetJSON,fetchGzipJSON,loadCompressedScene} from './asset-loader.js?v=116';
import * as THREE from 'three';
import {createArchitectureCollision} from './walk-architecture.js?v=77';
import {prepareArenaAudience} from './arena-crowd.js?v=173';
import {prepareGroypAir} from './groyp-air.js?v=120';
import {prepareVisualQuality} from './visual-quality.js?v=171';
import {prepareBalloonWorld,loadBalloonMapImages} from './balloon-world.js?v=156';
import {mountBalloonTravel} from './balloon-travel.js?v=156';
import {MobileRenderQuality} from './mobile-render-quality.js?v=59';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import {createArcadeTargets} from './arcade-links.js?v=8';
import {WalkPhysics,createGalleryCollision,createFloorIndex} from './walk-physics.js?v=150';
import {prepareMountainSnow} from './mountain-snow.js?v=138';
import {createSkiHonk} from './ski-honk.js?v=178';
import {mountMountainSki} from './mountain-ski.js?v=140';
import {rebuildMountainStairs} from './mountain-stairs.js?v=152';
import {repairLandingPad} from './landing-pad.js?v=19';
import {addClownHelicopter} from './clown-helicopter.js?v=59';
import {mountHelicopterFlight} from './helicopter-flight.js?v=149';
import {createHelicopterCollision,createHelicopterExplosion} from './helicopter-world.js?v=147';
import {createMountainNavigation,createMountainCollision,MountainWalkPhysics} from './mountain-walk.js?v=96';
import {createWorldTargets} from './world-links.js?v=99';
import {prepareArenaCircus} from './arena-circus.js?v=178';
import {attachTapGesture} from './tap-gesture.js?v=145';
import { createTouchStick } from './touch-stick.js?v=6';
import { WalkMotion } from './walk-motion.js?v=33';
import {loadHonkFamilyPictures} from './family-wall.js?v=72';
import {prepareAntiqueRoom} from './antique-room.js?v=144';
import {mountWardrobeAmbush} from './wardrobe-ambush.js?v=144';
import {mountKnockoutRecovery} from './knockout-recovery.js?v=105';
import {prepareGalleryMemes} from './gallery-memes.js?v=93';
import {prepareGalleryGraffiti} from './gallery-graffiti.js?v=100';
import {prepareGalleryInterior} from './gallery-interior.js?v=143';
import {mountMountainStorm,findMountainStormAnchor} from './mountain-storm.js?v=151';
import {mountGalleryLift} from './gallery-lift.js?v=72';
import {prepareIslandTransport} from './island-transport-world.js?v=178';
import {mountIslandTransport} from './island-transport.js?v=153';
import {loadHonkKartHead} from './kart-driver.js?v=178';
import { createPanoramicSky } from './sky360.js?v=5';
const DOWN=new THREE.Vector3(0,-1,0),UP=new THREE.Vector3(0,1,0),clamp=THREE.MathUtils.clamp;
const loadWorldConfig=createAssetCache(()=>fetchAssetJSON('./worlds.json?v=7'));
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
 async fetchBinary(url,onChunk=()=>{},options={}){return fetchAssetBytes(url,onChunk,options)}
 async loadGroypActor(){
  const manifest=await fetchAssetJSON('./models/groyp-air-v74.json'),buffer=await loadCompressedScene(manifest,(part,onChunk,cache)=>this.fetchBinary('./models/'+part,onChunk,{cache}));return (await new GLTFLoader().parseAsync(buffer,'')).scene;
 }
 async open(slug,progress){
  this.setActive(false);this.clear();this.slug=slug;this.camera.near=slug==='arena'?.10:.035;this.camera.far=slug==='arena'?180:1100;this.camera.updateProjectionMatrix();this.config=(await loadWorldConfig())[slug];if(!this.config)throw Error('Unknown island');this.renderQuality.configure(this.config.pixelRatio||1.6);
  this.manifest=await fetchAssetJSON(`./models/${slug}.json?v=9`);const buffer=await loadCompressedScene(this.manifest,(part,onChunk,cache)=>this.fetchBinary(`./models/${part}?v=9`,onChunk,{cache}),progress);progress(.78,'Opening the 3D world…');
  const gltf=await new GLTFLoader().parseAsync(buffer,'');this.root=gltf.scene;this.originalHonk=slug!=='citadel'?await loadArenaOriginalHonk():null;this.root.updateMatrixWorld(true);replaceWorldOriginalHonks(this.root,slug,this.originalHonk);this.antiqueRoom=slug==='honkhub'?prepareAntiqueRoom(this.root,{familyTextures:await loadHonkFamilyPictures(),balloonDoor:true,wardrobeActor:await this.loadGroypActor()}):null;if(slug==='carnival')await Promise.all([prepareGalleryMemes(this.root),prepareGalleryGraffiti(this.root)]);this.gallery=slug==='carnival'?prepareGalleryInterior(this.root):null;this.arenaCircus=slug==='arena'?prepareArenaCircus(this.root,this.environment,{statue:this.originalHonk}):null;this.arcadeTargets=slug==='arcade-district'?createArcadeTargets(this.root):slug==='arena'?this.arenaCircus.picker:createWorldTargets(this.root,slug);
  this.honkNews=slug==='honkhub'?await prepareHonkNews(this.root,{original:this.originalHonk}).catch(error=>{console.warn('HONK NEWS unavailable',error);return null}):null;
  let mountainShell=null;if(slug==='goat-mountain'){mountainShell=await fetchGzipJSON('./models/goat-mountain-shell-v22.bin?v=22')}
  this.stairNav=slug==='goat-mountain'?rebuildMountainStairs(this.root,mountainShell):null;this.padNav=slug==='citadel'?repairLandingPad(this.root):null;this.mountainSnow=null;
  this.islandTransportWorld=prepareIslandTransport(this.root,slug,{driverHead:slug==='arcade-district'?{original:this.originalHonk}:null});
  this.helicopter=slug==='citadel'?addClownHelicopter(this.root):null;
  this.balloonWorld=prepareBalloonWorld(this.root,slug,{mapImages:await loadBalloonMapImages()});this.mountainSnow=slug==='goat-mountain'?prepareMountainSnow(this.root,{balloonExit:this.balloonWorld.exit}):null;
  if(slug==='arcade-district')this.groypAir=prepareGroypAir(this.root,this.balloonWorld,await this.loadGroypActor());
  this.arenaCrowd=slug==='arena'?await prepareArenaAudience(this.root,{honkModel:this.arenaCircus.originalHonk}):null;
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
   if(o.isLight){remove.push(o);return}if(!o.isMesh||o.userData.arenaOriginalHonk)return;
   // Keep the existing open-roof presentation while restoring the missing wall.
   if(slug==='carnival'&&/^(Upper_landing_black_balustrade|Upper_end_landing_luminous_handrail)/.test(o.name)){remove.push(o);return}
   if(this.config.openRoof&&o.name.startsWith('Suspended_acoustic_ceiling_tile')){remove.push(o);return}
   const mats=Array.isArray(o.material)?o.material:[o.material];for(const mat of mats){if(mat.map)mat.map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());if(mat.emissiveIntensity>2.2)mat.emissiveIntensity=2.2}
   if(o.userData.honkNews||o.userData.honkNose||o.userData.wardrobeDynamic||o.userData.galleryDynamic||o.userData.helicopterDynamic||o.userData.arenaArrival||o.userData.arenaCrowd||o.userData.islandRide||animated.has(o.uuid)||o.isSkinnedMesh||Array.isArray(o.material))return;
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
  for(const extension of [this.islandTransportWorld,this.balloonWorld,this.groypAir,this.mountainSnow].filter(Boolean)){const extra=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(extension.navPositions,3)),old=this.nav.geometry;this.nav.geometry=mergeGeometries([old,extra],false);old.dispose();extra.dispose();this.nav.geometry.computeBoundingSphere()}
  this.boxes=this.manifest.collisionBoxes.map(([lo,hi])=>new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi)));this.boxes.push(...(this.arenaCircus?.extraBoxes||[]),...(this.arenaCrowd?.extraBoxes||[]),...(this.gallery?.extraBoxes||[]),...(this.helicopter?.extraBoxes||[]),...(this.antiqueRoom?.extraBoxes||[]),...(this.honkNews?.extraBoxes||[]));this.bounds=this.antiqueRoom?.bounds.clone()||new THREE.Box3(new THREE.Vector3(...this.manifest.bounds[0]),new THREE.Vector3(...this.manifest.bounds[1]));
  this.floorIndex=['carnival','goat-mountain','arena'].includes(slug)?createFloorIndex(this.nav,{doubleSided:slug==='arena',minNormalY:slug==='goat-mountain'?.3:.5}):null;
  for(const extension of [this.islandTransportWorld,this.balloonWorld,this.groypAir,this.mountainSnow].filter(Boolean)){this.boxes.push(...extension.extraBoxes);this.bounds.union(extension.bounds)}
  const Physics=slug==='goat-mountain'?MountainWalkPhysics:WalkPhysics;
  this.physics=['carnival','goat-mountain'].includes(slug)?new Physics({floorAt:(...args)=>this.floorAt(...args),canStand:(...args)=>this.canStand(...args),eye:this.config.eye,collision:this.walkCollision}):null;
  // Reset the lighting on every visit so the mountain's warm circus light
  // cannot tint the other rooms after returning to the map.
  const circus=slug==='goat-mountain'||slug==='arena';for(const light of this.scene.children){
   if(light.isHemisphereLight){light.color.set(circus?0xfff1da:0xe7f5ff);light.groundColor.set(circus?0x8a6b54:0x80717f)}
   else if(light.isDirectionalLight)light.color.set(light.position.x>0?(circus?0xffdfaa:0xfff1d2):(circus?0xffe5c2:0xb5dfff));
  }
  this.antiqueRoom?.mountLights(this.scene);this.wardrobeAmbush=this.antiqueRoom?.wardrobe?mountWardrobeAmbush(this,this.antiqueRoom.wardrobe):null;
  this.renderer.toneMappingExposure=this.config.exposure;this.mountainStorm=slug==='goat-mountain'?mountMountainStorm(this,stormAnchor):null;this.reset();this.setMode('walk');this.galleryLift=this.gallery?mountGalleryLift(this,this.gallery):null;this.helicopterExplosion=this.helicopter?createHelicopterExplosion(this.root):null;this.helicopterFlight=this.helicopter?mountHelicopterFlight(this,this.helicopter,{collision:this.helicopterCollision,effects:this.helicopterExplosion}):null;this.islandTransport=this.islandTransportWorld?mountIslandTransport(this,this.islandTransportWorld):null;this.balloonTravel=this.balloonWorld?mountBalloonTravel(this,this.balloonWorld):null;this.knockoutRecovery=slug==='arena'?mountKnockoutRecovery(this):null;this.mountainSki=this.mountainSnow?mountMountainSki(this,this.mountainSnow,createSkiHonk(this.mountainSnow.group,{original:this.originalHonk})):null;this.castleGreeting=slug==='honkhub'?mountCastleGreeting(this):null;this.mafiaFight=slug==='honkhub'?mountMafiaEncounter(this):null;this.resize();progress(.96,'Almost there…');await this.renderer.compileAsync(this.scene,this.camera);await this.mountainStorm?.prepare(this.renderer,this.camera);await this.honkNews?.prepare(this.renderer);this.renderer.render(this.scene,this.camera);progress(1,'Welcome');
 }
 reset(){
  if(!this.config||!this.nav)return;this.mafiaFight?.cancel();this.castleGreeting?.cancel();this.knockoutRecovery?.cancel();this.wardrobeAmbush?.cancel();this.mountainSki?.cancel();this.balloonTravel?.cancel();this.galleryLift?.cancel();this.helicopterFlight?.cancel();this.islandTransport?.cancel();this.camera.position.fromArray(this.config.spawn);const floor=this.floorAt(this.camera.position.x,this.camera.position.z,this.physics?this.config.spawn[1]-this.config.eye+.43:100,200);this.foot=floor??(this.config.spawn[1]-this.config.eye);this.camera.position.y=this.foot+this.config.eye;
  this.physics?.reset();this.mountainStorm?.reset();this.arenaCircus?.arrival.reset({x:this.config.spawn[0],z:this.config.spawn[2]});this.walkPosition=null;this.camera.lookAt(new THREE.Vector3(...this.config.look));this.yaw=this.camera.rotation.y;this.pitch=this.camera.rotation.x;this.motion.reset(this.yaw,this.pitch);this.clearWalkInput();
 }
 clearWalkInput(){const drag=this.drag;this.drag=null;this.keys.clear();this.stick.x=this.stick.y=0;this.motion.stop();this.touchStick?.reset();this.gameTaps?.reset();if(drag){const canvas=this.renderer.domElement;try{if(canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id)}catch{}}}
 setMode(mode){if(!this.bounds||this.mode===mode)return;this.mafiaFight?.cancel();this.castleGreeting?.cancel();this.knockoutRecovery?.cancel();this.wardrobeAmbush?.cancel();this.mountainSki?.cancel();this.balloonTravel?.cancel();this.galleryLift?.cancel();this.helicopterFlight?.cancel();this.islandTransport?.cancel();this.clearWalkInput();this.desktopControls?.reset();this.mode=mode;this.controls.enabled=mode==='orbit';document.getElementById('knob').style.transform='';
  if(mode==='orbit'){
   this.walkPosition=this.camera.position.clone();this.walkRotation=this.camera.rotation.clone();const size=this.bounds.getSize(new THREE.Vector3());const center=this.bounds.getCenter(new THREE.Vector3());center.y=Math.max(.8,this.bounds.min.y+size.y*.55);this.controls.target.copy(center);const extent=Math.max(size.x,size.z,size.y*.8);this.camera.position.set(center.x+extent*.92,center.y+extent*.58,center.z+extent*1.25);this.controls.maxDistance=extent*3.8;this.controls.minDistance=extent*.08;this.camera.lookAt(center);this.controls.update();
  }else if(this.walkPosition){this.camera.position.copy(this.walkPosition);this.camera.rotation.copy(this.walkRotation);this.yaw=this.camera.rotation.y;this.pitch=this.camera.rotation.x;this.motion.reset(this.yaw,this.pitch);this.walkPosition=null}
 }
 setActive(value,{suspend=false}={}){this.honkNews?.setActive(value);if(!value){if(!suspend){this.mafiaFight?.cancel();this.castleGreeting?.cancel();this.wardrobeAmbush?.cancel()}this.mountainSki?.cancel();this.mountainStorm?.stop();this.arenaCircus?.stop();this.galleryLift?.cancel();this.helicopterFlight?.cancel();this.islandTransport?.cancel()}this.active=value;if(!value)this.desktopControls?.reset();this.previous=0;this.clearWalkInput();if(value&&!this.frame){this.resize();this.frame=requestAnimationFrame(t=>this.tick(t))}else if(!value&&this.frame){cancelAnimationFrame(this.frame);this.frame=0}}
 floorAt(x,z,top,far=2){
  this.navRay.set(new THREE.Vector3(x,top,z),DOWN);this.navRay.near=0;this.navRay.far=far;
  let floor=null;if(this.floorIndex){const hit=this.floorIndex.rayIntersect(this.navRay.ray);if(hit&&hit.distance<=far)floor=hit.position.y}else floor=this.navRay.intersectObjects(this.padNav?[this.nav,this.padNav]:[this.nav],false)[0]?.point.y??null;
  for(const extension of [this.gallery,this.islandTransportWorld]){const cabin=extension?.floorAt?.(x,z,top,far);if(cabin!==null&&cabin!==undefined)floor=floor===null?cabin:Math.max(floor,cabin)}return floor;
 }
 canStand(x,z,floor){if(this.castleGreeting&&!this.castleGreeting.canStand(x,z,floor))return false;if(this.architectureCollision&&!this.architectureCollision.canStand(x,z,floor,this.config.eye))return false;if(this.islandTransportWorld&&!this.islandTransportWorld.canStand(x,z,floor))return false;if(this.arenaCircus&&!this.arenaCircus.canStand(x,z,floor,this.config.eye))return false;if(this.gallery&&!this.gallery.canStand(x,z,floor))return false;const r=.17,lo=floor+.22,hi=floor+this.config.eye-.12;for(const b of this.boxes){if(hi>b.min.y&&lo<b.max.y&&x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r)return false}return true}
 stepTo(x,z){if(this.physics){const floor=this.physics.step(x,z,this.foot);if(floor===null)return false;this.camera.position.x=x;this.camera.position.z=z;this.foot=floor;return true}const floor=this.floorAt(x,z,this.foot+.49,1.2);if(floor===null||floor-this.foot>.48||this.foot-floor>.65||!this.canStand(x,z,floor))return false;this.camera.position.x=x;this.camera.position.z=z;this.foot=floor;return true}
 tick(time){this.frame=0;if(!this.active)return;const dt=Math.min((time-(this.previous||time))/1000,.08);this.previous=time;this.renderQuality?.update(dt);
  if(this.mafiaFight?.active){this.honkNews?.update(0,this);this.mafiaFight.update(dt);this.desktopControls?.update(dt);this.renderer.render(this.mafiaFight.active?this.mafiaFight.scene:this.scene,this.camera);this.frame=requestAnimationFrame(t=>this.tick(t));return}

  const skiing=this.mountainSki?.active;this.mountainSki?.update(dt);
  const ballooning=this.balloonTravel?.active;this.balloonTravel?.update(dt);
  const riding=this.galleryLift?.active;this.galleryLift?.update(dt);
  const flying=this.helicopterFlight?.active;this.helicopterFlight?.update(dt);
  const transporting=this.islandTransport?.active;this.islandTransport?.update(dt);
  const recovering=this.knockoutRecovery?.active;this.knockoutRecovery?.update(dt);this.wardrobeAmbush?.update(dt);const ambushed=this.wardrobeAmbush?.active;this.castleGreeting?.update(dt);const greeting=this.castleGreeting?.active;
  if(this.mode==='walk'&&this.nav&&!greeting&&!recovering&&!ambushed&&!riding&&!flying&&!transporting&&!ballooning&&!skiing&&!this.balloonTravel?.mapOpen&&!this.desktopControls?.menuOpen){
   let sx=this.stick.x+(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0),sy=-this.stick.y+(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0);const length=Math.hypot(sx,sy);if(length>1){sx/=length;sy/=length}
   const motion=this.motion.update(dt,sx,sy,this.config.speed*1.3*((this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'))?1.5:1));this.yaw=motion.yaw;this.pitch=motion.pitch;
   const {dx,dz}=motion;
   if(dx||dz){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));for(let i=0;i<steps;i++){const x=dx/steps,z=dz/steps;if(!this.stepTo(this.camera.position.x+x,this.camera.position.z+z)){const a=this.stepTo(this.camera.position.x+x,this.camera.position.z);const b=this.stepTo(this.camera.position.x,this.camera.position.z+z);if(!a&&!b)break}}
   }
   if(this.physics){this.foot=this.physics.fall(this.camera.position.x,this.camera.position.z,this.foot,dt);if(this.foot<this.bounds.min.y-8)this.reset()}
   this.camera.position.y=this.physics&&!this.physics.grounded?this.foot+this.config.eye:THREE.MathUtils.damp(this.camera.position.y,this.foot+this.config.eye,17,dt);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
  }else if(this.mode==='walk'&&riding){this.motion.update(dt,0,0,0);this.yaw=this.motion.yaw;this.pitch=this.motion.pitch;this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ')}else if(!greeting&&!recovering&&!ambushed&&!flying&&!transporting&&!ballooning&&!skiing)this.controls.update();for(const mixer of this.mixers||[])mixer.update(dt);this.arenaCrowd?.update(dt,this.camera);this.groypAir?.update(dt,this.mode==='walk'&&!ballooning?this.camera.position:null);this.arenaCircus?.update(dt,this.mode==='walk'?this.camera.position:null);this.mountainStorm?.update(dt,this.mode==='walk'?this.camera.position:null);this.antiqueRoom?.updateLighting?.(this.camera.position,this.mode);this.desktopControls?.update(dt);this.honkNews?.update(dt,this);this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 gameAt(clientX,clientY){
  if(!this.active||this.mafiaFight?.active||this.mafiaFight?.loading||this.castleGreeting?.active||this.knockoutRecovery?.active||this.wardrobeAmbush?.active)return null;
  const r=this.renderer.domElement.getBoundingClientRect();const point=new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);
  if(this.mode==='walk'&&this.antiqueRoom?.wardrobe?.pick(this.camera,point,[this.staticGroup,this.root].filter(Boolean)))return {action:'wardrobe-open',title:'Open wardrobe'};
  if(this.mode==='walk'){const tv=this.honkNews?.pick(this.camera,point,[this.staticGroup,this.root].filter(Boolean));if(tv)return tv}
  if(this.mode==='walk'&&this.balloonWorld?.canBoard(this.camera.position,this.foot)&&this.groypAir?.pick(this.camera,point))return {action:'balloon-map',title:'GROYP AIR flight desk'};
  if(this.mode==='walk'&&this.balloonWorld?.pick(this.camera,point,this.foot))return {action:'balloon-map',title:'Flight map'};
  return this.arcadeTargets?.pick(this.camera,point,[this.staticGroup,this.root].filter(Boolean),this.mode==='walk'&&this.slug!=='goat-mountain'?12:Infinity);
 }
 launchGame(clientX,clientY){
  if(this.mafiaFight?.active)return this.mafiaFight.shoot();
  if(this.castleGreeting?.active||this.knockoutRecovery?.active||this.wardrobeAmbush?.active||this.mountainSki?.active||this.balloonTravel?.active||this.galleryLift?.active||this.helicopterFlight?.active||this.islandTransport?.active)return;
  const game=this.gameAt(clientX,clientY);if(!game)return;
  // An intentional tap on the flight map/basket stops the walker first. A
  // held movement finger or residual velocity must not swallow this action.
  if(game.action==='honk-news'){this.clearWalkInput();return this.honkNews?.interact(game.control)}
  if(game.action==='balloon-map'){this.clearWalkInput();return this.balloonTravel?.openMap()}
  if(Math.hypot(this.stick.x,this.stick.y)>.05||this.keys.size||Math.hypot(this.motion.vx,this.motion.vz)>.12)return;
  this.clearWalkInput();
  if(game.action==='wardrobe-open')return this.wardrobeAmbush?.begin();
  if(game.action==='honk'){
   const circus=this.arenaCircus;return circus?.honk(game.nose).then(ok=>{if(!ok&&this.active&&this.arenaCircus===circus&&circus.soundError){const hint=document.getElementById('hint');hint.textContent='Tap the nose again to enable the horn';hint.classList.remove('fade')}return ok});
  }
  const link=document.createElement('a');link.href=game.url;link.target='_blank';link.rel='noopener noreferrer';link.style.display='none';document.body.append(link);link.click();link.remove();
 }
 bindInput(){
  const canvas=this.renderer.domElement;canvas.style.touchAction='none';
  let lastHover=0;this.gameTaps=attachTapGesture(canvas,(x,y)=>this.launchGame(x,y),{enabled:e=>!(e?.pointerType==='mouse'&&this.desktopControls?.handlesMouse)&&this.active&&!!this.arcadeTargets&&!this.desktopControls?.locked&&!this.desktopControls?.menuOpen,tapPolicy:e=>this.slug==='arena'&&this.gameAt(e.clientX,e.clientY)?.action==='honk'?{distance:14,duration:800}:null,onHover:(x,y)=>{const now=performance.now();if(now-lastHover<100)return;lastHover=now;const game=this.gameAt(x,y);canvas.style.cursor=game?'pointer':'';canvas.title=game?(game.action==='honk'?game.title:'Open '+game.title):''}});
  this.host.addEventListener('keydown',e=>{if(e.key==='Enter'&&this.active&&this.arcadeTargets){const r=canvas.getBoundingClientRect();e.preventDefault();this.launchGame(r.left+r.width/2,r.top+r.height/2)}});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&this.desktopControls?.handlesMouse)return;if(!this.active||this.castleGreeting?.active||this.knockoutRecovery?.active||this.wardrobeAmbush?.active||this.mafiaFight?.active&&!this.mafiaFight.fighting||this.mode!=='walk'||this.desktopControls?.locked||this.desktopControls?.menuOpen||this.drag||(e.pointerType==='mouse'&&e.button!==0))return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!this.active||this.mafiaFight?.active&&!this.mafiaFight.fighting||this.desktopControls?.locked||this.desktopControls?.menuOpen||!this.drag||e.pointerId!==this.drag.id||this.mode!=='walk')return;const scale=e.pointerType==='mouse'?(this.desktopControls?.lookScale??1):1,dx=(e.clientX-this.drag.x)*scale,dy=(e.clientY-this.drag.y)*scale;if(this.mountainSki?.active)this.mountainSki.look(dx,dy);else this.motion.turn(dx,dy);this.drag.x=e.clientX;this.drag.y=e.clientY});
  const end=e=>{if(this.drag?.id===e.pointerId)this.drag=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  window.addEventListener('keydown',e=>{if(e.defaultPrevented||e.target?.matches?.('input, textarea, select, [contenteditable="true"]')||this.desktopControls?.menuOpen||this.mafiaFight?.active&&!this.mafiaFight.fighting||!this.active||this.castleGreeting?.active||this.knockoutRecovery?.active||this.wardrobeAmbush?.active||this.mode!=='walk')return;if(/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Shift(Left|Right))$/.test(e.code)||(this.helicopterFlight?.active&&/^(Space|KeyC)$/.test(e.code))||((this.islandTransport?.active||this.mountainSki?.active)&&e.code==='Space')){e.preventDefault();this.keys.add(e.code)}});window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clearWalkInput());
  this.desktopControls=mountDesktopControls(this);
  this.touchStick=createTouchStick(document.getElementById('joystick'),document.getElementById('knob'),(x,y)=>{this.stick.x=x;this.stick.y=y});
  const codes={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);this.keys.add(codes[b.dataset.move])});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>this.keys.delete(codes[b.dataset.move]))});
 }
 clear(){
  this.honkNews?.dispose();this.honkNews=null;
  this.mafiaFight?.dispose();this.mafiaFight=null;
  this.desktopControls?.reset();
  this.castleGreeting?.dispose();this.castleGreeting=null;
  this.arenaCrowd?.dispose();this.arenaCrowd=null;
  this.groypAir?.dispose();this.groypAir=null;
  this.balloonTravel?.dispose();this.balloonTravel=null;this.balloonWorld?.dispose();this.balloonWorld=null;
  this.islandTransport?.dispose();this.islandTransport=null;this.islandTransportWorld=null;
  this.knockoutRecovery?.dispose();this.knockoutRecovery=null;this.wardrobeAmbush?.dispose();this.wardrobeAmbush=null;this.antiqueRoom?.dispose();this.antiqueRoom=null;
  this.mountainSki?.dispose();this.mountainSki=null;
  this.mountainStorm?.dispose();this.mountainStorm=null;this.mountainSnow=null;
  this.helicopterFlight?.dispose();this.helicopterFlight=null;this.galleryLift?.dispose();this.galleryLift=null;this.gallery=null;this.helicopter=null;
  this.helicopterCollision?.dispose();this.helicopterCollision=null;this.helicopterExplosion?.dispose();this.helicopterExplosion=null;
  if(this.padNav){this.padNav.geometry.dispose();this.padNav.material.dispose();this.padNav=null}
  this.architectureCollision?.dispose();this.architectureCollision=null;
  this.physics?.dispose();this.physics=null;this.floorIndex?.clear();this.floorIndex=null;this.walkCollision=null;if(this.stairNav){this.stairNav.geometry.dispose();this.stairNav.material.dispose();this.stairNav=null}
  if(this.arenaCircus){this.arenaCircus.dispose();this.arenaCircus=null}else this.arcadeTargets?.dispose();this.arcadeTargets=null;this.gameTaps?.reset();this.renderer.domElement.title='';this.renderer.domElement.style.cursor='';
  for(const mixer of this.mixers||[])mixer.stopAllAction();const geometries=new Set(),materials=new Set(),textures=new Set();for(const root of [this.root,this.staticGroup,this.clouds,this.nav,this.originalHonk?.scene]){if(!root)continue;root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.isSkinnedMesh)o.skeleton.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture&&v!==this.environment)textures.add(v)}});root.removeFromParent()}
  textures.forEach(t=>{t.dispose();if(t.source?.data?.close)t.source.data.close()});materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());this.root=this.staticGroup=this.clouds=this.nav=this.originalHonk=null;this.mixers=[];this.boxes=[];this.walkPosition=null;this.renderer.renderLists.dispose();
 }
}


