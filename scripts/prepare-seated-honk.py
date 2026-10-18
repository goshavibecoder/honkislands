"""Build a seated HONK upper body and original clown shoes; legs are placed by joints at runtime.
Usage: python scripts/prepare-seated-honk.py /path/to/Teledog
"""
import base64,gzip,json,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
import fast_simplification
repo=Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as tmp:
 raw=Path(tmp)/'models.json';subprocess.run(['node',str(repo/'scripts/export-arena-crowd.mjs'),str(Path(sys.argv[1]).resolve()),str(raw)],check=True);parts=json.loads(raw.read_text())['honk']
allp=np.concatenate([np.array(o['positions']).reshape(-1,3) for o in parts]);center=(allp.min(0)+allp.max(0))/2;center[1]=allp[:,1].min();size=np.ptp(allp,axis=0);scale=min(1.2/size[1],.67/size[0]);body=[];shoes={'left':[],'right':[]}
for number,part in enumerate(parts):
 p=(np.array(part['positions']).reshape(-1,3)-center)*scale;f=np.array(part['indices']).reshape(-1,3);_,first,inverse=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True);p=p[first];f=inverse[f];f=f[(f[:,0]!=f[:,1])&(f[:,1]!=f[:,2])&(f[:,0]!=f[:,2])];edges=np.r_[f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]];_,labels=connected_components(coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(p),len(p))),directed=False)
 for c in np.unique(labels[f[:,0]]):
  faces=f[labels[f[:,0]]==c];used,remap=np.unique(faces,return_inverse=True);q=p[used].copy();faces=remap.reshape(-1,3);lo=q.min(0);hi=q.max(0)
  if number==0 and hi[1]<.32:
   if hi[1]<.10:
    side='left' if q[:,0].mean()<0 else 'right';q[:,0]-=(-.104 if side=='left' else .104);q[:,2]+=.035;shoes[side].append((q,faces,part['color']))
   continue
  q[:,1]-=.249;body.append((q,faces,part['color']))
def bake(components,budget):
 total=sum(len(f) for _,f,_ in components);positions=[];indices=[];colors=[];cursor=0
 for p,f,c in components:
  target=min(len(f),max(24,round(len(f)*budget/total)))
  if target<len(f):p,f=fast_simplification.simplify(p,f,target_count=target,agg=5,preserve_border=True)
  positions.extend(p.tolist());indices.extend((f+cursor).reshape(-1).tolist());colors.extend([c]*len(p));cursor+=len(p)
 return {'positions':np.round(positions,6).reshape(-1).tolist(),'indices':indices,'colors':np.round(colors,6).reshape(-1).tolist()}
result={'high':bake(body,32000),'low':bake(body,7500),'seatLift':.002,'frontOffset':.09,'legColor':parts[0]['color'],'legRig':{'left':bake(shoes['left'],750),'right':bake(shoes['right'],750)}}
for lod in ['high','low']:print(lod,len(result[lod]['indices'])//3,'body triangles')
payload=gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0);encoded=base64.b64encode(payload).decode();paths=[]
for i,off in enumerate(range(0,len(encoded),120000)):
 name=f'arena-honk-seated-v88.{i}.json';(repo/'models'/name).write_text(json.dumps(encoded[off:off+120000])+'\n');paths.append(name)
(repo/'models/arena-honk-seated-v88.json').write_text(json.dumps({'parts':paths,'bytes':len(payload),'source':'goshavibecoder/Teledog'},separators=(',',':'))+'\n');print('Packaged',len(payload),'bytes',len(paths),'chunks')
