import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
import {WalkMotion} from '../walk-motion.js';
const source=readFileSync(new URL('../knockout-recovery.js',import.meta.url),'utf8').replace("from 'three'",`from '${new URL('../vendor/three.module.min.js',import.meta.url).href}'`);
const {mountKnockoutRecovery,RECOVERY_DURATION}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
class Element{constructor(){this.style={};this.nodes=new Map();this.children=[];this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)}}append(e){this.children.push(e)}setAttribute(){}querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s)}remove(){this.removed=true}}
function setup(){const host=new Element();globalThis.document={getElementById:()=>host,createElement:()=>new Element()};const camera=new THREE.PerspectiveCamera(66,4/3,.1,180);camera.position.set(0,1.67,2.5);camera.rotation.set(-.05,.4,0,'YXZ');const viewer={camera,foot:.02,yaw:.4,pitch:-.05,config:{eye:1.65},controls:{enabled:false},renderer:{domElement:{style:{filter:'contrast(1)'}}},motion:new WalkMotion(),clearWalkInput(){this.cleared=(this.cleared||0)+1}},controller=mountKnockoutRecovery(viewer);return {host,viewer,controller,veil:host.children[0]}}
function advance(c,t,hz=60){for(let left=t;left>1e-8;){const dt=Math.min(left,1/hz);c.update(dt);left-=dt}}
test('the player wakes on the arena floor, vision opens while sitting and standing, then a mild sway settles into normal walking',async()=>{
 const e=setup(),{controller:c,viewer:v,veil}=e,standing=v.camera.position.clone(),quaternion=v.camera.quaternion.clone(),done=c.begin();assert.equal(c.active,true);assert.ok(v.camera.position.y<.25);assert.ok(v.camera.rotation.z>1);assert.equal(veil.hidden,false);assert.equal(veil.querySelector('.knockout-dim').style.opacity,'1');assert.equal(veil.querySelector('.knockout-lid-top').style.transform,'scaleY(1)');
 advance(c,1);assert.ok(v.camera.position.y<.25,'remain lying during the first glimpse');assert.notEqual(veil.querySelector('.knockout-lid-top').style.transform,'scaleY(1)');assert.match(v.renderer.domElement.style.filter,/blur/);
 advance(c,1.3);assert.ok(v.camera.position.y>.4&&v.camera.position.y<.8,'sit up before standing');advance(c,.9);assert.ok(v.camera.position.y>.8&&v.camera.position.y<1.67);assert.ok(Number(veil.querySelector('.knockout-dim').style.opacity)<.2,'vision clears during the rise');
 advance(c,1.2);assert.ok(v.camera.position.y>1.66);assert.ok(Math.abs(v.camera.rotation.z)<.04);assert.ok(Math.abs(v.camera.rotation.y-v.yaw)>.001,'retain a little dizziness after standing');assert.equal(c.active,true);
 advance(c,1.3);assert.equal(await done,true);assert.equal(c.active,false);assert.ok(v.camera.position.equals(standing));assert.ok(v.camera.quaternion.equals(quaternion));assert.equal(v.renderer.domElement.style.filter,'contrast(1)');assert.equal(veil.hidden,true);assert.equal(e.host.classes.has('knockout-recovering'),false);assert.equal(v.motion.yaw,.4);c.dispose();assert.ok(veil.removed);
});
test('recovery has the same pose across frame rates and cancellation removes eyelids, blur and camera tilt',async()=>{
 const poses=[];for(const hz of [30,60,120]){const e=setup(),done=e.controller.begin();advance(e.controller,3.2,hz);poses.push([e.viewer.camera.position.y,e.viewer.camera.rotation.z,e.viewer.camera.rotation.y]);e.controller.cancel();assert.equal(await done,false);assert.equal(e.viewer.camera.position.y,1.67);assert.ok(Math.abs(e.viewer.camera.rotation.z)<1e-10);assert.equal(e.viewer.renderer.domElement.style.filter,'contrast(1)');e.controller.dispose();assert.equal(await e.controller.begin(),false)}for(const pose of poses)pose.forEach((v,i)=>assert.ok(Math.abs(v-poses[0][i])<1e-8));assert.ok(RECOVERY_DURATION<6);
});
