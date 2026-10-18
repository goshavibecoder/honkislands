import * as THREE from 'three';

export function addClownTeaCabinet(parent,m){
 const cabinet=new THREE.Group();cabinet.name='Antique_glazed_clown_tea_cabinet';cabinet.position.set(5.57,.028,4.45);cabinet.rotation.y=-Math.PI/2;parent.add(cabinet);
 const porcelain=new THREE.MeshStandardMaterial({name:'Old glazed clown porcelain',color:0xe5dbc4,roughness:.28,metalness:.025});
 const glass=new THREE.MeshPhysicalMaterial({name:'Cabinet clear antique glass',color:0xc9e3df,transparent:true,opacity:.14,roughness:.12,metalness:0,depthWrite:false,side:THREE.DoubleSide});
 const crystal=glass.clone();crystal.name='Old crystal stemware';crystal.opacity=.32;crystal.roughness=.08;
 const colors=[0xa33c36,0xc49645,0x587555,0x4e6d91,0x846080].map(color=>new THREE.MeshStandardMaterial({color,roughness:.33}));
 const ink=new THREE.MeshStandardMaterial({color:0x282722,roughness:.45});
 function mesh(geometry,mat,g=cabinet,x=0,y=0,z=0,name='Antique_cabinet_detail'){const o=new THREE.Mesh(geometry,mat);o.name=name;o.position.set(x,y,z);g.add(o);return o}
 const box=(w,h,d,mat,g,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,g,x,y,z);
 const ball=(r,mat,g,x,y,z)=>mesh(new THREE.SphereGeometry(r,12,8),mat,g,x,y,z);
 const cylinder=(r,h,mat,g,x,y,z,r2=r)=>mesh(new THREE.CylinderGeometry(r,r2,h,24),mat,g,x,y,z);
 function ring(r,t,mat,g,x,y,z,horizontal=false){const o=mesh(new THREE.TorusGeometry(r,t,8,28),mat,g,x,y,z);if(horizontal)o.rotation.x=Math.PI/2;return o}
 function lathe(points,mat,g,x,y,z,name){return mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),28),mat,g,x,y,z,name)}
 function group(name,x,y,z){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);cabinet.add(g);return g}
 // An oak carcass, closed lower doors and shallow glazed upper doors.
 box(1.22,2.35,.065,m.dark,cabinet,0,1.27,-.245);
 for(const x of [-.60,.60]){box(.09,.56,.57,m.wood,cabinet,x,.44,0);for(const z of [-.245,.245])box(.075,2.42,.07,m.wood,cabinet,x,1.30,z);for(const z of [-.20,.20]){const foot=ball(.075,m.dark,cabinet,x,.095,z);foot.scale.y=1.25}}
 for(const y of [.18,.72,1.02,1.50,1.98,2.45])box(1.27,.065,.57,m.wood,cabinet,0,y,0);
 box(1.38,.13,.65,m.dark,cabinet,0,2.52,0);box(1.31,.055,.61,m.brass,cabinet,0,2.435,0);
 for(const x of [-.295,.295]){
  box(.565,.46,.055,m.wood,cabinet,x,.45,.275);box(.44,.33,.015,m.dark,cabinet,x,.45,.311);box(.38,.27,.015,m.wood,cabinet,x,.45,.323);ball(.026,m.brass,cabinet,x*.20,.49,.35);
  for(const edge of [-1,1])box(.035,1.65,.055,m.wood,cabinet,x+edge*.276,1.61,.295);
  for(const y of [.79,2.43])box(.56,.035,.055,m.wood,cabinet,x,y,.295);
  mesh(new THREE.PlaneGeometry(.51,1.58),glass,cabinet,x,1.61,.297,'Antique_cabinet_glass_door');
  box(.018,1.56,.022,m.brass,cabinet,x,1.61,.327);ball(.025,m.brass,cabinet,x*.13,1.44,.35);
  for(const y of [.92,2.26])box(.05,.075,.025,m.brass,cabinet,x+Math.sign(x)*.271,y,.33);
 }
 for(const x of [-.595,.595]){const side=mesh(new THREE.PlaneGeometry(.40,1.57),glass,cabinet,x,1.61,0,'Antique_cabinet_side_glass');side.rotation.y=Math.PI/2}
 // A small carved circus rosette, faded to match the old room.
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const petal=ball(.047,colors[i%5],cabinet,Math.cos(a)*.10,2.59+Math.sin(a)*.08,.30);petal.scale.z=.35}ball(.047,colors[0],cabinet,0,2.59,.32);
 function saucer(g,x,y,z,index){cylinder(.116,.013,porcelain,g,x,y+.007,z);ring(.106,.005,colors[index%5],g,x,y+.015,z,true);ring(.052,.004,m.brass,g,x,y+.016,z,true)}
 function cup(x,y,z,index){
  const g=group('Antique_clown_porcelain_cup',x,y,z);saucer(g,0,0,0,index);
  lathe([[.038,.018],[.062,.03],[.082,.11],[.087,.145],[.078,.145],[.073,.114],[.052,.035],[.038,.032],[.038,.018]],porcelain,g,0,0,0,'Antique_hollow_teacup');
  ring(.083,.005,colors[index%5],g,0,.145,0,true);ring(.043,.006,m.brass,g,0,.025,0,true);
  const handle=ring(.043,.012,porcelain,g,.094,.085,0);handle.scale.x=.82;
  for(const x of [-.025,.025])ball(.008,ink,g,x,.101,.078);
  ball(.017,colors[0],g,0,.079,.084);const smile=ring(.026,.004,colors[index%5],g,0,.064,.080);smile.scale.y=.35;
  for(let i=0;i<5;i++)ball(.009,colors[(i+index)%5],g,-.05+i*.025,.125,.069);
 }
 for(let i=0;i<4;i++)cup(-.43+i*.275,1.535,.06,i);
 // Upright dinner plates show the hand-painted rainbow petals behind the cups.
 for(const x of [-.31,.31]){
  const g=group('Antique_clown_display_plate',x,1.72,-.17);const plate=cylinder(.18,.015,porcelain,g,0,0,0);plate.rotation.x=Math.PI/2;
  ring(.167,.006,m.brass,g,0,0,.012);ring(.145,.007,colors[1],g,0,0,.014);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;const petal=ball(.034,colors[i%5],g,Math.cos(a)*.055,Math.sin(a)*.055,.024);petal.scale.z=.25}ball(.025,colors[0],g,0,0,.033);
 }
 // A rounded teapot with a genuinely open spout, loop handle and red nose finial.
 const tea=group('Antique_clown_porcelain_teapot',-.22,1.055,.025);
 const body=ball(.145,porcelain,tea,0,.15,0);body.scale.y=.85;cylinder(.095,.023,porcelain,tea,0,.04,0);
 ring(.088,.006,colors[2],tea,0,.26,0,true);const lid=ball(.09,porcelain,tea,0,.267,0);lid.scale.y=.24;ball(.027,colors[0],tea,0,.307,0);
 const spout=lathe([[.046,0],[.036,.08],[.026,.16],[.018,.19],[.012,.19],[.018,.16],[.028,.08],[.038,0]],porcelain,tea,.105,.14,0,'Antique_open_teapot_spout');spout.rotation.z=-.75;
 const handle=ring(.093,.018,porcelain,tea,-.145,.15,0);handle.scale.x=.72;
 for(const x of [-.037,.037])ball(.011,ink,tea,x,.177,.135);ball(.024,colors[0],tea,0,.144,.147);
 for(let i=0;i<7;i++){const a=i*Math.PI/7;ball(.015,colors[i%5],tea,Math.cos(a)*.097,.21+Math.sin(a)*.022,.09)}
 const sugar=group('Antique_clown_sugar_bowl',.22,1.055,.04);const bowl=ball(.10,porcelain,sugar,0,.105,0);bowl.scale.y=.75;ring(.081,.005,colors[4],sugar,0,.16,0,true);const cap=ball(.083,porcelain,sugar,0,.169,0);cap.scale.y=.22;ball(.018,colors[0],sugar,0,.20,0);
 for(const sign of [-1,1])ring(.036,.009,porcelain,sugar,sign*.105,.105,0);
 // Crystal goblets on the upper shelf have open bowls and slender stems.
 for(let i=0;i<4;i++){
  const g=group('Antique_crystal_goblet',-.42+i*.28,2.015,.03);cylinder(.065,.012,crystal,g,0,.006,0);cylinder(.008,.12,crystal,g,0,.066,0);
  lathe([[.012,.125],[.048,.15],[.064,.205],[.058,.285],[.052,.285],[.058,.205],[.042,.157],[.012,.134]],crystal,g,0,0,0,'Antique_open_crystal_bowl');ring(.055,.003,m.brass,g,0,.285,0,true);
 }
 cabinet.updateWorldMatrix(true,true);return cabinet;
}

