import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

const UP=new THREE.Vector3(0,1,0),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
function canvasTexture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function geometryTools(){
 const sphere=new THREE.SphereGeometry(1,20,12),geometries=new Set([sphere]);
 const mesh=(g,m,p,x=0,y=0,z=0)=>{geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o};
 const ball=(p,m,x,y,z,sx,sy= sx,sz=sx)=>{const o=mesh(sphere,m,p,x,y,z);o.scale.set(sx,sy,sz);return o};
 const box=(p,m,w,h,d,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const rod=(p,m,a,b,r=.025)=>{const start=new THREE.Vector3(...a),v=new THREE.Vector3(...b).sub(start),o=mesh(new THREE.CylinderGeometry(r,r,v.length(),12),m,p);o.position.copy(start.addScaledVector(v,.5));o.quaternion.setFromUnitVectors(UP,v.normalize());return o};
 return {mesh,ball,box,rod,geometries};
}
function batchRigidParts(root,rigs,geometries){
 root.updateMatrixWorld(true);const moving=new Set(rigs);
 for(const parent of [root,...rigs]){
  if(parent.isMesh)continue;
  const inverse=parent.matrixWorld.clone().invert(),buckets=new Map(),old=[];
  const visit=o=>{if(o!==parent&&moving.has(o))return;if(o.isMesh){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);old.push(o)}for(const c of o.children)visit(c)};visit(parent);
  for(const [material,parts] of buckets){const g=mergeGeometries(parts,false);geometries.add(g);const mesh=new THREE.Mesh(g,material);mesh.name='Grandma_rigid_material_batch';parent.add(mesh);parts.forEach(p=>p.dispose())}for(const o of old)o.removeFromParent();
 }
}

