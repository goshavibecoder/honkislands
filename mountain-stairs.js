import * as THREE from 'three';

const UP=new THREE.Vector3(0,1,0);
const normalizedName=object=>object.name.replace(/\s+/g,'_');

// The source mountain was widened after the stairs were built. Rebuild each
// flight in world coordinates so its run and width remain perpendicular.
export function rebuildMountainStairs(root,shell){
 root.updateMatrixWorld(true);
 const flights=new Map(),obsolete=[];let stone=null,nosing=null,edge=null,landingMaterial=null,summit=null;
 root.traverse(object=>{
  if(!object.isMesh)return;
  const name=normalizedName(object),match=name.match(/^Solid_stair_riser_(\d+)_(\d+)$/);
  if(match){
   const box=new THREE.Box3().setFromObject(object),center=box.getCenter(new THREE.Vector3());center.y=box.max.y;
   if(!flights.has(Number(match[1])))flights.set(Number(match[1]),[]);
   flights.get(Number(match[1])).push({order:Number(match[2]),center});stone??=object.material;
  }
  if(/^Summit_circular_terrace(?:_\d+)?$/.test(name)){const bounds=new THREE.Box3().setFromObject(object);if(!summit||bounds.max.y>summit.max.y)summit=bounds}
  if(name.startsWith('Unified_supported_landing_'))landingMaterial??=object.material;
  if(/^Neon_stair_nosing(?:_\d+)?$/.test(name))nosing??=object.material;
  if(/^Continuous_stair_side_light(?:_\d+)?$/.test(name))edge??=object.material;
  if(/^(Solid_stair_riser_\d+_\d+|Stair_solid_supporting_stringer_\d+|Neon_stair_nosing(?:_\d+)?|Continuous_stair_side_light(?:_\d+)?)$/.test(name))obsolete.push(object);
 });
 if(flights.size!==5||!stone||!nosing||!edge)throw Error('Mountain staircase source is incomplete');
 nosing=nosing.clone();edge=edge.clone();for(const material of [nosing,edge]){material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1}
 const inverse=root.matrixWorld.clone().invert(),group=new THREE.Group();group.name='Rebuilt_mountain_staircases';
 const navPositions=[],specs=[];
 const addGeometry=(geometry,material,name)=>{
  geometry.applyMatrix4(inverse);geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
  group.add(mesh);
 };
 const box=(size,center,basis,material,name)=>{
  const geometry=new THREE.BoxGeometry(...size);geometry.applyMatrix4(basis);geometry.translate(center.x,center.y,center.z);addGeometry(geometry,material,name);
 };
 for(const [id,steps] of [...flights].sort((a,b)=>a[0]-b[0])){
  steps.sort((a,b)=>a.order-b.order);
  const first=steps[0].center.clone(),last=steps.at(-1).center.clone(),count=steps.length;
  const direction=last.clone().sub(first);direction.y=0;const spacing=direction.length()/(count-1);direction.normalize();
  let rise=(last.y-first.y)/(count-1);const width=1.46,length=spacing*count;
  const start=first.clone().addScaledVector(direction,-spacing/2),base=first.y-rise;
  // Aim the summit approach into the actual terrace, with the last tread flush
  // to its top. The widened source flight pointed along the outside rim.
  if(id===4){
   if(!summit)throw Error('Summit platform unavailable');
   const target=summit.getCenter(new THREE.Vector3());target.z+=summit.getSize(new THREE.Vector3()).z*.19;direction.subVectors(target,start);direction.y=0;direction.normalize();
   rise=(summit.max.y-base)/count;first.y=base+rise;last.y=summit.max.y;
  }
  if(!(spacing>.1&&rise>.08&&rise<.22))throw Error(`Invalid mountain stair flight ${id}`);
  const side=new THREE.Vector3(direction.z,0,-direction.x),end=start.clone().addScaledVector(direction,length);end.y=last.y;
  if(id===0)box([2.8,.28,1.6],new THREE.Vector3(start.x,base-.13,start.z+.75),new THREE.Matrix4(),stone,'Mountain_entry_landing');
  // One closed extrusion: treads cannot float apart or expose a sloping ramp
  // through their top faces. The supporting underside stays below every tread.
  const shape=new THREE.Shape();shape.moveTo(0,base-.30);shape.lineTo(0,first.y);
  for(let i=0;i<count;i++){
   const top=first.y+i*rise;shape.lineTo((i+1)*spacing,top);
   if(i<count-1)shape.lineTo((i+1)*spacing,top+rise);
  }
  shape.lineTo(length,last.y-.30);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:false,curveSegments:1});
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
   const run=position.getX(i),height=position.getY(i),across=width/2-position.getZ(i);
   position.setXYZ(i,start.x+direction.x*run+side.x*across,height,start.z+direction.z*run+side.z*across);
  }
  geometry.computeVertexNormals();addGeometry(geometry,stone,`Mountain_solid_stair_flight_${id}`);
  const basis=new THREE.Matrix4().makeBasis(side,UP,direction);
  const lowLip=start.clone().addScaledVector(direction,-.10);lowLip.y=base-.07;box([width,.18,.30],lowLip,basis,stone,`Mountain_stair_mouth_low_${id}`);
  const highLip=end.clone().addScaledVector(direction,.125);highLip.y=last.y-.09;box([width,.18,.25],highLip,basis,stone,`Mountain_stair_mouth_high_${id}`);
  for(let i=0;i<count;i++){
   const top=first.y+i*rise,front=start.clone().addScaledVector(direction,i*spacing+.016);front.y=top+.012;
   box([width-.08,.022,.030],front,basis,nosing,`Mountain_stair_nosing_${id}_${i}`);
   for(const sign of [-1,1]){
    const rail=start.clone().addScaledVector(direction,(i+.5)*spacing).addScaledVector(side,sign*(width/2-.025));rail.y=top+.012;
    box([.024,.022,spacing+.002],rail,basis,edge,`Mountain_stair_edge_${id}_${i}_${sign}`);
    const vertical=start.clone().addScaledVector(direction,i*spacing-.012).addScaledVector(side,sign*(width/2-.025));vertical.y=top-rise/2;
    box([.024,rise,.024],vertical,basis,edge,`Mountain_stair_edge_riser_${id}_${i}_${sign}`);
   }
  }
  // The navigation ramp spans both full end treads, ending at landing height.
  // Its footprint uses the same orthogonal basis as the visible staircase.
  const half=width/2-.19,low=start.clone().addScaledVector(direction,-.02);low.y=base+.006-.02*rise/spacing;const high=end.clone().addScaledVector(direction,.02);high.y+=.006+.02*rise/spacing;
  const a=low.clone().addScaledVector(side,half),b=low.clone().addScaledVector(side,-half),c=high.clone().addScaledVector(side,half),d=high.clone().addScaledVector(side,-half);
  navPositions.push(...a.toArray(),...b.toArray(),...c.toArray(),...b.toArray(),...d.toArray(),...c.toArray());
  specs.push({id,count,width,spacing,rise,exitPadding:id===4?.25:.26,start:[start.x,base+.006,start.z],end:[end.x,end.y+.006,end.z],direction:direction.toArray(),side:side.toArray()});
 }
 // Flat turn landings join the complete widths of adjacent stair mouths.
 // They also replace the old rock floor through the middle of these turns.
 const landingCuts=[],landingPaths=[];
 for(let i=0;i<specs.length-1;i++){
  const previous=specs[i],next=specs[i+1],a=new THREE.Vector3(...previous.end),b=new THREE.Vector3(...next.start);
  const top=Math.max(a.y,b.y)-.006+.012;
  // Continue beyond the incoming top tread before turning back. A direct
  // diagonal across a switchback would cover the last few lower treads.
  const path=[a,a.clone().addScaledVector(new THREE.Vector3(...previous.direction),1.15),b.clone().addScaledVector(new THREE.Vector3(...next.direction),-1.15),b];
  const outline=pathOutline(path,.73),shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(p.x,-p.y)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.28,steps:1,bevelEnabled:false,curveSegments:1}),position=geometry.attributes.position;
  for(let n=0;n<position.count;n++){const x=position.getX(n),z=-position.getY(n),y=top-.28+position.getZ(n);position.setXYZ(n,x,y,z)}
  geometry.computeVertexNormals();addGeometry(geometry,landingMaterial||stone,`Mountain_stair_turn_landing_${i}`);
  for(const triangle of THREE.ShapeUtils.triangulateShape(outline,[])){
   const points=triangle.map(n=>new THREE.Vector3(outline[n].x,top+.006,outline[n].y));
   if(new THREE.Triangle(...points).getNormal(new THREE.Vector3()).y<0)[points[1],points[2]]=[points[2],points[1]];
   for(const point of points)navPositions.push(...point.toArray());
  }
  // Cut the entire turn, including mitered outer corners, out of the rock.
  // Three narrow center-line strips left rock protruding through those corners.
  const clearanceOutline=pathOutline(path,.91);
  for(const [n,triangle] of THREE.ShapeUtils.triangulateShape(clearanceOutline,[]).entries())landingCuts.push({id:`landing-${i}-${n}`,polygon:triangle.map(k=>[clearanceOutline[k].x,clearanceOutline[k].y]),top:top+.006});
  landingPaths.push(path.map(p=>[p.x,top+.006,p.z]));
 }
 const corridors=[...specs,...landingCuts];
 const disposed=new Set(obsolete.map(mesh=>mesh.geometry));for(const mesh of obsolete)mesh.removeFromParent();
 // Some original neon boxes share geometry; dispose only after checking that
 // no surviving mountain object still references it.
 root.traverse(object=>{if(object.geometry)disposed.delete(object.geometry)});for(const geometry of disposed)geometry.dispose();
 const trimmed=applySealedMountain(root,shell);
 // Fill the exposed outside notch at the final two treads. The new threshold
 // is wider than the source cut and sits just above its old surfaces.
 const final=specs.at(-1),fdir=new THREE.Vector3(...final.direction),fside=new THREE.Vector3(...final.side),fstart=new THREE.Vector3(...final.start),basis=new THREE.Matrix4().makeBasis(fside,UP,fdir);
 for(const step of [3,4]){
  const center=fstart.clone().addScaledVector(fdir,(step+.5)*final.spacing);center.y=final.start[1]-.006+(step+1)*final.rise+.028-.15;
  box([2.05,.30,final.spacing+.012],center,basis,landingMaterial||stone,`Mountain_summit_stair_threshold_${step}`);
 }
 const apron=new THREE.Vector3(...final.end).addScaledVector(fdir,.28);apron.y=final.end[1]+.022-.15;
 box([2.05,.30,.62],apron,basis,landingMaterial||stone,'Mountain_summit_stair_threshold_apron');

 // The offline union already contains the opaque treads and decks. Keeping
 // these construction meshes too would render the same faces twice.
 if(shell.mergedStairs)for(const mesh of [...group.children])if(/^(Mountain_entry_landing|Mountain_solid_stair_flight_|Mountain_stair_mouth_|Mountain_stair_turn_landing_)/.test(mesh.name)){mesh.removeFromParent();mesh.geometry.dispose()}
 root.add(group);applyCircusPalette(root);root.updateMatrixWorld(true);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(navPositions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const nav=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));nav.name='Mountain_stair_navigation';nav.userData.flights=specs;nav.userData.corridors=corridors;nav.userData.landingPaths=landingPaths;nav.userData.trimmedSurfaces=trimmed;nav.updateMatrixWorld(true);return nav;
}

