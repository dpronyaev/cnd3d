// Zone visual themes: procedural canvas textures, materials, lighting and 3D background props.
import * as THREE from 'three';

const texCache = new Map();
function canvasTexture(key, size, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  draw(g, size);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4; texCache.set(key, tex); return tex;
}
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }
function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

export const TEX = {
  planks(base, dark) { return canvasTexture('planks' + base + dark, 128, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); const r = rnd(1); for (let i = 0; i < 4; i++) { g.fillStyle = shade(base, 0.85 + r() * 0.3); g.fillRect(0, i * 32, s, 30); g.fillStyle = dark; g.fillRect(0, i * 32 + 30, s, 2); for (let k = 0; k < 6; k++) { g.fillStyle = shade(base, 0.7); g.fillRect(r() * s, i * 32 + 4 + r() * 22, 10 + r() * 30, 1); } } }); },
  bricks(base, mortar) { return canvasTexture('bricks' + base + mortar, 128, (g, s) => { g.fillStyle = mortar; g.fillRect(0, 0, s, s); const r = rnd(2); for (let row = 0; row < 8; row++) { const off = row % 2 ? 16 : 0; for (let col = -1; col < 5; col++) { g.fillStyle = shade(base, 0.85 + r() * 0.3); g.fillRect(col * 32 + off + 1, row * 16 + 1, 30, 14); } } }); },
  stone(base) { return canvasTexture('stone' + base, 128, (g, s) => { g.fillStyle = shade(base, 0.6); g.fillRect(0, 0, s, s); const r = rnd(3); for (let i = 0; i < 40; i++) { const w = 18 + r() * 30, h = 12 + r() * 18; g.fillStyle = shade(base, 0.8 + r() * 0.4); g.beginPath(); g.ellipse(r() * s, r() * s, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill(); } }); },
  metal(base) { return canvasTexture('metal' + base, 128, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); const r = rnd(4); for (let i = 0; i < 300; i++) { g.fillStyle = shade(base, 0.9 + r() * 0.2); g.fillRect(r() * s, r() * s, 2, 2); } g.strokeStyle = shade(base, 0.6); g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4); g.fillStyle = shade(base, 0.5); for (const [x, y] of [[10, 10], [s - 12, 10], [10, s - 12], [s - 12, s - 12]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }); },
  tiles(a, b) { return canvasTexture('tiles' + a + b, 128, (g, s) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64); g.strokeRect(64, 0, 64, 64); g.strokeRect(0, 64, 64, 64); }); },
  books(seed) { return canvasTexture('books' + seed, 128, (g, s) => { const r = rnd(seed); const cols = ['#c8322b', '#2b58c8', '#e8c030', '#2a9a4a', '#8a3cb0', '#e07820']; let x = 0; g.fillStyle = '#3a2412'; g.fillRect(0, 0, s, s); while (x < s) { const w = 10 + r() * 14; const h = 90 + r() * 36; g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, s - h, w - 2, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 2, s - h + 8, w - 6, 3); g.fillRect(x + 2, s - 14, w - 6, 3); x += w; } }); },
  leaves(base) { return canvasTexture('leaves' + base, 128, (g, s) => { g.fillStyle = shade(base, 0.6); g.fillRect(0, 0, s, s); const r = rnd(6); for (let i = 0; i < 90; i++) { g.fillStyle = shade(base, 0.7 + r() * 0.6); g.beginPath(); g.ellipse(r() * s, r() * s, 9, 5, r() * 3, 0, 7); g.fill(); } }); },
  grass(base) { return canvasTexture('grass' + base, 128, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); const r = rnd(7); for (let i = 0; i < 400; i++) { g.fillStyle = shade(base, 0.7 + r() * 0.6); g.fillRect(r() * s, r() * s, 2, 4 + r() * 6); } }); },
  wallpaper(a, b) { return canvasTexture('wp' + a + b, 128, (g, s) => { g.fillStyle = a; g.fillRect(0, 0, s, s); g.strokeStyle = b; g.lineWidth = 3; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(i * 32 + 16, j * 32); g.lineTo(i * 32 + 32, j * 32 + 16); g.lineTo(i * 32 + 16, j * 32 + 32); g.lineTo(i * 32, j * 32 + 16); g.closePath(); g.stroke(); } }); },
  carpet(a, b) { return canvasTexture('carpet' + a + b, 128, (g, s) => { g.fillStyle = a; g.fillRect(0, 0, s, s); const r = rnd(8); g.fillStyle = b; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * s, r() * s, 3 + r() * 5, 0, 7); g.fill(); } }); },
  dirt(base) { return canvasTexture('dirt' + base, 128, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); const r = rnd(9); for (let i = 0; i < 200; i++) { g.fillStyle = shade(base, 0.6 + r() * 0.8); g.beginPath(); g.arc(r() * s, r() * s, 2 + r() * 4, 0, 7); g.fill(); } }); },
  crate(base) { return canvasTexture('crate2' + base, 64, (g, s) => { // NES crate: orange box, dark rim, three horizontal slats
    g.fillStyle = '#3a1c06'; g.fillRect(0, 0, s, s); g.fillStyle = '#f0a040'; g.fillRect(3, 3, s - 6, s - 6); g.fillStyle = '#b86418'; g.fillRect(9, 9, s - 18, s - 18);
    for (let i = 0; i < 3; i++) { const y = 12 + i * 14; g.fillStyle = '#f0a040'; g.fillRect(11, y, s - 22, 9); g.fillStyle = '#5a2a08'; g.fillRect(11, y + 9, s - 22, 3); } }); },
  metalCrate() { return canvasTexture('mcrate', 64, (g, s) => { g.fillStyle = '#9aa3ad'; g.fillRect(0, 0, s, s); g.fillStyle = '#6b737c'; g.fillRect(0, 0, s, 8); g.fillRect(0, s - 8, s, 8); g.fillRect(0, 0, 8, s); g.fillRect(s - 8, 0, 8, s); g.fillStyle = '#d9e0e6'; g.fillRect(14, 14, s - 28, s - 28); g.fillStyle = '#4a5058'; for (const [x, y] of [[4, 4], [s - 8, 4], [4, s - 8], [s - 8, s - 8]]) g.fillRect(x, y, 4, 4); }); },
  water(a) { return canvasTexture('water' + a, 128, (g, s) => { g.fillStyle = a; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 22 + 8); for (let x = 0; x <= s; x += 8) g.lineTo(x, i * 22 + 8 + Math.sin(x / 10 + i) * 4); g.stroke(); } }); },
  slot() { return canvasTexture('slot', 128, (g, s) => { g.fillStyle = '#e8c030'; g.fillRect(0, 0, s, s); g.fillStyle = '#3a1810'; g.fillRect(12, 16, s - 24, 44); g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { g.fillRect(18 + i * 34, 22, 26, 32); g.fillStyle = ['#d02020', '#20a040', '#2040d0'][i]; g.beginPath(); g.arc(31 + i * 34, 38, 9, 0, 7); g.fill(); g.fillStyle = '#fff'; } g.fillStyle = '#c03030'; g.fillRect(20, 76, s - 40, 30); g.fillStyle = '#ffe080'; g.fillRect(28, 84, s - 56, 14); }); },
  curtain(a) { return canvasTexture('curtain' + a, 128, (g, s) => { for (let x = 0; x < s; x += 16) { g.fillStyle = shade(a, 0.75 + 0.35 * Math.abs(Math.sin(x / 16))); g.fillRect(x, 0, 16, s); } }); },
  checker(a, b) { return canvasTexture('chk' + a + b, 64, (g, s) => { g.fillStyle = a; g.fillRect(0, 0, s, s); g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }); },
  hazard() { return canvasTexture('hazard', 64, (g, s) => { g.fillStyle = '#e8c030'; g.fillRect(0, 0, s, s); g.fillStyle = '#222'; for (let i = -1; i < 5; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 8, 0); g.lineTo(i * 16 + 8 + s, s); g.lineTo(i * 16 + s, s); g.fill(); } }); },
  circuit() { return canvasTexture('circuit', 128, (g, s) => { g.fillStyle = '#1c3a2a'; g.fillRect(0, 0, s, s); g.strokeStyle = '#4fd38a'; g.lineWidth = 3; const r = rnd(11); for (let i = 0; i < 14; i++) { g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (r() < 0.5) x = r() * s; else y = r() * s; g.lineTo(x, y); } g.stroke(); g.fillStyle = '#9fe8c0'; g.fillRect(x - 3, y - 3, 6, 6); } }); },
  glass(a) { return canvasTexture('glass' + a, 64, (g, s) => { g.fillStyle = a; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(6, 6, 10, s - 12); g.fillRect(20, 6, 4, s - 12); }); },
};

