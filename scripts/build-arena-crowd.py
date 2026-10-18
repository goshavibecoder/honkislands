"""Build topology-aware seated crowd LODs from goshavibecoder/Teledog.
Requires numpy, scipy, Pillow, fast-simplification. Usage: python scripts/build-arena-crowd.py /path/to/Teledog
"""
import base64,gzip,io,json,struct,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree
import fast_simplification
repo=Path(__file__).resolve().parent.parent;source=Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory() as tmp:
 raw=Path(tmp)/'characters.json';subprocess.run(['node',str(repo/'scripts/export-arena-crowd.mjs'),str(source),str(raw)],check=True);models=json.loads(raw.read_text())
b=gzip.decompress((source/'assets/groyper_green.glb.gz').read_bytes());n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:];texture=g['textures'][g['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source'];view=g['bufferViews'][g['images'][texture]['bufferView']];image=Image.open(io.BytesIO(binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])).convert('RGB');image.thumbnail((1024,1024));out=io.BytesIO();image.save(out,format='WEBP',quality=94,method=6)
result={'texture':base64.b64encode(out.getvalue()).decode()}
def pose(p,hip):
 # Integrate a bent leg centreline; cross-sections follow its tangent. In
 # particular, the shin and foot retain their depth instead of becoming flat.
 u=p[:,1]-hip;grid=np.linspace(-1.5,0,15001)
 smooth=lambda x: np.clip(x,0,1)**2*(3-2*np.clip(x,0,1))
 angle=np.pi/2*smooth(-grid/.10)*(1-smooth((-grid-.24)/.09))
 step=grid[1]-grid[0];cy=np.r_[0,np.cumsum((np.cos(angle)[1:]+np.cos(angle)[:-1])*.5*step)];cz=np.r_[0,np.cumsum((-np.sin(angle)[1:]-np.sin(angle)[:-1])*.5*step)];cy-=cy[-1];cz-=cz[-1]
 a=np.interp(u,grid,angle);y=np.where(u>=0,u,np.interp(u,grid,cy))+p[:,2]*np.sin(a);z=np.where(u>=0,0,np.interp(u,grid,cz))+p[:,2]*np.cos(a)
 return np.c_[p[:,0],y,z]
def remap_uv(v,original,faces,uv):
 # Surface-local interpolation retains the original texture seams after QEM.
 tri=original[faces];tree=cKDTree(tri.mean(1));_,ids=tree.query(v,k=min(12,len(tri)));ids=np.atleast_2d(ids);best=np.full(len(v),np.inf);mapped=np.zeros((len(v),2))
 for k in range(ids.shape[1]):
  t=tri[ids[:,k]];a=t[:,1]-t[:,0];b=t[:,2]-t[:,0];q=v-t[:,0];aa=np.einsum('ij,ij->i',a,a);ab=np.einsum('ij,ij->i',a,b);bb=np.einsum('ij,ij->i',b,b);qa=np.einsum('ij,ij->i',q,a);qb=np.einsum('ij,ij->i',q,b);den=aa*bb-ab*ab;den=np.where(abs(den)<1e-20,1e-20,den);x=np.clip((bb*qa-ab*qb)/den,0,1);y=np.clip((aa*qb-ab*qa)/den,0,1);total=np.maximum(x+y,1);x/=total;y/=total;distance=np.linalg.norm(t[:,0]+a*x[:,None]+b*y[:,None]-v,axis=1);take=distance<best;tex=uv[faces[ids[:,k]]];mapped[take]=(tex[:,0]*(1-x-y)[:,None]+tex[:,1]*x[:,None]+tex[:,2]*y[:,None])[take];best[take]=distance[take]
 return mapped
