import test from 'node:test';
import assert from 'node:assert/strict';
import {MAFIA_ENEMY_RULES} from '../mafia-ai.js';
import {MafiaCombat,MAFIA_COVER,MAFIA_RULES,clearShot,rayBox,coverBox} from '../mafia-combat.js';
function advance(m,seconds,options={},hz=60){for(let t=0;t<seconds-1e-8;t+=1/hz)m.update(Math.min(1/hz,seconds-t),options)}
function fight(){const m=new MafiaCombat();advance(m,1.9);assert.equal(m.phase,'fight');return m}
test('solid cover and room boundaries stop movement, and bullets cannot pass through crates',()=>{
 const m=fight(),c=MAFIA_COVER[0];m.player.x=c.x;m.player.z=c.z+2;m.move(0,-10);assert.ok(m.player.z>=c.z+c.d/2+.27-.001);m.move(-30,20);assert.ok(m.player.x>=-5.6&&m.player.z<=7.2);
 assert.equal(clearShot({x:c.x,y:.9,z:c.z+3},{x:c.x,y:.9,z:c.z-3}),false);assert.equal(clearShot({x:4,y:1.6,z:6},{x:4,y:1.6,z:-6}),true);
 assert.equal(rayBox({x:c.x,y:1,z:c.z+2},{x:0,y:0,z:-1},coverBox(c)),2-c.d/2);
});
test('shots obey cooldown, empty magazines reload, misses do no damage, and reload cannot be spammed',()=>{
 const m=fight();m.health=10000;assert.equal(m.fire(false),true);assert.equal(m.enemyHealth,160);assert.equal(m.fire(true),false);
 for(let i=1;i<MAFIA_RULES.magazine;i++){advance(m,.25);assert.equal(m.fire(false),true)}assert.equal(m.ammo,0);advance(m,.25);assert.equal(m.fire(true),false);assert.ok(m.reloadTime>0);assert.equal(m.reload(),false);advance(m,MAFIA_RULES.reload+.01);assert.equal(m.ammo,MAFIA_RULES.magazine);assert.equal(m.fire(true),true);assert.equal(m.enemyHealth,160-MAFIA_RULES.damage);
});
test('Groyp telegraphs shots, moving dodges them, and crouching behind a crate blocks them',()=>{
 const exposed=fight();exposed.player.x=4.5;exposed.player.z=-3.4;while(!exposed.target)exposed.update(1/60);assert.ok(exposed.warning>0);const health=exposed.health;advance(exposed,.9);assert.equal(exposed.health,health-MAFIA_ENEMY_RULES.damage);
 const dodge=fight();dodge.player.x=4.5;dodge.player.z=-3.4;while(!dodge.target)dodge.update(1/60);dodge.move(-1.5,0);advance(dodge,.9);assert.equal(dodge.health,100);
 const cover=fight();cover.enemy.x=-2.6;cover.player.x=-2.6;cover.player.z=3.2;cover.target={...cover.player};cover.warning=.5;advance(cover,.3,{crouch:true});assert.equal(cover.target,null,'a crate breaks the locked aim');assert.equal(cover.health,100);assert.ok(cover.player.y<1);
});
test('victory leads to footsteps, a bag and a return, with no further damage during the ending',()=>{
 for(const hz of [30,60,120]){const m=fight();for(let i=0;i<Math.ceil(MAFIA_RULES.enemyHealth/MAFIA_RULES.damage);i++){assert.equal(m.fire(true),true);advance(m,MAFIA_RULES.shotDelay+.01,{},hz)}assert.equal(m.enemyHealth,0);assert.equal(m.phase,'victory');const health=m.health;assert.equal(m.controllable,true);advance(m,MAFIA_RULES.victory,{},hz);assert.equal(m.phase,'capture');advance(m,MAFIA_RULES.capture+.02,{},hz);assert.equal(m.phase,'return');advance(m,MAFIA_RULES.return+.02,{},hz);assert.equal(m.phase,'done');assert.equal(m.health,health)}
});
test('losing offers a fresh attempt with reset ammunition, health and timing',()=>{
 const m=fight();advance(m,35);assert.equal(m.phase,'lost');assert.equal(m.health,0);assert.equal(m.fire(true),false);m.reset();assert.equal(m.phase,'wake');assert.equal(m.health,100);assert.equal(m.enemyHealth,160);assert.equal(m.ammo,MAFIA_RULES.magazine);assert.equal(m.target,null);
});
test('shooting a defeated boss cannot restart the capture timer and movement freezes only when the bag arrives',()=>{
 const m=fight();m.enemyHealth=MAFIA_RULES.damage;assert.equal(m.fire(true),true);advance(m,.2);const elapsed=m.elapsed;m.move(.5,0);assert.ok(Math.abs(m.player.x-.5)<1e-8);assert.equal(m.fire(true),true);assert.equal(m.elapsed,elapsed);assert.equal(m.enemyHealth,0);assert.equal(m.reload(),true);
 advance(m,MAFIA_RULES.victory-m.elapsed+.02);assert.equal(m.phase,'capture');const position={...m.player};m.move(2,2);assert.deepEqual(m.player,position);assert.equal(m.fire(),false);assert.equal(m.reload(),false);
});
