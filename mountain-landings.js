import * as THREE from 'three';

// World-space outlines join each stair turn to its existing column balcony.
// Incoming stair wells remain open so a deck cannot cover the lower treads.
export const MOUNTAIN_LANDINGS=[{"id":0,"top":2.4820000286102273,"outline":[[-1.67615,5.6301799],[0.16124,5.1460199],[1.06709,7.23945],[1.091,7.3081799],[1.1081899,7.3782201],[1.11854,7.4491401],[1.122,7.5205002],[1.11854,7.5918598],[1.1081899,7.6627798],[1.091,7.73282],[0.73,8.8044996],[-0.73,8.8044996],[-2.0076799,6.7639298]]},{"id":1,"top":5.152000015497207,"outline":[[-4.44767,4.03162],[-4.19805,4.0178399],[-3.6614299,5.1907401],[-3.7912034,6.1730254],[-4.3029056,6.3078602],[-3.9739483,7.5562637],[-3.99985,7.7523198],[-6.0248399,8.2859097],[-7.9849701,5.9165001],[-8.0828199,5.7978001],[-8.1607103,5.6697602],[-8.2173204,5.5345702],[-8.2516804,5.3945599],[-8.2631998,5.2521],[-8.2516804,5.1096401],[-8.2173204,4.9696202],[-8.1607103,4.8344402],[-8.1087484,4.749022],[-8.0828199,4.7063999],[-8.025919,4.6373739],[-6.0383,4.1194301]]},{"id":2,"top":7.861999964237214,"outline":[[3.7107401,1.64301],[5.66364,1.31769],[7.4707861,1.517556],[7.5625701,1.6023999],[7.6604199,1.7211],[7.7383099,1.84914],[7.79492,1.98432],[7.8292799,2.1243401],[7.8407998,2.2667999],[7.8292799,2.40926],[7.79492,2.5492799],[7.7383099,2.6844599],[7.6604199,2.8125],[7.5625701,2.9312],[5.7982798,4.9282498],[3.9340501,5.0311599],[3.8355411,4.6073857],[3.7779178,3.5635305],[3.5952346,3.5736151],[3.43101,2.8671401]]},{"id":3,"top":10.462000047683716,"outline":[[-6.3269401,0.87444],[-6.1511998,0.8651],[-3.5494399,0.88502],[-2.74066,1.98527],[-2.8413193,2.7202895],[-3.2189715,2.7832004],[-3.0164371,3.9990081],[-3.05074,4.2494898],[-5.0388799,4.5806799],[-7.10325,2.72824],[-7.2193699,2.6208999],[-7.3172202,2.5021999],[-7.3951101,2.3741601],[-7.4517202,2.2389801],[-7.4860802,2.0989599],[-7.4976001,1.9565001],[-7.4860802,1.8140399],[-7.4517202,1.6740201],[-7.3951101,1.5388401],[-7.3172202,1.4108],[-7.2193699,1.2921],[-7.10325,1.18476],[-6.97084,1.0906301],[-6.8243999,1.01132],[-6.66644,0.94818],[-6.49967,0.90229]]}];

export function repairMountainLandings(root,flights){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),retire=[],navPositions=[];let stone=null,light=null;
 root.traverse(o=>{if(!o.isMesh)return;if(/^Unified_supported_landing_/.test(o.name))stone??=o.material;if(/^Landing_neon_edge(?:_|$)/.test(o.name))light??=o.material;if(/^(Unified_supported_landing_|Mountain_stair_turn_landing_|Landing_neon_edge(?:_|$)|Shrine_balcony_light(?:_|$))/.test(o.name))retire.push(o)});
 if(!stone||!light)throw Error('Mountain landing materials unavailable');
 const group=new THREE.Group();group.name='Mountain_repaired_landings';root.add(group);
 for(const landing of MOUNTAIN_LANDINGS){
  const shape=new THREE.Shape(landing.outline.map(([x,z])=>new THREE.Vector2(x,-z))),geometry=new THREE.ExtrudeGeometry(shape,{depth:.30,steps:1,bevelEnabled:false}),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i),landing.top-.30+p.getZ(i),-p.getY(i));geometry.computeVertexNormals();
  for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);if(new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3()).y>.99)navPositions.push(...a.toArray(),...b.toArray(),...c.toArray())}
  geometry.applyMatrix4(inverse);geometry.computeBoundingSphere();const deck=new THREE.Mesh(geometry,stone);deck.name=`Mountain_stair_turn_landing_${landing.id}`;deck.userData.repairedLanding=landing.id;group.add(deck);
  const mouths=[flights[landing.id].end,flights[landing.id+1].start],outline=landing.outline;
  for(let i=0;i<outline.length;i++){
   const a=new THREE.Vector3(outline[i][0],landing.top+.014,outline[i][1]),b=new THREE.Vector3(outline[(i+1)%outline.length][0],landing.top+.014,outline[(i+1)%outline.length][1]),middle=a.clone().add(b).multiplyScalar(.5);
   if(mouths.some(p=>Math.hypot(middle.x-p[0],middle.z-p[2])<.85))continue;
   const delta=b.clone().sub(a);if(delta.length()<.05)continue;
   const rod=new THREE.CylinderGeometry(.018,.018,delta.length(),8),matrix=new THREE.Matrix4().compose(middle,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()),new THREE.Vector3(1,1,1));rod.applyMatrix4(matrix).applyMatrix4(inverse);rod.computeBoundingSphere();
   const rim=new THREE.Mesh(rod,light);rim.name=landing.id?`Landing_neon_edge_${landing.id}`:'Landing_neon_edge';rim.userData.repairedLanding=landing.id;group.add(rim);
  }
 }
 const retired=new Set(retire.map(o=>o.geometry));for(const o of retire)o.removeFromParent();root.traverse(o=>{if(o.geometry)retired.delete(o.geometry)});for(const geometry of retired)geometry.dispose();root.updateMatrixWorld(true);
 return {group,navPositions,landings:MOUNTAIN_LANDINGS};
}
