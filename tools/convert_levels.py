"""Convert ripped original levels (ref/levels/level_X.json) into src/game/levels_orig_data.js:
per level: ASCII gameplay rows, per-cell block ids, block colours (from the original CHR/palette render), doors, objects, start."""
import json, os, sys, collections
from riplevels import ROM, rd, NES_PAL, chr_tile, blocks, VIDEO, PAL, NAMES

OUT_JS = 'src/game/levels_orig_data.js'
DOOR = 0x1E673
doors_all = [dict(startLoc=rd(DOOR + n), scrX=rd(DOOR + 48 + n), scrY=rd(DOOR + 24 + n), px=rd(DOOR + 193 + n), py=rd(DOOR + 217 + n), objId=rd(DOOR + 72 + n), backId=rd(DOOR + 96 + n), palId=rd(DOOR + 120 + n)) for n in range(25)]
# door records belong to levels in order (grouped by backId family): assign by matching destination screen validity in route order
DOOR_GROUPS = {'0': [0, 1], 'A': [2], 'B': [3, 4, 5], 'C': [6], 'D': [7, 8, 9], 'E': [10, 11, 12], 'F': [13], 'G': [14, 15, 16], 'H': [17, 18], 'I': [19, 20], 'J': [21, 22]}
BOSS = {'0': 'brusher', 'A': 'owl', 'B': 'rocket', 'C': None, 'D': 'robot', 'E': 'grouper', 'F': None, 'G': 'casinocat', 'H': None, 'I': 'caterpillar', 'J': 'fatcat'}
THEME = {'0': 'street', 'A': 'tree', 'B': 'kitchen', 'C': 'library', 'D': 'toystore', 'E': 'garden', 'F': 'machine', 'G': 'casino', 'H': 'sewer', 'I': 'office', 'J': 'factory'}
MUSIC = {0: 'zone0', 1: 'zoneB', 2: 'zoneD', 3: 'zoneG', 4: 'zoneJ', 5: 'zoneA', 6: 'zoneF'}
ZNAME = {'0': 'Улица и лаборатория', 'A': 'Верхушки деревьев', 'B': 'Закусочная', 'C': 'Библиотека', 'D': 'Магазин игрушек', 'E': 'Сад и фонтан', 'F': 'Машинное отделение', 'G': 'Казино Толстопуза', 'H': 'Водопровод', 'I': 'Склад и вентиляторы', 'J': 'Фабрика Толстопуза'}
OUTRO = {'0': 'afterZone0', 'A': 'gadgetLetter1', 'C': 'gadgetLetter2', 'D': 'gadgetLetter2', 'F': 'beforeCasino', 'G': 'afterCasino', 'I': 'beforeFinal', 'J': 'ending1'}

# object type -> tile char (gameplay). Enemies lowercase (see constants.ENEMY_CHARS), items uppercase/symbols.
OBJ = {
    0x00: 'd', 0x01: 'm', 0x02: 'm', 0x03: 'l', 0x04: 'b', 0x05: 't', 0x06: 'o', 0x07: 'q', 0x08: 'm',
    0x09: 'A', 0x0A: '1', 0x0B: 'f', 0x0C: '*', 0x0D: 'a', 0x0E: 'h', 0x0F: '*', 0x10: 'T', 0x11: 'R', 0x12: '*', 0x13: 'a', 0x14: 'Z', 0x15: 'Z',
    0x16: 'O', 0x17: 'Y', 0x18: '&', 0x19: 'O', 0x1A: '1', 0x1B: 'X', 0x1C: 'k', 0x1D: 'w', 0x1E: 'v', 0x1F: 'k', 0x20: 't', 0x21: 'c', 0x22: 'w',
    0x23: 's', 0x24: 'b', 0x25: 'b', 0x26: 'l', 0x27: 'l', 0x28: 'e', 0x29: 'r', 0x2A: 't', 0x2B: 'e', 0x2C: '_', 0x2D: '_', 0x2E: '_', 0x2F: 'P',
    0x30: 'v', 0x31: '_', 0x32: 'Y', 0x33: '_', 0x34: '_', 0x35: 'v', 0x36: 'F', 0x37: 'O', 0x38: 'X', 0x39: None, 0x3A: '_', 0x3B: 'c', 0x3C: '^', 0x3D: '&', 0x3E: '_',
    0x3F: 'F', 0x40: None, 0x41: None, 0x42: None, 0x43: None, 0x44: None, 0x45: None, 0x46: None, 0x47: None, 0x48: '_', 0x49: None, 0x4A: None, 0x4B: 'F', 0x4C: 'F', 0x4D: 'F', 0x4E: 'F', 0x4F: 'F',
    0x50: None, 0x51: None, 0x52: 'U', 0x53: None,
}
OBJ_LEVEL = {'E': {0x1E: 'n', 0x24: 's'}, 'D': {0x1E: 'v'}}
# zone 0: objects 2C-2E are electric sparks running back and forth along the power lines (1.5 px/frame);
# half-range in tiles and first direction measured in the emulator
SPARKS = {'0': {0x2C: (3.0, -1), 0x2D: (1.7, -1), 0x2E: (1.0, 1)}}
HIDEABLE = set('f*ah1Z')
LIFTABLE = 'XN'  # collectibles that may sit under a crate block (revealed when the crate is lifted)
# block type -> char
TYPE_CH = {0: '.', 1: 'f', 2: '=', 3: '#', 4: '^', 5: 'D', 6: '.', 7: 'J', 8: '~', 9: '~', 10: '#', 11: '!', 12: '#', 13: '#', 14: 'N', 15: 'X'}  # 14 = heavy nut/spool block (lab tower), 15 = crate block

