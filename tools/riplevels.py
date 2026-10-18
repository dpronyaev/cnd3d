"""Rip original level maps from the ROM using the format documented by CadEditor (spiiin) for Chip 'n Dale Rescue Rangers.
Outputs per level: PNG render (for inspection), and JSON with 16x16 block grid (block ids + collision types) and object list."""
import json, os, sys
from PIL import Image, ImageDraw

ROM = open('ChipAndDale.nes', 'rb').read()
OUT = sys.argv[2] if len(sys.argv) > 2 else 'ref/levels'
os.makedirs(OUT, exist_ok=True)
rd = lambda a: ROM[a]

LEVEL_REC = 0x1E201; DIR_REC = 0x10239; LAYOUT_ADD = 0x10010; SCROLL_ADD = 0x10010
SCREENS = 0x10; BIGBLOCKS = 0x36F0; BLOCKS = 0x3AF0; PAL = 0x1C354; VIDEO = 0x30010
OBJ_RECS = [(0x10388, 76), (0x10456, 31), (0x105A1, 73), (0x106D1, 57), (0x10890, 97), (0x10A1D, 74), (0x10B0E, 41), (0x10C88, 83), (0x10DB3, 53), (0x10EA1, 45), (0x10FED, 71)]
NAMES = ['0', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
TYPES = ['back', 'collect', 'platform', 'block', 'spikes', 'door', 'mask', 'up', 'down', 'down2', 'blockA', 'pit', 'blockC', 'blockD', 'stone', 'box']

# NES 2C02 palette as shown by Mesen / Nestopia (YUV) - the look most players know
NES_PAL = [(102,102,102),(0,42,136),(20,18,167),(59,0,164),(92,0,126),(110,0,64),(108,6,0),(86,29,0),(51,53,0),(11,72,0),(0,82,0),(0,79,8),(0,64,77),(0,0,0),(0,0,0),(0,0,0),
(173,173,173),(21,95,217),(66,64,255),(117,39,254),(160,26,204),(183,30,123),(181,49,32),(153,78,0),(107,109,0),(56,135,0),(12,147,0),(0,143,50),(0,124,141),(0,0,0),(0,0,0),(0,0,0),
(255,254,255),(100,176,255),(146,144,255),(198,118,255),(243,106,255),(254,110,204),(254,129,112),(234,158,34),(188,190,0),(136,216,0),(92,228,48),(69,224,130),(72,205,222),(79,79,79),(0,0,0),(0,0,0),
(255,254,255),(192,223,255),(211,210,255),(232,200,255),(251,194,255),(254,196,234),(254,204,197),(247,216,165),(228,229,148),(207,239,150),(189,244,171),(179,243,204),(181,235,242),(184,184,184),(0,0,0),(0,0,0)]

def level_data(no):
    b = LEVEL_REC
    d = dict(bigBlockId=rd(b + no), startLoc=rd(b + 15 + no), height=rd(b + 30 + no) + 1, width=rd(b + 45 + no) + 1, objId=rd(b + 60 + no), backId=rd(b + 75 + no), palId=rd(b + 90 + no), musicNo=rd(b + 105 + no), palId2=rd(b + 120 + no), palBlink=rd(b + 135 + no))
    d['layoutAddr'] = (rd(b + 165 + no) << 8) + rd(b + 150 + no) + LAYOUT_ADD
    d['scrollAddr'] = (rd(b + 195 + no) << 8) + rd(b + 180 + no) + SCROLL_ADD
    d['dirsAddr'] = (rd(DIR_REC + 15 + no) << 8) + rd(DIR_REC + no) + 0x8010
    return d

def blocks(setId):
    a = BLOCKS + setId * 0x4000; out = []
    for i in range(256):
        tc = rd(a + 256 * 4 + i)
        out.append(dict(tiles=[rd(a + i), rd(a + 256 + i), rd(a + 512 + i), rd(a + 768 + i)], pal=tc & 3, type=(tc >> 4) & 0xF))
    return out

def bigblocks(setId):
    a = BIGBLOCKS + setId * 0x4000
    return [[rd(a + i * 4 + k) for k in range(4)] for i in range(256)]

# Layout ids are 1-based: id N uses the screen record N-1 (verified against the emulator: zone 0 starts on layout id 001,
# whose picture is record 0). Id 0 is the "nothing here" filler and is rendered as an empty screen.
SCREEN_BASE = 1
def screen(idx):
    if idx - SCREEN_BASE < 0: return [0] * 64
    a = SCREENS + (idx - SCREEN_BASE) * 0x40
    return [rd(a + i) for i in range(64)]

def chr_tile(page, t):
    a = VIDEO + page * 0x1000 + t * 16; px = []
    for y in range(8):
        lo, hi = rd(a + y), rd(a + y + 8)
        px.append([((lo >> (7 - x)) & 1) | (((hi >> (7 - x)) & 1) << 1) for x in range(8)])
    return px

def rip(no):
    L = level_data(no); W, H = L['width'], L['height']
    layer = [rd(L['layoutAddr'] + i) + (0x100 if no in (5, 8) else 0) for i in range(W * H)]
    scrolls = [rd(L['scrollAddr'] + i) for i in range(W * H)]
    bb = bigblocks(L['bigBlockId']); bl = blocks(L['bigBlockId'])
    page = L['backId'] - 0x90
    pal = [rd(PAL + L['palId'] * 16 + i) for i in range(16)]
    # block grid: W*16 x H*16 blocks of 16px
    gw, gh = W * 16, H * 16
    grid = [[0] * gw for _ in range(gh)]
    for sy in range(H):
        for sx in range(W):
            s = screen(layer[sy * W + sx])
            for by in range(8):
                for bx in range(8):
                    big = bb[s[by * 8 + bx]]
                    for k in range(4):
                        x = sx * 16 + bx * 2 + (k & 1); y = sy * 16 + by * 2 + (k >> 1)
                        grid[y][x] = big[k]
    types = [[bl[b]['type'] for b in row] for row in grid]
    # objects
    addr, cnt = OBJ_RECS[no]; objs = []
    hack = 1 if no == 4 else 0
    for i in range(cnt):
        v = rd(addr + i)
        sx = rd(addr - 4 * cnt + hack + i); x = rd(addr - 3 * cnt + hack + i); sy = rd(addr - 2 * cnt + hack + i); y = rd(addr - cnt + i)
        if v == 0xFF: continue
        objs.append(dict(type=v, sx=sx, sy=sy, x=x, y=y))
    # render
    tiles = {}
    def tile(t):
        if t not in tiles: tiles[t] = chr_tile(page, t)
        return tiles[t]
    img = Image.new('RGB', (gw * 16, gh * 16))
    pix = img.load()
    for y in range(gh):
        for x in range(gw):
            b = bl[grid[y][x]]; p = b['pal']
            for k in range(4):
                tp = tile(b['tiles'][k]); ox = x * 16 + (k & 1) * 8; oy = y * 16 + (k >> 1) * 8
                for ty in range(8):
                    for tx in range(8):
                        c = tp[ty][tx]; col = NES_PAL[pal[p * 4 + c] & 0x3F] if c else NES_PAL[pal[0] & 0x3F]
                        pix[ox + tx, oy + ty] = col
    # overlay types + objects
    ov = img.copy(); d = ImageDraw.Draw(ov, 'RGBA')
    colors = {1: (255, 255, 0, 110), 2: (0, 255, 255, 110), 3: (255, 0, 0, 90), 4: (255, 0, 255, 140), 5: (0, 255, 0, 150), 6: (0, 0, 0, 0), 7: (255, 128, 0, 120), 8: (255, 128, 0, 120), 9: (255, 128, 0, 120), 10: (255, 0, 0, 90), 11: (0, 0, 0, 120), 12: (255, 0, 0, 90), 13: (255, 0, 0, 90), 14: (255, 255, 255, 140), 15: (255, 200, 0, 140)}
    for y in range(gh):
        for x in range(gw):
            t = types[y][x]
            if t in colors and colors[t][3]: d.rectangle([x * 16, y * 16, x * 16 + 15, y * 16 + 15], fill=colors[t])
    for o in objs:
        px = o['sx'] * 256 + o['x']; py = o['sy'] * 256 + o['y']
        d.rectangle([px - 8, py - 8, px + 8, py + 8], outline=(255, 255, 255, 255), width=2); d.text((px - 6, py - 6), '%02X' % o['type'], fill=(255, 255, 255, 255))
    for sy in range(H):
        for sx in range(W):
            d.rectangle([sx * 256, sy * 256, sx * 256 + 255, sy * 256 + 255], outline=(255, 255, 255, 60)); d.text((sx * 256 + 4, sy * 256 + 4), 'scr %03X scroll %02X' % (layer[sy * W + sx], scrolls[sy * W + sx]), fill=(255, 255, 255, 200))
    name = NAMES[no]
    img.save(f'{OUT}/level_{name}.png'); ov.save(f'{OUT}/level_{name}_types.png')
    json.dump(dict(level=name, info=L, width=gw, height=gh, blocks=grid, types=types, objects=objs, layer=layer, scrolls=scrolls, typeNames=TYPES), open(f'{OUT}/level_{name}.json', 'w'))
    print(name, 'screens %dx%d' % (W, H), 'blocks %dx%d' % (gw, gh), 'objs', len(objs), 'bigBlockId', L['bigBlockId'], 'page', page, 'pal', L['palId'], 'start', L['startLoc'], 'music', L['musicNo'])

if __name__ == "__main__":
    for no in range(11): rip(no)
