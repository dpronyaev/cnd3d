// 3D props for the original zones. The converter tags every map cell with the kind of thing the NES block shows
// (pole, pipe stub, fence, cactus pot, test tube, ...). Surface kinds become textured blocks; object kinds are grouped into
// connected cell groups and replaced by a modelled prop that fills the group's box. All art here is procedural.
import * as THREE from 'three';

export const SURFACE_KINDS = new Set(['bench', 'cobble', 'brick', 'window', 'fence', 'fenceTop', 'wood', 'roof', 'metal', 'labtable', 'grid', 'woodblock', 'pillar', 'labframe', 'labglass']);
export const MODEL_KINDS = new Set(['pole', 'polecap', 'trash', 'pipe', 'wire', 'insulator', 'pot', 'cactus', 'tulip', 'post', 'dish', 'antenna', 'pencil', 'testtube', 'flask']);

// ------------------------------------------------------------------------------------------------- textures
const texCache = new Map();
function canvasTex(key, size, draw, repeat = 1) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; texCache.set(key, t); return t;
}
const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const SURF = {
  cobble: (g, s) => { g.fillStyle = '#5a5a5e'; g.fillRect(0, 0, s, s); const r = rnd(7); const rows = 3; for (let i = 0; i < rows; i++) { let x = -r() * 20; const y = i * s / rows; while (x < s) { const w = 18 + r() * 16; g.fillStyle = ['#e9e6df', '#d8d4cc', '#cfcbc2'][Math.floor(r() * 3)]; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, s / rows - 4, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 6, y + 5, w * 0.4, 2); x += w; } } },
  brick: (g, s) => { g.fillStyle = '#9c9890'; g.fillRect(0, 0, s, s); for (let i = 0; i < 4; i++) { const off = i % 2 ? s / 4 : 0; for (let x = -s / 2 + off; x < s; x += s / 2) { g.fillStyle = '#e4e0d6'; g.fillRect(x + 2, i * s / 4 + 2, s / 2 - 4, s / 4 - 4); } } },
  window: (g, s) => { g.fillStyle = '#d8d6d0'; g.fillRect(0, 0, s, s); g.fillStyle = '#7cc4ff'; g.fillRect(6, 6, s - 12, s - 12); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; g.beginPath(); g.moveTo(s * 0.25, s - 8); g.lineTo(s - 8, s * 0.25); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(s * 0.5, s - 8); g.lineTo(s - 8, s * 0.5); g.stroke(); },
  fence: (g, s) => { g.fillStyle = '#4a1e08'; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += s / 2) { g.fillStyle = '#6e3412'; g.fillRect(x + 2, 0, s / 2 - 4, s); g.strokeStyle = '#3a1404'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); const xx = x + 6 + k * 5; g.moveTo(xx, 0); g.bezierCurveTo(xx + 3, s * 0.3, xx - 3, s * 0.6, xx + 1, s); g.stroke(); } g.fillStyle = '#a0561c'; g.fillRect(x + s / 2 - 6, 0, 3, s); } },
  fenceTop: (g, s) => { SURF.fence(g, s); g.fillStyle = '#d9822b'; g.fillRect(0, 0, s, s * 0.28); g.fillStyle = '#f0a848'; for (let x = 0; x < s; x += 8) g.fillRect(x, 3, 5, 4); g.fillStyle = '#7a3a10'; g.fillRect(0, s * 0.28, s, 3); },
  bench: (g, s) => { g.fillStyle = '#3a1a06'; g.fillRect(0, 0, s, s); g.fillStyle = '#8a4a16'; g.fillRect(0, 0, s, s * 0.35); g.fillStyle = '#b8682a'; g.fillRect(0, 2, s, 4); for (let x = 6; x < s; x += s / 2) { g.fillStyle = '#6a3410'; g.fillRect(x, s * 0.35, 8, s * 0.65); } },
  wood: (g, s) => { g.fillStyle = '#c87a2a'; g.fillRect(0, 0, s, s); g.strokeStyle = '#8a4a14'; g.lineWidth = 2; for (let y = 6; y < s; y += 10) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + 3, s * 0.6, y - 3, s, y + 1); g.stroke(); } g.fillStyle = '#e8a050'; g.fillRect(0, 0, s, 3); },
  roof: (g, s) => { g.fillStyle = '#8a4a10'; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += s / 4) { g.fillStyle = '#e89a30'; g.beginPath(); g.roundRect(x + 2, 2, s / 4 - 4, s - 4, 6); g.fill(); g.fillStyle = '#f6c060'; g.fillRect(x + 5, 6, 3, s - 14); } },
  metal: (g, s) => { g.fillStyle = '#b8bcc0'; g.fillRect(0, 0, s, s); g.strokeStyle = '#7a7e84'; g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4); g.fillStyle = '#5a5e64'; for (const [x, y] of [[9, 9], [s - 9, 9], [9, s - 9], [s - 9, s - 9]]) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); } },
  labtable: (g, s) => { g.fillStyle = '#ece8e0'; g.fillRect(0, 0, s, s); g.fillStyle = '#c8c2b6'; g.fillRect(0, s - 6, s, 6); g.fillStyle = '#fffcf6'; g.fillRect(0, 0, s, 5); },
  grid: (g, s) => { g.fillStyle = '#9a9ea4'; g.fillRect(0, 0, s, s); g.strokeStyle = '#e8ecf0'; g.lineWidth = 4; for (let k = -s; k < s * 2; k += s / 2) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + s, s); g.moveTo(k, s); g.lineTo(k + s, 0); g.stroke(); } g.strokeStyle = '#5a5e64'; g.lineWidth = 3; g.strokeRect(1, 1, s - 2, s - 2); },
  woodblock: (g, s) => { g.fillStyle = '#a8642a'; g.fillRect(0, 0, s, s); g.strokeStyle = '#7a4416'; g.lineWidth = 2; for (let x = 4; x < s; x += 9) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4, s * 0.4, x - 4, s * 0.7, x, s); g.stroke(); } },
  pillar: (g, s) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, s, s); g.fillStyle = '#c8c4bc'; for (let x = 8; x < s; x += 16) g.fillRect(x, 0, 4, s); g.fillStyle = '#ffffff'; for (let x = 13; x < s; x += 16) g.fillRect(x, 0, 2, s); },
  labframe: (g, s) => { g.fillStyle = '#2a58d0'; g.fillRect(0, 0, s, s); g.fillStyle = '#4a7cf0'; g.fillRect(0, 6, s, 10); g.fillStyle = '#1a3a9a'; g.fillRect(0, s - 8, s, 8); },
  labglass: (g, s) => { g.fillStyle = '#74bcff'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, s * 0.7); g.lineTo(s * 0.7, 0); g.stroke(); },
};
const surfMats = new Map();
export function surfaceMaterial(kind) {
  if (!surfMats.has(kind)) surfMats.set(kind, new THREE.MeshStandardMaterial({ map: canvasTex('surf_' + kind, 64, SURF[kind]), roughness: kind === 'metal' || kind === 'labframe' ? 0.45 : 0.85, metalness: kind === 'metal' ? 0.2 : 0 }));
  return surfMats.get(kind);
}

