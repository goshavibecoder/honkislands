"""Optimize the supplied Rias Gremory (EXCLUSIVE) without rebuilding her body.

Usage: python scripts/prepare-castle-guest.py /path/to/rias_gremory_exclusive.glb
Keeps the original geometry, clothing, skin weights and facial controls.
Removes unused helper joints and reduces the embedded atlas for web delivery.
"""
import copy,gzip,io,json,struct,sys
from pathlib import Path
import numpy as np
from PIL import Image

raw=Path(sys.argv[1]).read_bytes();size=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+size]);binary=raw[28+size:]
dtypes={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'};widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];dt=np.dtype(dtypes[a['componentType']]);n=widths[a['type']]
 return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*dt.itemsize),dt.itemsize)).copy()

def transform(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]);M=np.eye(4);M[:3,:3]=R@np.diag(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
parents={c:i for i,n in enumerate(doc['nodes']) for c in n.get('children',[])};world={}
def visit(i,parent):
 world[i]=parent@transform(doc['nodes'][i])
 for c in doc['nodes'][i].get('children',[]):visit(c,world[i])
for i in doc['scenes'][doc.get('scene',0)]['nodes']:visit(i,np.eye(4))
skin=doc['skins'][0];sourceJoints=skin['joints'];ib=accessor(skin['inverseBindMatrices']);pieces=[];used=set();bounds=[]
for i,node in enumerate(doc['nodes']):
 if 'mesh' not in node:continue
 for prim in doc['meshes'][node['mesh']]['primitives']:
  a={k:accessor(v) for k,v in prim['attributes'].items() if k in ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0']};indices=accessor(prim['indices']).ravel() if 'indices' in prim else np.arange(len(a['POSITION']));pieces.append((i,a,indices))
  used.update(a['JOINTS_0'][a['WEIGHTS_0']>1e-6].tolist());P=a['POSITION'];bounds.append((np.c_[P,np.ones(len(P))]@world[i].T)[:,:3])
# Stable semantic names replace damaged source names on the main control joints.
aliases={10:'hips',30:'spine',33:'chest',260:'neck',261:'head',141:'upperArmL',152:'forearmL',158:'handL',201:'upperArmR',212:'forearmR',218:'handR',814:'thighL',828:'shinL',840:'footL',861:'thighR',875:'shinR',887:'footR',297:'mouthBase',300:'mouthMove',301:'lipCornerL',302:'lipCornerR',303:'lipLower',304:'lipUpper',486:'pupilL',500:'pupilR'}
keep={sourceJoints[j] for j in used}|set(aliases)
for i,n in enumerate(doc['nodes']):
 if n.get('name','').startswith(('cf_J_Eye0','cf_J_pupil','cf_J_Eye_rz','cf_J_Eye_tz')):keep.add(i)
for i in list(keep):
 while i in parents:i=parents[i];keep.add(i)
keep.update(i for i,n in enumerate(doc['nodes']) if 'mesh' in n)
ordered=sorted(keep);remap={old:new for new,old in enumerate(ordered)}
retainedJoints=[i for i in sourceJoints if i in keep];jointMap={sourceJoints.index(i):j for j,i in enumerate(retainedJoints)}
output={'asset':copy.deepcopy(doc['asset']),'scene':0,'scenes':[{'nodes':[len(ordered)]}],'nodes':[],'meshes':[],'skins':[],'materials':[{'name':'Rias original uniform and face','doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.85},'alphaMode':'MASK','alphaCutoff':.4}],'textures':[{'source':0}],'images':[],'bufferViews':[],'accessors':[]}
output['asset']['generator']='HONK web optimization; original geometry and rig retained'
irisMaterial=copy.deepcopy(output['materials'][0]);irisMaterial.update(name='Rias iris cutout',extras={'irisClip':[.5625,.681,.020,.027]});output['materials'].append(irisMaterial)
overlayMaterial=copy.deepcopy(output['materials'][0]);overlayMaterial.update(name='Rias transparent eyelid overlay',extras={'eyeOverlay':True});output['materials'].append(overlayMaterial)
whiteMaterial=copy.deepcopy(output['materials'][0]);whiteMaterial.update(name='Rias sclera and eyelid surface',extras={'eyeWhite':True});output['materials'].append(whiteMaterial)
chunks=[];offset=0
def blob(data,target=None):
 global offset
 pad=(-offset)%4
 if pad:chunks.append(b'\0'*pad);offset+=pad
 index=len(output['bufferViews']);v={'buffer':0,'byteOffset':offset,'byteLength':len(data)}
 if target:v['target']=target
 output['bufferViews'].append(v);chunks.append(data);offset+=len(data);return index
def attribute(data,component,kind,target=None,bounds=False):
 a={'bufferView':blob(data.tobytes(),target),'componentType':component,'count':len(data),'type':kind}
 if bounds:a.update(min=data.min(0).tolist(),max=data.max(0).tolist())
 output['accessors'].append(a);return len(output['accessors'])-1
for old in ordered:
 n=copy.deepcopy(doc['nodes'][old]);n.pop('mesh',None);n.pop('skin',None);n['name']=aliases.get(old,n.get('name',f'joint_{old}'));n['children']=[remap[c] for c in n.get('children',[]) if c in keep];output['nodes'].append(n)
for old,a,index in pieces:
 pupilWeights=np.zeros(len(a['POSITION']))
 for col in range(4):pupilWeights+=a['WEIGHTS_0'][:,col]*np.isin(a['JOINTS_0'][:,col],[sourceJoints.index(486),sourceJoints.index(500)])
 tris=index.reshape(-1,3);iris=(pupilWeights[tris]>.95).all(1)
 uv=a['TEXCOORD_0'][tris];p=a['POSITION'][tris];eyeOverlay=(uv[:,:,0]>.625).all(1)&(uv[:,:,0]<.69).all(1)&(uv[:,:,1]>.94).all(1)&(p[:,:,1]>13.45).all(1)&(p[:,:,1]<14.4).all(1)
 eyeWhite=(uv[:,:,0]>.259).all(1)&(uv[:,:,0]<.304).all(1)&(uv[:,:,1]>.448).all(1)&(uv[:,:,1]<.485).all(1)&(p[:,:,1]>13.6).all(1)&(p[:,:,1]<14.3).all(1)
 a['JOINTS_0']=np.array([[jointMap.get(int(j),0) for j in row] for row in a['JOINTS_0']],dtype='<u2')
 attrs={k:attribute(a[k].astype('<u2' if k=='JOINTS_0' else '<f4'),5123 if k=='JOINTS_0' else 5126,'VEC4' if k in ['JOINTS_0','WEIGHTS_0'] else 'VEC2' if k=='TEXCOORD_0' else 'VEC3',34962,k=='POSITION') for k in a}
 primitives=[{'attributes':attrs,'indices':attribute(tris[mask].astype('<u4').reshape(-1,1),5125,'SCALAR',34963),'material':material} for mask,material in [(~(iris|eyeOverlay|eyeWhite),0),(iris,1),(eyeOverlay,2),(eyeWhite,3)] if mask.any()]
 mesh={'name':'Rias original model','primitives':primitives};output['nodes'][remap[old]].update(mesh=len(output['meshes']),skin=0);output['meshes'].append(mesh)
P=np.concatenate(bounds);lo=P.min(0);hi=P.max(0);scale=1.75/(hi[1]-lo[1]);center=np.array([(lo[0]+hi[0])/2,lo[1],0])
output['nodes'].append({'name':'Rias_EXCLUSIVE_original_rig','children':[remap[i] for i in doc['scenes'][doc.get('scene',0)]['nodes'] if i in keep],'scale':[scale]*3,'translation':(-center*scale).tolist(),'extras':{'character':'Rias Gremory (EXCLUSIVE)','originalGeometry':True,'sourceAuthor':'mendezedward444','license':'CC-BY-4.0'}})
selectedIB=ib[[sourceJoints.index(i) for i in retainedJoints]].astype('<f4');output['skins']=[{'joints':[remap[i] for i in retainedJoints],'skeleton':remap[skin['skeleton']],'inverseBindMatrices':attribute(selectedIB,5126,'MAT4')}]
v=doc['bufferViews'][doc['images'][0]['bufferView']];image=Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGBA');image.thumbnail((3072,3072),Image.Resampling.LANCZOS);png=io.BytesIO();image.save(png,format='PNG',optimize=True);output['images']=[{'bufferView':blob(png.getvalue()),'mimeType':'image/png'}]
data=b''.join(chunks);data+=b'\0'*((-len(data))%4);output['buffers']=[{'byteLength':len(data)}];js=json.dumps(output,separators=(',',':')).encode();js+=b' '*((-len(js))%4);glb=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data
path=Path(__file__).resolve().parents[1]/'assets'/'castle-guest-v119.bin';path.write_bytes(gzip.compress(glb,compresslevel=9,mtime=0));print(json.dumps({'joints':len(retainedJoints),'nodes':len(output['nodes']),'triangles':sum(len(p[2])//3 for p in pieces),'texture':image.size,'bytes':path.stat().st_size}))
