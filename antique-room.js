import * as THREE from 'three';
import {createWardrobeGroyp} from './wardrobe-groyp.js?v=105';
import {addAntiqueCastle} from './antique-castle.js?v=101';
import {hangFamilyPictures} from './family-wall.js?v=72';
import {addClownTeaCabinet,rearrangeWorkshopNotes} from './antique-details.js?v=53';

export function prepareAntiqueRoom(root,{familyTextures=[],balloonDoor=false,wardrobeActor=null}={}){
 root.updateMatrixWorld(true);const sources=new Map(),posters=[],original=[];
 root.traverse(o=>{if(!o.isMesh)return;original.push(o);if(!sources.has(o.material.name))sources.set(o.material.name,o.material);if(/^Poster_artwork_/.test(o.name))posters.push(o)});
 const material=(color,roughness=.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const reuse=(name,fallback)=>{const source=sources.get(name);if(!source)return material(fallback);const copy=source.clone();copy.vertexColors=false;return copy};
 const m={wood:reuse('Walnut',0x78583c),dark:reuse('Dark wood',0x47362c),plaster:reuse('Plaster',0xb4a58b),brick:reuse('Brick1',0x796554),brass:reuse('Brass',0xaf8e53),ivory:reuse('Ivory',0xb1ac99),paper:reuse('Paper',0xddd0ad),iron:reuse('Iron',0x65655f),wax:reuse('Wax',0xc3b58b),black:material(0x211d19),velvet:material(0x63433d,.98),faded:material(0x836357,.98),green:material(0x495447,.96),glass:material(0x485753,.5,.12),rug:material(0x704238,.98),trim:material(0xa68a5e,.92),flame:new THREE.MeshBasicMaterial({color:0xffd28b}),books:[0x674138,0x4b5344,0x514c5c,0x8d7552,0x605344].map(c=>material(c,.94))};
 const group=new THREE.Group();group.name='Antique_clown_workshop_extension';root.add(group);group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);
 const extraBoxes=[],furniture=[],lights=[];
 function mesh(geometry,mat,parent=group,x=0,y=0,z=0,name='Antique_detail'){const o=new THREE.Mesh(geometry,mat);o.name=name;o.position.set(x,y,z);parent.add(o);return o}
 const box=(w,h,d,mat,parent,x,y,z,name)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z,name);
 const ball=(x,y,z,sx,sy,sz,mat,parent)=>{const o=mesh(new THREE.SphereGeometry(1,16,10),mat,parent,x,y,z);o.scale.set(sx,sy,sz);return o};
 const cyl=(r,h,mat,parent,x,y,z,r2=r)=>mesh(new THREE.CylinderGeometry(r,r2,h,20),mat,parent,x,y,z);
 function rod(a,b,r,mat,parent=group){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start),o=mesh(new THREE.CylinderGeometry(r,r,v.length(),10),mat,parent);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
 function place(name,x,z,angle=0){const g=new THREE.Group();g.name=name;g.position.set(x,.028,z);g.rotation.y=angle;group.add(g);return g}
 function solid(g){g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(g);extraBoxes.push(b);furniture.push({name:g.name,bounds:b.clone()})}
 function cushion(w,h,d,mat,parent,x,y,z){const r=Math.min(.055,w/6,h/3,d/6),shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,steps:1});g.center();return mesh(g,mat,parent,x,y,z)}
 // Preserve the original desks, circus artwork and toys; relocate linked notes in pairs.
 // The old paper backings are separate meshes from the relocated poster images.
 const retired=new Set();for(const o of original)if(/^(Rear_ceiling_board|Left_ceiling_board|Poster_paper_)/.test(o.name)){retired.add(o.geometry);o.removeFromParent()}
 const retained=new Set();root.traverse(o=>{if(o.geometry)retained.add(o.geometry)});for(const g of retired)if(!retained.has(g))g.dispose();
 const left=-2.8,right=6,rear=-1.6,front=6,roof=3.78;
 box(right-left+.36,.18,front-rear+.36,m.dark,group,(left+right)/2,-.11,(front+rear)/2,'Antique_floor_foundation');
 function boards(x0,x1,z0,z1){for(let z=z0,row=0;z<z1;z+=.238,row++){const endZ=Math.min(z+.230,z1);for(let x=x0-(row%3)*.48;x<x1;x+=1.46){const a=Math.max(x,x0),b=Math.min(x+1.45,x1);if(b>a)box(b-a,.04,endZ-z,m.wood,group,(a+b)/2,.008,(z+endZ)/2,'Antique_extended_floorboard')}}}
 boards(3.358,right,rear,2.9485);boards(left,right,2.9565,front);
 function wall(name,w,d,x,z){const o=box(w,3.82,d,m.plaster,group,x,1.88,z,name);o.updateWorldMatrix(true,false);extraBoxes.push(new THREE.Box3().setFromObject(o))}
 wall('Antique_sealed_right_wall',.22,7.96,6.11,2.2);
 if(balloonDoor){for(const [a,b] of [[-3.02,.89],[2.41,6.22]])wall('Antique_front_wall_beside_balloon_door',b-a,.22,(a+b)/2,6.11);const lintel=box(1.52,.94,.22,m.plaster,group,1.65,3.32,6.11,'Antique_balloon_door_lintel');lintel.updateWorldMatrix(true,false);extraBoxes.push(new THREE.Box3().setFromObject(lintel))}else wall('Antique_sealed_front_wall',9.24,.22,1.6,6.11);
 wall('Antique_rear_wall_extension',2.88,.18,4.78,-1.69);wall('Antique_left_wall_extension',.18,3.345,-2.89,4.5475);
 box(9.24,.16,7.96,m.dark,group,1.6,3.86,2.2,'Antique_sealed_ceiling');
 for(let x=left;x<right;x+=.24)box(.232,.045,7.60,m.wood,group,x+.116,3.755,2.2,'Antique_ceiling_board');
 for(const z of [-1.45,1.05,3.55,5.86])box(8.84,.22,.18,m.dark,group,1.6,3.60,z,'Antique_ceiling_beam');
 for(const x of [-2.69,.2,3.12,5.87])box(.17,.20,7.48,m.dark,group,x,3.59,2.2,'Antique_ceiling_crossbeam');
 for(const [x,z] of [[5.88,-1.47],[5.88,2.2],[5.88,5.87],[1.6,5.87],[-2.69,5.87]]){if(balloonDoor&&x===1.6&&z===5.87)continue;box(.18,3.60,.18,m.dark,group,x,1.81,z,'Antique_timber_post');for(const sign of [-1,1])rod([x,3.5,z],[x+sign*.50,3.05,z],.045,m.dark)}
 function dado(length,x,z,angle){const g=place('Antique_brick_dado',x,z,angle);for(let row=0;row<4;row++)for(let a=-length/2-.22*(row%2);a<length/2;a+=.45){const lo=Math.max(a,-length/2),hi=Math.min(a+.435,length/2);if(hi>lo)box(hi-lo,.19,.045,m.brick,g,(lo+hi)/2,.12+row*.205,0)}box(length,.08,.09,m.dark,g,0,.92,.01);box(length,.12,.10,m.dark,g,0,.08,.01)}
 if(balloonDoor){dado(3.64,-.93,5.945,Math.PI);dado(3.54,4.18,5.945,Math.PI)}else dado(8.7,1.6,5.975,Math.PI);dado(7.55,5.945,2.2,-Math.PI/2);dado(2.75,4.75,-1.575,0);dado(3.12,-2.775,4.43,Math.PI/2);
 // A closed old oak door, with inset panels, hinges and an aged brass handle.
 const door=place('Antique_closed_oak_door',1.65,5.96,Math.PI),leaf=new THREE.Group();door.add(leaf);box(1.12,2.55,.10,m.dark,leaf,0,1.31,0);for(const x of [-.64,.64])box(.13,2.77,.17,m.wood,door,x,1.39,.02);box(1.41,.15,.17,m.wood,door,0,2.73,.02);
 for(const y of [.65,1.75]){box(.86,.82,.04,m.wood,leaf,0,y,.065);for(const x of [-.39,.39])box(.025,.76,.026,m.trim,leaf,x,y,.095)}
 for(const y of [.50,2.12]){box(.36,.065,.035,m.iron,leaf,-.38,y,.11);for(const x of [-.49,-.28])ball(x,y,.135,.018,.018,.012,m.brass,leaf)}ball(.37,1.24,.14,.065,.065,.045,m.brass,leaf);rod([.32,1.24,.18],[.47,1.24,.18],.022,m.brass,leaf);
 if(balloonDoor){leaf.position.x=-.56;for(const child of leaf.children)child.position.x+=.56;leaf.rotation.y=-Math.PI/2;leaf.updateWorldMatrix(true,true);extraBoxes.push(new THREE.Box3().setFromObject(leaf));door.name='Antique_open_oak_door_to_balloon'}
 // Faded woven rug with a restrained border, lozenges and short fringe.
 const rug=place('Antique_faded_circus_rug',-.65,4.23);box(4.25,.009,3.18,m.rug,rug,0,.009,0);for(const sign of [-1,1]){box(4.1,.003,.065,m.trim,rug,0,.024,sign*1.47);box(.065,.003,2.94,m.trim,rug,sign*1.98,.024,0);for(let i=0;i<34;i++)box(.018,.004,.12,m.ivory,rug,-2.02+i*.122,.014,sign*1.64)}
 for(let i=0;i<5;i++){const x=-1.5+i*.75;for(const sign of [-1,1]){rod([x-.30,.02,0],[x,.02,sign*.39],.009,m.trim,rug);rod([x,.02,sign*.39],[x+.30,.02,0],.009,m.trim,rug)}}
 function seat(name,x,z,width,angle){const g=place(name,x,z,angle);box(width-.16,.16,.80,m.dark,g,0,.31,0);cushion(width-.28,.22,.77,m.velvet,g,0,.49,0);cushion(width-.14,.73,.22,m.velvet,g,0,.89,.38);
  for(const sign of [-1,1]){const a=sign*(width/2-.11);cushion(.23,.24,.92,m.faded,g,a,.67,.03);for(const zz of [-.32,.36]){const foot=ball(a,.16,zz,.085,.16,.08,m.dark,g);foot.rotation.z=sign*.12}ball(a,.86,.43,.075,.08,.07,m.dark,g)}
  for(let a=-width/2+.30;a<width/2-.2;a+=.30)for(const y of [.78,1.03])ball(a,y,.251,.022,.022,.009,m.brass,g);
  rod([-width/2+.14,.36,-.425],[width/2-.14,.36,-.425],.026,m.wood,g);
  const pillow=cushion(.38,.34,.14,m.green,g,-width*.23,.77,.14);pillow.rotation.z=.16;solid(g);return g;
 }
 seat('Antique_worn_sofa',-1.17,5.28,2.60,0);seat('Antique_tufted_armchair',balloonDoor?2.7:2.12,balloonDoor?3.7:4.78,1.13,-.35);
 const table=place('Antique_low_tea_table',-.78,3.68);cushion(1.65,.10,.79,m.wood,table,0,.55,0);box(1.39,.14,.56,m.dark,table,0,.43,0);for(const x of [-.64,.64])for(const z of [-.23,.23])rod([x,.05,z],[x*.91,.47,z*.91],.048,m.dark,table);solid(table);
 function book(parent,x,y,z,w,d,h,index=0){box(w,h,d,m.paper,parent,x,y,z);box(w+.035,.02,d+.025,m.books[index%5],parent,x,y+h/2+.012,z);box(w+.035,.02,d+.025,m.books[index%5],parent,x,y-h/2-.012,z);box(.025,h+.04,d+.025,m.books[index%5],parent,x-w/2-.01,y,z)}
 book(table,-.33,.65,.05,.54,.37,.07,0);book(table,-.28,.74,.04,.50,.34,.07,3);cyl(.13,.018,m.ivory,table,.46,.62,-.05);cyl(.073,.11,m.ivory,table,.46,.68,-.05,.061);const cupHandle=mesh(new THREE.TorusGeometry(.044,.012,6,14),m.brass,table,.55,.69,-.05);cupHandle.rotation.y=Math.PI/2;
 // Tall bookcase, with drawers, worn books and a familiar hand-made clown.
 const shelf=place('Antique_full_bookcase',4.63,-1.23);box(2.35,2.72,.10,m.dark,shelf,0,1.39,-.26);for(const x of [-1.17,1.17])box(.12,2.79,.57,m.wood,shelf,x,1.43,0);for(const y of [.12,.60,1.10,1.60,2.10,2.70])box(2.48,.10,.65,m.wood,shelf,0,y,0);box(2.60,.14,.73,m.dark,shelf,0,2.82,0);
 for(const x of [-.57,.57]){box(1.02,.37,.49,m.wood,shelf,x,.35,.02);rod([x-.1,.36,.28],[x+.1,.36,.28],.016,m.brass,shelf)}
 for(let row=0;row<4;row++)for(let i=0;i<12;i++){if(row===1&&i>3&&i<9)continue;const w=.10+(i%3)*.025,h=.29+(i*7%5)*.025,x=-1.03+i*.184,y=.66+row*.50+h/2;box(w,h,.29,m.books[(row*2+i)%5],shelf,x,y,.06);for(const sign of [-1,1])box(w*.75,.013,.008,m.trim,shelf,x,y+sign*h*.34,.209)}
 box(2.48,.14,.65,m.dark,shelf,0,.07,0);solid(shelf);
 const figure=place('Antique_bookcase_clown',4.65,-.99);figure.position.y=1.18;const transform=new THREE.Matrix4().makeScale(.48,.48,.48).multiply(new THREE.Matrix4().makeTranslation(-2.02,-1.27,1.04));
 for(const o of original){if(!/^(Clown_|Jester_)/.test(o.name))continue;const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3());if(Math.abs(c.x-2.02)>.4||Math.abs(c.z+1.04)>.30)continue;const clone=new THREE.Mesh(o.geometry,o.material);clone.name='Antique_preserved_style_clown';clone.matrix.copy(transform.clone().multiply(o.matrixWorld));clone.matrixAutoUpdate=false;figure.add(clone)}
 // Wardrobe and stacked travelling trunks against the new right wall.
 const wardrobe=createWardrobeGroyp(group,m,wardrobeActor);extraBoxes.push(wardrobe.bounds.clone());furniture.push({name:wardrobe.group.name,bounds:wardrobe.bounds.clone()});
 function trunk(name,x,z,w,angle,y=0){const g=place(name,x,z,angle);g.position.y+=y;for(const x of [-w*.35,w*.35])for(const z of [-.17,.17])box(.10,.09,.10,m.dark,g,x,.045,z);cushion(w,.48,.53,m.faded,g,0,.30,0);cushion(w+.035,.13,.56,m.dark,g,0,.59,0);for(const x of [-w*.30,w*.30]){box(.06,.49,.012,m.iron,g,x,.31,.273);box(.06,.09,.56,m.iron,g,x,.62,0)}box(.11,.13,.026,m.brass,g,0,.49,.29);for(const sign of [-1,1])rod([sign*w/2,.31,-.08],[sign*w/2,.31,.08],.018,m.brass,g);solid(g);return g}
 trunk('Antique_leather_travelling_trunk',5.40,.56,1.20,-Math.PI/2);trunk('Antique_small_old_suitcase',5.40,.56,.88,-1.43,.65);
 // Closed leaded window, timber shutters and heavy faded curtains.
 const window=place('Antique_closed_leaded_window',5.96,.51,-Math.PI/2);box(1.66,1.70,.045,m.glass,window,0,2.03,0);for(const x of [-.88,0,.88])box(.075,1.87,.09,m.dark,window,x,2.03,.035);for(const y of [1.13,2.03,2.94])box(1.83,.075,.10,m.wood,window,0,y,.035);box(2.03,.10,.30,m.dark,window,0,1.08,.08);
 for(let x=-.72;x<.84;x+=.23)for(let y=1.3;y<2.8;y+=.33){rod([x-.10,y,.06],[x,y+.16,.06],.006,m.iron,window);rod([x,y+.16,.06],[x+.10,y,.06],.006,m.iron,window)}
 rod([-1.30,3.12,.13],[1.30,3.12,.13],.027,m.brass,window);
 for(const sign of [-1,1]){for(let i=0;i<6;i++){const x=sign*(.86+i*.075);cyl(.06,1.96,m.velvet,window,x,2.04,.16+Math.sin(i)*.025);const ring=mesh(new THREE.TorusGeometry(.044,.010,6,12),m.brass,window,x,3.11,.13);ring.rotation.y=Math.PI/2}rod([sign*.86,1.70,.23],[sign*1.27,1.67,.23],.023,m.trim,window)}
 // Grandfather clock with an inset dial, hands, weights and pendulum.
 const clock=place('Antique_grandfather_clock',5.45,5.49,Math.PI);for(const x of [-.29,.29])for(const z of [-.15,.15])ball(x,.065,z,.065,.065,.065,m.dark,clock);box(.73,2.23,.43,m.dark,clock,0,1.18,0);box(.88,.17,.56,m.wood,clock,0,.14,0);box(.83,.13,.51,m.wood,clock,0,2.30,0);const arch=mesh(new THREE.TorusGeometry(.36,.055,8,24,Math.PI),m.wood,clock,0,2.30,.04);
 box(.52,.98,.025,m.black,clock,0,1.03,.23);rod([0,1.46,.27],[.04,.75,.27],.012,m.brass,clock);ball(.04,.75,.29,.12,.12,.035,m.brass,clock);for(const x of [-.15,.15]){rod([x,1.4,.27],[x,.9,.27],.006,m.brass,clock);cyl(.03,.21,m.brass,clock,x,.97,.27)}
 const dial=mesh(new THREE.CircleGeometry(.277,40),m.ivory,clock,0,1.98,.25);mesh(new THREE.TorusGeometry(.29,.025,8,36),m.brass,clock,0,1.98,.255);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,mark=box(.014,i%3===0?.065:.038,.012,m.black,clock,Math.sin(a)*.231,1.98+Math.cos(a)*.231,.266);mark.rotation.z=-a}rod([0,1.98,.28],[-.11,2.04,.28],.014,m.black,clock);rod([0,1.98,.285],[.10,2.14,.285],.009,m.black,clock);ball(0,1.98,.29,.025,.025,.015,m.brass,clock);solid(clock);
 // A compact gramophone cabinet with record, crank and a flared brass horn.
 const music=place('Antique_gramophone_cabinet',3.67,5.47,Math.PI);box(1.16,.88,.54,m.dark,music,0,.54,0);box(1.27,.10,.65,m.wood,music,0,1.02,0);for(const x of [-.42,.42])for(const z of [-.17,.17])rod([x,.04,z],[x,.22,z],.045,m.wood,music);for(const x of [-.27,.27]){box(.49,.64,.04,m.wood,music,x,.58,.29);for(let i=0;i<5;i++)box(.34,.018,.015,m.black,music,x,.40+i*.08,.316)}
 cyl(.23,.023,m.black,music,-.20,1.09,.02);cyl(.065,.026,m.trim,music,-.20,1.106,.02);rod([.22,1.09,-.13],[.13,1.17,.12],.018,m.brass,music);rod([.13,1.17,.12],[-.03,1.12,.13],.014,m.brass,music);
 const horn=mesh(new THREE.LatheGeometry([new THREE.Vector2(.04,0),new THREE.Vector2(.055,.20),new THREE.Vector2(.10,.36),new THREE.Vector2(.22,.50),new THREE.Vector2(.37,.60)],24),m.brass,music,.23,1.10,-.12);horn.rotation.z=-.65;horn.material=m.brass.clone();horn.material.side=THREE.DoubleSide;rod([.58,.75,.0],[.76,.75,.0],.018,m.iron,music);rod([.76,.75,.0],[.76,.66,.0],.018,m.iron,music);solid(music);
 // Family portraits and original circus posters now share all four walls.
 const wallArt=hangFamilyPictures(group,m,posters,familyTextures);
 const teaCabinet=addClownTeaCabinet(group,m);solid(teaCabinet);
 const notes=rearrangeWorkshopNotes(group,original);
 // Source chair bevel caps share tangential faces with their rails. Give
 // those trims a distinct depth bias instead of drawing equal-depth layers.
 const chairMaterials=new Map();for(const o of original){if(!/^Chair_/.test(o.name)||!o.material)continue;const layer=/end_[AB]/.test(o.name)?2:/seat|slat|rail/.test(o.name)?1:0,key=o.material.uuid+':'+layer;if(!layer)continue;if(!chairMaterials.has(key)){const copy=o.material.clone();copy.polygonOffset=layer>0;copy.polygonOffsetFactor=0;copy.polygonOffsetUnits=-layer*2;chairMaterials.set(key,copy)}o.material=chairMaterials.get(key)}
 // Wax candles and a small wrought brass ceiling chandelier.
 const chandelier=place('Antique_candle_chandelier',1.7,2.35);chandelier.position.y=0;
 for(let y=3.15;y<3.55;y+=.085){const ring=mesh(new THREE.TorusGeometry(.045,.011,6,12),m.iron,chandelier,0,y,0);ring.rotation.y=Math.round(y*100)%2?Math.PI/2:0}
 const hoop=mesh(new THREE.TorusGeometry(.54,.023,8,32),m.brass,chandelier,0,2.95,0);hoop.rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.cos(a)*.54,z=Math.sin(a)*.54;rod([0,3.18,0],[x,2.95,z],.015,m.brass,chandelier);cyl(.075,.035,m.brass,chandelier,x,2.96,z);cyl(.035,.19,m.wax,chandelier,x,3.06,z);ball(x,3.20,z,.017,.057,.017,m.flame,chandelier)}
 const positions=new Float32Array([left,.028,rear,left,.028,front,right,.028,rear,right,.028,rear,left,.028,front,right,.028,front]),nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));nav.name='Antique_room_expanded_navigation';nav.updateMatrixWorld(true);
 const castle=addAntiqueCastle(group,extraBoxes);
 const bounds=new THREE.Box3(new THREE.Vector3(-3.0,-.21,-1.82),new THREE.Vector3(6.24,4.0,6.24)).union(castle.bounds);let lighting=null,lightBlend=-1;const indoorTint=new THREE.Color(0xffdbaf);
 return {group,nav,extraBoxes,bounds,furniture,wallArt,teaCabinet,notes,castle,wardrobe,
  mountLights(scene){if(lighting)return;lightBlend=-1;lighting={scene,environment:scene.environmentIntensity,items:scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight).map(light=>({light,intensity:light.intensity,color:light.color.clone()}))};scene.environmentIntensity=.35;for(const item of lighting.items){item.light.intensity*=item.light.isHemisphereLight?.64:.22;item.light.color.set(0xffdbaf)}for(const [x,y,z,intensity,color] of [[1.7,2.92,2.35,12,0xffcf8c],[4.7,2.30,-.5,4,0xffd7a0],[5.60,2.3,.5,3,0xb1bdb5]]){const light=new THREE.PointLight(color,intensity,7,2);light.position.set(x,y,z);scene.add(light);lights.push(light)}},
  updateLighting(position,mode='walk'){
   if(!lighting)return;const smooth=THREE.MathUtils.smoothstep,blend=mode==='orbit'?1:Math.max(smooth(position.z,5.45,7.10),smooth(position.y,3.45,4.40),smooth(position.x,6.05,6.70),smooth(-position.x,2.85,3.5),smooth(-position.z,1.70,2.4));
   if(Math.abs(lightBlend-blend)<.002)return;lightBlend=blend;lighting.scene.environmentIntensity=THREE.MathUtils.lerp(.35,.72,blend);
   for(const item of lighting.items){item.light.intensity=item.intensity*THREE.MathUtils.lerp(item.light.isHemisphereLight?.64:.22,item.light.isHemisphereLight?1.04:1.10,blend);item.light.color.copy(indoorTint).lerp(item.color,blend)}
  },
  dispose(){for(const light of lights){light.removeFromParent();light.dispose()}lights.length=0;if(lighting){lighting.scene.environmentIntensity=lighting.environment;for(const item of lighting.items){item.light.intensity=item.intensity;item.light.color.copy(item.color)}lighting=null}}
 };
}
