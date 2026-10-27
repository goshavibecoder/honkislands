"""Bake the supplied Meshy GLB into textured, mobile-sized HONK levels of detail.
Usage: python scripts/prepare-current-honk.py /path/to/source.glb
"""
import base64,gzip,io,json,struct,sys
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
b=Path(sys.argv[1]).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:]
def read(i,k):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
 return np.frombuffer(buf,dtype={5126:'<f4',5125:'<u4'}[a['componentType']],count=a['count']*k,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,k)
p=read(0,3).astype(float);uv=read(1,2).astype(float);f=read(3,1).reshape(-1,3)
center=(p.min(0)+p.max(0))/2;center[1]=p[:,1].min();p=(p-center)/np.ptp(p,axis=0)[1]
v=g['bufferViews'][g['images'][0]['bufferView']];image=Image.open(io.BytesIO(buf[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGB');out=io.BytesIO();image.save(out,format='WEBP',quality=92);texture=base64.b64encode(out.getvalue()).decode()
def bake(res):
 keys=np.column_stack([np.round(p*res),np.floor(uv*8)]).astype(int);_,inv=np.unique(keys,axis=0,return_inverse=True);counts=np.bincount(inv);q=np.column_stack([np.bincount(inv,weights=p[:,i])/counts for i in range(3)]);t=np.column_stack([np.bincount(inv,weights=uv[:,i])/counts for i in range(2)]);faces=inv[f];faces=faces[(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2])];_,idx=np.unique(np.sort(faces,axis=1),axis=0,return_index=True);faces=faces[np.sort(idx)];norm=np.zeros_like(q);cross=np.cross(q[faces[:,1]]-q[faces[:,0]],q[faces[:,2]]-q[faces[:,0]])
 for j in range(3):np.add.at(norm,faces[:,j],cross)
 norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-12)
 pixels=np.array(image);rgb=pixels[np.clip((t[:,1]*image.height).astype(int),0,image.height-1),np.clip((t[:,0]*image.width).astype(int),0,image.width-1)]/255;rgb=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
 return {'positions':np.round(q,6).reshape(-1).tolist(),'normals':np.round(norm,6).reshape(-1).tolist(),'uv':np.round(t,6).reshape(-1).tolist(),'colors':np.round(rgb,6).reshape(-1).tolist(),'indices':faces.reshape(-1).tolist()}
data={'source':Path(sys.argv[1]).name,'texture':texture,'high':bake(100),'medium':bake(40),'low':bake(24)}
path=root/'models/honk-current-v165.bin';path.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0));print(path.name,path.stat().st_size,[(k,len(data[k]['indices'])//3) for k in ['high','medium','low']])