export function rearrangeWorkshopNotes(parent,original){
 const notes=[];
 const layout=[
  ['X',-2.775,3.18,1.65,Math.PI/2],['TG',-2.775,3.13,2.40,Math.PI/2],
  ['GroypFi',-2.775,3.15,3.50,Math.PI/2],['NFT',-2.775,3.13,4.85,Math.PI/2],
  ['IG',-2.775,2.73,1.65,Math.PI/2],['TikTok',-2.775,2.67,2.46,Math.PI/2],
  ['Chart',-2.775,2.30,1.65,Math.PI/2],['Lore',-2.775,2.24,2.48,Math.PI/2],
  ['ADL',-2.40,1.80,-1.575,0],['Meme',-2.775,3.10,-.65,Math.PI/2],
  ['Honkster',1.55,3.10,-1.575,0],['Goat',1.55,2.57,-1.575,0],
  ['DeDust',-2.775,2.65,-.65,Math.PI/2],['Topblast',2.70,1.75,-1.575,0],
  ['HonkHub',-2.775,2.20,-.65,Math.PI/2]
 ];
 function movePair(name,paper,image,x,y,z,angle){
  if(!paper||!image)return;paper.updateWorldMatrix(true,false);image.updateWorldMatrix(true,false);
  const center=new THREE.Box3().setFromObject(paper).getCenter(new THREE.Vector3()),normal=new THREE.Vector3().fromBufferAttribute(image.geometry.attributes.normal,0).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(image.matrixWorld));
  const transform=new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(normal,new THREE.Vector3(0,0,1))).multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z));
  const g=new THREE.Group();g.name='Antique_relocated_note_'+name;g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);
  for(const o of [paper,image]){const local=transform.clone().multiply(o.matrixWorld);g.add(o);o.matrix.copy(local);o.matrixAutoUpdate=false}
  notes.push({name,group:g,paper,image});
 }
 for(const [name,x,y,z,angle] of layout)movePair(name,original.find(o=>o.name==='Highlighted_post-it_'+name),original.find(o=>o.name==='Highlighted_exact_text_'+name),x,y,z,angle);
 // Move the small doodles that occupied the reclaimed poster space as pairs too.
 for(const [id,y] of [[45,2.60],[59,2.20]])movePair('sketch_'+id,original.find(o=>o.name==='Background_sketch_'+id),original.find(o=>o.name==='Circus_illustration_'+id),-2.775,y,5.67,Math.PI/2);
 parent.updateWorldMatrix(true,true);return notes;
}
