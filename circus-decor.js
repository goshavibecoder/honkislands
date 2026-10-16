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