export function createGrandmaFeed(headData){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x8de1f3);
 const camera=new THREE.OrthographicCamera(-1.72,1.72,.9675,-.9675,.1,60);camera.position.set(0,1.12,7);camera.lookAt(0,1.02,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0xb9a473,2.3));const sun=new THREE.DirectionalLight(0xfff3d4,2.2);sun.position.set(-3,6,5);scene.add(sun);
 const {mesh,ball,box,rod,geometries}=geometryTools(),materials=new Set(),textures=new Set();
 const mat=(color,roughness=.8)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.add(m);return m};
 const basic=(color)=>{const m=new THREE.MeshBasicMaterial({color});materials.add(m);return m};
 const texture=(w,h,paint)=>{const t=canvasTexture(w,h,paint);textures.add(t);return t};
 const green=mat(0x6b9e43),dress=mat(0x937b9e),cream=mat(0xfff0d3),grey=mat(0xe0e2d8),gold=mat(0xd9a441,.3),dark=mat(0x423443),pink=mat(0xf198af),wood=mat(0xb77c40),leaf=mat(0x32976c),sea=basic(0x30cbbf),sand=mat(0xffe3a4),cloudWhite=basic(0xfff9e9),foam=basic(0xcbfff0);leaf.side=THREE.DoubleSide;
 const ocean=mesh(new THREE.PlaneGeometry(70,60),sea,scene,0,-.045,-20);ocean.rotation.x=-Math.PI/2;
 const beach=mesh(new THREE.CircleGeometry(7,48),sand,scene,0,-.02,3);beach.rotation.x=-Math.PI/2;
 const horizon=box(scene,basic(0x70ddd7),50,.27,.05,0,.20,-14);
 const clouds=[];for(const [x,y,z] of [[-3.8,2.6,-7],[3.9,2.8,-8]]){const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);for(let i=0;i<4;i++)ball(g,cloudWhite,i*.35,Math.sin(i)*.10,0,.42,.18,.14);clouds.push(g)}
 const palms=[];
 for(const [x,z,scale] of [[-1.45,-2.6,.72],[1.24,-3.4,.78],[-2.8,-5,.9]]){
  const palm=new THREE.Group();palm.position.set(x,0,z);palm.scale.setScalar(scale);scene.add(palm);
  const crown=new THREE.Group();crown.position.set(.25,2.4,0);palm.add(crown);rod(palm,wood,[0,0,0],[.25,2.4,0],.075);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(.4,.25,1.2,-.32);s.quadraticCurveTo(.4,-.03,0,0);const frond=mesh(new THREE.ShapeGeometry(s),leaf,crown);frond.rotation.set(-.28,a,0);}
  for(const x of [-.08,.10])ball(crown,wood,x,-.08,.03,.13);palms.push(crown);
 }
 const waves=[];for(let i=0;i<6;i++){const g=box(scene,foam,2.1+i*.35,.009,.032,-3.8+i*1.5,-.026,-1.3-i*.45);waves.push(g)}
 // A resort bungalow, deck and striped beach parasol make the location visible.
 const hut=new THREE.Group();hut.position.set(1.2,0,-6);hut.scale.setScalar(.65);scene.add(hut);box(hut,cream,1.5,.85,1.0,0,.75,0);for(const x of [-.6,.6])rod(hut,wood,[x,-.1,0],[x,.5,0],.055);
 const roof=mesh(new THREE.ConeGeometry(1.2,.6,4),wood,hut,0,1.46,0);roof.rotation.y=Math.PI/4;box(hut,wood,2.2,.08,1.3,0,.35,.35);box(hut,basic(0x40a6b2),.45,.45,.02,0,.82,.512);
 const umbrella=new THREE.Group();umbrella.position.set(-1.35,0,-.8);umbrella.scale.setScalar(.65);scene.add(umbrella);rod(umbrella,cream,[0,0,0],[0,1.5,0],.025);
 for(let i=0;i<8;i++){const g=new THREE.SphereGeometry(.75,3,3,i*Math.PI/4,Math.PI/4,0,Math.PI*.38),o=mesh(g,i%2?cream:pink,umbrella,0,1.5,0);o.scale.y=.5}

 const grandma=new THREE.Group();grandma.name='Grandma_HONK';grandma.position.x=-.62;scene.add(grandma);
 const torso=new THREE.Group();torso.name='Grandma_breathing_torso';grandma.add(torso);
 ball(torso,green,0,1.00,.015,.135,.16,.125);ball(torso,dress,0,.58,0,.34,.45,.22);ball(torso,dress,0,.24,.03,.42,.21,.28);
 for(const sign of [-1,1]){ball(grandma,dark,sign*.17,.075,.13,.13,.07,.22);ball(torso,dress,sign*.26,.78,0,.14,.17,.15)}
 for(let i=0;i<15;i++){const a=i*Math.PI/14;ball(torso,cream,Math.cos(a)*.245,.85-Math.sin(a)*.11,.18,.042,.033,.022)}
 ball(torso,gold,0,.765,.235,.055,.065,.025);ball(torso,cream,0,.77,.26,.033,.043,.018);
 for(let i=0;i<18;i++){const y=.31+(i%5)*.09,x=Math.sin(i*2.4)*.23;ball(torso,pink,x,y,.205,.018,.018,.009);ball(torso,cream,x+.018,y+.012,.205,.011,.011,.009)}
 const head=new THREE.Group();head.name='Grandma_original_HONK_head';head.position.set(0,1.20,.0);head.scale.set(1.65,1.45,1.65);torso.add(head);
 const buckets=new Map();for(const part of headData.meshes){const key=part.color.join(','),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));g.setIndex(part.indices);if(!buckets.has(key))buckets.set(key,{color:part.color,items:[]});buckets.get(key).items.push(g)}
 for(const b of buckets.values()){const g=mergeGeometries(b.items,false);geometries.add(g);const m=mat(new THREE.Color().setRGB(...b.color));mesh(g,m,head);b.items.forEach(g=>g.dispose())}
 // Silver curls and low gold reading glasses distinguish her from the player.
 for(const sign of [-1,1])for(let i=0;i<6;i++)ball(head,grey,sign*(.195+Math.sin(i*.7)*.018),-.05+i*.035,.035,.042,.035,.04);
 for(const sign of [-1,1]){const lens=mesh(new THREE.TorusGeometry(.067,.006,8,32),gold,head,sign*.092,.018,.227);lens.scale.y=.86;rod(head,gold,[sign*.15,.02,.22],[sign*.22,.045,.09],.005)}
 rod(head,gold,[-.025,.02,.235],[.025,.02,.235],.005);
 const freeArm=new THREE.Group();freeArm.position.set(-.27,.79,0);torso.add(freeArm);rod(freeArm,dress,[0,0,0],[-.13,-.20,.09],.075);rod(freeArm,dress,[-.13,-.20,.09],[-.22,-.11,.19],.062);ball(freeArm,cream,-.22,-.11,.19,.075,.055,.05);ball(freeArm,green,-.25,-.10,.22,.065,.05,.045);
 const signArm=new THREE.Group();signArm.name='Grandma_waving_sign_arm';signArm.position.set(.27,.82,0);torso.add(signArm);
 rod(signArm,dress,[0,0,0],[.32,-.15,.04],.085);ball(signArm,dress,.32,-.15,.04,.09);rod(signArm,dress,[.32,-.15,.04],[.72,.05,.17],.065);ball(signArm,cream,.72,.05,.17,.075,.065,.06);
 const sign=new THREE.Group();sign.name='BUY_HONK_placard';signArm.add(sign);rod(sign,wood,[.72,-.09,.2],[.72,.59,.2],.024);
 box(sign,gold,1.18,.62,.045,.72,.54,.21);const boardTexture=texture(1024,512,(c,w,h)=>{c.fillStyle='#fff5d5';c.fillRect(0,0,w,h);c.strokeStyle='#c29336';c.lineWidth=16;c.strokeRect(17,17,w-34,h-34);c.fillStyle='#ba203c';c.textAlign='center';c.textBaseline='middle';c.font='900 150px Arial, sans-serif';c.fillText('BUY HONK',w/2,h/2+8,w-90)}),boardMaterial=new THREE.MeshBasicMaterial({map:boardTexture});materials.add(boardMaterial);const lettering=mesh(new THREE.PlaneGeometry(1.13,.57),boardMaterial,sign,.72,.54,.235);lettering.name='BUY HONK';
 ball(signArm,green,.72,.05,.24,.07,.055,.05);
 const headerTexture=texture(1024,80,(c,w,h)=>{c.fillStyle='#153b3bdd';c.fillRect(0,0,w,h);c.fillStyle='#fff8e7';c.font='bold 31px Arial';c.fillText('GRANDMA HONK',28,49);c.textAlign='right';c.fillStyle='#b8ffe3';c.fillText('MALDIVES  •  LIVE',w-28,49)}),headerMaterial=new THREE.MeshBasicMaterial({map:headerTexture,transparent:true});materials.add(headerMaterial);mesh(new THREE.PlaneGeometry(3.44,.23),headerMaterial,scene,0,1.91,2);
 batchRigidParts(scene,[torso,head,freeArm,signArm,sign,...palms,...clouds,...waves],geometries);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 return {scene,camera,grandma,head,signArm,sign,lettering,
  update(t){torso.position.y=Math.sin(t*1.8)*.012;torso.rotation.y=Math.sin(t*.7)*.055;head.rotation.set(Math.sin(t*1.2)*.035,Math.sin(t*.85)*.11,Math.sin(t*.65)*.045);signArm.rotation.z=.03+Math.sin(t*2.5)*.13;signArm.rotation.x=Math.sin(t*1.5)*.045;sign.rotation.y=Math.sin(t*1.3)*.055;freeArm.rotation.z=-.10+Math.sin(t*2.1)*.10;for(let i=0;i<palms.length;i++)palms[i].rotation.z=Math.sin(t*.8+i)*.035;for(let i=0;i<waves.length;i++)waves[i].position.x=-3.8+i*1.5+Math.sin(t*.7+i)*.12;for(let i=0;i<clouds.length;i++)clouds[i].position.x=(i?3.9:-3.8)+Math.sin(t*.03)*.1},
  dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose()}
 };
}

