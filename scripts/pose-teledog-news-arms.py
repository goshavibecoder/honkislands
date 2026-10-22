"""Bring both TELEDOG paws out of the hoodie, using the supplied sleeve/paw references."""
import gzip,json
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
data=json.loads(gzip.decompress((root/'models/honk-news-museum-v161.bin').read_bytes()))
original=json.loads(gzip.decompress((root/'models/honk-news-museum-v160.bin').read_bytes()))
s=data['characters']['teledog'];p=np.array(s['positions']).reshape(-1,3);colors=np.array(s['colors']).reshape(-1,3);faces=np.array(s['indices']).reshape(-1,3);legs=np.array(s['legSide']);old_paw=np.zeros(len(p),bool);old_paw[s['gripVertices']]=True
# The temporary pocket-level glove is replaced by the actual exposed right paw.
paw_p=p[old_paw].copy();paw_f=faces[np.all(old_paw[faces],axis=1)];used,paw_f=np.unique(paw_f,return_inverse=True);paw_p=p[used].copy();paw_f=paw_f.reshape(-1,3)
faces=faces[~np.any(old_paw[faces],axis=1)]
# Settle the original tucked sleeve bulges into the hoodie sides. Preserve the
# front pocket, drawstrings, collar, head, trousers and trainers.
blue=(colors[:,0]<.006)&(colors[:,1]>.04)&(colors[:,1]<.05)&(colors[:,2]>.30)
region=blue&(p[:,1]<.785);y=p[region,1];w=np.interp(y,[.378,.44,.58,.70,.785],[.130,.143,.148,.143,.130]);x=np.abs(p[region,0]);blend=np.clip((x-.085)/(.216-.085),0,1);blend=blend*blend*(3-2*blend);p[region,0]=np.sign(p[region,0])*(x-(.216-w)*blend)
positions=p.tolist();cs=colors.tolist();indices=faces.reshape(-1).tolist();leg=legs.tolist();arm_side=[0]*len(p);arm_weight=[0.]*len(p);part_names=['native_museum_body'];grip_indices=[];wrists={};shoulders={}
cloth=[.004,.045,.32];knit=[.008,.026,.07];white=[.93,.95,1.]
def add(vertices,triangles,color,side,weights,name):
    start=len(positions);positions.extend(np.array(vertices).tolist());indices.extend((np.array(triangles,dtype=int)+start).reshape(-1).tolist());cs.extend([color]*len(vertices));leg.extend([0]*len(vertices));arm_side.extend([side]*len(vertices));arm_weight.extend(weights if hasattr(weights,'__len__') else [weights]*len(vertices));part_names.append(name);return list(range(start,start+len(vertices)))
def curve(points,t):
    pts=np.array(points);x=t*(len(pts)-1);i=min(int(x),len(pts)-2);u=x-i;a=pts[max(0,i-1)];b=pts[i];c=pts[i+1];d=pts[min(len(pts)-1,i+2)];return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
def frame(direction):
    z=direction/np.linalg.norm(direction);reference=np.array([0.,0.,1.]);x=np.cross(z,reference)
    if np.linalg.norm(x)<.1:x=np.cross(z,[1.,0.,0.])
    x/=np.linalg.norm(x);return x,np.cross(z,x),z
