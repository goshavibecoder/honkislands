"""Export COMPLETE museum models for HONK NEWS without replacing body parts.
Usage: python scripts/build-honk-news-museum.py /path/to/Teledog
Requires numpy, scipy and fast-simplification (same as the arena source baker).
"""
import base64,gzip,json,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
import fast_simplification
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as tmp:
    raw=Path(tmp)/'museum.json'
    subprocess.run(['node',str(root/'scripts/export-arena-crowd.mjs'),str(Path(sys.argv[1]).resolve()),str(raw),'--museum-news'],check=True)
    models=json.loads(raw.read_text())
old=json.loads(gzip.decompress((root/'models/honk-news-cast-v158.bin').read_bytes()))
result={'source':'goshavibecoder/Teledog/assets/hall.glb.gz + groyper_green.glb.gz','completeMuseumModels':True,'texture':old['texture'],'characters':{}}
for name,parts in models.items():
    allp=np.concatenate([np.array(a['positions']).reshape(-1,3) for a in parts]);center=(allp.min(0)+allp.max(0))/2;center[1]=allp[:,1].min();angle={'teledog':np.pi/2,'fast':np.pi}.get(name,0);rot=np.array([[np.cos(angle),0,np.sin(angle)],[0,1,0],[-np.sin(angle),0,np.cos(angle)]]);size=np.ptp((allp-center)@rot.T,axis=0);scale=min(1.2/size[1],.67/size[0]);chunks=[];total=sum(len(a['indices'])//3 for a in parts)
    for part_number,part in enumerate(parts):
        p=(np.array(part['positions']).reshape(-1,3)-center)@rot.T*scale;f=np.array(part['indices']).reshape(-1,3)
        if name=='groyper':chunks.append((p,f,part['color'],np.array(part['uv']).reshape(-1,2),np.where(p[:,1]<.44,np.sign(p[:,0]),0)));continue
        _,first,inverse=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True);p=p[first];f=inverse[f];edges=np.r_[f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]];_,labels=connected_components(coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(p),len(p))),directed=False)
        for component in np.unique(labels[f[:,0]]):
            faces=f[labels[f[:,0]]==component];used,faces=np.unique(faces,return_inverse=True);q=p[used];faces=faces.reshape(-1,3);hi=q.max(0);lo=q.min(0)
            is_leg=hi[1]<{'honk':.32,'fast':.28,'teledog':.44,'zoich':.31}[name] and not lo[0]<0<hi[0] and (name!='honk' or part_number==0)
            target=min(len(faces),max(48,round(len(faces)*{'honk':11000,'fast':7000,'teledog':10000,'zoich':6500}[name]/total)))
            if target<len(faces):q,faces=fast_simplification.simplify(q,faces,target_count=target,agg=5,preserve_border=True)
            chunks.append((q,faces,part['color'],None,np.full(len(q),np.sign(q[:,0].mean()) if is_leg else 0)))
    p=np.concatenate([c[0] for c in chunks]);indices=[];colors=[];rig=[];cursor=0
    for q,f,color,uv,leg in chunks:indices.extend((f+cursor).reshape(-1).tolist());colors.extend([color]*len(q));rig.extend(leg.tolist());cursor+=len(q)
    f=np.array(indices).reshape(-1,3);_,inverse=np.unique(np.round(p,5),axis=0,return_inverse=True);normal=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]]);smooth=np.zeros((inverse.max()+1,3))
    for c in range(3):np.add.at(smooth,inverse[f[:,c]],normal)
    smooth/=np.maximum(np.linalg.norm(smooth,axis=1,keepdims=True),1e-20)
    rig=np.array(rig);pivots={}
    for side in [-1,1]:
        leg=p[rig==side];top=leg[:,1].max();upper=leg[leg[:,1]>top-.025];pivot=upper.mean(0);pivot[1]=top;pivots[str(side)]=np.round(pivot,6).tolist()
    preferred={'honk':[.278,.275,.01],'teledog':[.17,.54,.02],'fast':[.29,.49,0],'zoich':[.18,.29,-.02],'groyper':[.27,.51,.03]}[name]
    # Bind the sign to an actual point of the native hand/arm, never an extra limb.
    eligible=np.where((p[:,0]>0)&(rig==0))[0];grip=p[eligible[np.argmin(np.linalg.norm(p[eligible]-preferred,axis=1))]]
    out={'positions':np.round(p,6).reshape(-1).tolist(),'normals':np.round(smooth[inverse],6).reshape(-1).tolist(),'colors':np.round(colors,6).reshape(-1).tolist(),'indices':indices,'legSide':rig.tolist(),'pivots':pivots,'grip':np.round(grip,6).tolist(),'height':float(p[:,1].max()),'width':float(np.ptp(p[:,0])),'sourceParts':len(parts),'sourceComponents':len(chunks),'complete':True}
    if name=='groyper':out['uv']=chunks[0][3].reshape(-1).tolist()
    result['characters'][name]=out;print(name,len(f),'triangles; all',len(parts),'source parts retained',flush=True)
path=root/'models/honk-news-museum-v160.bin';path.write_bytes(gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0));print(path.name,path.stat().st_size)
