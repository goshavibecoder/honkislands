"""Package the supplied rigged Groyper for the game's existing gzip loader."""
import argparse,gzip,io,json,struct
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--output',default='models/groyp-air-v74');args=p.parse_args()
b=Path(args.source).read_bytes();length=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+length]);binary=b[28+length:];image_views={image['bufferView']:i for i,image in enumerate(g['images'])};packed=bytearray()
for index,view in enumerate(g['bufferViews']):
 raw=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
 if index in image_views:
  image_index=image_views[index];image=Image.open(io.BytesIO(raw)).convert('RGB');output=io.BytesIO();image.save(output,format='WEBP',quality=92,lossless=image_index!=1,method=6);raw=output.getvalue();g['images'][image_index]['mimeType']='image/webp'
 packed.extend(b'\0'*(-len(packed)%4));view['byteOffset']=len(packed);view['byteLength']=len(raw);packed.extend(raw)
for texture in g['textures']:texture['extensions']={'EXT_texture_webp':{'source':texture.pop('source')}}
g['extensionsUsed']=list(dict.fromkeys(g.get('extensionsUsed',[])+['EXT_texture_webp']));g['extensionsRequired']=list(dict.fromkeys(g.get('extensionsRequired',[])+['EXT_texture_webp']));g['buffers']=[{'byteLength':len(packed)}]
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);packed.extend(b'\0'*(-len(packed)%4));glb=struct.pack('<III',0x46546c67,2,28+len(js)+len(packed))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(packed),0x004e4942)+packed
compressed=gzip.compress(glb,compresslevel=9,mtime=0);prefix=Path(args.output);prefix.parent.mkdir(parents=True,exist_ok=True);parts=[]
for i,offset in enumerate(range(0,len(compressed),196608)):
 path=Path(str(prefix)+'.'+str(i)+'.bin');path.write_bytes(compressed[offset:offset+196608]);parts.append(path.name)
manifest={'parts':parts,'bytes':len(compressed),'source':'groyper_green(1).glb','height':1.75,'vertices':10487,'textureSizes':[[2048,2048],[2048,2048],[1024,1024]],'rigged':True}
Path(str(prefix)+'.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n');print('Original:',len(b),'Packaged:',len(compressed),'Parts:',len(parts))