def sleeve(points,side):
    vertices=[];triangles=[];weights=[];rows=30;columns=24
    for row in range(rows+1):
        t=row/rows;center=curve(points,t);a=curve(points,max(0,t-.002));b=curve(points,min(1,t+.002));x,y,z=frame(b-a);radius=np.interp(t,[0,.2,.48,.65,1],[.074,.078,.074,.065,.045]);radius+=.0035*np.sin(t*9*np.pi)*np.sin(t*np.pi)**2
        for col in range(columns):
            angle=col/columns*np.pi*2;r=radius*(1+.035*np.sin(angle*3+t*5));vertices.append(center+(np.cos(angle)*x+np.sin(angle)*y)*r);u=np.clip(t/.22,0,1);weights.append(float(u*u*(3-2*u)))
    for row in range(rows):
        for col in range(columns):
            a=row*columns+col;b=row*columns+(col+1)%columns;c=a+columns;d=b+columns;triangles.extend([[a,b,c],[b,d,c]])
    add(vertices,triangles,cloth,side,weights,'exposed_'+str(side)+'_sleeve')
    # A real hollow ribbed cuff fits around the white wrist.
    center=np.array(points[-1]);x,y,z=frame(center-np.array(points[-2]));vertices=[];triangles=[];radii=[.046,.047,.046,.047,.045,.030,.030];offsets=[-.023,-.017,-.011,-.005,.002,.002,-.023]
    for k,(radius,offset) in enumerate(zip(radii,offsets)):
        for col in range(columns):
            angle=col/columns*np.pi*2;vertices.append(center+z*offset+(np.cos(angle)*x+np.sin(angle)*y)*radius)
    for row in range(len(radii)):
        for col in range(columns):
            a=row*columns+col;b=row*columns+(col+1)%columns;c=((row+1)%len(radii))*columns+col;d=((row+1)%len(radii))*columns+(col+1)%columns;triangles.extend([[a,b,c],[b,d,c]])
    add(vertices,triangles,knit,side,1.,'ribbed_'+str(side)+'_cuff')
paths={1:[[.135,.754,-.035],[.20,.705,-.030],[.275,.625,.010],[.305,.665,.080],[.295,.748,.140]],-1:[[-.135,.754,-.035],[-.205,.680,-.025],[-.260,.590,.015],[-.270,.510,.065],[-.260,.455,.110]]}
for side,path in paths.items():sleeve(path,side);wrists[str(side)]=path[-1];shoulders[str(side)]=path[0]
right_wrist=np.array(paths[1][-1]);shift=right_wrist-np.array([.153,.568,.082]);grip_indices=add(paw_p+shift,paw_f,white,1,1.,'white_closed_holding_paw');s['grip']=(np.array(s['grip'])+shift).round(6).tolist()
# The free paw uses the museum's original open white glove, mirrored naturally.
f=original['characters']['fast'];q=np.array(f['positions']).reshape(-1,3);c=np.array(f['colors']).reshape(-1,3);mask=(q[:,0]>.24)&(q[:,1]>.35)&(q[:,1]<.46)&(c[:,0]>.9)&(c[:,1]>.9);ff=np.array(f['indices']).reshape(-1,3);ff=ff[np.all(mask[ff],axis=1)];used,ff=np.unique(ff,return_inverse=True);q=(q[used]-[.291,.451,0])*.92;q[:,0]*=-1;q+=paths[-1][-1];add(q,ff.reshape(-1,3)[:,[0,2,1]],white,-1,1.,'white_free_paw')
p=np.array(positions);f=np.array(indices).reshape(-1,3);used,remap=np.unique(f,return_inverse=True);mapping=np.full(len(p),-1);mapping[used]=np.arange(len(used));p=p[used];f=remap.reshape(-1,3);cs=np.array(cs)[used];leg=np.array(leg)[used];arm_side=np.array(arm_side)[used];arm_weight=np.array(arm_weight)[used]
_,inverse=np.unique(np.round(p,5),axis=0,return_inverse=True);normal=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]]);smooth=np.zeros((inverse.max()+1,3))
for j in range(3):np.add.at(smooth,inverse[f[:,j]],normal)
smooth/=np.maximum(np.linalg.norm(smooth,axis=1,keepdims=True),1e-20)
s.update(positions=np.round(p,6).reshape(-1).tolist(),indices=f.reshape(-1).tolist(),colors=np.round(cs,6).reshape(-1).tolist(),normals=np.round(smooth[inverse],6).reshape(-1).tolist(),legSide=leg.tolist(),armSide=arm_side.tolist(),armWeight=np.round(arm_weight,6).tolist(),armPivots=shoulders,wrists=wrists,gripVertices=mapping[grip_indices].tolist(),armsOutOfPockets=True,armParts=part_names,width=float(np.ptp(p[:,0])))
path=root/'models/honk-news-museum-v162.bin';path.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0));print('TELEDOG:',len(p),'vertices, exposed wrists',wrists,'grip',s['grip']);print(path.name,path.stat().st_size)
