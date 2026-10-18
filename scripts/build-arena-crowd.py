"""Bake the original Teledog gallery into five compact seated, vertex-colour LODs.
Usage: python scripts/build-arena-crowd.py /path/to/Teledog
No source room, furniture, skin skeleton or full-size textures ship with the crowd.
"""
import gzip,io,json,struct,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
from PIL import Image
repo=Path(__file__).resolve().parent.parent;source=Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory() as tmp:
 raw=Path(tmp)/'characters.json'
 subprocess.run(['node',str(repo/'scripts/export-arena-crowd.mjs'),str(source),str(raw)],check=True)
 models=json.loads(raw.read_text())
b=gzip.decompress((source/'assets/groyper_green.glb.gz').read_bytes());n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:]
texture=g['textures'][g['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source'];view=g['bufferViews'][g['images'][texture]['bufferView']];image=np.asarray(Image.open(io.BytesIO(binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])).convert('RGB'))/255
result={}
for name,parts in models.items():
 points=np.concatenate([np.array(p['positions']).reshape(-1,3) for p in parts]);lo=points.min(0);hi=points.max(0);center=(lo+hi)/2;center[1]=lo[1]
 angle={'teledog':np.pi/2,'fast':np.pi}.get(name,0);rotation=np.array([[np.cos(angle),0,np.sin(angle)],[0,1,0],[-np.sin(angle),0,np.cos(angle)]])
 points=(points-center)@rotation.T;size=points.max(0)-points.min(0);scale=min(1.2/size[1],.67/size[0]);height=size[1]*scale;hip=height*(.38 if name=='groyper' else .46)
 vertices=[];colors=[];faces=[];cursor=0
 for part in parts:
  p=(np.array(part['positions']).reshape(-1,3)-center)@rotation.T*scale
  # Fold thighs forward and shins down, retaining the original continuous surface.
  dy=p[:,1]-hip;p[:,1]=np.where(dy>=0,dy,np.minimum(dy+.24,0));p[:,2]+=np.minimum(np.maximum(-dy,0),.24)
  color=np.tile(part['color'],(len(p),1))
  if name=='groyper':
   uv=np.array(part['uv']).reshape(-1,2);pixels=image[np.clip((uv[:,1]*image.shape[0]).astype(int),0,image.shape[0]-1),np.clip((uv[:,0]*image.shape[1]).astype(int),0,image.shape[1]-1)]
   color=np.where(pixels<=.04045,pixels/12.92,((pixels+.055)/1.055)**2.4)
  # Material boundaries and facial colour boundaries remain separate clusters.
  cell={'honk':.043,'teledog':.038,'zoich':.035,'groyper':.032,'fast':.030}[name]
  cells=np.where(p[:,1]>height*.25,{'groyper':.020,'honk':.032,'teledog':.026,'zoich':.030,'fast':.024}[name],cell)
  keys=np.c_[np.round(p/cells[:,None]).astype(int),np.round(color*14).astype(int)]
  _,inverse=np.unique(keys,axis=0,return_inverse=True);count=np.bincount(inverse)
  v=np.stack([np.bincount(inverse,weights=p[:,k])/count for k in range(3)],axis=1);c=np.stack([np.bincount(inverse,weights=color[:,k])/count for k in range(3)],axis=1)
  f=inverse[np.array(part['indices']).reshape(-1,3)];f=f[(f[:,0]!=f[:,1])&(f[:,1]!=f[:,2])&(f[:,0]!=f[:,2])];f=np.unique(f,axis=0)
  vertices.extend(v.tolist());colors.extend(c.tolist());faces.extend((f+cursor).tolist());cursor+=len(v)
 result[name]={'positions':np.round(vertices,5).reshape(-1).tolist(),'colors':np.round(colors,4).reshape(-1).tolist(),'indices':np.array(faces).reshape(-1).tolist()}
 print(name,len(vertices),'vertices',len(faces),'triangles')
# Text chunks fit the connector and retain an entirely local runtime asset.
payload=gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0);import base64
encoded=base64.b64encode(payload).decode();parts=[]
for i,start in enumerate(range(0,len(encoded),120000)):
 name=f'arena-crowd-v82.{i}.json';(repo/'models'/name).write_text(json.dumps(encoded[start:start+120000])+'\n');parts.append(name)
(repo/'models/arena-crowd-v82.json').write_text(json.dumps({'parts':parts,'bytes':len(payload),'source':'goshavibecoder/Teledog','characters':list(result)},separators=(',',':'))+'\n')
print('Packaged',len(payload),'bytes',len(parts),'chunks')