// theme definitions ---------------------------------------------------------------------------
// Each: sky gradient, fog, materials for '#' (solid), '%' (alt), '=' (platform), decorative props kind, lighting.
export const THEMES = {
  street:   { sky: ['#3f7fe0', '#9fd0ff'], fog: '#9fd0ff', solid: ['planks', '#7a4a22', '#3a1e0a'], alt: ['stone', '#8c8c88'], plat: ['metal', '#d8d8d0'], props: 'street', ambient: 0.55, sun: 0.9, decoPillar: '#dcdcd4' },
  lab:      { sky: ['#1a1030', '#4a3880'], fog: '#2a1c48', solid: ['metal', '#6f7a90'], alt: ['tiles', '#3a4260', '#2c3248'], plat: ['metal', '#9ab0d0'], props: 'lab', ambient: 0.6, sun: 0.8, decoPillar: '#6aa0ff' },
  tree:     { sky: ['#1838a8', '#4d8ff0'], fog: '#3a70d0', solid: ['planks', '#b86a2a', '#5a300c'], alt: ['dirt', '#6b3f1e'], plat: ['planks', '#c8803a', '#5a300c'], props: 'tree', ambient: 0.55, sun: 1.0, decoPillar: '#a85a22', leaf: '#2f9a3a' },
  kitchen:  { sky: ['#3a2210', '#6a4020'], fog: '#5a3818', solid: ['planks', '#e8a030', '#8a5010'], alt: ['tiles', '#f0f0e0', '#c8c8b8'], plat: ['metal', '#f0eee0'], props: 'kitchen', ambient: 0.6, sun: 0.8, decoPillar: '#f0eee0' },
  library:  { sky: ['#2a1a0c', '#4a3018'], fog: '#3a2410', solid: ['planks', '#8a5a2a', '#3a2008'], alt: ['books', 5], plat: ['planks', '#a8702e', '#3a2008'], props: 'library', ambient: 0.55, sun: 0.8, decoPillar: '#6a4a2a' },
  toystore: { sky: ['#4a2a1a', '#8a5030'], fog: '#5a3020', solid: ['wallpaper', '#5a3a28', '#8a6040'], alt: ['tiles', '#f0e8d8', '#d8d0c0'], plat: ['metal', '#f8f0e0'], props: 'toystore', ambient: 0.6, sun: 0.8, decoPillar: '#f8f0e0' },
  garden:   { sky: ['#2050d0', '#78b8ff'], fog: '#78b8ff', solid: ['planks', '#9a5a28', '#4a2a0c'], alt: ['dirt', '#7a4a20'], plat: ['planks', '#b07030', '#4a2a0c'], props: 'garden', ambient: 0.6, sun: 1.0, decoPillar: '#8a5020', leaf: '#3aa845' },
  machine:  { sky: ['#404040', '#8a8a8a'], fog: '#707070', solid: ['metal', '#9a9a9a'], alt: ['metal', '#f0e8d8'], plat: ['metal', '#d8d8d0'], props: 'machine', ambient: 0.5, sun: 0.8, decoPillar: '#2e8a3a' },
  casino:   { sky: ['#3a0a0a', '#6a1818'], fog: '#4a1010', solid: ['curtain', '#8a1a1a'], alt: ['carpet', '#e07060', '#f0a090'], plat: ['metal', '#f0e8d0'], props: 'casino', ambient: 0.5, sun: 0.8, decoPillar: '#e8d8c0' },
  sewer:    { sky: ['#0a1040', '#203088'], fog: '#182868', solid: ['bricks', '#2a3aa0', '#101848'], alt: ['grass', '#2a8a30'], plat: ['metal', '#f0f0f0'], props: 'sewer', ambient: 0.45, sun: 0.7, decoPillar: '#e8d070' },
  office:   { sky: ['#505860', '#8a9098'], fog: '#707880', solid: ['planks', '#a86a30', '#4a2a0c'], alt: ['metal', '#7a8088'], plat: ['planks', '#c08040', '#4a2a0c'], props: 'office', ambient: 0.55, sun: 0.8, decoPillar: '#4080e0' },
  factory:  { sky: ['#2a1414', '#6a3030'], fog: '#4a2020', solid: ['metal', '#8a7878'], alt: ['hazard'], plat: ['metal', '#b0a0a0'], props: 'factory', ambient: 0.65, sun: 0.9, decoPillar: '#c04040' },
  // --- Act II themes ---
  hq:        { sky: ['#2a7a48', '#a8e0a0'], fog: '#6ab070', solid: ['planks', '#9a6a3a', '#4a2a0c'], alt: ['leaves', '#2f8a3a'], plat: ['planks', '#b8803a', '#4a2a0c'], props: 'hq', ambient: 0.6, sun: 0.9, decoPillar: '#7a4a22', leaf: '#2f9a3a' },
  nimlab:    { sky: ['#101828', '#283858'], fog: '#1c2840', solid: ['stone', '#6a6a78'], alt: ['circuit'], plat: ['metal', '#a0b0c8'], props: 'nimlab', ambient: 0.45, sun: 0.7, decoPillar: '#80e0ff' },
  pier:      { sky: ['#e08040', '#f8d090'], fog: '#f0c080', solid: ['planks', '#6a4a30', '#2a1808'], alt: ['water', '#2a6ab0'], plat: ['planks', '#8a6040', '#2a1808'], props: 'pier', ambient: 0.6, sun: 0.9, decoPillar: '#4a3020' },
  laundry:   { sky: ['#204040', '#60a0a0'], fog: '#50909a', solid: ['tiles', '#e8f0f0', '#b0d0d0'], alt: ['metal', '#d0d8e0'], plat: ['metal', '#f0f0f0'], props: 'laundry', ambient: 0.65, sun: 0.8, decoPillar: '#d8e8f0' },
  speakeasy: { sky: ['#120808', '#302018'], fog: '#201410', solid: ['bricks', '#7a3a2a', '#2a1008'], alt: ['planks', '#5a3a20', '#1a0c04'], plat: ['planks', '#6a4a28', '#1a0c04'], props: 'speakeasy', ambient: 0.45, sun: 0.7, decoPillar: '#d0a040' },
  museum:    { sky: ['#302820', '#706050'], fog: '#504030', solid: ['stone', '#c8c0b0'], alt: ['tiles', '#e8e0d0', '#c0b8a8'], plat: ['stone', '#e0d8c8'], props: 'museum', ambient: 0.55, sun: 0.85, decoPillar: '#e8e0d0' },
  zoo:       { sky: ['#2070d0', '#90d0ff'], fog: '#90d0ff', solid: ['stone', '#8a7a60'], alt: ['grass', '#3a9a3a'], plat: ['metal', '#505050'], props: 'zoo', ambient: 0.6, sun: 1.0, decoPillar: '#505050', leaf: '#3aa845' },
  witch:     { sky: ['#0c0818', '#301848'], fog: '#201030', solid: ['planks', '#4a3048', '#1a0820'], alt: ['stone', '#5a4a6a'], plat: ['planks', '#5a3858', '#1a0820'], props: 'witch', ambient: 0.4, sun: 0.6, decoPillar: '#8a60a0' },
  theatre:   { sky: ['#180810', '#401830'], fog: '#2a1020', solid: ['planks', '#5a2a30', '#200810'], alt: ['curtain', '#a02030'], plat: ['planks', '#7a3a40', '#200810'], props: 'theatre', ambient: 0.45, sun: 0.8, decoPillar: '#e0c060' },
  airship:   { sky: ['#4060c0', '#c0d8ff'], fog: '#a0c0f0', solid: ['metal', '#8a7a68'], alt: ['planks', '#a07040', '#4a2a0c'], plat: ['metal', '#c0b0a0'], props: 'airship', ambient: 0.65, sun: 1.0, decoPillar: '#d0c0a0' },
  skyscraper:{ sky: ['#101830', '#304878'], fog: '#203050', solid: ['glass', '#4a6a9a'], alt: ['metal', '#6a7080'], plat: ['metal', '#c0c8d0'], props: 'skyscraper', ambient: 0.5, sun: 0.8, decoPillar: '#80a0d0' },
};

