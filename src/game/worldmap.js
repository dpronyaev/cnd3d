// World map (zone select) in the style of the NES original: seen from above - a strip of sea at the top, a grass field with
// reddish patches, orange paths with right-angle bends between wooden signposts carrying the zone letters, the Rescue Rangers
// logo sign where the adventure starts, and the Ranger Plane (red balloon, bottle gondola, fan tail) flying along the paths.
// Map coordinates come in NES screen pixels (256 x 240); one tile (16 px) = one world unit, x to the right, z downwards.
import * as THREE from 'three';
import { RANGERS } from './models.js';

const U = 16; // pixels per world unit
const texCache = new Map();
function canvasTex(key, w, h, draw, rx = 1, ry = 1) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; texCache.set(key, t); return t;
}
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.8, metalness: o.m ?? 0, map: o.map || null, transparent: !!o.op, opacity: o.op ?? 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, emissive: o.e || '#000000', emissiveIntensity: o.ei ?? 0 });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };

function grassTex() {
  return canvasTex('mapgrass', 512, 512, (g, w, h) => {
    g.fillStyle = '#2f9a2a'; g.fillRect(0, 0, w, h); let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, rw = 30 + r() * 70; g.fillStyle = 'rgba(150,70,30,0.55)'; for (let k = 0; k < 40; k++) { g.beginPath(); g.ellipse(x + (r() - 0.5) * rw, y + (r() - 0.5) * rw * 0.4, 6 + r() * 6, 2 + r() * 2, -0.4, 0, Math.PI * 2); g.fill(); } }
    for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.6 ? '#0e3a10' : '#58c048'; g.fillRect(r() * w, r() * h, 2 + r() * 2, 2); }
  }, 6, 6);
}
function seaTex() {
  return canvasTex('mapsea', 256, 128, (g, w, h) => {
    g.fillStyle = '#2a6ee8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a8d4ff'; g.lineWidth = 2;
    for (let y = 8; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 12; x < w; x += 24) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y - 4, x + 10, y); g.stroke(); }
  }, 6, 3);
}
function letterTex(text, logo) {
  return canvasTex('sign_' + text, 256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (logo) { g.fillStyle = '#d02020'; g.beginPath(); g.arc(w / 2, h / 2, 50, 0, Math.PI * 2); g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke(); g.fillStyle = '#ffffff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RR', w / 2, h / 2 + 3); return; }
    g.font = 'bold 96px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#2a1206'; g.strokeText(text, w / 2, h / 2 + 6); g.fillStyle = '#ffffff'; g.fillText(text, w / 2, h / 2 + 6);
  });
}