function pathOutline(path,half){
 const normals=[];for(let i=0;i<path.length-1;i++){const d=path[i+1].clone().sub(path[i]);d.y=0;d.normalize();normals.push(new THREE.Vector2(d.z,-d.x))}
 const left=[],right=[];
 for(let i=0;i<path.length;i++){
  let offset;if(i===0)offset=normals[0].clone().multiplyScalar(half);else if(i===path.length-1)offset=normals.at(-1).clone().multiplyScalar(half);else{offset=normals[i-1].clone().add(normals[i]).normalize();offset.multiplyScalar(Math.min(half*2.5,half/Math.max(.1,offset.dot(normals[i]))))}
  left.push(new THREE.Vector2(path[i].x+offset.x,path[i].z+offset.y));right.push(new THREE.Vector2(path[i].x-offset.x,path[i].z-offset.y));
 }
 return left.concat(right.reverse());
}


// The shell was cut as closed solids offline. Its cut faces belong to the
// mountain, retain its stone textures, and introduce no freestanding walls.
function applySealedMountain(root,shell){
 if(!shell?.replace?.length||!shell.parts?.length)throw Error('Sealed mountain surface unavailable');
 const materials=new Map(),meshes=new Map();root.traverse(o=>{if(o.isMesh){materials.set(o.material.name,o.material);meshes.set(o.name,o)}});
 for(const name of shell.replace)if(!meshes.has(name))throw Error(`Mountain surface missing: ${name}`);
 for(const part of shell.parts)if(!materials.has(part.material))throw Error(`Mountain material missing: ${part.material}`);
 const inverse=root.matrixWorld.clone().invert(),retired=new Set();
 for(const name of shell.replace){const mesh=meshes.get(name);retired.add(mesh.geometry);mesh.removeFromParent()}
 for(const part of shell.parts){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(part.uv,2));geometry.computeVertexNormals();geometry.applyMatrix4(inverse);geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,materials.get(part.material));mesh.name=part.name.replace(/_sealed_\d+$/,'');root.add(mesh);
 }
 root.traverse(o=>{if(o.geometry)retired.delete(o.geometry)});for(const geometry of retired)geometry.dispose();return shell.replace.length;
}

