"""Reuse the colosseum cast's original colours, UVs and faces for HONK NEWS."""
import base64
import gzip
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parents[1]

def packed(name):
    manifest = json.loads((root / 'models' / name).read_text())
    content = ''.join(json.loads((root / 'models' / part).read_text()) for part in manifest['parts'])
    return json.loads(gzip.decompress(base64.b64decode(content)))

data = packed('arena-crowd-v84.json')
# Use the complete original HONK face, including the chin and rainbow wig.
head = json.loads(gzip.decompress((root / 'assets/honk-kart-head-v57.bin').read_bytes()))
honk = {'positions': [], 'normals': [], 'colors': [], 'indices': []}
for part in head['meshes']:
    start = len(honk['positions']) // 3
    honk['positions'].extend(part['positions'])
    honk['normals'].extend(part['normals'])
    honk['colors'].extend(part['color'] * (len(part['positions']) // 3))
    honk['indices'].extend(v + start for v in part['indices'])
data['honk'] = {'low': honk}
result = {'source': 'Original colosseum audience / goshavibecoder/Teledog', 'texture': data['texture'], 'characters': {}}
for name in ['honk', 'fast', 'teledog', 'groyper', 'zoich']:
    source = data[name]['low']
    if 'normals' not in source:
        points = source['positions']
        normals = [0.0] * len(points)
        for i in range(0, len(source['indices']), 3):
            ids = source['indices'][i:i+3]
            a, b, c = [points[v*3:v*3+3] for v in ids]
            u, v = [b[k]-a[k] for k in range(3)], [c[k]-a[k] for k in range(3)]
            n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
            for vertex in ids:
                for k in range(3):
                    normals[vertex*3+k] += n[k]
        for i in range(0, len(normals), 3):
            length = math.sqrt(sum(x*x for x in normals[i:i+3])) or 1
            normals[i:i+3] = [x/length for x in normals[i:i+3]]
        source['normals'] = normals
    channels = {'positions': 3, 'colors': 3}
    if 'normals' in source:
        channels['normals'] = 3
    if 'uv' in source:
        channels['uv'] = 2
    out = {key: [] for key in channels}
    out['indices'] = []
    # These are seated models with different hip heights. Only the recognisable
    # heads belong in the walking rig; never retain seated thighs or duplicate arms.
    cut = {'honk': -1, 'fast': .175, 'teledog': .17, 'groyper': .25, 'zoich': .28}[name]
    for i in range(0, len(source['indices']), 3):
        polygon = [{key: source[key][v * n:v * n + n] for key, n in channels.items()}
                   for v in source['indices'][i:i+3]]
        clipped = []
        for a, b in zip(polygon, polygon[1:] + polygon[:1]):
            inside_a, inside_b = a['positions'][1] >= cut, b['positions'][1] >= cut
            if inside_a:
                clipped.append(a)
            if inside_a != inside_b:
                t = (cut - a['positions'][1]) / (b['positions'][1] - a['positions'][1])
                clipped.append({key: [x + (y-x)*t for x, y in zip(a[key], b[key])] for key in channels})
        for j in range(1, len(clipped)-1):
            for vertex in [clipped[0], clipped[j], clipped[j+1]]:
                out['indices'].append(len(out['positions']) // 3)
                for key in channels:
                    values = vertex[key][:]
                    if key == 'positions':
                        values[1] -= cut
                    out[key].extend(round(v, 5) for v in values)
    # A head-local origin makes every attachment independent of source posture.
    bottom = min(out['positions'][1::3])
    cx = (min(out['positions'][::3]) + max(out['positions'][::3])) / 2
    cz = (min(out['positions'][2::3]) + max(out['positions'][2::3])) / 2
    for i in range(0, len(out['positions']), 3):
        out['positions'][i] = round(out['positions'][i] - cx, 5)
        out['positions'][i+1] = round(out['positions'][i+1] - bottom, 5)
        out['positions'][i+2] = round(out['positions'][i+2] - cz, 5)
    out['height'] = max(out['positions'][1::3])
    result['characters'][name] = out
target = root / 'models/honk-news-cast-v158.bin'
target.write_bytes(gzip.compress(json.dumps(result, separators=(',', ':')).encode(), mtime=0))
print(target.name, target.stat().st_size)