function texFromSpec(spec) {
  const [kind, ...args] = spec; return TEX[kind](...args);
}
export function makeThemeMaterials(theme) {
  const mk = (spec, opts = {}) => new THREE.MeshStandardMaterial({ map: texFromSpec(spec), roughness: 0.85, metalness: kind(spec) === 'metal' ? 0.35 : 0.05, ...opts });
  const kind = (s) => s[0];
  const mats = {
    solid: mk(theme.solid), alt: mk(theme.alt), plat: mk(theme.plat),
    pillar: new THREE.MeshStandardMaterial({ color: theme.decoPillar, roughness: 0.6, metalness: 0.2 }),
    leaf: new THREE.MeshStandardMaterial({ map: TEX.leaves(theme.leaf || '#2f9a3a'), roughness: 0.9 }),
    water: new THREE.MeshStandardMaterial({ map: TEX.water('#2a6ab0'), transparent: true, opacity: 0.8, roughness: 0.2 }),
    spikes: new THREE.MeshStandardMaterial({ color: '#c0c8d0', roughness: 0.4, metalness: 0.6 }),
    wall: new THREE.MeshStandardMaterial({ map: TEX.bricks('#9a7a5a', '#4a3a2a'), roughness: 0.9 }),
  };
  return mats;
}

// ---------------------------------------------------------------------------------------------
// Background props: deep 3D layers behind the play plane.
function M(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }); }
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function cyl(rt, rb, h, mat, x, y, z, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return m; }
function sph(r, mat, x, y, z, seg = 10) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat); m.position.set(x, y, z); return m; }
function cone(r, h, mat, x, y, z) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), mat); m.position.set(x, y, z); return m; }