// A painted circus setting: a full rainbow on the stairs, warm stone and
// crimson fabric. Cache the small palette so the model still batches well.
function applyCircusPalette(root){
 const rainbow=['#ed3346','#ff982e','#ffe15a','#37b86d','#498cf0','#aa56d7'];
 const stone={Basalt:'#66544e','Basalt blue':'#7c6660','Basalt grey':'#9f8977','Basalt light':'#bca68c',Snow:'#fff0dc','Snow shadow':'#d6cec1','Snow bright':'#fffaf0','Stone blocks':'#e3ca98','Stone blocks light':'#f5dfb0',Mortar:'#86705d','Stair tread':'#ad3044','Royal purple cloth':'#b82436','Saddle violet':'#c13a41'};
 const starts=[0,15,32,49,66],cache=new Map();
 root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material))return;
  const source=mesh.material,name=normalizedName(mesh);let color=stone[source.name],glow=false;
  const stair=name.match(/^Mountain_stair_(?:nosing|edge|edge_riser)_(\d+)_(\d+)/),ring=name.match(/^Summit_luminous_ring(?:_(\d+))?$/),landing=name.match(/^Landing_neon_edge(?:_(\d+))?$/),shrine=name.match(/^Shrine_balcony_light(?:_(\d+))?$/),arch=name.match(/^Gate_arch_voussoir_(\d+)$/);
  if(stair){color=rainbow[(starts[Number(stair[1])]+Number(stair[2]))%6];glow=true}
  else if(ring){color=rainbow[[0,2,3][Number(ring[1]||0)%3]];glow=true}
  else if(landing){color=rainbow[[2,1,3,0][Number(landing[1]||0)%4]];glow=true}
  else if(shrine){color=rainbow[(Number(shrine[1]||0)+1)%6];glow=true}
  else if(arch)color=Number(arch[1])%2?'#d84142':'#f5dfb0';
  else if(/^Gateway_inner_purple_arch/.test(name)){color='#ffd36b';glow=true}
  else if(/^Gateway_upright_neon/.test(name)){color='#ed3346';glow=true}
  else if(/^(Cyan neon|Purple neon|Gold neon|Cold beacon|White starlight)$/.test(source.name)){color={'Cyan neon':'#ffd36b','Purple neon':'#ed3346','Gold neon':'#ffcc57','Cold beacon':'#ffbc68','White starlight':'#fff0c8'}[source.name];glow=true}
  if(!color)return;
  const key=source.uuid+color+glow;let material=cache.get(key);
  if(!material){
   material=source.clone();material.name=`Circus ${source.name} ${color}`;material.color.set(color);
   if(glow){material.emissive.set(color);material.emissiveIntensity=.45;material.roughness=.5;material.metalness=.1}
   cache.set(key,material);
  }
  mesh.material=material;
 });
}
