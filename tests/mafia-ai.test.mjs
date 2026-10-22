import test from 'node:test';
import assert from 'node:assert/strict';
import {MafiaCombat,MAFIA_COVER,clearShot} from '../mafia-combat.js';
import {createMafiaNavigation,MAFIA_ENEMY_RULES} from '../mafia-ai.js';
const advance=(m,t,options={},hz=60)=>{for(let left=t;left>1e-8;){const dt=Math.min(left,1/hz);m.update(dt,options);left-=dt}};
function fight(player={x:4.5,y:1.62,z:-3.4}){const m=new MafiaCombat();m.phase='fight';Object.assign(m.player,player);m.health=10000;return m}
test('a shared navigation graph routes the whole actor around crates and keeps every segment clear',()=>{
 const nav=createMafiaNavigation(MAFIA_COVER),from={x:-2.6,z:3.3},to={x:-2.6,z:-2};assert.equal(nav,createMafiaNavigation(MAFIA_COVER));assert.equal(nav.direct(from,to),false);const route=nav.route(from,to);assert.ok(route.length>1);
 let start=from;for(const point of route){assert.equal(nav.direct(start,point),true);for(let n=0;n<=20;n++)assert.equal(nav.valid({x:start.x+(point.x-start.x)*n/20,z:start.z+(point.z-start.z)*n/20}),true);start=point}
 assert.deepEqual(route.at(-1),to);assert.equal(nav.route(from,{x:8,z:0}),null);assert.equal(nav.valid({x:MAFIA_COVER[0].x,z:MAFIA_COVER[0].z}),false);
});
test('Groyp flanks a camper after hearing a shot, but never fires through the blocking crate',()=>{
 const m=fight({x:-2.6,y:.94,z:3.2});m.opponent.hear(m);assert.equal(m.opponent.see(m),false);let flanking=false,found=false,shots=0;
 for(let i=0;i<60*12;i++){
  const events=m.update(1/60,{crouch:true});flanking||=m.enemy.behavior==='flank';found||=m.opponent.see(m);
  if(events.includes('enemy-shot')){shots++;assert.equal(clearShot(m.lastShotOrigin,m.player),true,'a locked shot must still have line of sight when fired')}
 }
 assert.ok(flanking&&found);assert.ok(shots>0);assert.ok(Math.hypot(m.enemy.x,m.enemy.z+5.05)>1);
});
test('aim has a reaction window and a locked burst can be dodged rather than tracking every movement',()=>{
 const m=fight();for(let i=0;i<300&&!m.target;i++)m.update(1/60);assert.ok(m.warning>.7);const target={...m.target},health=m.health;m.move(-1.5,0);advance(m,.4);assert.deepEqual(m.target,target);assert.equal(m.health,health);advance(m,.5);assert.equal(m.health,health);
});
test('getting behind cover cancels aim and does not reveal subsequent silent movement through the crate',()=>{
 const m=fight();for(let i=0;i<300&&!m.target;i++)m.update(1/60);assert.ok(m.target);m.enemy.x=-2.6;m.enemy.z=-5.05;m.player.x=-2.6;m.player.z=3.2;m.player.y=.94;
 m.update(1/60,{crouch:true});assert.equal(m.target,null);assert.equal(m.warning,0);const known={...m.opponent.memory};m.player.z=3.5;m.update(1/60,{crouch:true});assert.deepEqual(m.opponent.memory,known);
});
test('hits interrupt aim and make Groyp choose real cover without healing or teleporting',()=>{
 const m=fight();m.enemy.ammo=9;m.target={...m.player};m.warning=.6;const before={...m.enemy};m.fire(true);assert.equal(m.enemyHealth,152);assert.equal(m.target,null);assert.ok(m.opponent.underFire>0);assert.equal(m.enemy.x,before.x);assert.equal(m.enemy.z,before.z);advance(m,.25);
 assert.ok(m.enemy.route.length>0);const goal=m.enemy.route.at(-1);assert.equal(clearShot({x:goal.x,y:1.42,z:goal.z},m.player),false);assert.equal(m.enemyHealth,152);
});
test('an empty enemy magazine creates a genuine reload window with no shots until it finishes',()=>{
 const m=fight();m.enemy.ammo=0;assert.ok(m.update(1/60).includes('enemy-reload'));assert.ok(m.enemy.reloadTime>2);let shots=0;
 for(let i=0;i<120;i++)shots+=m.update(1/60).includes('enemy-shot');assert.equal(shots,0);assert.ok(m.enemy.reloadTime>0);advance(m,.5);assert.equal(m.enemy.reloadTime,0);assert.equal(m.enemy.ammo,MAFIA_ENEMY_RULES.magazine);
});
test('movement remains inside the room and clear of crates at 30, 60 and 120 Hz with bounded planning work',()=>{
 for(const hz of [30,60,120]){
  const m=fight(),nav=createMafiaNavigation(MAFIA_COVER);
  for(let frame=0;frame<hz*20;frame++){
   const dt=1/hz;m.move(Math.sin(frame/hz*.5)*dt*2,Math.cos(frame/hz*.7)*dt*2);const old={...m.enemy};m.update(dt);
   assert.equal(nav.valid(m.enemy),true);assert.ok(Math.hypot(m.enemy.x-old.x,m.enemy.z-old.z)<=MAFIA_ENEMY_RULES.speed*dt+1e-7,'no teleporting across corners');assert.equal(nav.direct(old,m.enemy),true);
  }
  assert.ok(m.opponent.planNumber<40,'planning runs on a timer, not for every render frame');
 }
});

