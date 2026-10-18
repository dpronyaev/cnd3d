"""Atlas of the distinct blocks used by a zone (per graphics page/palette), with block id, collision type and use count.
Used to map every original block to a 3D prop kind (tools/props_<zone>.json). Usage: python tools/blockatlas.py 0"""
import json, sys, collections
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools')
from riplevels import rd, NES_PAL, chr_tile, blocks, PAL, level_data
import convert_levels as CV

name = sys.argv[1] if len(sys.argv) > 1 else '0'
L = json.load(open(f'ref/levels/level_{name}.json')); info = L['info']
bl = blocks(info['bigBlockId'])
lv = CV.levels[name]
# rebuild per-cell (block, page, pal) like the converter does
grid = L['blocks']; types = L['types']; W, H = info['width'], info['height']
pages = CV.LAST_SCREEN_PAGE[name]
use = collections.Counter(); where = {}
for y in range(len(grid)):
    for x in range(len(grid[0])):
        s = (x // 16, y // 16)
        if s not in pages: continue
        key = (grid[y][x],) + pages[s]
        use[key] += 1; where.setdefault(key, (x, y))
keys = sorted(use, key=lambda k: (k[1], k[2], k[0]))
cell = 48; cols = 16; rows = (len(keys) + cols - 1) // cols
img = Image.new('RGB', (cols * (cell + 8), rows * (cell + 22)), (40, 40, 40)); d = ImageDraw.Draw(img)
cache = {}
for i, (b, pg, pl) in enumerate(keys):
    pal = [rd(PAL + pl * 16 + j) for j in range(16)]; blk = bl[b]
    tile = Image.new('RGB', (16, 16)); px = tile.load()
    for k in range(4):
        t = blk['tiles'][k]; ck = (pg, t)
        if ck not in cache: cache[ck] = chr_tile(pg, t)
        tp = cache[ck]
        for ty in range(8):
            for tx in range(8):
                c = tp[ty][tx]; px[(k & 1) * 8 + tx, (k >> 1) * 8 + ty] = NES_PAL[pal[blk['pal'] * 4 + c] & 0x3F] if c else NES_PAL[pal[0] & 0x3F]
    ox = (i % cols) * (cell + 8) + 4; oy = (i // cols) * (cell + 22) + 2
    img.paste(tile.resize((cell, cell), Image.NEAREST), (ox, oy))
    d.text((ox, oy + cell + 1), f'{b:02X}p{pg}t{blk["type"]:X}', fill=(255, 255, 0)); d.text((ox, oy + cell + 10), f'x{use[(b, pg, pl)]}', fill=(180, 180, 180))
img.save(f'ref/levels/atlas_{name}.png')
json.dump([dict(block=b, page=pg, pal=pl, type=bl[b]['type'], count=use[(b, pg, pl)], at=where[(b, pg, pl)]) for (b, pg, pl) in keys], open(f'ref/levels/atlas_{name}.json', 'w'))
print(len(keys), 'distinct blocks', img.size)
