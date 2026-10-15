import * as THREE from 'three';

// One continuous spherical field, baked once into six adjoining cube faces.
// The background uses world directions: no cursor, camera-position or time input.
export const skyFragment = `
precision highp float;
varying vec3 vSkyDirection;
float hash3(vec3 p) {
 p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
 return fract((p.x+p.y)*p.z);
}
float noise3(vec3 p) {
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),
                mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),
                mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
 float n=0.,a=.56;
 for(int i=0;i<5;i++){n+=a*noise3(p);p=p*2.03+vec3(7.13,3.71,9.37);a*=.49;}
 return n;
}
vec3 rainbowColor(float t){
 // Pastel colors matched to the supplied rainbow-3 illustration.
 float p=clamp(t,0.,1.)*6.;
 vec3 a,b;
 if(p<1.){a=vec3(.73,.61,.97);b=vec3(.40,.69,1.);}
 else if(p<2.){a=vec3(.40,.69,1.);b=vec3(.38,.87,.95);}
 else if(p<3.){a=vec3(.38,.87,.95);b=vec3(.64,.92,.72);}
 else if(p<4.){a=vec3(.64,.92,.72);b=vec3(1.,.93,.62);}
 else if(p<5.){a=vec3(1.,.93,.62);b=vec3(1.,.78,.65);}
 else{a=vec3(1.,.78,.65);b=vec3(1.,.65,.79);}
 return mix(a,b,smoothstep(0.,1.,fract(min(p,5.9999))));
}
vec3 skyColor(vec3 direction) {
 vec3 d=normalize(direction),sun=normalize(vec3(-.60,.32,-.74));
 float y=d.y,sunDot=max(0.,dot(d,sun));
 vec3 col=mix(vec3(.55,.78,1.),vec3(.065,.40,1.),smoothstep(-.04,.87,y));
 col=mix(col,vec3(1.,.78,.70),pow(sunDot,7.)*.24);
 col+=vec3(.12,.09,.045)*pow(sunDot,40.);
 float disk=smoothstep(.9991,.99965,sunDot)*smoothstep(-.02,.08,y);
 col=mix(col,vec3(1.,.97,.85),disk*.9);
 // Rounded cloud towers at different depths and sizes, all around the viewer.
 vec3 p=d*4.6+vec3(17.4,8.1,-6.8);
 float mass=fbm(p),detail=fbm(d*12.7+vec3(-5.1,31.6,12.3));
 float layer=mass*.78+detail*.22;
 float sea=1.-smoothstep(-.42,.07,y);
 float coverage=smoothstep(.49-sea*.16,.64-sea*.13,layer);
 coverage=mix(coverage,1.,sea*.48);
 float shade=clamp((fbm(p+sun*.25)-mass)*4.5+.63,.1,1.);
 vec3 shadow=mix(vec3(.59,.68,.91),vec3(.94,.68,.80),pow(sunDot,5.)*.48);
 vec3 lit=mix(vec3(.98,.99,1.),vec3(1.,.89,.80),pow(sunDot,6.)*.55);
 vec3 cloud=mix(shadow,lit,shade);
 cloud=mix(cloud,vec3(.95,.96,1.),(1.-smoothstep(-.95,-.45,y))*.35);
 col=mix(col,cloud,coverage*.96);
 // A single rainbow occupies one direction, rather than repeating on every face.
 vec3 bowAxis=normalize(vec3(.18,.10,.98));
 float angle=acos(clamp(dot(d,bowAxis),-1.,1.));
 float band=(angle-.71)/.16;
 float bowMask=smoothstep(-.22,.18,band)*(1.-smoothstep(.82,1.22,band));
 bowMask*=smoothstep(.005,.15,y)*.72;
 vec3 rainbow=rainbowColor(band);
 col=mix(col,rainbow,bowMask);
 return clamp(col,0.,1.);
}
void main(){
 vec3 col=skyColor(vSkyDirection);
 gl_FragColor=vec4(pow(col,vec3(2.2)),1.);
 #include <colorspace_fragment>
}
`;

export function createPanoramicSky(renderer){
 const target=new THREE.WebGLCubeRenderTarget(768,{
  type:THREE.UnsignedByteType,colorSpace:THREE.SRGBColorSpace,
  generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,
  depthBuffer:false
 });
 const material=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,toneMapped:false,
  vertexShader:`varying vec3 vSkyDirection;void main(){vSkyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:skyFragment
 });
 const geometry=new THREE.SphereGeometry(100,48,32),sphere=new THREE.Mesh(geometry,material);
 const scene=new THREE.Scene();scene.add(sphere);
 const camera=new THREE.CubeCamera(.1,200,target);
 const previous=renderer.getRenderTarget();camera.update(renderer,scene);renderer.setRenderTarget(previous);
 geometry.dispose();material.dispose();
 return target;
}
