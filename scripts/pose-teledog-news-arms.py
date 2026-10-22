"""Build TELEDOG sleeves and rounded gloves from the supplied character parts sheet.

Keep the museum head details, hoodie front, trousers and shoes. Narrow only
the head width by 8%; taper the sleeves and scale both gloves down by 20%.
Hands are purpose-built
continuous surfaces; no stretched geometry from another character is used.
Requires numpy, scipy and fast-simplification, as does build-honk-news-museum.py.
"""
import gzip,json
from pathlib import Path
import numpy as np
import fast_simplification
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
root=Path(__file__).resolve().parents[1]
data=json.loads(gzip.decompress((root/'models/honk-news-museum-v161.bin').read_bytes()))
s=data['characters']['teledog'];p=np.array(s['positions']).reshape(-1,3);colors=np.array(s['colors']).reshape(-1,3);faces=np.array(s['indices']).reshape(-1,3);legs=np.array(s['legSide']);old_paw=np.zeros(len(p),bool);old_paw[s['gripVertices']]=True
# Remove the former borrowed glove completely before building the new hands.
faces=faces[~np.any(old_paw[faces],axis=1)]
# Transform every connected piece of the native head together, including eyes,
# muzzle, ears and flower. Height and depth remain at the museum proportions.
edges=np.r_[faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]]
_,components=connected_components(coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(p),len(p))),directed=False)
heights=np.full(components.max()+1,-np.inf);np.maximum.at(heights,components,p[:,1])
head=heights[components]>.85;p[head,0]*=.92;s['headScaleX']=.92
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
        t=row/rows;center=curve(points,t);a=curve(points,max(0,t-.002));b=curve(points,min(1,t+.002));x,y,z=frame(b-a);radius=np.interp(t,[0,.2,.48,.65,1],[.050,.050,.044,.039,.029]);radius+=.0015*np.sin(t*9*np.pi)*np.sin(t*np.pi)**2
        for col in range(columns):
            angle=col/columns*np.pi*2;r=radius*(1+.035*np.sin(angle*3+t*5));vertices.append(center+(np.cos(angle)*x+np.sin(angle)*y)*r);u=np.clip(t/.22,0,1);weights.append(float(u*u*(3-2*u)))
    for row in range(rows):
        for col in range(columns):
            a=row*columns+col;b=row*columns+(col+1)%columns;c=a+columns;d=b+columns;triangles.extend([[a,b,c],[b,d,c]])
    add(vertices,triangles,cloth,side,weights,'exposed_'+str(side)+'_sleeve')
    # A real hollow ribbed cuff fits around the white wrist.
    center=np.array(points[-1]);x,y,z=frame(center-np.array(points[-2]));vertices=[];triangles=[];radii=[.030,.031,.030,.031,.029,.021,.021];offsets=[-.023,-.017,-.011,-.005,.002,.002,-.023]
    for k,(radius,offset) in enumerate(zip(radii,offsets)):
        for col in range(columns):
            angle=col/columns*np.pi*2;vertices.append(center+z*offset+(np.cos(angle)*x+np.sin(angle)*y)*radius)
    for row in range(len(radii)):
        for col in range(columns):
            a=row*columns+col;b=row*columns+(col+1)%columns;c=((row+1)%len(radii))*columns+col;d=((row+1)%len(radii))*columns+(col+1)%columns;triangles.extend([[a,b,c],[b,d,c]])
    add(vertices,triangles,knit,side,1.,'ribbed_'+str(side)+'_cuff')
paths={
    1:[[.105,.710,-.035],[.174,.710,-.027],[.235,.615,.010],[.270,.659,.065],[.270,.746,.120]],
    -1:[[-.105,.710,-.035],[-.174,.690,-.025],[-.215,.590,.010],[-.235,.510,.050],[-.232,.455,.080]]
}
for side,path in paths.items():
    sleeve(path,side);wrists[str(side)]=path[-1];shoulders[str(side)]=path[0]

