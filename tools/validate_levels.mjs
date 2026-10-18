// Validates level layouts: rectangular rows, required markers, approximate reachability from S to K/E.
import { ACT1 } from '../src/game/levels_act1.js';
import { ORIG } from '../src/game/levels_orig_data.js';
import { ACT2 } from '../src/game/levels_act2.js';

const SOLID = new Set(['#', '%', 'W', '@']);
function validate(lv) {
  const rows = lv.rows; const H = rows.length; const W = rows[0].length; const issues = [];
  if (rows.some(r => r.length !== W)) issues.push('ragged rows');
  const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= W) ? '#' : rows[y][x];
  const pass = (x, y) => !SOLID.has(at(x, y)) && y < H;
  const supportBelow = (x, y) => { const c = at(x, y + 1); return SOLID.has(c) || c === '=' || c === 'Y' || c === '_' || c === ':' || c === 'U' || c === 'M' || c === 'X' || c === 'A' || c === 'B'; };
  const standable = (x, y) => pass(x, y) && y + 1 < H && supportBelow(x, y);
  let S = null, E = null, K = null; const gears = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = rows[y][x]; if (c === 'S') S = [x, y]; if (c === 'E') E = [x, y]; if (c === 'K') K = [x, y]; if (c === 'g') gears.push([x, y]); }
  if (!S) issues.push('no S'); if (!E) issues.push('no E'); if (lv.boss && !K) issues.push('boss level without K');
  if (!S) return issues;
  // BFS over standable cells
  const seen = new Set(); const q = [S]; seen.add(S.join(','));
  const key = (x, y) => x + ',' + y;
  const clearArc = (x0, y0, x1, y1, yTop) => {
    for (let y = y0; y >= yTop; y--) if (!pass(x0, y) || !pass(x0, y - 1)) return false;
    const dir = Math.sign(x1 - x0); for (let x = x0; x !== x1; x += dir) if (!pass(x, yTop) || !pass(x, yTop - 1)) return false;
    for (let y = yTop; y <= y1; y++) if (!pass(x1, y)) return false;
    return true;
  };
  const clear = (x0, y0, x1, y1, lim = 4) => { for (let k = 0; k <= lim; k++) { const yTop = Math.min(y0, y1) - k; if (y0 - yTop > lim) break; if (clearArc(x0, y0, x1, y1, yTop)) return true; } return false; };
  const doorAt = (x, y) => (lv.doors || []).find(d => d.x === x && y >= d.y && y < d.y + d.h);
  while (q.length) {
    const [x, y] = q.shift();
    const dr = doorAt(x, y) || doorAt(x, y - 1); if (dr) { const tx = Math.floor(dr.dest[0]), ty = H - 1 - Math.floor(dr.dest[1]); for (const [ax, ay] of [[tx, ty], [tx, ty + 1], [tx, ty - 1]]) { if (!seen.has(key(ax, ay))) { seen.add(key(ax, ay)); q.push([ax, ay]); } } }
    if (at(x, y) === 'J' || at(x, y + 1) === 'J') { for (let yy = y - 1; yy >= 0 && pass(x, yy); yy--) { if (!seen.has(key(x, yy))) { seen.add(key(x, yy)); q.push([x, yy]); } } }
    for (let dx = -24; dx <= 24; dx++) for (let dy = -5; dy <= H; dy++) {
      const tx = x + dx, ty = y + dy; if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
      if (dy === -5 && !(lv.cells && at(tx, ty + 1) === '=')) continue; // NES ledge snap: one-way ledges are reachable one tile higher in the original zones
      if (!standable(tx, ty) && at(tx, ty) !== 'E' && at(tx, ty) !== 'K') continue;
      const below = at(x, y + 1); const maxDx = below === 'U' ? 24 : below === '_' ? 8 : below === 'Y' ? 6 : 0;
      if (dy < 0 && Math.abs(dx) > Math.max(maxDx, 1.5 + (4 + dy) * 1.5)) continue; // jump arc limits
      if (dy >= 0 && Math.abs(dx) > Math.max(maxDx, 5 + dy)) continue;
      if (seen.has(key(tx, ty))) continue;
      if (!clear(x, y, tx, ty, dy === -5 ? 5 : 4)) continue;
      seen.add(key(tx, ty)); q.push([tx, ty]);
    }
    // also treat '=' platform cells themselves as standable targets when character is standing on them from above (already covered)
  }
  const reach = (p) => p && (seen.has(key(p[0], p[1])) || seen.has(key(p[0], p[1] + 1)) || seen.has(key(p[0] - 1, p[1])) || seen.has(key(p[0] + 1, p[1])));
  if (!reach(E)) issues.push(`E unreachable at ${E}`);
  if (K && !reach(K)) issues.push(`K unreachable at ${K}`);
  for (const g of gears) if (!reach(g) && !seen.has(key(g[0], g[1] - 1)) && !seen.has(key(g[0], g[1] + 1))) issues.push(`gear unreachable at ${g}`);
  issues.push(`size ${W}x${H}, reachable cells ${seen.size}`);
  if (process.argv[2] === lv.id) for (let y = 0; y < H; y++) { let o = ''; for (let x = 0; x < W; x++) o += seen.has(key(x, y)) ? 'o' : rows[y][x]; console.log(o.slice(0, 140)); }
  return issues;
}
for (const [name, acts] of [['ORIG', ORIG], ['ACT2', ACT2]]) {
  for (const id in acts) { const lv = acts[id]; console.log(name, id, lv.name, '->', validate(lv).join('; ')); }
}