export function prepareGrandmaLaptop(root,{headData}){
 root.updateMatrixWorld(true);const table=root.getObjectByName('Antique_low_tea_table');if(!table)return null;const desktop=table.children[0];
 // Clear the left half of the coffee table while keeping its books and tea.
 for(const o of table.children.slice(6,14)){o.position.x+=.78;o.position.z-=.23}for(const o of table.children.slice(14)){o.position.z+=.27}root.updateMatrixWorld(true);
 const desk=new THREE.Box3().setFromObject(desktop),group=new THREE.Group();group.name='Grandma_HONK_laptop';root.add(group);
 // The source scene is in world coordinates; keep the laptop on the real desk.
 root.matrixWorld.clone().invert().multiply(new THREE.Matrix4().makeTranslation((desk.min.x+desk.max.x)/2-.36,desk.max.y+.007,(desk.min.z+desk.max.z)/2+.04).multiply(new THREE.Matrix4().makeScale(.8,.8,.8))).decompose(group.position,group.quaternion,group.scale);
 const {mesh,ball,box,rod,geometries}=geometryTools(),metal=new THREE.MeshStandardMaterial({color:0xc95067,metalness:.55,roughness:.35}),gold=new THREE.MeshStandardMaterial({color:0xe8bb65,metalness:.7,roughness:.25}),black=new THREE.MeshStandardMaterial({color:0x171c30,roughness:.6}),keys=new THREE.MeshStandardMaterial({color:0xf3d9c2,roughness:.65});
 box(group,metal,1.06,.036,.38,0,.018,0);box(group,gold,1.067,.009,.386,0,.012,0);box(group,black,.91,.006,.16,0,.039,-.044);
 for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(group,keys,.057,.004,.024,-.40+col*.073,.043,-.099+row*.035);
 box(group,keys,.30,.003,.062,0,.040,.107);rod(group,gold,[-.47,.04,-.178],[.47,.04,-.178],.018);
 const lid=new THREE.Group();lid.position.set(0,.045,-.178);lid.rotation.x=-.15;group.add(lid);box(lid,metal,1.06,.635,.032,0,.3175,0);box(lid,black,1.012,.579,.008,0,.324,.021);
 const idle=canvasTexture(1024,576,(c,w,h)=>{const gradient=c.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#153849');gradient.addColorStop(1,'#253655');c.fillStyle=gradient;c.fillRect(0,0,w,h);c.textAlign='center';c.fillStyle='#f6c975';c.font='bold 35px Arial';c.fillText('HONK CONNECT',w/2,72);c.fillStyle='#9ce9cd';c.beginPath();c.arc(w/2,215,74,0,Math.PI*2);c.fill();c.fillStyle='#243b49';c.font='bold 78px Arial';c.fillText('H',w/2,243);c.fillStyle='#fff4dc';c.font='bold 54px Arial';c.fillText('Grandma HONK',w/2,365);c.fillStyle='#a5d9db';c.font='30px Arial';c.fillText('Maldives · Incoming video call',w/2,418);c.fillStyle='#a4efd0';c.font='bold 30px Arial';c.fillText('TAP TO ANSWER',w/2,514)});
 const screenMaterial=new THREE.MeshBasicMaterial({map:idle,toneMapped:false}),screen=mesh(new THREE.PlaneGeometry(.963,.542),screenMaterial,lid,0,.324,.026);screen.name='Grandma_video_call_screen';ball(lid,black,0,.605,.024,.009);ball(lid,new THREE.MeshBasicMaterial({color:0x9affc6}),.024,.605,.025,.003);
 batchRigidParts(group,[screen],geometries);const retained=new Set();group.traverse(o=>{if(o.geometry)retained.add(o.geometry)});for(const g of geometries)if(!retained.has(g))g.dispose();
 group.traverse(o=>{if(o.isMesh)o.userData.grandmaLaptop=true});root.updateMatrixWorld(true);const screenPosition=screen.getWorldPosition(new THREE.Vector3()),feed=createGrandmaFeed(headData),target=new THREE.WebGLRenderTarget(768,432,{depthBuffer:true,stencilBuffer:false});target.texture.colorSpace=THREE.SRGBColorSpace;target.texture.generateMipmaps=false;
 const ray=new THREE.Raycaster(),direction=new THREE.Vector3();
 return {group,screen,screenPosition,feed,target,idle,width:.963*.8,
  showLive(live){screenMaterial.map=live?target.texture:idle;screenMaterial.needsUpdate=true},
  visibleFrom(position,occluders=[]){direction.copy(screenPosition).sub(position);const distance=direction.length();if(distance>3.6)return false;ray.set(position,direction.normalize());ray.far=distance-.02;return !ray.intersectObjects(occluders,true).some(h=>!h.object.userData.grandmaLaptop)},
  pick(camera,point,occluders=[]){group.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);ray.setFromCamera(point,camera);ray.far=3.6;const hit=ray.intersectObject(group,true)[0];if(!hit)return false;const blocked=ray.intersectObjects(occluders,true).find(h=>!h.object.userData.grandmaLaptop&&h.distance<hit.distance-.015);return !blocked},
  render(renderer){if(!renderer.setRenderTarget)return;const previous=renderer.getRenderTarget(),viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear,xr=renderer.xr?.enabled;try{if(renderer.xr)renderer.xr.enabled=false;renderer.autoClear=true;renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.render(feed.scene,feed.camera)}finally{renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=autoClear;if(renderer.xr)renderer.xr.enabled=xr}},
  dispose(){feed.dispose();target.dispose()}
 };
}

export function mountGrandmaCall(viewer,laptop){
 const host=document.getElementById('world'),panel=document.createElement('aside');panel.className='grandma-call glass';panel.hidden=true;panel.setAttribute('aria-label','Grandma HONK video call');panel.innerHTML='<div><strong>Grandma HONK</strong><span class="grandma-call-status">Maldives · Incoming video call</span></div><button class="grandma-answer" type="button">Answer</button><button class="grandma-hangup" type="button">Decline</button>';host.append(panel);
 const answer=panel.querySelector('.grandma-answer'),hangup=panel.querySelector('.grandma-hangup'),status=panel.querySelector('.grandma-call-status'),focus=laptop.screenPosition.clone(),closePosition=new THREE.Vector3(),closeCamera=viewer.camera.clone(),closeRotation=new THREE.Quaternion();
 let phase='waiting',nearTime=0,nearCheck=0,near=false,elapsed=0,blend=0,paint=0,ringTime=0,saved=null,disposed=false,context=null,notes=[],suspended=false,unfocused=false,aspect=viewer.camera.aspect;
 function fitCamera(){const distance=Math.max(.90,laptop.width*1.18/(2*Math.tan(THREE.MathUtils.degToRad(viewer.camera.fov/2))*viewer.camera.aspect));closePosition.copy(focus).add(new THREE.Vector3(0,.09,distance));closeCamera.position.copy(closePosition);closeCamera.lookAt(focus);closeRotation.copy(closeCamera.quaternion)}fitCamera();
 function silence(){for(const n of notes){try{n.stop()}catch{}n.disconnect()}notes=[]}
 function unlock(){if(disposed)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!context&&Audio)context=new Audio();void context?.resume()?.catch(()=>{})}catch{}}
 function ring(){if(!context||context.state!=='running')return;silence();for(const [delay,freq] of [[0,660],[.18,880],[.38,660],[.56,880]]){const o=context.createOscillator(),g=context.createGain(),at=context.currentTime+delay;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.055,at+.018);g.gain.exponentialRampToValueAtTime(.0001,at+.16);o.connect(g);g.connect(context.destination);o.start(at);o.stop(at+.18);o.onended=()=>g.disconnect();notes.push(o)}}
 function sync(){answer.hidden=!!saved;hangup.textContent=saved?'End call':'Decline';status.textContent=saved?'Maldives · Connected':'Maldives · Incoming video call'}
 function restore(){if(!saved)return;viewer.camera.position.copy(saved.position);viewer.camera.quaternion.copy(saved.rotation);viewer.foot=saved.foot;viewer.yaw=saved.yaw;viewer.pitch=saved.pitch;viewer.controls.enabled=saved.controls;viewer.motion.reset(saved.yaw,saved.pitch);saved=null;viewer.clearWalkInput();host.classList.remove('grandma-in-call')}
 function cancel(){silence();restore();phase='waiting';nearTime=0;nearCheck=0;elapsed=0;ringTime=0;panel.hidden=true;hangup.disabled=false;laptop.showLive(false)}
 function begin(){if(disposed||saved||!viewer.active||viewer.mode!=='walk'||!laptop.visibleFrom(viewer.camera.position,[viewer.staticGroup,viewer.root].filter(Boolean))||viewer.helicopterFlight?.active||viewer.balloonTravel?.active||viewer.castleGreeting?.active||viewer.wardrobeAmbush?.active||viewer.mafiaFight?.active)return false;unlock();silence();saved={position:viewer.camera.position.clone(),rotation:viewer.camera.quaternion.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,controls:viewer.controls.enabled};phase='connecting';elapsed=0;blend=0;paint=1;viewer.clearWalkInput();viewer.controls.enabled=false;host.classList.add('grandma-in-call');laptop.showLive(true);panel.hidden=false;sync();return true}
 function end(){silence();if(!saved){phase='declined';panel.hidden=true;return}if(phase==='ending')return;phase='ending';blend=0;closeCamera.position.copy(viewer.camera.position);closeCamera.quaternion.copy(viewer.camera.quaternion);hangup.disabled=true}
 answer.addEventListener('click',begin);hangup.addEventListener('click',end);const key=e=>{if(saved&&e.code==='Escape'){e.preventDefault();end()}},blur=()=>{unfocused=true;silence()},focusWindow=()=>{unfocused=false};window.addEventListener('pointerdown',unlock,{passive:true});window.addEventListener('keydown',unlock);window.addEventListener('keydown',key);window.addEventListener('blur',blur);window.addEventListener('focus',focusWindow);
 return {laptop,get active(){return !!saved},get phase(){return phase},begin,end,cancel,
  async prepare(){await viewer.renderer.compileAsync?.(laptop.feed.scene,laptop.feed.camera);laptop.render(viewer.renderer)},
  suspend(value){suspended=value;if(value)silence()},
  update(dt){if(disposed)return;if(!saved&&(viewer.castleGreeting?.active||viewer.wardrobeAmbush?.active||viewer.mafiaFight?.active)){panel.hidden=true;silence();nearCheck=0;return}const paused=unfocused||suspended||!viewer.active||document.hidden||viewer.desktopControls?.menuOpen;if(paused){silence();return}dt=Math.min(Math.max(dt,0),.08);
   if(saved){
    if(phase!=='ending'&&aspect!==viewer.camera.aspect){aspect=viewer.camera.aspect;fitCamera();if(phase==='live'){viewer.camera.position.copy(closePosition);viewer.camera.quaternion.copy(closeRotation)}}
    blend=Math.min(1,blend+dt/(phase==='ending'?.45:.65));const t=smooth(blend);
    if(phase==='ending'){viewer.camera.position.lerpVectors(closeCamera.position,saved.position,t);viewer.camera.quaternion.slerpQuaternions(closeCamera.quaternion,saved.rotation,t);if(blend===1){restore();phase='ended';panel.hidden=true;hangup.disabled=false;laptop.showLive(false)}return}
    if(phase==='connecting'){viewer.camera.position.lerpVectors(saved.position,closePosition,t);viewer.camera.quaternion.slerpQuaternions(saved.rotation,closeRotation,t);if(blend===1)phase='live'}
    elapsed+=dt;paint+=dt;laptop.feed.update(elapsed);if(paint>=1/24){paint%=1/24;laptop.render(viewer.renderer)}status.textContent=`Maldives · ${Math.floor(elapsed/60)}:${String(Math.floor(elapsed)%60).padStart(2,'0')}`;return;
   }
   nearCheck-=dt;if(nearCheck<=0){nearCheck=.2;near=viewer.mode==='walk'&&!viewer.helicopterFlight?.active&&!viewer.balloonTravel?.active&&viewer.camera.position.distanceTo(focus)<3.4&&laptop.visibleFrom(viewer.camera.position,[viewer.staticGroup,viewer.root].filter(Boolean))}
   panel.hidden=!near||phase==='declined'||phase==='ended';
   if(!near){silence();return}nearTime+=dt;if(phase==='waiting'&&nearTime>.8){phase='ringing';ringTime=0;sync()}
   if(phase==='ringing'){ringTime-=dt;if(ringTime<=0){ring();ringTime=3.3}}
  },
  dispose(){if(disposed)return;cancel();disposed=true;window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);window.removeEventListener('keydown',key);window.removeEventListener('blur',blur);window.removeEventListener('focus',focusWindow);void context?.close()?.catch(()=>{});laptop.dispose();panel.remove()}
 };
}