def glove(side):
    """Smooth union of a palm, wrist, three fingers and an opposing thumb.

    Marching tetrahedra gives a connected surface at the finger roots instead
    of overlapping borrowed triangles. Rounded finger ends remain distinct.
    """
    shapes=[]
    def ellipsoid(center,radii):
        shapes.append(('ellipsoid',np.array(center),np.array(radii)))
    def chain(points,radii):
        shapes.append(('chain',np.array(points),np.broadcast_to(radii,(len(points),))))
    if side==1:
        grip=np.array([.330,.799,.165])
        ellipsoid([.298,.784,.128],[.034,.047,.026])
        chain([[.300,.732,.110],[.300,.754,.123],[.299,.778,.128]],[.027,.028,.031])
        # Three fat cartoon fingers curl across the front and around the pole.
        for y,r in [(.777,.0115),(.802,.012),(.827,.011)]:
            angles=np.linspace(np.pi,0,15)
            points=np.column_stack([grip[0]+.028*np.cos(angles),np.full(15,y),grip[2]+.028*np.sin(angles)])
            chain(np.vstack([[.291,y,.132],points]),np.r_[.014,np.linspace(.013,r,15)])
        # The thumb opposes the fingers behind the handle, rather than growing
        # from their tips. Its round tip meets the lower finger on the outside.
        chain([[.293,.758,.134],[.321,.757,.144],[.347,.766,.154],[.352,.787,.164]],[.018,.017,.015,.014])
    else:
        grip=None
        ellipsoid([-.266,.414,.091],[.035,.044,.024])
        chain([[-.260,.465,.077],[-.263,.443,.085],[-.266,.421,.091]],[.026,.027,.031])
        for x,length in [(-.287,.055),(-.266,.064),(-.245,.054)]:
            chain([[x,.410,.090],[x,.385,.094],[x,.410-length,.108]],[.0125,.012,.0105])
        chain([[-.239,.429,.093],[-.218,.410,.108],[-.222,.389,.120]],[.016,.014,.012])
    # Evaluate a signed distance field on a small local grid. Polynomial smooth
    # union only rounds intersections; it keeps the gaps between the digits.
    centers=np.concatenate([shape[1] for shape in shapes if shape[0]=='chain'])
    lo=centers.min(0)-.045;hi=centers.max(0)+.045;step=.0035
    counts=np.ceil((hi-lo)/step).astype(int)+1
    grid=np.stack(np.meshgrid(*[lo[i]+np.arange(counts[i])*step for i in range(3)],indexing='ij'),axis=-1)
    field=np.full(tuple(counts),1.)
    def merge(d):
        nonlocal field
        h=np.maximum(.003-np.abs(field-d),0)/.003
        field=np.minimum(field,d)-h*h*.003*.25
    for kind,a,b in shapes:
        if kind=='ellipsoid':
            q=grid-a;k0=np.linalg.norm(q/b,axis=-1);k1=np.linalg.norm(q/(b*b),axis=-1)
            merge(k0*(k0-1)/np.maximum(k1,1e-12))
        else:
            d=np.full(tuple(counts),1.)
            for i in range(len(a)-1):
                ab=a[i+1]-a[i];t=np.clip(np.sum((grid-a[i])*ab,axis=-1)/np.dot(ab,ab),0,1)
                d=np.minimum(d,np.linalg.norm(grid-a[i]-t[...,None]*ab,axis=-1)-(b[i]+t*(b[i+1]-b[i])))
            merge(d)
    corners=np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]])
    tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]
    cell=np.stack(np.meshgrid(*[np.arange(n-1) for n in counts],indexing='ij'),axis=-1).reshape(-1,3)
    corner_index=cell[:,None,:]+corners;values=field[tuple(corner_index.transpose(2,0,1))]
    active=(values.min(1)<0)&(values.max(1)>=0);cell=cell[active];values=values[active]
    triangles=[]
    for tet in tets:
        v=values[:,tet];xyz=lo+(cell[:,None,:]+corners[tet])*step
        for mask in range(1,15):
            select=np.all((v<0)==[(mask>>i)&1 for i in range(4)],axis=1)
            if not np.any(select):continue
            inside=[i for i in range(4) if mask>>i&1];outside=[i for i in range(4) if not(mask>>i&1)]
            q=xyz[select];vv=v[select]
            def edge(a,b):
                t=vv[:,a]/(vv[:,a]-vv[:,b]);return q[:,a]+t[:,None]*(q[:,b]-q[:,a])
            if len(inside)==1 or len(outside)==1:
                a=(inside if len(inside)==1 else outside)[0];others=outside if len(inside)==1 else inside
                tri=np.stack([edge(a,b) for b in others],axis=1)
                direction=q[:,outside].mean(1)-q[:,inside].mean(1)
                reverse=np.sum(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])*direction,axis=1)<0
                tri[reverse]=tri[reverse][:,[0,2,1]];triangles.extend(tri)
            else:
                a,b=inside;c,d=outside;e0,e1,e2,e3=edge(a,c),edge(a,d),edge(b,c),edge(b,d)
                for tri in [np.stack([e0,e1,e2],1),np.stack([e1,e3,e2],1)]:
                    direction=q[:,outside].mean(1)-q[:,inside].mean(1)
                    reverse=np.sum(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])*direction,axis=1)<0
                    tri[reverse]=tri[reverse][:,[0,2,1]];triangles.extend(tri)
    vertices,inv=np.unique(np.round(np.array(triangles).reshape(-1,3),6),axis=0,return_inverse=True)
    faces=inv.reshape(-1,3);faces=faces[np.linalg.norm(np.cross(vertices[faces[:,1]]-vertices[faces[:,0]],vertices[faces[:,2]]-vertices[faces[:,0]]),axis=1)>1e-12]
    vertices,faces=fast_simplification.simplify(vertices,faces,target_count=1800,agg=5,preserve_border=True)
    old_wrist=np.array([.300,.746,.120] if side==1 else [-.260,.455,.080])
    new_wrist=np.array(paths[side][-1]);vertices=new_wrist+(vertices-old_wrist)*.80
    if grip is not None:grip=new_wrist+(grip-old_wrist)*.80
    ids=add(vertices,faces,white,side,1.,'white_closed_holding_paw' if side==1 else 'white_free_paw')
    return ids,grip