// ------------------------------------------------------------------------------------------- the Ranger Plane
export function makeRangerPlane(pilotKind) {
  const g = new THREE.Group(); // nose points to +x
  const red = M('#e0242a', { r: 0.5 }), strap = M('#5a3214'), gold = M('#e8c030', { m: 0.6, r: 0.3 }), white = M('#f2f2f0', { r: 0.35 }), blue = M('#1e86c8', { r: 0.4 }), orange = M('#f08a2a'), slat = M('#f6a83a'), grey = M('#9aa0a8', { m: 0.5, r: 0.4 });
  // red balloon with two straps and gold buckles
  const bal = mesh(new THREE.SphereGeometry(1, 32, 18), red, -0.05, 1.05, 0); bal.scale.set(1.15, 0.42, 0.42); g.add(bal);
  for (const x of [-0.42, 0.32]) {
    const ring = mesh(new THREE.TorusGeometry(0.43, 0.035, 8, 28), strap, x, 1.05, 0); ring.rotation.y = Math.PI / 2; ring.scale.set(1, 1, 1); g.add(ring);
    for (const z of [-0.3, 0.3]) { const rope = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6), strap, x, 0.55, z * 0.8); rope.rotation.x = z > 0 ? 0.25 : -0.25; g.add(rope); }
    const buckle = mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 14), gold, x, 0.82, 0.38); g.add(buckle);
  }
  // gondola: a white plastic bottle lying on its side, blue cap at the nose, open cockpit with blue seats
  const bottle = mesh(new THREE.LatheGeometry([[0, -0.5], [0.2, -0.48], [0.24, -0.4], [0.24, 0.15], [0.2, 0.3], [0.1, 0.42], [0.08, 0.5]].map(([r, y]) => new THREE.Vector2(r, y)), 28), white, 0, 0.25, 0); bottle.rotation.z = -Math.PI / 2; g.add(bottle);
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 18).rotateZ(Math.PI / 2), blue, 0.56, 0.25, 0));
  const hole = mesh(new THREE.BoxGeometry(0.55, 0.06, 0.3), M('#3a3a3a'), -0.05, 0.47, 0); g.add(hole);
  for (const x of [-0.22, 0.08]) { g.add(mesh(new THREE.BoxGeometry(0.14, 0.18, 0.24), blue, x, 0.5, 0)); g.add(mesh(new THREE.BoxGeometry(0.05, 0.22, 0.24), blue, x - 0.08, 0.6, 0)); }
  // orange fan tail
  for (let k = 0; k < 7; k++) { const a = -0.7 + k * 0.23; const rib = mesh(new THREE.BoxGeometry(0.5, 0.025, 0.07), orange, -0.72 - Math.cos(a) * 0.22, 0.38 + Math.sin(a) * 0.22, 0); rib.rotation.z = a; g.add(rib); }
  const fan = mesh(new THREE.CircleGeometry(0.42, 18, Math.PI * 0.62, Math.PI * 0.76), M('#f0a050', { op: 0.85, ds: true }), -0.55, 0.38, 0); g.add(fan);
  // slatted wings on both sides
  for (const z of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.55, 0.03, 0.55), slat, 0.05, 0.12, z * 0.5); g.add(w); for (let k = 0; k < 4; k++) g.add(mesh(new THREE.BoxGeometry(0.56, 0.035, 0.02), M('#f8d040'), 0.05, 0.135, z * (0.28 + k * 0.13))); }
  // landing strut with a red plunger foot
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), grey, -0.25, 0.02, 0)); g.add(mesh(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#d02020'), -0.25, -0.15, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), grey, 0.2, 0.06, 0));
  if (pilotKind && RANGERS[pilotKind]) { const p = RANGERS[pilotKind](); p.scale.setScalar(0.3); p.position.set(0.0, 0.42, 0); p.rotation.y = Math.PI / 2; g.add(p); g.userData.pilot = p; }
  return g;
}

// ------------------------------------------------------------------------------------------- map scene
export function buildWorldMap(scene, def, state) {
  const root = new THREE.Group(); scene.add(root);
  const P = (px, py) => new THREE.Vector3(px / U, 0, py / U);
  // ground and sea
  const ground = mesh(new THREE.PlaneGeometry(40, 30).rotateX(-Math.PI / 2), M('#ffffff', { map: grassTex(), r: 1 }), 8, 0, 10); ground.castShadow = false; root.add(ground);
  const seaZ = (def.seaPy ?? 64) / U; const sea = mesh(new THREE.PlaneGeometry(40, seaZ + 12).rotateX(-Math.PI / 2), M('#ffffff', { map: seaTex(), r: 0.3 }), 8, 0.02, seaZ - (seaZ + 12) / 2); sea.castShadow = false; root.add(sea);
  root.add(mesh(new THREE.BoxGeometry(40, 0.08, 0.15), M('#1a5a18'), 8, 0.04, seaZ)); // shoreline
  // paths: orange ribbons with rounded corners
  const pathM = M('#f2b230', { r: 0.7 }), edgeM = M('#c87a10');
  for (const p of def.paths) {
    const pts = p.pts.map(([x, y]) => P(x, y));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b); const seg = mesh(new THREE.BoxGeometry(len, 0.06, 0.82), pathM, (a.x + b.x) / 2, 0.04, (a.z + b.z) / 2); seg.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); seg.castShadow = false; root.add(seg);
      const rim = mesh(new THREE.BoxGeometry(len, 0.05, 0.95), edgeM, (a.x + b.x) / 2, 0.025, (a.z + b.z) / 2); rim.rotation.y = seg.rotation.y; rim.castShadow = false; root.add(rim);
    }
    for (const v of pts) { const c = mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.06, 20), pathM, v.x, 0.04, v.z); c.castShadow = false; root.add(c); const c2 = mesh(new THREE.CylinderGeometry(0.475, 0.475, 0.05, 20), edgeM, v.x, 0.025, v.z); c2.castShadow = false; root.add(c2); }
  }
  // signposts
  const signs = {};
  const plank = M('#a8642a', { r: 0.9 }), plankL = M('#d08a40', { r: 0.9 }), postM = M('#6a3a14');
  for (const [id, n] of Object.entries(def.nodes)) {
    const s = new THREE.Group(); const v = P(n.px, n.py); s.position.copy(v); root.add(s);
    s.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.7, 8), postM, 0, 0.35, 0));
    const board = new THREE.Group(); board.position.set(0, 0.95, 0.05); board.rotation.x = -0.45; s.add(board);
    for (let k = 0; k < 3; k++) { const pl = mesh(new THREE.BoxGeometry(1.5 - (k % 2) * 0.12, 0.3, 0.14), k === 0 ? plankL : plank, (k - 1) * 0.06, 0.32 - k * 0.31, 0); board.add(pl); }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: letterTex(n.label, n.logo), transparent: true })); label.position.set(0, 0.02, 0.08); board.add(label);
    const flag = mesh(new THREE.ConeGeometry(0.12, 0.3, 4), M('#40d060', { e: '#108020', ei: 0.4 }), 0.72, 0.5, 0.1); flag.visible = false; board.add(flag);
    signs[id] = { group: s, board, flag, pos: v };
  }
  // the plane
  const plane = makeRangerPlane(state.pilot); root.add(plane);
  const start = signs[state.current] ? signs[state.current].pos : P(128, 120);
  plane.position.set(start.x, 1.7, start.z);
  return { root, signs, plane, P };
}
