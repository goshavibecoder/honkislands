"""Extract original standing legs and shoes from the Teledog collection.
Usage: python scripts/build-honk-news-legs.py /path/to/Teledog
Requires numpy, scipy and fast-simplification, as the arena source baker does.
"""
import gzip,json,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
import fast_simplification
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as tmp:
    raw=Path(tmp)/'originals.json'
    subprocess.run(['node',str(root/'scripts/export-arena-crowd.mjs'),str(Path(sys.argv[1]).resolve()),str(raw)],check=True)
    models=json.loads(raw.read_text())
result={'source':'goshavibecoder/Teledog — original collection leg and shoe geometry','characters':{}}
def clip(vertices,axis,limit,below=True):
    out=[]
    for a,b in zip(vertices,vertices[1:]+vertices[:1]):
        ia=(a['p'][axis]<=limit) if below else (a['p'][axis]>=limit)
        ib=(b['p'][axis]<=limit) if below else (b['p'][axis]>=limit)
        if ia:out.append(a)
        if ia!=ib:
            t=(limit-a['p'][axis])/(b['p'][axis]-a['p'][axis])
            out.append({k:a[k]+(b[k]-a[k])*t for k in a})
    return out
for name,parts in models.items():
    allp=np.concatenate([np.array(a['positions']).reshape(-1,3) for a in parts]);center=(allp.min(0)+allp.max(0))/2;center[1]=allp[:,1].min();angle={'teledog':np.pi/2,'fast':np.pi}.get(name,0)
    rot=np.array([[np.cos(angle),0,np.sin(angle)],[0,1,0],[-np.sin(angle),0,np.cos(angle)]]);size=np.ptp((allp-center)@rot.T,axis=0);scale=min(1.2/size[1],.67/size[0]);sides={'left':[],'right':[]}
    for part_number,part in enumerate(parts):
        if name=='honk' and part_number!=0:continue  # Green source fingers are not trousers.
        p=(np.array(part['positions']).reshape(-1,3)-center)@rot.T*scale;f=np.array(part['indices']).reshape(-1,3)
        if name=='groyper':
            uv=np.array(part['uv']).reshape(-1,2)
            for face in f:
                polygon=[{'p':p[i],'uv':uv[i]} for i in face];polygon=clip(polygon,1,.44)
                for side,below in [('left',True),('right',False)]:
                    q=clip(polygon,0,0,below)
                    for i in range(1,len(q)-1):sides[side].extend([q[0],q[i],q[i+1]])
            continue
        _,first,inverse=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True);p=p[first];f=inverse[f];edges=np.r_[f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]];_,labels=connected_components(coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(p),len(p))),directed=False)
        for component in np.unique(labels[f[:,0]]):
            faces=f[labels[f[:,0]]==component];used,faces=np.unique(faces,return_inverse=True);q=p[used];faces=faces.reshape(-1,3);hi=q.max(0);lo=q.min(0)
            if hi[1]>{'honk':.32,'fast':.28,'teledog':.44,'zoich':.32}[name] or lo[0]<0<hi[0]:continue
            side='left' if q[:,0].mean()<0 else 'right'
            budget=180 if len(faces)>1000 else min(len(faces),120)
            if budget<len(faces):q,faces=fast_simplification.simplify(q,faces,target_count=budget,agg=5,preserve_border=True)
            for face in faces:
                for v in face:sides[side].append({'p':q[v],'color':np.array(part['color'])})
    result['characters'][name]={}
    for side,vertices in sides.items():
        p=np.array([v['p'] for v in vertices]);top=p[:,1].max();upper=p[p[:,1]>top-.035];hip=upper.mean(0);hip[1]=top;p-=hip
        # Flat facets are welded for smooth original fabric and rounded shoe edges.
        normal=np.cross(p[1::3]-p[::3],p[2::3]-p[::3]);_,inverse=np.unique(np.round(p,5),axis=0,return_inverse=True);smooth=np.zeros((inverse.max()+1,3))
        for c in range(3):np.add.at(smooth,inverse[c::3],normal)
        smooth/=np.maximum(np.linalg.norm(smooth,axis=1,keepdims=True),1e-20)
        out={'positions':np.round(p,5).reshape(-1).tolist(),'normals':np.round(smooth[inverse],5).reshape(-1).tolist(),'indices':list(range(len(p))),'height':float(-p[:,1].min()),'originalTriangles':len(p)//3}
        if name=='groyper':out['uv']=np.round([v['uv'] for v in vertices],6).reshape(-1).tolist();out['colors']=[1.]*(len(p)*3)
        else:out['colors']=np.round([v['color'] for v in vertices],6).reshape(-1).tolist()
        # The lower convex hull supports the sole at every walking angle.
        from scipy.spatial import ConvexHull
        lower=p[p[:,1]<p[:,1].min()+.12];_,unique=np.unique(np.round(lower[:,[1,2]],6),axis=0,return_index=True);lower=lower[unique];hull=ConvexHull(lower[:,[1,2]]);out['support']=np.round(lower[hull.vertices],5).reshape(-1).tolist()
        result['characters'][name][side]=out
    print(name,[(s,v['originalTriangles'],round(v['height'],3)) for s,v in result['characters'][name].items()])
cast=json.loads(gzip.decompress((root/'models/honk-news-cast-v158.bin').read_bytes()));cast['legs']=result['characters'];cast['legSource']=result['source']
path=root/'models/honk-news-cast-v159.bin';path.write_bytes(gzip.compress(json.dumps(cast,separators=(',',':')).encode(),mtime=0));print(path.name,path.stat().st_size)