for name,parts in models.items():
 allp=np.concatenate([np.array(p['positions']).reshape(-1,3) for p in parts]);center=(allp.min(0)+allp.max(0))/2;center[1]=allp.min(0)[1];angle={'teledog':np.pi/2,'fast':np.pi}.get(name,0);rotation=np.array([[np.cos(angle),0,np.sin(angle)],[0,1,0],[-np.sin(angle),0,np.cos(angle)]]);allp=(allp-center)@rotation.T;size=allp.max(0)-allp.min(0);scale=min(1.2/size[1],.67/size[0]);height=size[1]*scale;hip=height*(.40 if name=='groyper' else .46)
 if name=='groyper':
  # Keep every original UV seam and its index. Re-projecting UVs after welding
  # chooses different atlas islands at seams and produces vein-like streaks.
  part=parts[0];original=(np.array(part['positions']).reshape(-1,3)-center)@rotation.T*scale;p=pose(original,hip);f=np.array(part['indices']).reshape(-1,3)
  _,inverse=np.unique(np.round(p,6),axis=0,return_inverse=True);normal=np.zeros((inverse.max()+1,3));face_normal=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]])
  for corner in range(3):np.add.at(normal,inverse[f[:,corner]],face_normal)
  normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-20)
  geometry={'positions':np.round(p,6).reshape(-1).tolist(),'indices':part['indices'],'uv':part['uv'],'normals':np.round(normal[inverse],6).reshape(-1).tolist(),'colors':[1.]*(len(p)*3)}
  result[name]={'high':geometry,'low':geometry,'seatLift':.225,'frontOffset':.16};print(name,'original UVs',len(f),'triangles',flush=True);continue
 prepared=[];total=sum(len(p['indices'])//3 for p in parts)
 for part in parts:
  original=(np.array(part['positions']).reshape(-1,3)-center)@rotation.T*scale;p=original.copy() if name=='zoich' else pose(original,hip);f=np.array(part['indices'],dtype=np.int32).reshape(-1,3)
  _,first,inverse=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True);v=p[first];f=inverse[f];f=f[(f[:,0]!=f[:,1])&(f[:,1]!=f[:,2])&(f[:,0]!=f[:,2])]
  edges=np.r_[f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]];graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(v),len(v)));_,labels=connected_components(graph,directed=False);component=labels[f[:,0]]
  prepared.append((part,p,np.array(part['indices']).reshape(-1,3),v,f,component))
 baked={}
 for lod in ['high','low']:
  budget={'teledog':(200000,4500),'zoich':(200000,3500),'fast':(200000,3500),'honk':(32000,7500),'groyper':(16000,7000)}[name][lod=='low'];positions=[];colors=[];indices=[];uvs=[];cursor=0
  for part,original,original_faces,v,f,components in prepared:
   for component in np.unique(components):
    faces=f[components==component];used,faces=np.unique(faces,return_inverse=True);points=v[used];faces=faces.reshape(-1,3);target=min(len(faces),max(24,round(len(faces)*budget/total)))
    if target<len(faces):points,faces=fast_simplification.simplify(points,faces,target_count=target,agg=5,preserve_border=True)
    positions.extend(points.tolist());indices.extend((faces+cursor).tolist());colors.extend([part['color']]*len(points));cursor+=len(points)
    if name=='groyper':uvs.extend(remap_uv(points,original,original_faces,np.array(part['uv']).reshape(-1,2)).tolist())
  baked[lod]={'positions':np.round(positions,6).reshape(-1).tolist(),'colors':np.round(colors,5).reshape(-1).tolist(),'indices':np.array(indices).reshape(-1).tolist()}
  if uvs:baked[lod]['uv']=np.round(uvs,6).reshape(-1).tolist()
  print(name,lod,len(indices),'triangles',flush=True)
 # The pelvis, rather than the origin at the hips, rests on the cushion.
 baked['seatLift']={'teledog':.187,'zoich':.008,'fast':.194,'honk':.393,'groyper':.225}[name];baked['frontOffset']=.23 if name=='teledog' else .16;result[name]=baked
payload=gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0);encoded=base64.b64encode(payload).decode();parts=[]
for i,start in enumerate(range(0,len(encoded),120000)):
 name=f'arena-crowd-v84.{i}.json';(repo/'models'/name).write_text(json.dumps(encoded[start:start+120000])+'\n');parts.append(name)
(repo/'models/arena-crowd-v84.json').write_text(json.dumps({'parts':parts,'bytes':len(payload),'source':'goshavibecoder/Teledog','characters':list(models)},separators=(',',':'))+'\n');print('Packaged',len(payload),'bytes',len(parts),'chunks')