test('seeing a reload changes a long-range plan into a closer attack, but hidden reloads reveal nothing',()=>{
 const m=fight();m.enemyDelay=5;m.update(1/60);const oldDistance=Math.hypot(m.enemy.route.at(-1).x-m.player.x,m.enemy.route.at(-1).z-m.player.z);
 m.reloadTime=2;advance(m,.5);assert.equal(m.enemy.intent,'pressure');const goal=m.enemy.route.at(-1);assert.ok(Math.hypot(goal.x-m.player.x,goal.z-m.player.z)<oldDistance-1);
 const hidden=fight({x:-2.6,y:.94,z:3.2});hidden.opponent.hear(hidden);hidden.reloadTime=2;hidden.update(1/60,{crouch:true});assert.equal(hidden.opponent.observedReload,false);assert.notEqual(hidden.enemy.intent,'pressure');
});
test('a wounded opponent reacts to visible missed shots by choosing cover without a fake hit or teleport',()=>{
 const m=fight();m.enemyHealth=56;m.enemyDelay=5;const before={...m.enemy};m.fire(false);advance(m,.05);
 assert.equal(m.enemyHealth,56);assert.equal(m.opponent.stagger,0);assert.equal(m.enemy.intent,'cover');const goal=m.enemy.route.at(-1);assert.equal(clearShot({x:goal.x,y:1.42,z:goal.z},m.player),false);assert.ok(Math.hypot(m.enemy.x-before.x,m.enemy.z-before.z)<=MAFIA_ENEMY_RULES.speed*.05+1e-7);
});
test('search uses the last known position and does not follow silent movement through walls',()=>{
 const m=fight({x:-2.6,y:.94,z:3.2});m.opponent.hear(m);const known={...m.opponent.memory};m.opponent.clearShot=()=>false;Object.assign(m.player,{x:4.5,z:5.5});advance(m,5);
 assert.deepEqual(m.opponent.memory,known);assert.equal(m.enemy.intent,'search');const goal=m.enemy.route.at(-1);assert.ok(Math.hypot(goal.x-known.x,goal.z-known.z)<2.5);assert.equal(m.target,null);
});
test('sustained shots cannot force a navigation search on every frame',()=>{
 const m=fight();m.enemyHealth=56;m.enemyDelay=100;
 for(let i=0;i<600;i++){m.cooldown=0;m.ammo=30;m.fire(false);m.update(1/60)}
 assert.ok(m.opponent.planNumber<=26);assert.ok(createMafiaNavigation(MAFIA_COVER).valid(m.enemy));
});
test('holding fire at Groyp cannot stun-lock him and he answers with sustained automatic fire at every frame rate',()=>{
 for(const hz of [30,60,120]){
  const m=fight();let shots=0,run=0,longest=0,last=-100;
  for(let i=0;i<hz*8;i++){
   if(m.cooldown===0){m.fire(true);m.enemyHealth=160;m.ammo=30}
   const events=m.update(1/hz);if(events.includes('enemy-shot')){assert.equal(clearShot(m.lastShotOrigin,m.player),true);shots++;run=m.clock-last<.16?run+1:1;longest=Math.max(longest,run);last=m.clock}
  }
  assert.ok(shots>=24,`${hz} Hz: ${shots} shots`);assert.ok(longest>=10,`${hz} Hz: longest automatic burst was ${longest}`);
 }
});