grip_indices,grip=glove(1);glove(-1);s['grip']=grip.tolist();s['gripRadius']=.019*.80
s['handStyle']='reference_cartoon_gloves';s['gloveDigits']=4;s['gloveScale']=.80
p=np.array(positions);f=np.array(indices).reshape(-1,3);used,remap=np.unique(f,return_inverse=True);mapping=np.full(len(p),-1);mapping[used]=np.arange(len(used));p=p[used];f=remap.reshape(-1,3);cs=np.array(cs)[used];leg=np.array(leg)[used];arm_side=np.array(arm_side)[used];arm_weight=np.array(arm_weight)[used]
_,inverse=np.unique(np.round(p,5),axis=0,return_inverse=True);normal=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]]);smooth=np.zeros((inverse.max()+1,3))
for j in range(3):np.add.at(smooth,inverse[f[:,j]],normal)
smooth/=np.maximum(np.linalg.norm(smooth,axis=1,keepdims=True),1e-20)
s.update(positions=np.round(p,6).reshape(-1).tolist(),indices=f.reshape(-1).tolist(),colors=np.round(cs,6).reshape(-1).tolist(),normals=np.round(smooth[inverse],6).reshape(-1).tolist(),legSide=leg.tolist(),armSide=arm_side.tolist(),armWeight=np.round(arm_weight,6).tolist(),armPivots=shoulders,wrists=wrists,gripVertices=mapping[grip_indices].tolist(),armsOutOfPockets=True,armParts=part_names,width=float(np.ptp(p[:,0])))
path=root/'models/honk-news-museum-v164.bin';path.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0));print('TELEDOG:',len(p),'vertices, exposed wrists',wrists,'grip',s['grip']);print(path.name,path.stat().st_size)