function treeProp(x, groundY, z, scale, leafColor, trunkColor) {
  const g = new THREE.Group(); const trunk = M(trunkColor); const leaf = M(leafColor);
  g.add(cyl(0.35 * scale, 0.5 * scale, 3 * scale, trunk, 0, 1.5 * scale, 0));
  g.add(sph(1.6 * scale, leaf, 0, 3.6 * scale, 0)); g.add(sph(1.2 * scale, leaf, 1.1 * scale, 3.0 * scale, 0.2)); g.add(sph(1.2 * scale, leaf, -1.1 * scale, 3.1 * scale, -0.2)); g.add(sph(1.0 * scale, leaf, 0, 4.8 * scale, 0));
  g.position.set(x, groundY, z); return g;
}
function cloud(x, y, z, s) { const g = new THREE.Group(); const m = M('#ffffff', { roughness: 1 }); g.add(sph(1.0 * s, m, 0, 0, 0)); g.add(sph(0.8 * s, m, 1.0 * s, 0.1 * s, 0)); g.add(sph(0.7 * s, m, -1.0 * s, 0, 0)); g.add(sph(0.6 * s, m, 0.4 * s, 0.6 * s, 0)); g.position.set(x, y, z); return g; }
function fence(x, y, z, len, color) { const g = new THREE.Group(); const m = M(color); for (let i = 0; i <= len; i += 1.5) { const p = box(0.3, 2.4, 0.3, m, i, 1.2, 0); g.add(p); const tip = cone(0.22, 0.4, m, i, 2.6, 0); g.add(tip); } g.add(box(len, 0.25, 0.2, m, len / 2, 0.8, 0.05)); g.add(box(len, 0.25, 0.2, m, len / 2, 1.9, 0.05)); g.position.set(x, y, z); return g; }
function building(x, y, z, w, h, color, winColor) { const g = new THREE.Group(); g.add(box(w, h, 4, M(color), 0, h / 2, 0)); const wm = M(winColor, { emissive: winColor, emissiveIntensity: 0.4 }); for (let i = 0.8; i < w - 0.8; i += 1.4) for (let j = 1; j < h - 0.8; j += 1.6) g.add(box(0.7, 0.9, 0.1, wm, -w / 2 + i + 0.4, j + 0.5, 2.05)); g.position.set(x, y, z); return g; }
function shelfUnit(x, y, z, w, h, color) { const g = new THREE.Group(); const m = M(color); g.add(box(0.3, h, 1, m, -w / 2, h / 2, 0)); g.add(box(0.3, h, 1, m, w / 2, h / 2, 0)); for (let j = 0; j <= h; j += 2) g.add(box(w, 0.2, 1, m, 0, j, 0)); g.position.set(x, y, z); return g; }
function pipe(x1, y1, x2, y2, z, r, color) { const dx = x2 - x1, dy = y2 - y1; const len = Math.hypot(dx, dy); const m = cyl(r, r, len, M(color, { metalness: 0.5, roughness: 0.4 }), (x1 + x2) / 2, (y1 + y2) / 2, z); m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2; return m; }
function lamp(x, y, z, color) { const g = new THREE.Group(); g.add(cyl(0.08, 0.1, 4, M('#333'), 0, 2, 0)); g.add(sph(0.35, M(color, { emissive: color, emissiveIntensity: 1 }), 0, 4.1, 0)); const l = new THREE.PointLight(color, 1.2, 10); l.position.set(0, 4.1, 0.5); g.add(l); g.position.set(x, y, z); return g; }
function gift(x, y, z, s, color, ribbon) { const g = new THREE.Group(); g.add(box(s, s, s, M(color), 0, s / 2, 0)); const rm = M(ribbon); g.add(box(s * 0.18, s * 1.02, s * 1.02, rm, 0, s / 2, 0)); g.add(box(s * 1.02, s * 1.02, s * 0.18, rm, 0, s / 2, 0)); g.add(sph(s * 0.18, rm, 0, s * 1.05, 0)); g.position.set(x, y, z); return g; }
function mug(x, y, z, color) { const g = new THREE.Group(); const m = M(color, { roughness: 0.3 }); g.add(cyl(0.9, 0.8, 1.8, m, 0, 0.9, 0, 14)); const h = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 14), m); h.position.set(1.0, 0.9, 0); g.add(h); g.position.set(x, y, z); return g; }
function slotMachine(x, y, z) { const g = new THREE.Group(); g.add(box(2.4, 3.6, 1.6, new THREE.MeshStandardMaterial({ map: TEX.slot(), roughness: 0.5 }), 0, 1.8, 0)); g.add(cyl(0.1, 0.1, 1.2, M('#ddd', { metalness: 0.7, roughness: 0.3 }), 1.4, 2.6, 0)); g.add(sph(0.22, M('#e03030'), 1.4, 3.2, 0)); g.position.set(x, y, z); return g; }
function bookRow(x, y, z, len) { const g = new THREE.Group(); const cols = ['#c8322b', '#2b58c8', '#e8c030', '#2a9a4a', '#8a3cb0', '#e07820']; let cx = 0; let i = 0; while (cx < len) { const w = 0.5 + ((i * 7) % 5) * 0.12; const h = 2.6 + ((i * 3) % 4) * 0.3; g.add(box(w, h, 1.6, M(cols[i % cols.length], { roughness: 0.6 }), cx + w / 2, h / 2, 0)); cx += w + 0.05; i++; } g.position.set(x, y, z); return g; }

