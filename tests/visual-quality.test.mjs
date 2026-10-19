import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {prepareVisualQuality}=await import(moduleURL(new URL('../visual-quality.js',import.meta.url)));
const {prepareAntiqueRoom}=await import(moduleURL(new URL('../antique-room.js',import.meta.url)));
const {prepareGalleryInterior}=await import(moduleURL(new URL('../gallery-interior.js',import.meta.url)));
const {mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url)));
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){},fillText(){}})})};

const awaitStory=await import('../grandma-story.js');
test('the shared interface is English and the story has explicit RU / EN translations',()=>{
 for(const name of readdirSync(new URL('../',import.meta.url))){if(!/\.(js|html|css)$/.test(name)||name==='grandma-story.js')continue;assert.equal(/[А-Яа-яЁёІіЇїЄє]/.test(readFileSync(new URL('../'+name,import.meta.url),'utf8')),false,`untranslated text in ${name}`)}
 const {HONK_STORY}=awaitStory;assert.ok(HONK_STORY.ru.paragraphs.every(p=>/[А-Яа-я]/.test(p)));assert.ok(HONK_STORY.en.paragraphs.every(p=>!/[А-Яа-я]/.test(p)));assert.deepEqual(Object.keys(HONK_STORY.ru),Object.keys(HONK_STORY.en));
 assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/<html lang="en">/);
});

test('glass, color maps and contact shading retain the palette, data maps and furniture transforms',()=>{
 const root=new THREE.Group(),furniture=new THREE.Group();furniture.name='Antique_low_tea_table';furniture.position.set(3,.028,4);furniture.rotation.y=.65;root.add(furniture);
 const colorMap=new THREE.Texture(),normalMap=new THREE.Texture(),wood=new THREE.MeshStandardMaterial({color:0x9e654b,map:colorMap,normalMap}),leg=new THREE.Mesh(new THREE.BoxGeometry(2,1,1),wood);leg.position.y=.5;furniture.add(leg);
 const glass=new THREE.MeshStandardMaterial({name:'Reactor clear glass',color:0xc9e3df,transparent:true,opacity:.14}),pane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),glass);root.add(pane);const color=wood.color.clone(),geometry=leg.geometry,matrix=furniture.matrix.clone(),stats=prepareVisualQuality(root,{maxAnisotropy:4});
 assert.equal(colorMap.colorSpace,THREE.SRGBColorSpace);assert.equal(colorMap.anisotropy,4);assert.equal(normalMap.colorSpace,THREE.NoColorSpace);assert.ok(wood.color.equals(color));assert.equal(leg.geometry,geometry);
 assert.equal(glass.side,THREE.DoubleSide);assert.equal(glass.depthWrite,false);assert.equal(glass.opacity,.14);assert.equal(glass.forceSinglePass,true);assert.equal(pane.renderOrder,2);assert.equal(stats.shadows,1);
 const shadow=furniture.getObjectByName('Furniture_soft_contact');assert.ok(shadow);assert.equal(shadow.material.depthWrite,false);assert.ok(shadow.getWorldPosition(new THREE.Vector3()).distanceTo(furniture.localToWorld(shadow.position.clone()))<1e-8);assert.ok(furniture.position.equals(new THREE.Vector3(3,.028,4)));
});

test('all six original islands have finite geometry and keep their material colors after the quality pass',async()=>{
 for(const slug of ['honkhub','carnival','arena','arcade-district','goat-mountain','citadel']){
  const manifest=JSON.parse(readFileSync(new URL('../models/'+slug+'.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),root=gltf.scene,colors=new Map();if(slug==='honkhub')prepareAntiqueRoom(root,{balloonDoor:true});if(slug==='carnival')prepareGalleryInterior(root);
  root.traverse(o=>{if(!o.isMesh)return;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),`${slug}: invalid vertices`);assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite),`${slug}: invalid normals`);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.color)colors.set(m,m.color.clone())});
  const stats=prepareVisualQuality(root,{maxAnisotropy:8});assert.ok(stats.materials>30);assert.ok(stats.textures>0);if(['honkhub','carnival'].includes(slug)){assert.ok(stats.shadows>4);const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start),viewer={root,config:{},renderer:{capabilities:{getMaxAnisotropy:()=>8}}};new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)).call(viewer,THREE,mergeGeometries,{animations:[]},slug);assert.ok(viewer.staticGroup.children.some(o=>o.material.name==='Soft furniture contact'));if(slug==='honkhub')assert.ok(viewer.staticGroup.children.some(o=>/glass/i.test(o.material.name)&&o.renderOrder===2));for(const mesh of viewer.staticGroup.children)assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite))}for(const [m,color] of colors)assert.ok(m.color.equals(color),`${slug}: changed artwork palette`);
 }
});
