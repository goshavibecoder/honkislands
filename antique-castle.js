import * as THREE from 'three';

// A closed exterior built outside the antique room's existing wall envelope.
// Coordinates share the room's world-aligned extension, including its balloon door.
export function addAntiqueCastle(parent,extraBoxes){
 const group=new THREE.Group();group.name='Antique_storybook_castle';parent.add(group);
 const material=color=>({color:new THREE.Color(color)});
 const surface=new THREE.MeshStandardMaterial({name:'Antique castle coloured sandstone and slate',color:0xffffff,vertexColors:true,roughness:.9,metalness:.05});
 const m={stone:[0xb6a08a,0xbda790,0xb19a83,0xc1ab95].map(c=>material(c)),trim:material(0xd9c5a5),base:material(0x806f60),roof:material(0x46555a),roofEdge:material(0x66787a),dark:material(0x26383b),gold:material(0xb59a61,.55,.35),red:material(0x8f3f47),teal:material(0x46736b),glass:material(0xc39c65,.55)};
 const mesh=(g,mat,p=group,x=0,y=0,z=0,name='Castle_exterior_detail')=>{if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)mat.color.toArray(colors,i);g.setAttribute('color',new THREE.BufferAttribute(colors,3));const o=new THREE.Mesh(g,surface);o.name=name;o.position.set(x,y,z);p.add(o);return o};
 const box=(w,h,d,mat,p,x,y,z,name)=>mesh(new THREE.BoxGeometry(w,h,d),mat,p,x,y,z,name);
 const cylinder=(top,bottom,h,mat,p,x,y,z,name)=>mesh(new THREE.CylinderGeometry(top,bottom,h,24),mat,p,x,y,z,name);
 function solid(o){o.updateWorldMatrix(true,true);extraBoxes.push(new THREE.Box3().setFromObject(o))}
 function archShape(r,spring){const s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.lineTo(-r,0);return s}
 function archFrame(r,spring,width,depth,mat,p,x,y,z,name){const s=archShape(r+width,spring),hole=new THREE.Path();hole.moveTo(-r,0);hole.lineTo(-r,spring);hole.absarc(0,spring,r,Math.PI,0,true);hole.lineTo(r,0);hole.closePath();s.holes.push(hole);return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:12}),mat,p,x,y,z,name)}
 // Individually coursed sandstone avoids large blank plaster faces and coplanar overlays.
 function wall(x,z,length,angle,door=false){const side=new THREE.Group();side.position.set(x,0,z);side.rotation.y=angle;group.add(side);
  for(let row=0;row<9;row++){const y=.12+row*.425;for(let a=-length/2-(row%2)*.58,i=0;a<length/2;a+=1.16,i++){
   let lo=Math.max(a,-length/2),hi=Math.min(a+1.145,length/2);const spans=door&&y<2.84?[[lo,Math.min(hi,-.78)],[Math.max(lo,.78),hi]]:[[lo,hi]];
   for(const [l,h] of spans)if(h-l>.01)box(h-l,.410,.19,m.stone[(row+i)%4],side,(l+h)/2,y+.205,0,'Castle_sandstone_course');
  }}
  for(const [y,h,d] of [[.04,.15,.27],[.55,.075,.235],[3.84,.12,.30],[4.02,.16,.40]]){
   const spans=door&&y<2.84?[[-length/2,-.78],[.78,length/2]]:[[-length/2,length/2]];
   for(const [lo,hi] of spans)box(hi-lo,h,d,y===.04?m.base:m.trim,side,(lo+hi)/2,y,0,'Castle_continuous_stone_moulding');
  }
  // Short corbels cast recessed shadow lines beneath the eaves.
  for(let a=-length/2+.42;a<length/2;a+=.64)box(.16,.23,.32,m.base,side,a,3.68,.045,'Castle_eaves_corbel');
  for(const [lo,hi] of door?[[-length/2,-.78],[.78,length/2]]:[[-length/2,length/2]])solid(box(hi-lo,3.8,.20,m.stone[0],side,(hi+lo)/2,1.9,-.015,'Castle_solid_outer_wall'));
 }
 wall(1.65,6.36,9.50,0,true);wall(1.60,-1.94,9.50,Math.PI);wall(-3.13,2.20,8.32,-Math.PI/2);wall(6.36,2.20,8.32,Math.PI/2);
 // Closed hipped roof: a ridge rather than a flat rectangular lid.
 function hipRoof(cx,cz,w,d,eave,ridge,mat,name){const p=[[-w/2,eave,-d/2],[w/2,eave,-d/2],[w/2,eave,d/2],[-w/2,eave,d/2],[-w*.26,ridge,0],[w*.26,ridge,0]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.flatMap(([x,y,z])=>[x+cx,y,z+cz]),3));g.setIndex([0,4,5,0,5,1,1,5,2,2,5,4,2,4,3,3,4,0,3,0,1,3,1,2]);g.computeVertexNormals();return mesh(g,mat,group,0,0,0,name)}
 hipRoof(1.60,2.20,9.92,8.76,4.12,6.27,m.roof,'Castle_closed_hipped_roof');
 // Shallow overlapping courses follow the roof slopes, keeping mobile geometry light.
 for(let i=1;i<12;i++){const t=i/12,w=9.92*(1-.48*t),d=8.76*(1-t),y=4.12+2.15*t;for(const sign of [-1,1]){box(w,.025,.035,m.roofEdge,group,1.6,y+.015,2.2+sign*d/2,'Castle_roof_slate_course');const e=box(.035,.025,d,m.roofEdge,group,1.6+sign*w/2,y+.015,2.2,'Castle_roof_slate_course');e.rotation.y=0}}
 box(5.26,.11,.14,m.roofEdge,group,1.60,6.29,2.20,'Castle_roof_ridge_cap');
 // The central stone gable anchors the crest and breaks up the long eaves.
 const gable=new THREE.Shape();gable.moveTo(-1.35,3.97);gable.lineTo(1.35,3.97);gable.lineTo(0,5.98);gable.closePath();
 mesh(new THREE.ExtrudeGeometry(gable,{depth:2.30,bevelEnabled:false}),m.stone[1],group,1.65,0,4.28,'Castle_entrance_gable');
 const gp=new THREE.BufferGeometry();gp.setAttribute('position',new THREE.Float32BufferAttribute([-1.49,3.98,4.20,0,6.12,4.20,1.49,3.98,4.20,-1.49,3.98,6.78,0,6.12,6.78,1.49,3.98,6.78].reduce((a,v,i)=>{a.push(v+(i%3===0?1.65:0));return a},[]),3));gp.setIndex([0,3,4,0,4,1,1,4,5,1,5,2]);gp.computeVertexNormals();mesh(gp,m.roof,group,0,0,0,'Castle_gable_slate_roof');
 for(const sign of [-1,1]){const start=new THREE.Vector3(1.65,6.12,6.79),end=new THREE.Vector3(1.65+sign*1.49,3.98,6.79),v=end.clone().sub(start),edge=cylinder(.055,.055,v.length(),m.trim,group,...start.clone().add(end).multiplyScalar(.5).toArray(),'Castle_gable_edge');edge.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize())}
 // Four distinct stone turrets frame the silhouette seen during balloon descent.
 const towers=[];
 for(const [x,z] of [[-3.46,6.66],[6.66,6.66],[-3.46,-2.26],[6.66,-2.26]]){
  const tower=new THREE.Group();tower.name='Castle_corner_turret';tower.position.set(x,0,z);group.add(tower);towers.push(tower);
  cylinder(.88,.94,.28,m.base,tower,0,.025,0,'Castle_tower_footing');
  cylinder(.85,.88,4.95,m.stone[1],tower,0,2.61,0,'Castle_tower_closed_stone_shaft');
  for(let row=0;row<11;row++)cylinder(.86,.86,.035,m.base,tower,0,.34+row*.43,0,'Castle_tower_masonry_joint');
  for(const y of [.37,3.10,4.72])cylinder(.92,.92,.105,m.trim,tower,0,y,0,'Castle_tower_stone_belt');
  cylinder(1.04,.88,.30,m.base,tower,0,5.10,0,'Castle_turret_corbel_crown');
  cylinder(1.08,1.08,.13,m.trim,tower,0,5.29,0,'Castle_turret_eaves');
  cylinder(0,1.16,2.12,m.roof,tower,0,6.40,0,'Castle_conical_turret_roof');
  for(let i=1;i<7;i++){const t=i/7;cylinder(1.16*(1-t),1.16*(1-t)+.025,.035,m.roofEdge,tower,0,5.34+2.12*t,0,'Castle_turret_slate_course')}
  cylinder(.028,.06,.29,m.gold,tower,0,7.54,0,'Castle_turret_finial');
  mesh(new THREE.SphereGeometry(.075,10,6),m.gold,tower,0,7.73,0);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const g=new THREE.Group();g.position.set(Math.sin(a)*.855,0,Math.cos(a)*.855);g.rotation.y=a;tower.add(g);window(g,0,3.34,0,.20,.70)}
  // Collision stays outside the room, even at diagonally adjoining round towers.
  for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12,pts=[a,b].map(t=>new THREE.Vector3(x+Math.sin(t)*.88,0,z+Math.cos(t)*.88));const bounds=new THREE.Box3().setFromPoints(pts);bounds.min.y=-.12;bounds.max.y=5.1;extraBoxes.push(bounds)}
 }
 function window(p,x,y,z,r=.29,h=.93){const s=archShape(r,h),face=mesh(new THREE.ShapeGeometry(s,12),m.dark,p,x,y,z+.014,'Castle_recessed_arch_window');archFrame(r,h,.075,.065,m.trim,p,x,y,z+.02,'Castle_window_stone_surround');box(.035,h+r,.03,m.gold,p,x,y+(h+r)/2,z+.055,'Castle_window_mullion');box(r*1.75,.035,.035,m.gold,p,x,y+h*.54,z+.06);box(r*2+.24,.09,.21,m.trim,p,x,y-.035,z+.02,'Castle_window_sill');return face}
 for(const x of [-1.57,4.85])window(group,x,1.80,6.47,.32,.88);
 for(const [x,z,angle] of [[-3.24,2.20,-Math.PI/2],[6.47,2.20,Math.PI/2],[1.60,-2.05,Math.PI]]){const side=new THREE.Group();side.position.set(x,0,z);side.rotation.y=angle;group.add(side);for(const a of [-2,2])window(side,a,1.82,0,.28,.86)}
 // A recessed arched portal preserves the original open oak door and level threshold.
 const portal=new THREE.Group();portal.name='Castle_balloon_entrance';portal.position.set(1.65,0,6.48);group.add(portal);
 archFrame(.79,2.76,.25,.20,m.trim,portal,0,.025,0,'Castle_entrance_arch');
 for(const sign of [-1,1]){solid(box(.28,2.80,.34,m.trim,portal,sign*.94,1.39,.08,'Castle_entrance_pier'));box(.43,.17,.46,m.base,portal,sign*.94,.09,.10);box(.40,.15,.42,m.trim,portal,sign*.94,2.73,.10)}
 for(let i=0;i<9;i++){const a=(i+.5)*Math.PI/9,o=box(.22,.26,.24,i===4?m.gold:m.stone[2],portal,Math.cos(a)*.925,2.785+Math.sin(a)*.925,.12,'Castle_arch_voussoir');o.rotation.z=a-Math.PI/2}
 // Stone lintel remains behind this fanlight, above the full-height walkable doorway.
 const fan=archShape(.74,0);mesh(new THREE.ShapeGeometry(fan),m.dark,portal,0,2.88,-.10,'Castle_portal_fanlight');for(const x of [-.4,0,.4])box(.028,.48,.03,m.gold,portal,x,3.11,-.075);
 box(.25,.34,.30,m.gold,portal,0,3.81,.13,'Castle_arch_keystone');
 // A modest heraldic medallion and rich cloth banners tie the old castle to Honk.
 const crest=new THREE.Group();crest.position.set(1.65,4.58,6.54);group.add(crest);
 const shield=new THREE.Shape();shield.moveTo(-.43,.32);shield.lineTo(.43,.32);shield.lineTo(.38,-.23);shield.quadraticCurveTo(0,-.65,-.38,-.23);shield.closePath();mesh(new THREE.ExtrudeGeometry(shield,{depth:.07,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1}),m.gold,crest);
 mesh(new THREE.SphereGeometry(.18,14,8),m.red,crest,0,-.02,.14,'Castle_honk_red_nose_crest');for(const x of [-.19,.19]){const eye=mesh(new THREE.SphereGeometry(.085,10,6),m.trim,crest,x,.18,.13);eye.scale.z=.45;const pupil=mesh(new THREE.SphereGeometry(.034,8,6),m.dark,crest,x,.18,.17);pupil.scale.z=.4}
 for(const [x,mat] of [[-.32,m.red],[3.62,m.teal]]){const banner=new THREE.Group();banner.name='Castle_heraldic_banner';banner.position.set(x,2.53,6.55);group.add(banner);const s=new THREE.Shape();s.moveTo(-.27,.58);s.lineTo(.27,.58);s.lineTo(.27,-.42);s.lineTo(0,-.66);s.lineTo(-.27,-.42);s.closePath();mesh(new THREE.ExtrudeGeometry(s,{depth:.025,bevelEnabled:false}),mat,banner);box(.64,.04,.06,m.gold,banner,0,.62,.015);const diamond=box(.18,.18,.035,m.gold,banner,0,-.03,.04);diamond.rotation.z=Math.PI/4;for(const sign of [-1,1])box(.022,.92,.018,m.gold,banner,sign*.22,.06,.037)}
 // Warm glazed lanterns need no additional real-time lights or shadow maps.
 for(const x of [.40,2.90]){const lantern=new THREE.Group();lantern.name='Castle_entrance_lantern';lantern.position.set(x,1.93,6.65);group.add(lantern);box(.07,.38,.08,m.dark,lantern,0,.20,-.08);box(.22,.29,.19,m.glass,lantern,0,0,.05);for(const xx of [-.12,.12])for(const zz of [-.055,.155])box(.025,.33,.025,m.dark,lantern,xx,0,zz);cylinder(0,.19,.16,m.dark,lantern,0,.25,.05);box(.29,.045,.25,m.dark,lantern,0,-.18,.05)}
 group.updateWorldMatrix(true,true);
 return {group,towers,bounds:new THREE.Box3().setFromObject(group)};
}
