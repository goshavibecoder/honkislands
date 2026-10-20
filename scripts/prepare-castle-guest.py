"""Prepare the supplied static character for a fully clothed castle greeting.

Usage: python scripts/prepare-castle-guest.py /path/to/input.glb
The original silhouette and arm geometry are retained under opaque clothing.
Only the face, hair, hands and lower legs retain their source texture.
"""
import io,json,struct,sys,gzip
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter

source=Path(sys.argv[1]).read_bytes();length=struct.unpack_from('<I',source,12)[0]
doc=json.loads(source[20:20+length]);binary=source[28+length:]
types={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'};widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dt=np.dtype(types[a['componentType']]);n=widths[a['type']]
 return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*dt.itemsize),dt.itemsize)).copy()
def transform(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
 M=np.eye(4);M[:3,:3]=R@np.diag(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
parts=[]
def visit(i,parent):
 n=doc['nodes'][i];M=parent@transform(n)
 if 'mesh' in n:
  for p in doc['meshes'][n['mesh']]['primitives']:
   material=doc['materials'][p['material']];texture=doc['textures'][material['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
   if texture!=6:continue
   xyz=accessor(p['attributes']['POSITION']);xyz=(np.c_[xyz,np.ones(len(xyz))]@M.T)[:,:3]
   normal=accessor(p['attributes']['NORMAL'])@np.linalg.inv(M[:3,:3]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-10)
   ids=accessor(p['indices']).ravel().astype(int)
   parts.append((xyz[ids].reshape(-1,3,3),normal[ids].reshape(-1,3,3),accessor(p['attributes']['TEXCOORD_0'])[ids].reshape(-1,3,2)))
 for child in n.get('children',[]):visit(child,M)
for i in doc['scenes'][doc.get('scene',0)]['nodes']:visit(i,np.eye(4))
T=np.concatenate([p[0] for p in parts]);N=np.concatenate([p[1] for p in parts]);UV=np.concatenate([p[2] for p in parts])
scale=1.75/1.09955044;T=(T-np.array([.043640915,-.17310238,.255349235]))*scale
view=doc['bufferViews'][doc['images'][6]['bufferView']];image=Image.open(io.BytesIO(binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])).convert('RGBA');pixels=np.asarray(image)
uv=UV.mean(1)%1;color=pixels[np.minimum((uv[:,1]*image.height).astype(int),image.height-1),np.minimum((uv[:,0]*image.width).astype(int),image.width-1)]
centers=T.mean(1);hair=(color[:,0]>color[:,1]*1.35)&(color[:,0]>color[:,2]*1.15)&(color[:,0]>45)&(centers[:,1]>.65)
head=centers[:,1]>1.465;hands=(np.abs(centers[:,0])>.50)&(centers[:,1]>1.25)
lower=centers[:,1]<.54;valid=np.linalg.norm(np.cross(T[:,1]-T[:,0],T[:,2]-T[:,0]),axis=1)>1e-10
fabric=(~(head|hair|hands|lower))&(np.abs(centers[:,0])>.175)&(centers[:,1]>1.30)&valid
fabricT=T[fabric]+N[fabric]*.006;fabricN=N[fabric]
keep=(head|hair|hands|lower)&valid;T=T[keep];N=N[keep];UV=UV[keep];ishead=(head|hair)[keep]
P=T.reshape(-1,3);normals=N.reshape(-1,3);uvs=UV.reshape(-1,2)
# Trim unused atlas regions as well as unused geometry.
image.thumbnail((2048,2048),Image.Resampling.LANCZOS);mask=Image.new('L',image.size);draw=ImageDraw.Draw(mask)
for tri in UV:draw.polygon([tuple(v*np.array(image.size)) for v in tri],fill=255)
mask=mask.filter(ImageFilter.MaxFilter(7));image.putalpha(Image.fromarray(np.minimum(np.asarray(image.getchannel('A')),np.asarray(mask))))
png=io.BytesIO();image.save(png,format='PNG',optimize=True)
joints=[('root',-1,[0,0,0]),('hips',0,[0,.95,0]),('spine',1,[0,1.12,0]),('chest',2,[0,1.34,0]),('neck',3,[0,1.45,0]),('head',4,[0,1.48,0]),('upperArmL',3,[.15,1.38,0]),('forearmL',6,[.36,1.38,0]),('handL',7,[.54,1.38,0]),('upperArmR',3,[-.15,1.38,0]),('forearmR',9,[-.36,1.38,0]),('handR',10,[-.54,1.38,0]),('thighL',1,[.09,.95,0]),('shinL',12,[.09,.53,.01]),('footL',13,[.09,.08,.025]),('thighR',1,[-.09,.95,0]),('shinR',15,[-.09,.53,.01]),('footR',16,[-.09,.08,.025])]
joint_indices=np.zeros((len(P),4),dtype=np.uint8);weights=np.zeros((len(P),4),dtype=np.float32);weights[:,0]=1
for k,p in enumerate(P):
 if ishead[k//3]:j=5
 elif abs(p[0])>.49 and p[1]>1.2:j=8 if p[0]>0 else 11
 else:j=(14 if p[1]<.14 else 13) if p[0]>0 else (17 if p[1]<.14 else 16)
 joint_indices[k,0]=j
# Deduplicate only vertices sharing all attributes to keep original smooth normals.
packed=np.c_[np.round(P,6),np.round(normals,6),np.round(uvs,7),joint_indices[:,0]].astype(np.float32)
_,selected,inverse=np.unique(packed,axis=0,return_index=True,return_inverse=True)
P=P[selected].astype('<f4');normals=normals[selected].astype('<f4');uvs=uvs[selected].astype('<f4');joint_indices=joint_indices[selected];weights=weights[selected]
output={'asset':{'version':'2.0','generator':'HONK castle guest preparation'},'scene':0,'scenes':[{'nodes':[18]}],'nodes':[],'meshes':[],'skins':[],'materials':[],'images':[],'textures':[{'source':0}],'bufferViews':[],'accessors':[]}
chunks=[];offset=0
def blob(data,target=None):
 global offset
 raw=bytes(data);padding=(-offset)%4
 if padding:chunks.append(b'\0'*padding);offset+=padding
 index=len(output['bufferViews']);view={'buffer':0,'byteOffset':offset,'byteLength':len(raw)}
 if target:view['target']=target
 output['bufferViews'].append(view);chunks.append(raw);offset+=len(raw);return index
def attribute(data,component,kind,target=None,bounds=False):
 index=len(output['accessors']);a={'bufferView':blob(data.tobytes(),target),'componentType':component,'count':len(data),'type':kind}
 if bounds:a.update(min=data.min(0).tolist(),max=data.max(0).tolist())
 output['accessors'].append(a);return index
attrs={'POSITION':attribute(P,5126,'VEC3',34962,True),'NORMAL':attribute(normals,5126,'VEC3',34962),'TEXCOORD_0':attribute(uvs,5126,'VEC2',34962),'JOINTS_0':attribute(joint_indices,5121,'VEC4',34962),'WEIGHTS_0':attribute(weights,5126,'VEC4',34962)}
indices=attribute(inverse.astype('<u4').reshape(-1,1),5125,'SCALAR',34963)
# Cloth follows the original body surface; adjacent joints blend continuously.
FP=fabricT.reshape(-1,3).astype('<f4');FN=fabricN.reshape(-1,3).astype('<f4')
FJ=np.zeros((len(FP),4),dtype=np.uint8);FW=np.zeros((len(FP),4),dtype='<f4')
for k,p in enumerate(FP):
 x,y,z=p;side=1 if x>0 else -1;ax=abs(x)
 if ax>.155 and y>1.30:
  chain=[(3,.145),(6 if side>0 else 9,.20),(7 if side>0 else 10,.36),(8 if side>0 else 11,.54)]
 else:chain=[(1,.96),(2,1.12),(3,1.34),(4,1.45)];ax=y
 for (a,lo),(b,hi) in zip(chain,chain[1:]):
  if ax<=hi:
   t=float(np.clip((ax-lo)/(hi-lo),0,1));FJ[k,:2]=[a,b];FW[k,:2]=[1-t,t];break
 else:FJ[k,0]=chain[-1][0];FW[k,0]=1
fabricAttrs={'POSITION':attribute(FP,5126,'VEC3',34962,True),'NORMAL':attribute(FN,5126,'VEC3',34962),'JOINTS_0':attribute(FJ,5121,'VEC4',34962),'WEIGHTS_0':attribute(FW,5126,'VEC4',34962)}
for i,(name,parent,position) in enumerate(joints):
 parent_position=np.array(joints[parent][2]) if parent>=0 else np.zeros(3);node={'name':name,'translation':(np.array(position)-parent_position).tolist(),'children':[j for j,v in enumerate(joints) if v[1]==i]};output['nodes'].append(node)
output['nodes'] += [{'name':'Rias_clothed_guest','children':[0,19]},{'name':'Rias_original_face_hair_hands_and_boots','mesh':0,'skin':0}]
inverse_bind=np.array([np.eye(4) for j in joints],dtype='<f4')
for i,j in enumerate(joints):inverse_bind[i,:3,3]=-np.array(j[2])
ib=attribute(inverse_bind.transpose(0,2,1).reshape(-1,16).copy(),5126,'MAT4')
output['skins']=[{'joints':list(range(18)),'skeleton':0,'inverseBindMatrices':ib}]
output['meshes']=[{'primitives':[{'attributes':attrs,'indices':indices,'material':0},{'attributes':fabricAttrs,'material':1}]}]
output['materials']=[{'name':'Original Rias face and hair','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.85},'alphaMode':'MASK','alphaCutoff':.45,'doubleSided':True},{'name':'Opaque blouse on original proportions','pbrMetallicRoughness':{'baseColorFactor':[.97,.94,.88,1],'metallicFactor':0,'roughnessFactor':.85},'doubleSided':True}]
output['images']=[{'bufferView':blob(png.getvalue()),'mimeType':'image/png'}]
data=b''.join(chunks);data+=b'\0'*((-len(data))%4);output['buffers']=[{'byteLength':len(data)}]
js=json.dumps(output,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
glb=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data
target=Path(__file__).resolve().parents[1]/'assets'/'castle-guest-v118.bin';target.write_bytes(gzip.compress(glb,compresslevel=9,mtime=0))
print(json.dumps({'vertices':len(P),'triangles':len(inverse)//3,'texture':image.size,'compressedBytes':target.stat().st_size,'glbBytes':len(glb)}))