export function buildBackground(theme, level) {
  const g = new THREE.Group(); const W = level.width, H = level.height; const gy = level.groundY != null ? level.groundY : 0;
  const kind = theme.props; const r = rnd(42);
  // ground slab far behind to catch the horizon
  const far = -14, mid = -7, near = -3.2;
  const addGroundPlane = (color, z, depth) => { const p = box(W + 60, 1, depth, M(color), W / 2, gy - 0.5, z); p.receiveShadow = true; g.add(p); };
  switch (kind) {
    case 'street': case 'hq': case 'garden': case 'zoo': case 'pier': {
      addGroundPlane(kind === 'pier' ? '#2a6ab0' : '#4a9a3a', mid - 3, 20);
      for (let x = -6; x < W + 10; x += 9 + r() * 6) g.add(treeProp(x, gy, far + r() * 3, 1.3 + r() * 0.9, theme.leaf || '#2f8a3a', '#5a3a1a'));
      for (let x = 0; x < W; x += 14 + r() * 10) g.add(cloud(x, gy + 10 + r() * 5, far - 6 - r() * 6, 1 + r()));
      if (kind === 'street') { for (let x = -4; x < W; x += 16) g.add(building(x + 6, gy, far - 4, 7 + r() * 5, 9 + r() * 7, ['#b8a090', '#90a0b8', '#c0b0a0'][Math.floor(r() * 3)], '#ffe8a0')); g.add(fence(-2, gy, near - 0.6, W + 4, '#8a5a2a')); }
      if (kind === 'garden') { g.add(fence(-2, gy, near - 0.6, W + 4, '#a06a30')); for (let x = 2; x < W; x += 5 + r() * 4) { const b = sph(1.1, M(theme.leaf), x, gy + 1.0, mid, 8); b.scale.set(1.6, 1, 1); g.add(b); } for (let x = 1; x < W; x += 3.3) g.add(cone(0.35, 0.9, M(['#e85070', '#f0d040', '#f08030', '#ffffff'][Math.floor(r() * 4)]), x + r(), gy + 0.5, near - 0.2)); }
      if (kind === 'zoo') { for (let x = 4; x < W; x += 20) { const cage = new THREE.Group(); for (let i = 0; i < 8; i++) cage.add(cyl(0.08, 0.08, 5, M('#333', { metalness: 0.6 }), i * 0.8, 2.5, 0)); cage.add(box(6.4, 0.3, 0.3, M('#333'), 2.8, 5, 0)); cage.position.set(x, gy, mid); g.add(cage); } }
      if (kind === 'pier') { for (let x = 2; x < W; x += 7) g.add(cyl(0.4, 0.45, 5, M('#4a3020'), x, gy + 1.5, mid)); for (let x = 10; x < W; x += 36) { const ship = new THREE.Group(); ship.add(box(14, 3, 5, M('#5a3a22'), 0, 1.5, 0)); ship.add(cyl(0.25, 0.25, 12, M('#8a6a40'), 0, 9, 0)); ship.add(box(8, 6, 0.1, M('#f0e8d0'), 1.5, 9, 0.3)); ship.position.set(x, gy - 1, far - 2); g.add(ship); } }
      if (kind === 'hq') { for (let x = 0; x < W; x += 12) g.add(cyl(1.8, 2.4, 14, M('#6a4222'), x + 4, gy + 7, far + 2, 12)); }
      break;
    }
    case 'tree': {
      for (let x = -4; x < W + 8; x += 8 + r() * 5) { const tr = cyl(1.0 + r(), 1.5 + r(), H + 10, M('#5a3214'), x, gy + H / 2, far + r() * 4, 12); g.add(tr); }
      for (let i = 0; i < W / 3; i++) { const lf = sph(2 + r() * 2, new THREE.MeshStandardMaterial({ map: TEX.leaves(theme.leaf), roughness: 1 }), r() * W, gy + r() * (H + 8), mid - 4 - r() * 8, 8); g.add(lf); }
      for (let x = 0; x < W; x += 14 + r() * 10) g.add(cloud(x, gy + 6 + r() * H, far - 10 - r() * 6, 1 + r()));
      break;
    }
    case 'kitchen': case 'laundry': {
      addGroundPlane(kind === 'kitchen' ? '#e0d8c0' : '#d0e0e8', mid, 14);
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: kind === 'kitchen' ? TEX.planks('#5a3818', '#2a1808') : TEX.tiles('#e8f0f0', '#b0d0d0') }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 2, (H + 20) / 2); g.add(wall);
      for (let x = 2; x < W; x += 6 + r() * 4) { if (kind === 'kitchen') { g.add(box(3, 3, 2.6, M('#e8a030'), x, gy + 1.5, mid)); g.add(box(3.2, 0.3, 2.8, M('#f0eee0'), x, gy + 3.1, mid)); if (r() < 0.5) { g.add(cyl(0.9, 0.7, 1.2, M('#c0c8d0', { metalness: 0.7, roughness: 0.3 }), x, gy + 3.9, mid)); } } else { g.add(box(2.6, 2.6, 2.6, M('#f0f0f0'), x, gy + 1.3, mid)); g.add(cyl(0.9, 0.9, 0.2, M('#204060', { roughness: 0.2 }), x, gy + 1.3, mid + 1.35, 16).rotateX(Math.PI / 2)); } }
      for (let x = 1; x < W; x += 9) g.add(shelfUnit(x + 2, gy + 6, mid - 1, 4, 4, '#e8a030'));
      break;
    }
    case 'library': {
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: TEX.planks('#5a3818', '#2a1808') }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 2, (H + 20) / 2); g.add(wall);
      for (let y = 0; y < H + 6; y += 4) { for (let x = -2; x < W; x += 12) { g.add(box(12, 0.3, 2.6, M('#6a4222'), x + 6, gy + y, mid)); g.add(bookRow(x + 0.2, gy + y + 0.15, mid, 11.6)); } }
      for (let x = 0; x < W; x += 12) g.add(box(0.5, H + 8, 2.8, M('#6a4222'), x - 0.1, gy + H / 2, mid));
      break;
    }
    case 'toystore': {
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: TEX.wallpaper('#5a3a28', '#8a6040') }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 2, (H + 20) / 2); g.add(wall);
      addGroundPlane('#e8e0d0', mid, 14);
      for (let x = 1; x < W; x += 5 + r() * 5) { const c = ['#9a40c0', '#3090e0', '#e04040', '#30b060'][Math.floor(r() * 4)]; g.add(gift(x, gy, mid - r() * 3, 1.5 + r() * 2.5, c, '#f0c030')); }
      for (let x = 3; x < W; x += 11) { g.add(box(3, 2.4, 2.4, M('#2a80e0'), x, gy + 4 + r() * 4, mid)); g.add(box(2.2, 1.6, 0.2, M('#f8d8a0', { emissive: '#f8d8a0', emissiveIntensity: 0.3 }), x, gy + 4 + r() * 4, mid + 1.25)); }
      break;
    }
    case 'machine': case 'factory': case 'airship': case 'nimlab': case 'lab': {
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: kind === 'nimlab' || kind === 'lab' ? TEX.circuit() : TEX.metal(kind === 'factory' ? '#3a2a2a' : kind === 'airship' ? '#6a5a48' : '#606060'), metalness: 0.4, roughness: 0.6 }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 2, (H + 20) / 2); g.add(wall);
      for (let x = 0; x < W; x += 8 + r() * 6) { g.add(pipe(x, gy - 2, x, gy + H + 4, mid, 0.4 + r() * 0.3, ['#2e8a3a', '#d0b040', '#c0c0c0'][Math.floor(r() * 3)])); }
      for (let y = 2; y < H; y += 6) g.add(pipe(-2, gy + y, W + 2, gy + y + (r() - 0.5) * 2, mid - 1, 0.3, '#c0c0c0'));
      for (let x = 3; x < W; x += 12) { const gear = new THREE.Mesh(new THREE.TorusGeometry(1.2 + r(), 0.35, 8, 10), M('#8a8a8a', { metalness: 0.7, roughness: 0.4 })); gear.position.set(x, gy + 3 + r() * (H - 4), mid - 2); gear.userData.spin = (r() - 0.5) * 2; g.add(gear); }
      if (kind === 'factory') for (let x = 4; x < W; x += 16) g.add(lamp(x, gy, near - 1, '#ff6040'));
      if (kind === 'nimlab' || kind === 'lab') for (let x = 4; x < W; x += 14) { g.add(cyl(0.3, 0.6, 3, M('#8090a0', { metalness: 0.8 }), x, gy + 1.5, mid - 1)); g.add(sph(0.9, M('#80e0ff', { emissive: '#40c0ff', emissiveIntensity: 0.8, transparent: true, opacity: 0.7 }), x, gy + 3.6, mid - 1)); }
      if (kind === 'airship') { for (let x = 0; x < W; x += 16 + r() * 10) g.add(cloud(x, gy + r() * H, far - 8 - r() * 8, 1.5 + r() * 2)); }
      break;
    }
    case 'casino': case 'speakeasy': case 'theatre': {
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: kind === 'theatre' ? TEX.curtain('#a02030') : kind === 'speakeasy' ? TEX.bricks('#5a2a1a', '#2a1008') : TEX.curtain('#6a1414') }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 2, (H + 20) / 2); g.add(wall);
      addGroundPlane(kind === 'casino' ? '#e07060' : '#4a2a18', mid, 14);
      if (kind === 'casino') { for (let x = 1; x < W; x += 4.5) g.add(slotMachine(x, gy, mid - r() * 2)); for (let x = 6; x < W; x += 15) { g.add(cyl(2.6, 2.6, 0.4, M('#2a9a4a'), x, gy + 2.2, mid - 2, 20)); g.add(cyl(0.3, 0.5, 2.2, M('#e8d8c0'), x, gy + 1.1, mid - 2)); } }
      if (kind === 'speakeasy') { for (let x = 2; x < W; x += 6) { g.add(cyl(1.2, 1.0, 2.4, M('#7a5030'), x, gy + 1.2, mid, 12)); } for (let x = 5; x < W; x += 13) g.add(lamp(x, gy, mid - 2, '#f0c060')); }
      if (kind === 'theatre') { for (let x = 3; x < W; x += 9) { const spot = new THREE.SpotLight('#fff0c0', 2, 30, 0.5, 0.5); spot.position.set(x, gy + H + 4, mid); spot.target.position.set(x, gy, 0); g.add(spot); g.add(spot.target); g.add(cyl(0.5, 0.7, 1, M('#333'), x, gy + H + 4, mid)); } for (let x = 0; x < W; x += 2.2) g.add(box(1.8, 0.8, 1.6, M('#a02030'), x + 1, gy - 1.6, near - 1)); }
      break;
    }
    case 'sewer': {
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: TEX.bricks('#1a2a80', '#0a1040') }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 2, (H + 20) / 2); g.add(wall);
      for (let x = 2; x < W; x += 7 + r() * 5) g.add(pipe(x, gy - 2, x, gy + H + 4, mid, 0.6 + r() * 0.5, r() < 0.5 ? '#e8d070' : '#f0f0f0'));
      for (let x = 0; x < W; x += 10) { const arch = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.4, 8, 16, Math.PI), M('#2a3aa0')); arch.position.set(x + 5, gy + 1, mid - 2); g.add(arch); }
      const water = box(W + 20, 0.6, 10, new THREE.MeshStandardMaterial({ map: TEX.water('#1a5a9a'), transparent: true, opacity: 0.85 }), W / 2, gy - 0.3, mid - 2); water.material.map.repeat.set(20, 4); g.add(water);
      break;
    }
    case 'office': {
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: TEX.planks('#505860', '#303840') }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 2, (H + 20) / 2); g.add(wall);
      addGroundPlane('#6a7078', mid, 14);
      for (let x = 1; x < W; x += 3.2) { const c = r() < 0.5 ? '#2a80e0' : '#e050b0'; const n = 1 + Math.floor(r() * 4); for (let i = 0; i < n; i++) g.add(mug(x + (i % 2) * 0.5, gy + i * 1.8, mid - r() * 2, c)); }
      for (let x = 5; x < W; x += 12) g.add(shelfUnit(x, gy + 7, mid - 1, 6, 4, '#a86a30'));
      break;
    }
    case 'museum': {
      const wall = box(W + 20, H + 20, 1, new THREE.MeshStandardMaterial({ map: TEX.stone('#b8b0a0') }), W / 2, gy + H / 2, far); wall.material.map.repeat.set((W + 20) / 3, (H + 20) / 3); g.add(wall);
      addGroundPlane('#d8d0c0', mid, 14);
      for (let x = 2; x < W; x += 10) { g.add(box(2, 1.2, 2, M('#c8c0b0'), x, gy + 0.6, mid)); g.add(cyl(0.9, 1.1, 2.4, M('#d8c090'), x, gy + 2.4, mid, 12)); }
      for (let x = 8; x < W; x += 30) { const dino = new THREE.Group(); const bone = M('#f0ece0'); for (let i = 0; i < 9; i++) dino.add(box(0.4, 2.4 - Math.abs(i - 4) * 0.3, 0.4, bone, i * 1.1, 4, 0)); dino.add(box(10, 0.5, 0.5, bone, 4.4, 5.2, 0)); dino.add(sph(1.2, bone, 10.5, 5.6, 0)); for (const lx of [1.5, 7.5]) dino.add(box(0.5, 4, 0.5, bone, lx, 2, 0)); dino.position.set(x, gy, mid - 1); g.add(dino); }
      break;
    }
    case 'witch': {
      for (let x = -4; x < W + 8; x += 7 + r() * 5) { const tr = cyl(0.5, 0.9, 10 + r() * 6, M('#2a1830'), x, gy + 6, far + r() * 4, 7); g.add(tr); }
      g.add(sph(2.6, M('#f8f0c0', { emissive: '#f8f0c0', emissiveIntensity: 0.9 }), W * 0.6, gy + H + 6, far - 14, 16));
      for (let x = 4; x < W; x += 15) g.add(lamp(x, gy, mid - 2, '#80ff80'));
      for (let x = 0; x < W; x += 12) { const house = new THREE.Group(); house.add(box(6, 5, 4, M('#3a2a3a'), 0, 2.5, 0)); house.add(cone(4.6, 3.6, M('#1a0c1a'), 0, 6.8, 0)); house.add(box(1.2, 1.4, 0.1, M('#e0c040', { emissive: '#e0a020', emissiveIntensity: 0.8 }), 1.5, 3, 2.05)); house.position.set(x + 6, gy, far - 2); g.add(house); }
      break;
    }
    case 'skyscraper': {
      for (let x = -10; x < W + 20; x += 9 + r() * 6) g.add(building(x, gy - 30, far - 6 - r() * 10, 6 + r() * 6, 30 + r() * 20, ['#304878', '#405a90', '#283858'][Math.floor(r() * 3)], '#ffe8a0'));
      for (let x = 0; x < W; x += 20) g.add(cloud(x, gy + r() * H, far - 20, 2 + r() * 2));
      break;
    }
    default: {
      for (let x = -6; x < W + 10; x += 10) g.add(treeProp(x, gy, far, 1.5, '#2f8a3a', '#5a3a1a'));
    }
  }
  return g;
}

export function animateBackground(group, dt) {
  group.traverse(o => { if (o.userData.spin) o.rotation.z += o.userData.spin * dt; });
}
