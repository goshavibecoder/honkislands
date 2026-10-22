"""Close native museum fingers around sign handles; restore the v159 studio head."""
import gzip,json
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
data=json.loads(gzip.decompress((root/'models/honk-news-museum-v160.bin').read_bytes()))
old=json.loads(gzip.decompress((root/'models/honk-news-cast-v158.bin').read_bytes()));data['presenter']=old['characters']['honk'];data['presenterVersion']=159
# Keep each native hand at its wrist. Its longitudinal finger surface bends
# around a vertical handle; native fingertips remain part of the same mesh.
settings={'honk':([.278,.349,-.012],-1,.045,.028),'fast':([.291,.451,0],-1,.025,.020),'zoich':([.236,.398,.010],1,.025,.020),'groyper':([.266,.580,-.015],-1,.040,.027)}
def hand_mask(name,p,c):
    x,y,z=p.T
    if name=='honk':return (x>.21)&(y>.21)&(y<.351)&(c[:,1]>.4)&(c[:,0]>.20)&(c[:,0]<.22)
    if name=='fast':return (x>.24)&(y>.35)&(y<.46)&(c[:,0]>.9)&(c[:,1]>.9)
    if name=='zoich':return (x>.21)&(y>.39)&(y<.50)&(c[:,0]<.02)&(c[:,1]<.43)
    return (x>.225)&(y>.43)&(y<.585)
def curl(p,mask,wrist,direction,straight,radius):
    w=np.array(wrist);q=p[mask].copy();length=np.maximum(0,direction*(q[:,1]-w[1]));extent=length.max();t=np.clip((length-straight)/max(.01,extent-straight),0,1);angle=t*np.pi*1.20;depth=(q[:,2]-w[2])*.40;r=np.clip(radius+depth,radius*.65,radius*1.45);curved=length>straight
    out=q.copy();out[:,0]=w[0]+length;out[:,1]=w[1]+(q[:,0]-w[0])*.90;out[:,2]=w[2]+depth
    out[curved,0]=w[0]+straight+r[curved]*np.sin(angle[curved]);out[curved,2]=w[2]+radius-r[curved]*np.cos(angle[curved])
    # Ease the wrist cross section into the new pose, keeping the sleeve join.
    blend=np.clip(length/.018,0,1);blend=blend*blend*(3-2*blend);p[mask]=q+(out-q)*blend[:,None]
    return [w[0]+straight,w[1],w[2]+radius]
fast=data['characters']['fast'];fp=np.array(fast['positions']).reshape(-1,3);fc=np.array(fast['colors']).reshape(-1,3);fm=hand_mask('fast',fp,fc);ff=np.array(fast['indices']).reshape(-1,3);paw_faces=ff[np.all(fm[ff],axis=1)];used,paw_faces=np.unique(paw_faces,return_inverse=True);paw=fp[used].copy();paw_faces=paw_faces.reshape(-1,3)
for name,source in data['characters'].items():
    p=np.array(source['positions']).reshape(-1,3);c=np.array(source['colors']).reshape(-1,3);mask=np.zeros(len(p),dtype=bool)
    if name=='teledog':
        # The original hoodie covers both paws. Expose one museum glove at its
        # existing right cuff, rather than adding another arm or changing the body.
        q=(paw-np.array(settings['fast'][0]))*.92+np.array([.153,.568,.082]);start=len(p);p=np.r_[p,q];c=np.r_[c,np.tile([.93,.95,1.],(len(q),1))];source['indices'].extend((paw_faces+start).reshape(-1).tolist());source['legSide'].extend([0]*len(q));mask=np.r_[mask,np.ones(len(q),dtype=bool)];grip=curl(p,mask,[.153,.568,.082],-1,.023,.019)
    else:
        mask=hand_mask(name,p,c);grip=curl(p,mask,*settings[name])
    f=np.array(source['indices']).reshape(-1,3);_,inverse=np.unique(np.round(p,5),axis=0,return_inverse=True);normal=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]]);smooth=np.zeros((inverse.max()+1,3))
    for j in range(3):np.add.at(smooth,inverse[f[:,j]],normal)
    smooth/=np.maximum(np.linalg.norm(smooth,axis=1,keepdims=True),1e-20)
    source['positions']=np.round(p,6).reshape(-1).tolist();source['colors']=np.round(c,6).reshape(-1).tolist();source['normals']=np.round(smooth[inverse],6).reshape(-1).tolist();source['grip']=np.round(grip,6).tolist();source['gripVertices']=np.where(mask)[0].tolist();source['gripRadius']=settings.get(name,([0,0,0],0,0,.019))[3];source['holdingSign']=True
    # Closing the fist is a pose change; the native torso and lower body are kept.
    print(name,'holding hand:',int(mask.sum()),'vertices, handle',source['grip'])
data['handsHoldSigns']=True
path=root/'models/honk-news-museum-v161.bin';path.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0));print(path.name,path.stat().st_size)
