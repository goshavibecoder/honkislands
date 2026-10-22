import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Sample the original statue before its named meshes become static batches.
// Each filament follows the visible skin instead of a loose bounding box.
export function sampleStatueCurrent(root,strike,floor){
 const meshes=[];root.updateMatrixWorld(true);const box=new THREE.Box3();
 root.traverse(o=>{if(o.isMesh&&/^(Goat_|Rider_Museum_HONK_)/.test(o.name)){meshes.push(o);box.expandByObject(o)}});
 if(!meshes.length)return [];
 const center=box.getCenter(new THREE.Vector3()),ray=new THREE.Raycaster(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3(),paths=[],low=Math.max(box.min.y,floor+.9),height=strike.y-low;
 const guide=t=>t<.12?strike.x+(.7-strike.x)*t/.12:t<.23?.7+((t-.12)/.11)*(-1.1):t<.62?-.4+(t-.23)/.39*.5:.1;
 for(let channel=0;channel<6;channel++){
  const side=channel%2?-1:1,alongZ=channel<4,leg=channel<2?-.72:.72;let run=[];
  const finish=()=>{if(run.length>=6)paths.push(run);run=[]};
  for(let i=0;i<=100;i++){
   const t=i/100,y=strike.y-.025-t*height,wiggle=Math.sin(i*2.63+channel*1.7)*.055;
   let hit=null;
   for(const offset of [0,.18,-.18,.36,-.36,.60,-.60,.9,-.9]){
    if(alongZ){const x=guide(t)+(t>.65?(leg-.1)*(t-.65)/.35:0)+wiggle+offset;ray.set(new THREE.Vector3(x,y,center.z+side*5),new THREE.Vector3(0,0,-side))}
    else ray.set(new THREE.Vector3(center.x+side*5,y,center.z+wiggle+.22*Math.sin(t*5)+offset),new THREE.Vector3(-side,0,0));
    ray.far=10;hit=ray.intersectObjects(meshes,false)[0];if(hit)break;
   }
   if(!hit){finish();continue}
   normal.copy(hit.face.normal).applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld));const point=hit.point.clone().addScaledVector(normal,.035);
   if(run.length&&run[run.length-1].distanceTo(point)>.45)finish();
   if(!run.length&&point.distanceTo(strike)<.20)run.push(strike.clone().addScaledVector(normal,.035));run.push(point);
  }finish();
 }
 return paths;
}

export function createStatueCurrent(anchor){
 const group=new THREE.Group();group.name='Statue_surface_electric_current';group.visible=false;
 const uniforms={age:{value:0},strength:{value:0},top:{value:anchor.strike.y},span:{value:Math.max(1,anchor.strike.y-anchor.floor-.9)}};
 const material=(halo)=>new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`uniform float top;uniform float span;varying float travel;void main(){travel=clamp((top-position.y)/span,0.0,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float age;uniform float strength;varying float travel;void main(){float reveal=1.0-smoothstep(age/0.85-0.06,age/0.85+0.02,travel);float wave=exp(-pow((travel-fract(age*.78))/.12,2.0));float current=(.28+.72*wave)*strength*reveal;gl_FragColor=vec4(${halo?'vec3(.12,.38,1.0)':'vec3(.58,.88,1.0)'},current*${halo?'.30':'.90'});}`
 });
 const core=material(false),halo=material(true),batches=new Map([[core,[]],[halo,[]]]);let triangles=0;
 for(const points of anchor.currentPaths||[]){
  const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
  for(const [radius,m] of [[.018,core],[.055,halo]]){const geometry=new THREE.TubeGeometry(curve,points.length*2,radius,4,false);batches.get(m).push(geometry);triangles+=geometry.index.count/3}
 }
 for(const [m,parts] of batches){if(!parts.length)continue;const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,m);mesh.name='Statue_crawling_arc';group.add(mesh)}
 const light=new THREE.PointLight(0x5e9fff,0,10,2);light.position.copy(anchor.strike);light.position.y-=2.3;group.add(light);
 return {group,light,triangles,
  update(age){const strength=age>=0&&age<4.2?Math.min(1,age/.12)*(1-THREE.MathUtils.smoothstep(age,2.5,4.2)):0;group.visible=strength>0;uniforms.age.value=Math.max(0,age);uniforms.strength.value=strength;light.intensity=strength*7},
  reset(){group.visible=false;light.intensity=0;uniforms.strength.value=0}
 };
}