def block_pixels(bl, page, pal, tile_cache):
    bgc = NES_PAL[pal[0] & 0x3F]; out = collections.Counter()
    for k in range(4):
        t = bl['tiles'][k]; key = (page, t)
        if key not in tile_cache: tile_cache[key] = chr_tile(page, t)
        for row in tile_cache[key]:
            for c in row: out[NES_PAL[pal[bl['pal'] * 4 + c] & 0x3F] if c else bgc] += 1
    return out

def block_color(bl, page, pal, tile_cache, sky=None):
    """Colour of a 16x16 block as the eye sees it on the NES screen: the dominant palette colour of its pixels.
    Dark outline colours only win when they really cover most of the block. Returns (hex colour, share of non-background pixels)."""
    bgc = NES_PAL[pal[0] & 0x3F]; counts = collections.Counter(); fg = collections.Counter(); nonbg = 0; n = 0
    for k in range(4):
        t = bl['tiles'][k]; key = (page, t)
        if key not in tile_cache: tile_cache[key] = chr_tile(page, t)
        for row in tile_cache[key]:
            for c in row:
                col = NES_PAL[pal[bl['pal'] * 4 + c] & 0x3F] if c else bgc
                if c and col != sky: nonbg += 1; fg[col] += 1
                counts[col] += 1; n += 1
    lum = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
    ranked = (fg if nonbg >= n * 0.05 else counts).most_common()  # drawn blocks (even thin wires): ignore the sky showing through
    best = ranked[0][0]
    if lum(best) < 40 and len(ranked) > 1 and ranked[1][1] >= ranked[0][1] * 0.35: best = ranked[1][0]  # skip black outlines/shadows
    return '#%02x%02x%02x' % best, nonbg / n

