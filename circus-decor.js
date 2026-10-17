import * as THREE from 'three';
const COLORS=[0xf32a43,0xff8e25,0xffd73d,0x26b862,0x3676e9,0xa84dd0];

export function decorateCircusArena(root){
 root.updateMatrixWorld(true);
 const group=new THREE.Group();group.name='Circus_faces_and_bunting';
 const inverse=root.matrixWorld.clone().invert(),materials=COLORS.map((color,i)=>new THREE.MeshStandardMaterial({name:`Circus paint ${i}`,color,roughness:.48}));
 const white=new THREE.MeshStandardMaterial({name:'Clown face porcelain',color:0xfff8df,roughness:.48}),black=new THREE.MeshStandardMaterial({name:'Clown eyes and smile',color:0x201724,roughness:.5}),gold=new THREE.MeshStandardMaterial({name:'Circus bunting gold',color:0xffc745,metalness:.7,roughness:.28});
 const sphere=new THREE.SphereGeometry(1,20,12),noses=[],extraBoxes=[];
 const add=(parent,geometry,material,position,scale)=>{const mesh=new THREE.Mesh(geometry,material);if(position)mesh.position.set(...position);if(scale)mesh.scale.set(...scale);parent.add(mesh);return mesh};
 const face=(base,normal,scale,label,withNose)=>{
  const mask=new THREE.Group();mask.name=label;const side=new THREE.Vector3(normal.z,0,-normal.x),basis=new THREE.Matrix4().makeBasis(side,new THREE.Vector3(0,1,0),normal);
  mask.position.copy(base).addScaledVector(new THREE.Vector3(0,1,0),.12*scale);mask.quaternion.setFromRotationMatrix(basis);mask.scale.setScalar(scale);mask.updateMatrix();mask.matrix.premultiply(inverse);mask.matrix.decompose(mask.position,mask.quaternion,mask.scale);group.add(mask);
  add(mask,sphere,white,[0,0,0],[.47,.47,.08]);
  for(const sign of [-1,1]){
   add(mask,sphere,white,[sign*.16,.14,.09],[.12,.15,.045]);
   add(mask,sphere,black,[sign*.16,.13,.135],[.052,.074,.027]);
   add(mask,sphere,materials[0],[sign*.31,-.13,.075],[.076,.052,.03]);
   const brow=new THREE.CatmullRomCurve3([new THREE.Vector3(sign*.27,.28,.1),new THREE.Vector3(sign*.17,.33,.1),new THREE.Vector3(sign*.06,.28,.1)]);
   add(mask,new THREE.TubeGeometry(brow,10,.014,5,false),black);
  }
  const smile=[];for(let i=0;i<=16;i++){const a=Math.PI+i*Math.PI/16;smile.push(new THREE.Vector3(Math.cos(a)*.245,-.19+Math.sin(a)*.15,.1))}
  add(mask,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smile),20,.022,6,false),materials[0]);
  for(let i=0;i<6;i++){const a=Math.PI-i*Math.PI/5;add(mask,sphere,materials[i],[Math.cos(a)*.46,.20+Math.sin(a)*.35,-.005],[.18,.18,.11])}
  add(mask,sphere,materials[0],[-.16,-.40,.06],[.19,.10,.05]);add(mask,sphere,materials[4],[.16,-.40,.06],[.19,.10,.05]);add(mask,sphere,gold,[0,-.40,.105],[.06,.065,.035]);
  if(withNose){const nose=add(mask,new THREE.SphereGeometry(.24,24,16),materials[0],[0,-.12,.19]);nose.name='Circus_gateway_red_nose';noses.push(nose)}
  return mask;
 };
 // The four wall buttons now sit in smiling rainbow-haired clown faces.
 for(let i=0;i<4;i++){
  const angle=i*Math.PI/2,normal=new THREE.Vector3(-Math.cos(angle),0,-Math.sin(angle)),base=new THREE.Vector3(5.15*Math.cos(angle),1.16,4.12*Math.sin(angle)).addScaledVector(normal,.025);
  face(base,normal,1,`Circus_wall_clown_${i}`,false);
 }
 // A painted circus ring follows the arena floor without adding a collider.
 // The central trophy and the diagonal entrance keep their original clearance.
 const sector=(inner,outer,start,end,material)=>{
  const points=[],steps=Math.max(2,Math.ceil((end-start)/(Math.PI/96)));for(let j=0;j<steps;j++){
   const a=start+(end-start)*j/steps,b=start+(end-start)*(j+1)/steps;
   const at=(radius,angle)=>[radius*Math.cos(angle),.762,radius*.80*Math.sin(angle)];
   points.push(...at(inner,a),...at(outer,b),...at(outer,a),...at(inner,a),...at(inner,b),...at(outer,b));
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.computeVertexNormals();geometry.applyMatrix4(inverse);add(group,geometry,material).name='Circus_floor_paint';
 };
 for(let i=0;i<24;i++)sector(2.18,4.68,i*Math.PI/12,(i+1)*Math.PI/12,i%2?white:materials[0]);
 sector(2.12,2.18,0,Math.PI*2,gold);sector(4.68,4.75,0,Math.PI*2,gold);
 group.userData.floorSectors=24;
 // Four miniature circus displays fill the upper arena walls. All details
 // share the existing paint materials and are batched with the static scene.
 const starGeometry=(radius=.12)=>{const shape=new THREE.Shape();for(let j=0;j<10;j++){const a=Math.PI/2+j*Math.PI/5,r=j%2?radius*.43:radius,x=Math.cos(a)*r,y=Math.sin(a)*r;if(j)shape.lineTo(x,y);else shape.moveTo(x,y)}shape.closePath();return new THREE.ShapeGeometry(shape)};
 const star=starGeometry();
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,normal=new THREE.Vector3(-Math.cos(a),0,-Math.sin(a)),side=new THREE.Vector3(normal.z,0,-normal.x),display=new THREE.Group();display.name=`Circus_wall_display_${i}`;
  display.position.set(5.08*Math.cos(a),3.03,4.04*Math.sin(a));display.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,new THREE.Vector3(0,1,0),normal));display.updateMatrix();display.matrix.premultiply(inverse);display.matrix.decompose(display.position,display.quaternion,display.scale);group.add(display);
  add(display,new THREE.BoxGeometry(1.72,1.16,.045),gold,[0,0,0]);add(display,new THREE.BoxGeometry(1.62,1.06,.045),materials[4],[0,0,.026]);
  for(const sign of [-1,1]){add(display,sphere,materials[0],[sign*.72,0,.08],[.11,.55,.07]);add(display,sphere,gold,[sign*.71,-.12,.15],[.12,.035,.025]);add(display,star,gold,[sign*.55,.05,.12])}
  for(let k=0;k<7;k++)add(display,sphere,materials[0],[(k-3)*.22,.51,.08],[.14,.12,.06]);
  if(i===0){ // Three-point jester cap, each tip ending in a golden bell.
   add(display,sphere,white,[0,-.19,.14],[.38,.085,.08]);
   for(let k=0;k<3;k++){const x=(k-1)*.34,top=k===1?.40:.24,curve=new THREE.CatmullRomCurve3([new THREE.Vector3((k-1)*.18,-.13,.13),new THREE.Vector3(x*.9,.13,.13),new THREE.Vector3(x,top,.13)]);add(display,new THREE.TubeGeometry(curve,10,.075,8,false),materials[(k+1)%6]);add(display,sphere,gold,[x,top,.14],[.07,.07,.05])}
  }else if(i===1){ // Crossed juggling clubs with coloured pear-shaped bodies.
   for(const sign of [-1,1]){const club=new THREE.Group();club.rotation.z=sign*.56;club.position.set(sign*.10,-.03,.14);display.add(club);add(club,new THREE.CylinderGeometry(.026,.026,.30,8),white,[0,-.20,0]);add(club,sphere,materials[sign<0?0:2],[0,.08,0],[.10,.23,.07]);add(club,sphere,gold,[0,-.36,0],[.055,.045,.045]);add(club,sphere,white,[0,.29,0],[.07,.06,.05])}
  }else if(i===2){ // Oversized polka-dot bow tie.
   for(const sign of [-1,1]){add(display,sphere,materials[2],[sign*.21,0,.13],[.25,.24,.06]);for(let k=0;k<3;k++)add(display,sphere,white,[sign*(.22+(k===1?.09:0)),(k-1)*.12,.193],[.035,.035,.012])}add(display,sphere,materials[0],[0,0,.19],[.10,.12,.06]);
  }else{ // Six rainbow pinwheel sails, with a golden centre.
   for(let k=0;k<6;k++){const a=k*Math.PI/3,b=a+.68,positions=[0,0,.16,.39*Math.cos(a),.39*Math.sin(a),.16,.23*Math.cos(b),.23*Math.sin(b),.19];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();add(display,geo,materials[k])}add(display,sphere,gold,[0,0,.20],[.065,.065,.04]);
  }
 }
 group.userData.interiorDisplays=4;
 // Little gold stars alternate with rainbow diamonds on the inner wall rim.
 const passageBounds=new THREE.Box3();root.traverse(o=>{if(o.isMesh&&/^(Passage_|Main_portal_)/.test(o.name))passageBounds.expandByObject(o)});passageBounds.expandByScalar(.45);
 for(let i=0;i<32;i++){
  const a=i*Math.PI/16;if(Math.abs(Math.sin(a*2))>.93)continue; // keep door arches visually clear
  if(passageBounds.containsPoint(new THREE.Vector3(5.08*Math.cos(a),2.30,4.04*Math.sin(a))))continue;
  const normal=new THREE.Vector3(-Math.cos(a),0,-Math.sin(a)),side=new THREE.Vector3(normal.z,0,-normal.x),ornament=new THREE.Group();ornament.position.set(5.08*Math.cos(a),2.30,4.04*Math.sin(a));ornament.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,new THREE.Vector3(0,1,0),normal));ornament.updateMatrix();ornament.matrix.premultiply(inverse);ornament.matrix.decompose(ornament.position,ornament.quaternion,ornament.scale);group.add(ornament);
  ornament.name='Circus_wall_rim_ornament';if(i%2)add(ornament,star,gold,[0,0,.025]);else{const diamond=add(ornament,new THREE.PlaneGeometry(.13,.13),materials[i%6],[0,0,.025]);diamond.rotation.z=Math.PI/4}
 }
 // A large clown crowns the existing entrance, entirely above its opening.
 const portal=new THREE.Box3(),portalMeshes=[];root.traverse(o=>{if(o.isMesh&&/^(Right_entrance_true_open_arched_header|Right_gate_gilded_cornice)/.test(o.name)){portal.expandByObject(o);portalMeshes.push(o)}});
 if(!portal.isEmpty()){
  const center=portal.getCenter(new THREE.Vector3()),points=[];for(const mesh of portalMeshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld))}
  let xx=0,xz=0,zz=0;for(const p of points){const x=p.x-center.x,z=p.z-center.z;xx+=x*x;xz+=x*z;zz+=z*z}
  const theta=.5*Math.atan2(2*xz,xx-zz),widthAxis=new THREE.Vector3(Math.cos(theta),0,Math.sin(theta)),normal=new THREE.Vector3(-widthAxis.z,0,widthAxis.x);if(normal.dot(center)<0)normal.negate();
  let front=-Infinity;for(const p of points)front=Math.max(front,p.dot(normal));center.addScaledVector(normal,front-center.dot(normal));center.y=portal.max.y+.46;face(center,normal,1.4,'Circus_gateway_clown',true);
  // A real red-and-white frame sits outside the stone doorway, with a wider
  // clear span than the existing passage. No paint lies on coplanar stone.
  const side=new THREE.Vector3(normal.z,0,-normal.x),frameBase=center.clone();frameBase.y=.20;frameBase.addScaledVector(normal,.08);
  const toWorld=(x,y)=>frameBase.clone().addScaledVector(side,x).add(new THREE.Vector3(0,y,0));
  for(const sign of [-1,1]){
   const x=sign*1.38;
   for(let k=0;k<12;k++){const geo=new THREE.CylinderGeometry(.095,.095,2.5/12,12);geo.translate(...toWorld(x,(k+.5)*2.5/12).toArray());geo.applyMatrix4(inverse);add(group,geo,k%2?materials[0]:white)}
   extraBoxes.push(new THREE.Box3().setFromCenterAndSize(toWorld(x,1.25),new THREE.Vector3(.20,2.5,.20)));
  }
  for(let k=0;k<20;k++){
   const a=k*Math.PI/20,b=(k+1)*Math.PI/20,arc=[];for(let j=0;j<=4;j++){const t=a+(b-a)*j/4;arc.push(toWorld(Math.cos(t)*1.38,2.5+Math.sin(t)*1.38))}
   const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc),5,.095,10,false);geo.applyMatrix4(inverse);add(group,geo,k%2?materials[0]:white);
  }
 }
 // Follow the actual height of the stands, including their lower front rim.
 const roofs=[];root.traverse(o=>{if(o.isMesh&&/^(Unified_masonry_pier|True_open_facade_arch|Arch_carved_voussoir|Wide_empty_seating_terrace|Individual_seat_solid_stone)/.test(o.name))roofs.push(o)});
 const ray=new THREE.Raycaster(),anchors=[];
 for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,x=10.25*Math.cos(angle),z=8.2*Math.sin(angle);ray.set(new THREE.Vector3(x,16,z),new THREE.Vector3(0,-1,0));ray.far=15;const hit=ray.intersectObjects(roofs,false)[0];if(!hit||hit.point.y<2)continue;
  const foot=new THREE.Vector3(x,hit.point.y+.015,z),top=foot.clone().add(new THREE.Vector3(0,.45,0));
  const pole=new THREE.CylinderGeometry(.022,.022,.45,8);pole.translate(foot.x,foot.y+.225,foot.z);pole.applyMatrix4(inverse);add(group,pole,gold);
  const bead=new THREE.SphereGeometry(.065,12,8);bead.translate(top.x,top.y,top.z);bead.applyMatrix4(inverse);add(group,bead,gold);anchors.push(top);
 }
 // Tethered balloon bouquets stand on selected roof posts, above the seats.
 let bouquets=0;
 for(let i=0;i<anchors.length;i+=4){
  const anchor=anchors[i],bouquet=new THREE.Group();bouquet.name=`Circus_balloon_bouquet_${bouquets++}`;bouquet.position.copy(anchor);bouquet.updateMatrix();bouquet.matrix.premultiply(inverse);bouquet.matrix.decompose(bouquet.position,bouquet.quaternion,bouquet.scale);group.add(bouquet);
  for(let k=0;k<3;k++){
   const x=(k-1)*.25,y=.85+(k===1?.28:0),z=k===1?-.08:.02,material=materials[(i+k)%6];
   add(bouquet,sphere,material,[x,y,z],[.19,.25,.18]);
   const knot=new THREE.ConeGeometry(.045,.055,6);knot.rotateX(Math.PI);add(bouquet,knot,material,[x,y-.25,z]);
   const string=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(x*.4,y*.4-.1,z),new THREE.Vector3(x,y-.28,z)]);add(bouquet,new THREE.TubeGeometry(string,10,.006,4,false),gold);
  }
 }
 group.userData.balloonBouquets=bouquets;
 for(let i=0;i<anchors.length;i++){
  const a=anchors[i],b=anchors[(i+1)%anchors.length],mid=a.clone().lerp(b,.5);mid.y-=.13;
  const curve=new THREE.CatmullRomCurve3([a,mid,b]),rope=new THREE.TubeGeometry(curve,12,.012,5,false);rope.applyMatrix4(inverse);add(group,rope,gold);
  const tangent=b.clone().sub(a);tangent.y=0;tangent.normalize();
  for(let k=0;k<3;k++){
   const p=curve.getPoint((k+1)/4),left=p.clone().addScaledVector(tangent,-.15),right=p.clone().addScaledVector(tangent,.15),tip=p.clone().add(new THREE.Vector3(0,-.34,0));
   const geometry=new THREE.BufferGeometry().setFromPoints([left,right,tip]);geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,.5,0],2));geometry.computeVertexNormals();geometry.applyMatrix4(inverse);
   const material=materials[(i*3+k)%6];material.side=THREE.DoubleSide;add(group,geometry,material);
  }
 }
 group.userData.buntingAnchors=anchors.length;root.add(group);root.updateMatrixWorld(true);return {group,noses,extraBoxes};
}
