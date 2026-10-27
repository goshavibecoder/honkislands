"""Bake the supplied Meshy GLB into textured, mobile-sized HONK levels of detail.
Usage: python scripts/prepare-current-honk.py /path/to/source.glb
"""
import base64,gzip,io,json,struct,sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree
from trimesh.triangles import closest_point,points_to_barycentric
root=Path(__file__).resolve().parents[1]
b=Path(sys.argv[1]).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:]
def read(i,k):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
 return np.frombuffer(buf,dtype={5126:'<f4',5125:'<u4'}[a['componentType']],count=a['count']*k,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,k)
p=read(0,3).astype(float);uv=read(1,2).astype(float);f=read(3,1).reshape(-1,3)
center=(p.min(0)+p.max(0))/2;center[1]=p[:,1].min();p=(p-center)/np.ptp(p,axis=0)[1]
v=g['bufferViews'][g['images'][0]['bufferView']];image=Image.open(io.BytesIO(buf[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGB');out=io.BytesIO();image.save(out,format='WEBP',quality=92);texture=base64.b64encode(out.getvalue()).decode()
# The source atlas has hundreds of separate UV islands. Spatial neighbours can
# sample entirely different colours, even inside the same coarse UV bin.
edges=np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]])
_,charts=connected_components(coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(p),len(p))),directed=False)
chart_faces={c:f[charts[f[:,0]]==c] for c in np.unique(charts)}
chart_trees={c:cKDTree(p[faces].mean(1)) for c,faces in chart_faces.items()}
def bake(res,face_res):
 # A UV seam may require several texture coordinates at the same position.
 # Share the spatial centroid across those copies, or the seam becomes a crack.
 spatial=np.round(p*face_res)/face_res
 body=p[:,1]<.58
 spatial[body]=np.round(p[body]*res)/res
 _,spatial_inv=np.unique(spatial,axis=0,return_inverse=True)
 spatial_count=np.bincount(spatial_inv)
 centroids=np.column_stack([np.bincount(spatial_inv,weights=p[:,i])/spatial_count for i in range(3)])
 keys=np.column_stack([spatial_inv,charts,np.floor(uv*64)]).astype(int)
 _,first,inv=np.unique(keys,axis=0,return_index=True,return_inverse=True)
 shared=spatial_inv[first];q=centroids[shared];counts=np.bincount(inv)
 t=np.column_stack([np.bincount(inv,weights=uv[:,i])/counts for i in range(2)])
 # The shared geometric centroid and a chart's UV centroid are not the same
 # surface point. Reproject to the original chart so eye edges do not become
 # jagged, even when the spatial grid straddles a texture boundary.
 for chart,original_faces in chart_faces.items():
  selected=np.flatnonzero(charts[first]==chart)
  if not len(selected):continue
  k=min(16,len(original_faces));_,near=chart_trees[chart].query(q[selected],k=k)
  candidates=original_faces[np.asarray(near).reshape(-1,k)]
  triangles=p[candidates].reshape(-1,3,3);points=np.repeat(q[selected],k,axis=0)
  closest=closest_point(triangles,points);dist=((closest-points)**2).sum(1).reshape(-1,k)
  best=np.argmin(dist,axis=1)+np.arange(len(selected))*k
  weights=points_to_barycentric(triangles[best],closest[best])
  t[selected]=(uv[candidates.reshape(-1,3)[best]]*weights[:,:,None]).sum(1)
 faces=inv[f];corners=shared[faces]
 faces=faces[(corners[:,0]!=corners[:,1])&(corners[:,1]!=corners[:,2])&(corners[:,0]!=corners[:,2])]
 _,idx=np.unique(np.sort(faces,axis=1),axis=0,return_index=True);faces=faces[np.sort(idx)]
 cross=np.cross(q[faces[:,1]]-q[faces[:,0]],q[faces[:,2]]-q[faces[:,0]])
 smooth=np.zeros_like(centroids)
 for j in range(3):np.add.at(smooth,shared[faces[:,j]],cross)
 smooth/=np.maximum(np.linalg.norm(smooth,axis=1,keepdims=True),1e-12);norm=smooth[shared]
 pixels=np.array(image);rgb=pixels[np.clip((t[:,1]*image.height).astype(int),0,image.height-1),np.clip((t[:,0]*image.width).astype(int),0,image.width-1)]/255
 rgb=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
 return {'positions':np.round(q,6).reshape(-1).tolist(),'normals':np.round(norm,6).reshape(-1).tolist(),'uv':np.round(t,6).reshape(-1).tolist(),'colors':np.round(rgb,6).reshape(-1).tolist(),'indices':faces.reshape(-1).tolist()}
data={'source':Path(sys.argv[1]).name,'texture':texture,'high':bake(100,140),'medium':bake(40,90),'low':bake(24,55)}
path=root/'models/honk-current-v168.bin';path.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0));print(path.name,path.stat().st_size,[(k,len(data[k]['indices'])//3) for k in ['high','medium','low']])