def convert(name):
    L = json.load(open(f'ref/levels/level_{name}.json')); info = L['info']; W, H = info['width'], info['height']; gw, gh = L['width'], L['height']
    layer, scrolls = L['layer'], L['scrolls']; filler = 0x100 if name in 'EH' else 0
    bl = blocks(info['bigBlockId'])
    # route BFS over non-filler screens from start
    start = info['startLoc']; sc = start % W, start // W
    valid = lambda c, r: 0 <= c < W and 0 <= r < H and layer[r * W + c] != filler
    recs = [doors_all[i] for i in DOOR_GROUPS[name]]
    dist = {sc: 0}; q = [sc]
    while q:
        c, r = q.pop(0)
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nc, nr = c + dc, r + dr
            if valid(nc, nr) and (nc, nr) not in dist: dist[(nc, nr)] = dist[(c, r)] + 1; q.append((nc, nr))
        if not q:  # seed door destinations not yet reached (in record order)
            for rec in recs:
                ds = (rec['scrX'], rec['scrY'])
                if valid(*ds) and ds not in dist: dist[ds] = max(dist.values()) + 1; q.append(ds); break
    # doors: door blocks (type 5) grouped into door objects (vertical pairs), ordered by route distance then x
    doorcells = [(x, y) for y in range(gh) for x in range(gw) if L['types'][y][x] == 5]
    groups = []
    for x, y in doorcells:
        for g in groups:
            if any(abs(gx - x) <= 1 and abs(gy - y) <= 1 for gx, gy in g): g.append((x, y)); break
        else: groups.append([(x, y)])
    # door record index = (scroll byte of the door's screen & 0x1F) - 1; 24 marks the level exit
    doors = []; exit_cells = []
    for g in groups:
        x, y = g[0]; sc_ = (x // 16, y // 16)
        sb = 0
        for cc, rr in ((sc_[0], sc_[1]), (sc_[0] + 1, sc_[1]), (sc_[0], sc_[1] - 1), (sc_[0], sc_[1] + 1), (sc_[0] - 1, sc_[1])):  # flag sits on the door's screen or the neighbour the camera scrolls into
            if 0 <= cc < W and 0 <= rr < H and (scrolls[rr * W + cc] & 0x1F): sb = scrolls[rr * W + cc]; break
        idx = (sb & 0x1F) - 1
        if idx >= 24 or idx < 0: exit_cells.append(g); continue
        rec = doors_all[idx]
        dx = rec['scrX'] * 16 + rec['px'] // 16; dy = rec['scrY'] * 16 + rec['py'] // 16
        doors.append(dict(cells=g, dest=[dx + 0.5, (gh - 1 - dy)], destScreen=[rec['scrX'], rec['scrY']], page=rec['backId'] - 0x90, pal=rec['palId']))
    # per-screen CHR page/palette: graphics change only through doors; each door destination seeds its own row
    page0 = info['backId'] - 0x90; pal0 = info['palId']
    screen_page = {}
    for sc2 in dist: screen_page[sc2] = (page0, pal0)
    seeds = [(d['destScreen'], d['page'], d['pal']) for d in doors]
    for (c3, r3) in dist:
        i3 = (scrolls[r3 * W + c3] & 0x1F) - 1
        if 0 <= i3 < 24: rec3 = doors_all[i3]; seeds.append(([rec3['scrX'], rec3['scrY']], rec3['backId'] - 0x90, rec3['palId']))
    for dest, dpage, dpal in seeds:
        dr = dict(page=dpage, pal=dpal); dc, drow = dest
        for cc in range(dc, W):
            if not valid(cc, drow): break
            screen_page[(cc, drow)] = (dr['page'], dr['pal'])
        for cc in range(dc - 1, -1, -1):
            if not valid(cc, drow): break
            screen_page[(cc, drow)] = (dr['page'], dr['pal'])
    # cells + colours
    tile_cache = {}; colors = {}; grid = L['blocks']; types = L['types']
    screen_sky = {}
    for sc2 in dist:
        pg2, pl2 = screen_page[sc2]; pal2 = [rd(PAL + pl2 * 16 + i) for i in range(16)]; hist = collections.Counter()
        for yy in range(sc2[1] * 16, sc2[1] * 16 + 16):
            for xx in range(sc2[0] * 16, sc2[0] * 16 + 16): hist.update(block_pixels(bl[grid[yy][xx]], pg2, pal2, tile_cache))
        col, cnt = hist.most_common(1)[0]; screen_sky[sc2] = col if cnt > 256 * 256 * 0.3 else None
    cells = []; rows = []
    for y in range(gh):
        row = []; cr = []
        for x in range(gw):
            s = (x // 16, y // 16)
            if s not in dist: cr.append(-1); row.append('@'); continue
            b = grid[y][x]; pg, pl = screen_page[s]
            pal = [rd(PAL + pl * 16 + i) for i in range(16)]
            key = (b, pg, pl, screen_sky[s])
            if key not in colors: colors[key] = block_color(bl[b], pg, pal, tile_cache, screen_sky[s])
            cid = len(colors) if key not in colors else list(colors.keys()).index(key)
            cr.append(cid); row.append(TYPE_CH[types[y][x]])
        cells.append(cr); rows.append(row)
    # objects
    objs = []; extra = []
    for o in L['objects']:
        ch = OBJ_LEVEL.get(name, {}).get(o['type'], OBJ.get(o['type']))
        bx = o['sx'] * 16 + o['x'] // 16; by = o['sy'] * 16 + o['y'] // 16
        px = o['sx'] * 256 + o['x']; py = o['sy'] * 256 + o['y']
        if not (0 <= bx < gw and 0 <= by < gh) or (bx // 16, by // 16) not in dist: continue
        sp = SPARKS.get(name, {}).get(o['type'])
        if sp:
            extra.append(dict(k='spark', x=round(px / 16, 3), y=round(gh - py / 16 - 0.25, 3), r=sp[0], d=sp[1])); continue
        if ch is None: continue
        if ch == 'R':
            extra.append(dict(k='redbox', x=bx + 0.5, y=gh - 1 - by, sx=o['sx'], sy=o['sy'])); continue
        if ch in HIDEABLE and rows[by][bx] in LIFTABLE:
            extra.append(dict(k='hidden', x=bx + 0.5, y=gh - 1 - by, ch=ch)); continue
        # place on the cell; items/enemies sit above the ground: find nearest non-solid cell upwards
        yy = by
        while yy > 0 and rows[yy][bx] in '#@=': yy -= 1
        if rows[yy][bx] in '.f': rows[yy][bx] = ch
        objs.append(dict(type=o['type'], x=bx, y=yy, ch=ch))
    # start position: start screen, find ground near left
    sx0, sy0 = sc
    placed = False
    for x in range(sx0 * 16 + 1, sx0 * 16 + 15):
        for y in range(sy0 * 16 + 14, sy0 * 16, -1):
            if rows[y][x] in '.f' and rows[y + 1][x] in '#=AX': rows[y][x] = 'S'; placed = True; break
        if placed: break
    # boss room = the screen that holds the boss ball object (0x53); boss position = centroid of boss-part objects (0x40-0x52)
    # exit = a screen flagged 24 (scroll & 0x1F == 0x19) when present, otherwise the boss room / the exit door
    exit_screens = [(c, r) for (c, r) in dist if (scrolls[r * W + c] & 0x1F) == 0x19]
    def floor_row(ec, er, min_solid=10):
        """highest row of the screen that is a real floor (>= min_solid solid cells with free space above); None if absent"""
        for y in range(er * 16 + 2, er * 16 + 16):
            if sum(1 for x in range(ec * 16, ec * 16 + 16) if rows[y][x] in '#=') >= min_solid and all(rows[y - 1][x] not in '#@' for x in range(ec * 16 + 2, ec * 16 + 14)): return y
        return None
    def arena_floor(ec, er):
        fy = floor_row(ec, er)
        if fy is None:  # static room without a real floor in the data: close the bottom of the screen
            fy = er * 16 + 15
            for x in range(ec * 16, ec * 16 + 16):
                if rows[fy][x] in '.@': rows[fy][x] = '#'
        return fy
    def put_on(ch, x, y):
        if rows[y][x] in '#=@': rows[y][x] = '.'
        rows[y][x] = ch
    if BOSS[name]:
        balls = [o for o in L['objects'] if o['type'] == 0x53]
        parts = [o for o in L['objects'] if 0x40 <= o['type'] <= 0x52]
        if balls:
            b = balls[0]; ec, er = b['sx'], b['sy']
        else:
            dests = set(tuple(d['destScreen']) for d in doors)
            cands = [sc2 for sc2 in dist if (scrolls[sc2[1] * W + sc2[0]] & 0xE0) == 0x80 and sc2 in dests]
            ec, er = cands[0] if cands else max(dist, key=lambda sc2: dist[sc2])
        fy = arena_floor(ec, er); by = fy - 1
        for x in range(ec * 16 + 1, ec * 16 + 15):
            if rows[by][x] in '#=@': rows[by][x] = '.'
            if rows[fy][x] in '.@': rows[fy][x] = '#'
        put_on('K', ec * 16 + 8, by); put_on('E', ec * 16 + 13, by)
        boss_screen = (ec, er)
    else:
        boss_screen = None
        if exit_screens:
            xc, xr = exit_screens[0]; fy = arena_floor(xc, xr); put_on('E', xc * 16 + 13, fy - 1)
        else:
            last = exit_cells[-1] if exit_cells else None
            if last:
                for (x, y) in last: rows[y][x] = '.'
                x0, y0 = last[0][0], max(c[1] for c in last); rows[y0][x0] = 'E'
    # screens flagged with a door record but without door blocks: the transition happens at the screen's right edge
    used = set()
    for dr in doors: used.add(tuple(dr['destScreen']))
    for (c, r) in dist:
        sb = scrolls[r * W + c]; idx = (sb & 0x1F) - 1
        if idx < 0 or idx >= 24 or (c, r) == boss_screen: continue
        rec = doors_all[idx]; ds = (rec['scrX'], rec['scrY'])
        if ds in used: continue
        # right edge column of this screen: find standing cell
        x = c * 16 + 15; fy = None
        for y in range(r * 16 + 15, r * 16, -1):
            if rows[y][x] in '#=' and rows[y - 1][x] in '.f': fy = y; break
        if fy is None:
            # the screen ends in a wall: the passage opens in the wall's leftmost column at floor level (zone 0, screen 01C)
            for y in range(r * 16 + 15, r * 16, -1):
                if rows[y][c * 16 + 2] in '#=' and rows[y - 1][c * 16 + 2] in '.f': fy = y; break
            if fy is None: continue
            x = next((xx for xx in range(c * 16 + 3, c * 16 + 16) if rows[fy - 1][xx] == '#'), None)
            if x is None: continue
        dx = rec['scrX'] * 16 + rec['px'] // 16; dy = rec['scrY'] * 16 + rec['py'] // 16
        cells_ = [(x, fy - 1), (x, fy - 2)]
        lock = 'redbox' if any(e['k'] == 'redbox' and (e['sx'], e['sy']) == (c, r) for e in extra) else None
        doors.append(dict(cells=cells_, dest=[dx + 0.5, (gh - 1 - dy)], destScreen=[rec['scrX'], rec['scrY']], page=rec['backId'] - 0x90, pal=rec['palId'], edge=True, lock=lock))
        used.add(ds)
    for d in doors:
        for (x, y) in d['cells']: rows[y][x] = 'D'
    for g in exit_cells:
        for (x, y) in g:
            if rows[y][x] == 'D': rows[y][x] = '.'
    colour_list = [c for c in colors.values()]
    # sky = most common colour among background cells on route screens
    cnt = collections.Counter(cells[y][x] for y in range(gh) for x in range(gw) if cells[y][x] >= 0 and rows[y][x] == '.')
    sky_id = cnt.most_common(1)[0][0]; sky_col = colour_list[sky_id][0]
    return dict(id=name, name=ZNAME[name], theme=THEME[name], music=MUSIC[info['musicNo']], boss=BOSS[name], act=1, outro=OUTRO.get(name),
                rows=[''.join(r) for r in rows], cells=cells, colors=[c[0] for c in colour_list], density=[round(c[1], 2) for c in colour_list],
                doors=[dict(x=d['cells'][0][0], y=min(c[1] for c in d['cells']), h=len(d['cells']), dest=d['dest'], edge=bool(d.get('edge')), lock=d.get('lock')) for d in doors],
                extra=extra, bossScreen=list(boss_screen) if boss_screen else None,
                sky=sky_col, skyId=sky_id, screens=[W, H], route=[list(k) for k in dist])

levels = {n: convert(n) for n in NAMES}
from PIL import Image, ImageDraw
for n, lv in levels.items():
    gw, gh = len(lv['rows'][0]), len(lv['rows']); cs = 8
    img = Image.new('RGB', (gw * cs, gh * cs), (20, 20, 30)); d = ImageDraw.Draw(img)
    for y in range(gh):
        for x in range(gw):
            cid = lv['cells'][y][x]; ch = lv['rows'][y][x]
            if cid >= 0 and cid != lv['skyId'] and lv['density'][cid] > 0.02: d.rectangle([x * cs, y * cs, x * cs + cs - 1, y * cs + cs - 1], fill=lv['colors'][cid])
            if ch == '@': d.rectangle([x * cs, y * cs, x * cs + cs - 1, y * cs + cs - 1], fill=(40, 40, 40))
            elif ch in '#': d.rectangle([x * cs + 1, y * cs + 1, x * cs + cs - 2, y * cs + cs - 2], outline=(255, 255, 255))
            elif ch == '=': d.line([x * cs, y * cs + 1, x * cs + cs - 1, y * cs + 1], fill=(0, 255, 255), width=2)
            elif ch not in '.': d.text((x * cs, y * cs - 2), ch, fill=(255, 255, 0) if ch.islower() else (255, 80, 255))
    img.save(f'ref/levels/conv_{n}.png')
with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write('// Generated by tools/convert_levels.py from the original ROM level data (block types, colours, objects, doors).\n')
    f.write('export const ORIG = ' + json.dumps(levels, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('written', OUT_JS, os.path.getsize(OUT_JS))
for n, lv in levels.items():
    print(n, lv['music'], 'size', len(lv['rows'][0]), 'x', len(lv['rows']), 'doors', len(lv['doors']), 'colors', len(lv['colors']), 'S' in ''.join(lv['rows']), 'K' in ''.join(lv['rows']), 'E' in ''.join(lv['rows']))