// ------------------------------------------------------------------------------------------------- models
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, transparent: !!o.op, opacity: o.op ?? 1, emissive: o.e || '#000000', emissiveIntensity: o.ei ?? 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, depthWrite: o.op ? false : true });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
const glass = () => M('#d8f0ff', { op: 0.38, r: 0.1 });
const poleTex = () => canvasTex('pole', 64, (g, s) => { g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, s, s); g.fillStyle = '#f4f2ec'; g.fillRect(s * 0.35, 0, s * 0.18, s); g.fillStyle = '#a8a49c'; g.fillRect(s * 0.8, 0, s * 0.2, s); });

// box: {x0, y0, w, h} in tiles, y0 = bottom; ctx: { kindAt(tx, ty), rowOf(y) } for orientation decisions; cells: [[tx, ty]]
export function buildProp(kind, box, ctx) {
  const g = new THREE.Group(); const cx = box.x0 + box.w / 2, cy = box.y0 + box.h / 2;
  switch (kind) {
    case 'pole': {
      const r = Math.min(box.w, 2) * 0.42; const pm = new THREE.MeshStandardMaterial({ map: poleTex(), roughness: 0.5, metalness: 0.15 });
      g.add(mesh(new THREE.CylinderGeometry(r, r, box.h, 24), pm, cx, cy, -0.35));
      const ring = M('#9a968e', { m: 0.3 }); for (let y = box.y0 + 1.5; y < box.y0 + box.h - 0.5; y += 4) g.add(mesh(new THREE.TorusGeometry(r, 0.05, 6, 24).rotateX(Math.PI / 2), ring, cx, y, -0.35));
      if (ctx.topFree) g.add(mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), pm, cx, box.y0 + box.h, -0.35));
      break;
    }
    case 'polecap': { const m = M('#7a7a80', { m: 0.4 }); g.add(mesh(new THREE.BoxGeometry(box.w, 0.25, 0.4), m, cx, box.y0 + box.h - 0.2, -0.3)); for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), M('#f0f0f0'), cx + s * box.w * 0.3, box.y0 + box.h + 0.1, -0.3)); break; }
    case 'pipe': {
      const r = 0.3, y = box.y0 + box.h - r; const pm = M('#ecebe6', { m: 0.25, r: 0.35 });
      g.add(mesh(new THREE.CylinderGeometry(r, r, box.w, 20).rotateZ(Math.PI / 2), pm, cx, y, 0));
      const freeRight = ctx.kindAt(Math.floor(box.x0) - 1, ctx.rowOf(y)) === 'pole'; const end = freeRight ? box.x0 + box.w : box.x0; const dir = freeRight ? -1 : 1;
      const rm = M('#b8b6ae', { m: 0.3 }); for (let k = 0; k < 3; k++) g.add(mesh(new THREE.TorusGeometry(r * 1.02, 0.045, 6, 20).rotateY(Math.PI / 2), rm, end + dir * (0.12 + k * 0.14), y, 0));
      g.add(mesh(new THREE.CircleGeometry(r * 0.75, 16).rotateY(dir > 0 ? -Math.PI / 2 : Math.PI / 2), M('#3a3a3a'), end + dir * 0.005, y, 0));
      break;
    }
    case 'wire': { const y = box.y0 + box.h - 0.1; g.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, box.w, 8).rotateZ(Math.PI / 2), M('#e2e2de', { m: 0.3 }), cx, y, 0)); break; }
    case 'insulator': {
      const white = M('#f4f4f0', { r: 0.25 }), black = M('#2a2a2e');
      if (box.w >= box.h) { const y = box.y0 + box.h - 0.35; g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, box.w, 8).rotateZ(Math.PI / 2), black, cx, y, 0)); for (let x = box.x0 + 0.3; x < box.x0 + box.w - 0.1; x += 0.28) g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 18).rotateZ(Math.PI / 2), white, x, y, 0)); }
      else { for (let k = 0; k < box.w; k++) { const x = box.x0 + k + 0.5; g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, box.h, 8), black, x, cy, -0.2)); for (let y = box.y0 + 0.2; y < box.y0 + box.h; y += 0.24) g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 18), white, x, y, -0.2)); } }
      break;
    }
    case 'trash': {
      const r = box.w / 2 * 0.9, bodyH = box.h - 0.3; const tm = new THREE.MeshStandardMaterial({ map: canvasTex('trash', 64, (gg, s) => { gg.fillStyle = '#c8c8c8'; gg.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 8) { gg.fillStyle = '#8a8a8a'; gg.fillRect(x, 0, 3, s); gg.fillStyle = '#f0f0f0'; gg.fillRect(x + 4, 0, 2, s); } }), roughness: 0.35, metalness: 0.4 });
      tm.map.repeat.set(3, 1);
      g.add(mesh(new THREE.CylinderGeometry(r, r * 0.9, bodyH, 28), tm, cx, box.y0 + bodyH / 2, -0.15));
      g.add(mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.18, 28), M('#dcdcdc', { m: 0.4, r: 0.3 }), cx, box.y0 + bodyH + 0.09, -0.15));
      g.add(mesh(new THREE.SphereGeometry(r * 1.05, 24, 8, 0, Math.PI * 2, 0, 0.5), M('#e8e8e8', { m: 0.4, r: 0.3 }), cx, box.y0 + bodyH, -0.15));
      g.add(mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 14, Math.PI), M('#9a9a9a', { m: 0.5 }), cx, box.y0 + bodyH + 0.3, -0.15));
      break;
    }
    case 'pot': { const r = box.w / 2 * 0.95; const pm = M('#d8842c', { r: 0.7 }); g.add(mesh(new THREE.CylinderGeometry(r, r * 0.72, box.h - 0.15, 24), pm, cx, box.y0 + (box.h - 0.15) / 2, 0)); g.add(mesh(new THREE.TorusGeometry(r, 0.09, 8, 24).rotateX(Math.PI / 2), M('#a85a1a'), cx, box.y0 + box.h - 0.1, 0)); g.add(mesh(new THREE.CircleGeometry(r * 0.95, 20).rotateX(-Math.PI / 2), M('#4a2a10'), cx, box.y0 + box.h - 0.08, 0)); break; }
    case 'cactus': {
      const gm = M('#36a63a', { r: 0.55 }), sp = M('#f2d040'); const h = box.h * 0.95; const r = Math.min(0.32, box.w * 0.17);
      const body = (x, y0, hh, rr) => { g.add(mesh(new THREE.CapsuleGeometry(rr, Math.max(0.01, hh - rr * 2), 6, 12), gm, x, y0 + hh / 2, 0)); for (let k = 0; k < hh * 5; k++) { const a = k * 2.4, yy = y0 + 0.15 + (k / (hh * 5)) * (hh - 0.3); const s = mesh(new THREE.ConeGeometry(0.03, 0.14, 4), sp, x + Math.cos(a) * rr, yy, Math.sin(a) * rr); s.rotation.z = -Math.cos(a) * 1.4; s.rotation.x = Math.sin(a) * 1.4; g.add(s); } };
      for (const dx of box.w > 1.5 ? [-0.45, 0.45] : [0]) { body(cx + dx, box.y0, h, r); body(cx + dx + 0.32, box.y0 + h * 0.35, h * 0.38, r * 0.65); g.add(mesh(new THREE.CapsuleGeometry(r * 0.6, 0.15, 4, 8).rotateZ(Math.PI / 2), gm, cx + dx + 0.18, box.y0 + h * 0.38, 0)); }
      break;
    }
    case 'tulip': {
      const stem = M('#2f8a34'), petal = M('#f4b62a', { r: 0.45 }), leaf = M('#3fa83f');
      const n = Math.max(2, Math.round(box.w * 1.5)); for (let k = 0; k < n; k++) {
        const x = box.x0 + (k + 0.5) * box.w / n, top = box.y0 + box.h * (0.82 + (k % 2) * 0.12);
        g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, top - box.y0, 6), stem, x, box.y0 + (top - box.y0) / 2, 0));
        const cup = mesh(new THREE.LatheGeometry([0, 0.12, 0.17, 0.19, 0.17].map((rr, i) => new THREE.Vector2(rr, i * 0.09)), 14), petal, x, top - 0.12, 0); g.add(cup);
        const lf = mesh(new THREE.SphereGeometry(0.2, 10, 6), leaf, x + (k % 2 ? 0.12 : -0.12), box.y0 + 0.4, 0); lf.scale.set(0.35, 1.4, 0.2); lf.rotation.z = k % 2 ? -0.4 : 0.4; g.add(lf);
      }
      break;
    }
    case 'post': { const wm = M('#b8742c', { r: 0.7 }); g.add(mesh(new THREE.BoxGeometry(Math.min(0.6, box.w * 0.6), box.h - 0.3, 0.5), wm, cx, box.y0 + (box.h - 0.3) / 2, 0)); g.add(mesh(new THREE.SphereGeometry(0.28, 14, 10), M('#d08a3a'), cx, box.y0 + box.h - 0.2, 0)); for (const y of [0.3, 0.7]) g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#5a3010'), cx, box.y0 + box.h * y, 0.26)); break; }
    case 'dish': {
      const m = M('#dcdcdc', { m: 0.3, r: 0.4 }); const R = Math.min(box.w, box.h) * 0.42;
      const bowl = mesh(new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.32), M('#e8e8e8', { m: 0.3, r: 0.35, ds: true }), cx + 0.1 * box.w, box.y0 + box.h * 0.55, -0.2); bowl.rotation.z = 0.9; bowl.rotation.x = -0.3; g.add(bowl);
      const arm = mesh(new THREE.CylinderGeometry(0.06, 0.06, R * 1.2, 8), m, cx + 0.1 * box.w, box.y0 + box.h * 0.6, 0.2); arm.rotation.z = 0.9; g.add(arm);
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.3, box.h * 0.35, 12), m, cx, box.y0 + box.h * 0.17, -0.2));
      break;
    }
    case 'antenna': { const m = M('#9a9a9a', { m: 0.5 }); g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, box.h, 6), m, cx, cy, -0.3)); g.add(mesh(new THREE.BoxGeometry(box.w * 0.6, 0.05, 0.05), m, cx, box.y0 + box.h * 0.75, -0.3)); break; }
    case 'pencil': {
      const color = ctx.color || '#3a7ad8'; const r = Math.min(0.42, box.h * 0.36), y = box.y0 + r + 0.04; const L = box.w;
      g.add(mesh(new THREE.CylinderGeometry(r, r, L - 0.9, 6).rotateZ(Math.PI / 2), M(color, { r: 0.5 }), box.x0 + 0.35 + (L - 0.9) / 2, y, 0));
      g.add(mesh(new THREE.ConeGeometry(r, 0.55, 6).rotateZ(-Math.PI / 2), M('#f0c890'), box.x0 + L - 0.28, y, 0));
      g.add(mesh(new THREE.ConeGeometry(r * 0.35, 0.2, 6).rotateZ(-Math.PI / 2), M('#2a2a2a'), box.x0 + L - 0.06, y, 0));
      g.add(mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.18, 12).rotateZ(Math.PI / 2), M('#c8c8c8', { m: 0.6 }), box.x0 + 0.26, y, 0));
      g.add(mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.22, 12).rotateZ(Math.PI / 2), M('#f08aa0'), box.x0 + 0.08, y, 0));
      break;
    }
    case 'testtube': {
      const liq = M('#e8862a', { e: '#803000', ei: 0.25, r: 0.3 }); const gl = glass(); const n = Math.max(1, Math.round(box.w));
      for (let k = 0; k < n; k++) { const x = box.x0 + k + 0.5; g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, box.h - 0.3, 16, 1, true), gl, x, box.y0 + 0.3 + (box.h - 0.3) / 2, -0.1)); g.add(mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gl, x, box.y0 + 0.3, -0.1)); g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, (box.h - 0.3) * 0.55, 14), liq, x, box.y0 + 0.3 + (box.h - 0.3) * 0.275, -0.1)); g.add(mesh(new THREE.SphereGeometry(0.25, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), liq, x, box.y0 + 0.3, -0.1)); g.add(mesh(new THREE.TorusGeometry(0.31, 0.04, 6, 16).rotateX(Math.PI / 2), M('#f0f0f0'), x, box.y0 + box.h - 0.02, -0.1)); }
      break;
    }
    case 'flask': {
      const R = Math.min(box.w, box.h) * 0.42; const gl = glass(); const by = box.y0 + R;
      g.add(mesh(new THREE.SphereGeometry(R, 24, 16), gl, cx, by, -0.2));
      g.add(mesh(new THREE.CylinderGeometry(R * 0.28, R * 0.32, box.h - 2 * R + 0.2, 16, 1, true), gl, cx, by + R + (box.h - 2 * R) / 2, -0.2));
      g.add(mesh(new THREE.SphereGeometry(R * 0.86, 20, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), M('#e8862a', { e: '#803000', ei: 0.25 }), cx, by, -0.2));
      g.add(mesh(new THREE.TorusGeometry(R * 0.5, R * 0.08, 8, 24, Math.PI * 3).rotateX(Math.PI / 2), M('#8a4a14'), cx, by + R * 0.1, -0.2));
      break;
    }
  }
  return g;
}
