// Recipe-based level generator: builds 18-row ASCII levels from ordered chunks with guaranteed-climbable heights.
// A level recipe lists chunks; the generator tracks the ground elevation so every climb is ≤ 2–3 tiles (one jump).
import { H } from './levels_lib.js';

const FLOOR_TOP = H - 2; // rows 16,17 are the base floor; elevation e means ground top row = FLOOR_TOP - e
function rng(seed) { let s = (seed * 1103515245 + 12345) >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; }

class Canvas {
  constructor(width) { this.w = width; this.g = []; for (let y = 0; y < H; y++) this.g.push(new Array(width).fill('.')); }
  set(x, y, c) { if (x >= 0 && x < this.w && y >= 0 && y < H) this.g[y][x] = c; }
  get(x, y) { return (x >= 0 && x < this.w && y >= 0 && y < H) ? this.g[y][x] : '#'; }
  fillFloor(x0, x1, elev, ch = '#', alt = '%') { for (let x = x0; x < x1; x++) { const top = FLOOR_TOP - elev; for (let y = top; y < H; y++) this.set(x, y, y >= FLOOR_TOP ? alt : ch); } }
  water(x0, x1) { for (let x = x0; x < x1; x++) for (let y = FLOOR_TOP; y < H; y++) this.set(x, y, '~'); }
  rows() { return this.g.map(r => r.join('')); }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// ------------------------------------------------------------ chunk builders. Each: (cv, x, state, rnd, params) → newX
const C = {};
C.start = (cv, x, st, r) => { const top = FLOOR_TOP - st.e; cv.fillFloor(x, x + 8, st.e, st.solid, st.alt); cv.set(x + 2, top - 1, 'S'); cv.set(x + 6, top - 1, 'X'); return x + 8; };
C.flat = (cv, x, st, r, p = {}) => {
  const len = p.len || 10; const e = st.e; const top = FLOOR_TOP - e; cv.fillFloor(x, x + len, e, st.solid, st.alt);
  if (p.items !== false) {
    if (r() < 0.7 && len >= 8) { const px = x + 2 + Math.floor(r() * (len - 7)); const h = 2 + Math.floor(r() * 2); const pl = 3 + Math.floor(r() * 3); for (let i = 0; i < pl; i++) cv.set(px + i, top - h, '='); for (let i = 0; i < pl; i += 2) cv.set(px + i, top - h - 1, 'f'); if (r() < 0.3) cv.set(px + 1, top - h - 1, '*'); }
    else { for (let i = 2; i < len - 2; i += 2) if (r() < 0.5) cv.set(x + i, top - 1, 'f'); }
  }
  if (p.crates !== false && len >= 6) { const n = 1 + Math.floor(r() * 2); for (let i = 0; i < n; i++) { const cx = x + 1 + Math.floor(r() * (len - 2)); if (cv.get(cx, top - 1) === '.') cv.set(cx, top - 1, r() < 0.15 ? st.heavy : 'X'); } }
  if (p.enemies !== false && st.ground.length) { const n = Math.min(3, Math.floor(len / 6) + (r() < 0.5 ? 1 : 0)); for (let i = 0; i < n; i++) { const ex = x + 3 + Math.floor(r() * (len - 5)); if (cv.get(ex, top - 1) === '.') cv.set(ex, top - 1, pick(r, st.ground)); } }
  if (p.air && st.air.length && r() < 0.7) cv.set(x + Math.floor(len / 2), top - 4 - Math.floor(r() * 2), pick(r, st.air));
  return x + len;
};
C.gap = (cv, x, st, r, p = {}) => {
  const w = p.w || 3 + Math.floor(r() * 2); const top = FLOOR_TOP - st.e;
  if (st.water) cv.water(x, x + w);
  if (w > 4) { const mid = x + Math.floor(w / 2); cv.set(mid - 1, top - 1, '='); cv.set(mid, top - 1, '='); if (r() < 0.5) cv.set(mid, top - 2, '*'); }
  return x + w;
};
C.stepsUp = (cv, x, st, r, p = {}) => {
  let n = p.n || 2; let cx = x; cv.fillFloor(cx, cx + 2, st.e, st.solid, st.alt); cx += 2; // landing pad
  while (n > 0) { const h = Math.min(2, n); st.e += h; cv.fillFloor(cx, cx + 3, st.e, st.solid, st.alt); if (r() < 0.4) cv.set(cx + 1, FLOOR_TOP - st.e - 1, 'f'); cx += 3; n -= h; }
  return cx;
};
C.stepsDown = (cv, x, st, r, p = {}) => {
  let n = p.n ?? st.e; let cx = x;
  while (n > 0 && st.e > 0) { const h = Math.min(3, n, st.e); st.e -= h; cv.fillFloor(cx, cx + 2, st.e, st.solid, st.alt); cx += 2; n -= h; }
  return cx;
};
C.descent = (cv, x, st, r) => { let cx = x; while (st.e > 0) { const h = Math.min(3, st.e); st.e -= h; cv.fillFloor(cx, cx + 3, st.e, st.solid, st.alt); if (r() < 0.5) cv.set(cx + 1, FLOOR_TOP - st.e - 1, 'f'); cx += 3; } return cx; };
C.climb = (cv, x, st, r, p = {}) => {
  // staircase of floating 2-wide platforms rising 2 rows each, ending on a ledge at the new height
  const rise = Math.min(p.rise || 6, FLOOR_TOP - 5 - st.e); const e0 = st.e; const top0 = FLOOR_TOP - e0; const n = Math.ceil(rise / 2);
  cv.fillFloor(x, x + 2, e0, st.solid, st.alt);
  for (let k = 0; k < n; k++) { const px = x + 2 + k * 2; const py = top0 - 2 * (k + 1); cv.set(px, py, '='); cv.set(px + 1, py, '='); if (r() < 0.6) cv.set(px + (r() < 0.5 ? 0 : 1), py - 1, r() < 0.25 ? '*' : 'f'); }
  if (st.air.length && r() < 0.7) cv.set(x + 2, top0 - 5, pick(r, st.air));
  st.e = e0 + 2 * n; const lx = x + 2 + n * 2; cv.fillFloor(lx, lx + 4, st.e, st.solid, st.alt); cv.set(lx + 1, FLOOR_TOP - st.e - 1, p.prize || '*');
  return lx + 4;
};
C.tower = (cv, x, st, r, p = {}) => {
  // vertical shaft with alternating 4-wide ledges every 2 rows; exit onto a ledge at the top-right
  const rise = Math.min(p.rise || 8, FLOOR_TOP - 5 - st.e); const e0 = st.e; const top0 = FLOOR_TOP - e0; const w = 9;
  cv.fillFloor(x, x + w, e0, st.solid, st.alt);
  let y = top0 - 2, side = 0, k = 0;
  while (top0 - y <= rise) { const lx = side ? x + 5 : x + 1; for (let i = 0; i < 4; i++) cv.set(lx + i, y, '='); if (r() < 0.6) cv.set(lx + 1 + Math.floor(r() * 2), y - 1, r() < 0.3 ? '*' : 'f'); if (st.air.length && k % 2 === 1 && r() < 0.5) cv.set(side ? x + 2 : x + 7, y - 1, pick(r, st.air)); side ^= 1; y -= 2; k++; }
  st.e = e0 + rise; cv.fillFloor(x + w, x + w + 3, st.e, st.solid, st.alt); cv.set(x + w + 1, FLOOR_TOP - st.e - 1, p.prize || 'a');
  for (let yy = 0; yy < top0; yy++) { if (cv.get(x + 4, yy) === '.') cv.set(x + 4, yy, '|'); }
  return x + w + 3;
};
C.hazard = (cv, x, st, r, p = {}) => {
  // hazard strip (spikes or water) crossed by platforms, cranes, moving platforms or a boat
  const len = p.len || 10; const e = st.e; const top = FLOOR_TOP - e; const hz = p.kind || (st.water ? '~' : '^');
  for (let gx = x; gx < x + len; gx++) { if (hz === '^') { cv.fillFloor(gx, gx + 1, Math.max(0, e - 1), st.solid, st.alt); cv.set(gx, FLOOR_TOP - Math.max(0, e - 1) - 1, '^'); } else cv.water(gx, gx + 1); }
  if (p.moving) { for (let gx = x + 2; gx < x + len - 2; gx += 6) cv.set(gx, top - 1, '_'); }
  else if (p.cranes) { for (let gx = x + 2; gx < x + len - 1; gx += 4) cv.set(gx, top - 1, 'Y'); }
  else if (p.boat) { cv.set(x + 1, top - 1, 'U'); }
  else { for (let gx = x + 2; gx < x + len - 1; gx += 3) { cv.set(gx, top - 1, '='); if (r() < 0.4) cv.set(gx, top - 2, 'f'); } }
  if (st.air.length && r() < 0.6) cv.set(x + Math.floor(len / 2), top - 4, pick(r, st.air));
  return x + len;
};
C.wallPuzzle = (cv, x, st, r) => {
  // 3-tall wall (a tight jump; a crate placed in front makes it easy), star on top, ledge behind
  const e = st.e; const top = FLOOR_TOP - e; cv.fillFloor(x, x + 10, e, st.solid, st.alt);
  cv.set(x + 2, top - 1, 'X'); cv.set(x + 4, top - 1, 'M'); for (let y = top - 3; y < top; y++) cv.set(x + 7, y, st.solid); cv.set(x + 7, top - 4, '*');
  cv.set(x + 9, top - 2, '='); return x + 10;
};
C.breakWall = (cv, x, st, r, p = {}) => {
  // breakable wall (Monty / cheese) guarding treasure; the wall is 3 tall so it can also be jumped
  const e = st.e; const top = FLOOR_TOP - e; cv.fillFloor(x, x + 12, e, st.solid, st.alt);
  cv.set(x + 1, top - 1, 'C'); for (let y = top - 3; y < top; y++) cv.set(x + 5, y, 'W'); cv.set(x + 7, top - 1, p.prize || 'T'); cv.set(x + 9, top - 1, 'h');
  return x + 12;
};
C.gearRoom = (cv, x, st, r) => {
  const e = st.e; const top = FLOOR_TOP - e; cv.fillFloor(x, x + 8, e, st.solid, st.alt);
  cv.set(x + 1, top - 2, '='); cv.set(x + 2, top - 2, '='); cv.set(x + 4, top - 4, '='); cv.set(x + 5, top - 4, '='); cv.set(x + 4, top - 5, 'g');
  if (st.ground.length) cv.set(x + 6, top - 1, pick(r, st.ground));
  return x + 8;
};
C.fallers = (cv, x, st, r, p = {}) => {
  const len = p.len || 14; const e = st.e; const top = FLOOR_TOP - e; cv.fillFloor(x, x + len, e, st.solid, st.alt);
  for (let gx = x + 3; gx < x + len - 2; gx += 5) cv.set(gx, 1, 'v'); cv.set(x + 2, top - 1, '&'); cv.set(x + 5, top - 1, 'X'); cv.set(x + 9, top - 3, '='); cv.set(x + 10, top - 3, '='); cv.set(x + 10, top - 4, '*');
  return x + len;
};
C.steam = (cv, x, st, r, p = {}) => {
  const len = p.len || 12; const e = st.e; const top = FLOOR_TOP - e; cv.fillFloor(x, x + len, e, st.solid, st.alt);
  for (let gx = x + 2; gx < x + len - 1; gx += 4) cv.set(gx, top - 1, 'P'); cv.set(x + 4, top - 3, '='); cv.set(x + 5, top - 3, '='); cv.set(x + 5, top - 4, 'f');
  return x + len;
};
C.fans = (cv, x, st, r, p = {}) => {
  const len = p.len || 14; const e = st.e; const top = FLOOR_TOP - e; cv.fillFloor(x, x + len, e, st.solid, st.alt);
  for (let gx = x + 3; gx < x + len - 2; gx += 5) cv.set(gx, top - 5, 'F');
  cv.set(x + 2, top - 1, 'M'); cv.set(x + 4, top - 1, 'M'); for (let y = top - 3; y < top; y++) cv.set(x + 8, y, st.solid); cv.set(x + 8, top - 4, '*'); if (st.ground.length) cv.set(x + 11, top - 1, st.ground[0]);
  return x + len;
};
C.arena = (cv, x, st, r, p = {}) => {
  // boss arena: ceiling, closed right wall, open entrance on the left, exit behind the boss
  x = C.stepsDown(cv, x, st, r, { n: st.e }); const len = p.len || 30; const top = FLOOR_TOP;
  cv.fillFloor(x, x + len, 0, st.solid, st.alt);
  for (let y = 0; y < top - 4; y++) cv.set(x, y, '#'); for (let y = 0; y < top; y++) cv.set(x + len - 1, y, '#'); for (let gx = x; gx < x + len; gx++) cv.set(gx, 0, '#');
  cv.set(x + 10, top - 1, 'K'); cv.set(x + len - 3, top - 1, 'E');
  if (p.water) { cv.water(x + 4, x + len - 6); for (let gx = x + 5; gx < x + len - 7; gx += 3) { cv.set(gx, top - 1, '='); cv.set(gx + 1, top - 1, '='); } cv.set(x + 10, top - 1, '='); cv.set(x + 12, top - 2, 'K'); }
  return x + len;
};
C.exit = (cv, x, st, r) => { const top = FLOOR_TOP - st.e; cv.fillFloor(x, x + 8, st.e, st.solid, st.alt); cv.set(x + 5, top - 1, 'E'); cv.set(x + 2, top - 1, 'T'); return x + 8; };

export function generate(recipe) {
  const r = rng(recipe.seed || 1); const chunks = recipe.chunks;
  const cv = new Canvas(400);
  const st = { e: 0, solid: recipe.solid || '#', alt: recipe.alt || '%', ground: recipe.ground || [], air: recipe.air || [], water: !!recipe.water, heavy: recipe.heavy || 'A' };
  let x = 0;
  for (const c of chunks) { const fn = C[c.type]; if (!fn) throw new Error('unknown chunk ' + c.type); x = fn(cv, x, st, r, c); }
  const used = x + 1; const rows = cv.rows().map(rw => rw.slice(0, used - 1) + '#');
  return { ...recipe, rows };
}
