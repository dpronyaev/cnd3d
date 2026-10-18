// Procedural cartoon 3D models (cel-shaded) of the Rescue Rangers, enemies, bosses, items and NPCs. No external assets.
import * as THREE from 'three';
import { TEX } from './themes.js';
import { makeChip2, makeDale2, makeGadget2, makeMonty2, makeZipper2 } from './heroes.js';

// ------------------------------------------------------------------ materials (toon shading with a 3-band ramp)
let ramp = null;
function toonRamp() {
  if (ramp) return ramp;
  const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat); ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true; return ramp;
}
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const { emissive, emissiveIntensity, metalness, roughness, flat, ...rest } = opts;
    const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (metalness !== undefined || flat === false) { const p = { color, roughness: roughness ?? 0.6, metalness: metalness ?? 0.2, ...clean }; if (emissive) { p.emissive = emissive; p.emissiveIntensity = emissiveIntensity ?? 1; } matCache.set(key, new THREE.MeshStandardMaterial(p)); }
    else { const m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...clean }); if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveIntensity ?? 1; } matCache.set(key, m); }
  }
  return matCache.get(key);
}
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#1a0d08', side: THREE.BackSide });

const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  sph: (r, s = 16) => new THREE.SphereGeometry(r, s, Math.max(8, s - 4)),
  cyl: (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 12) => new THREE.ConeGeometry(r, h, s),
  torus: (r, t) => new THREE.TorusGeometry(r, t, 10, 18),
  cap: (r, h, s = 12) => new THREE.CapsuleGeometry(r, h, 6, s),
};
function P(geo, m, x = 0, y = 0, z = 0) { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; return mesh; }
function grp(x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); return g; }
// cartoon outline: a slightly larger back-face copy
function outlined(mesh, scale = 1.06) { const o = new THREE.Mesh(mesh.geometry, OUTLINE); o.scale.setScalar(scale); mesh.add(o); return mesh; }
function sph(r, m, x, y, z, s = 16, outline = true) { const p = P(G.sph(r, s), m, x, y, z); return outline ? outlined(p) : p; }
function ellipsoid(rx, ry, rz, m, x, y, z, outline = true) { const p = sph(1, m, x, y, z, 18, outline); p.scale.set(rx, ry, rz); return p; }
function tube(points, radius, m, segs = 10) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); const geo = new THREE.TubeGeometry(curve, 16, radius, segs, false); const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; return mesh; }

// big expressive cartoon eyes: white, iris, pupil, highlight, optional lid/lash
function cartoonEyes(parent, { y, z, spread, r = 0.11, iris = '#2a2a2a', irisR = 0.55, lashes = false, brow = null, browY = 0 }) {
  const w = mat('#ffffff'), b = mat('#111111'), ir = mat(iris), hl = mat('#ffffff');
  for (const s of [-1, 1]) {
    const e = ellipsoid(r, r * 1.25, r * 0.8, w, s * spread, y, z); parent.add(e);
    parent.add(sph(r * irisR, ir, s * spread, y - r * 0.05, z + r * 0.62, 10, false));
    parent.add(sph(r * 0.3, b, s * spread, y - r * 0.05, z + r * 0.95, 8, false));
    parent.add(sph(r * 0.12, hl, s * spread + r * 0.2, y + r * 0.25, z + r * 1.1, 6, false));
    if (lashes) { const l = P(G.box(r * 1.6, r * 0.18, r * 0.3), b, s * spread, y + r * 1.2, z + r * 0.3); l.rotation.z = -s * 0.25; parent.add(l); }
    if (brow) { const br = P(G.box(r * 1.9, r * 0.35, r * 0.4), mat(brow), s * spread, y + r * 1.7 + browY, z + r * 0.2); br.rotation.z = -s * 0.2; parent.add(br); }
  }
}

// ------------------------------------------------------------------ Rescue Rangers
// Chip & Dale share the chipmunk body: big head, round tan face mask, cheeks, striped back/tail, tiny limbs.
function chipmunkBase({ fur, face, dark }) {
  const root = grp(); const parts = {};
  const furM = mat(fur), faceM = mat(face), darkM = mat(dark);
  const body = grp(0, 0.5, 0); root.add(body); parts.body = body;
  // torso: pear shape
  const torso = ellipsoid(0.3, 0.34, 0.27, furM, 0, 0, 0); body.add(torso);
  body.add(ellipsoid(0.2, 0.22, 0.12, faceM, 0, -0.02, 0.2)); // belly patch
  // back stripes (dark middle, cream sides)
  const bs = P(G.box(0.07, 0.42, 0.04), darkM, 0, 0.02, -0.27); body.add(bs);
  for (const s of [-1, 1]) body.add(P(G.box(0.05, 0.4, 0.03), faceM, s * 0.09, 0.02, -0.265));
  // head
  const head = grp(0, 0.52, 0.04); body.add(head); parts.head = head;
  head.add(ellipsoid(0.4, 0.38, 0.38, furM, 0, 0, 0));
  // face mask (tan), muzzle, cheeks
  const mask = ellipsoid(0.3, 0.26, 0.2, faceM, 0, -0.08, 0.26, false); head.add(mask);
  for (const s of [-1, 1]) head.add(ellipsoid(0.15, 0.13, 0.13, faceM, s * 0.22, -0.1, 0.2, false));
  head.add(ellipsoid(0.17, 0.12, 0.14, faceM, 0, -0.16, 0.33, false));
  // dark stripe up the forehead
  head.add(P(G.box(0.06, 0.26, 0.04), darkM, 0, 0.26, 0.28));
  // mouth line
  head.add(P(G.box(0.16, 0.025, 0.02), darkM, 0, -0.25, 0.44));
  // ears: round, with inner tan
  for (const s of [-1, 1]) { head.add(ellipsoid(0.12, 0.13, 0.05, furM, s * 0.3, 0.33, -0.02)); head.add(ellipsoid(0.07, 0.08, 0.02, faceM, s * 0.3, 0.33, 0.03, false)); }
  // tail: curved tube with stripe
  const tailPts = [[0, -0.1, -0.3], [0, 0.1, -0.5], [0, 0.45, -0.58], [0, 0.75, -0.48], [0, 0.9, -0.3]];
  const tail = grp(0, 0, 0); body.add(tail); parts.tail = tail;
  const tailMesh = tube(tailPts, 0.14, furM); tail.add(outlined(tailMesh, 1.08));
  tail.add(tube(tailPts.map(p => [p[0], p[1], p[2] - 0.05]), 0.06, darkM));
  // limbs
  const mkLeg = (s) => { const l = grp(s * 0.13, -0.3, 0.02); body.add(l); l.add(P(G.cyl(0.07, 0.08, 0.26, 10), furM, 0, -0.1, 0)); const foot = ellipsoid(0.1, 0.07, 0.17, faceM, 0, -0.26, 0.06); l.add(foot); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const mkArm = (s) => { const a = grp(s * 0.3, 0.14, 0.06); body.add(a); a.add(P(G.cyl(0.055, 0.06, 0.34, 10), furM, 0, -0.15, 0)); a.add(sph(0.085, faceM, 0, -0.34, 0, 10, false)); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  root.userData.parts = parts; root.userData.height = 1.35;
  return { root, parts, body, head, furM, faceM, darkM };
}
export function makeChip() {
  const { root, body, head, faceM } = chipmunkBase({ fur: '#a35a2c', face: '#f3dfb6', dark: '#4a2512' });
  cartoonEyes(head, { y: 0.06, z: 0.3, spread: 0.15, r: 0.1, brow: '#4a2512' });
  head.add(ellipsoid(0.085, 0.07, 0.07, mat('#111111'), 0, -0.12, 0.48)); // black nose
  // fedora: crown + brim + band
  const hat = grp(0, 0.32, -0.02); head.add(hat);
  const crown = P(G.cyl(0.27, 0.32, 0.26, 18), mat('#6b3a1c'), 0, 0.16, 0); crown.scale.z = 0.95; hat.add(outlined(crown));
  hat.add(P(G.cyl(0.46, 0.48, 0.045, 24), mat('#6b3a1c'), 0, 0.03, 0.02));
  hat.add(P(G.cyl(0.29, 0.33, 0.07, 18), mat('#2b1a0e'), 0, 0.08, 0));
  const dent = P(G.box(0.14, 0.08, 0.3), mat('#5a2f15'), 0, 0.3, 0); hat.add(dent);
  // bomber jacket: dark brown with shearling collar and zipper
  const jacket = ellipsoid(0.33, 0.33, 0.29, mat('#7a4522'), 0, -0.02, -0.02); body.add(jacket);
  body.add(P(G.torus(0.25, 0.07), mat('#f6ead0'), 0, 0.26, 0.02).rotateX(Math.PI / 2));
  body.add(P(G.box(0.04, 0.42, 0.02), mat('#c8c8c8'), 0, -0.02, 0.3));
  body.add(ellipsoid(0.17, 0.2, 0.08, faceM, 0, -0.04, 0.26, false)); // belly showing through open jacket
  root.userData.kind = 'chip'; return root;
}
export function makeDale() {
  const { root, body, head, faceM, furM } = chipmunkBase({ fur: '#b7682f', face: '#f3dfb6', dark: '#4a2512' });
  cartoonEyes(head, { y: 0.06, z: 0.3, spread: 0.15, r: 0.1, brow: '#4a2512', browY: 0.02 });
  head.add(sph(0.095, mat('#e02424'), 0, -0.12, 0.49, 12)); // red nose
  // buck teeth
  for (const s of [-1, 1]) head.add(P(G.box(0.055, 0.08, 0.03), mat('#ffffff'), s * 0.03, -0.27, 0.42));
  // hair tuft
  for (let i = 0; i < 3; i++) { const h = outlined(P(G.cone(0.05, 0.22, 8), furM, (i - 1) * 0.07, 0.42, 0.1)); h.rotation.z = (i - 1) * 0.45; h.rotation.x = -0.3; head.add(h); }
  // Hawaiian shirt: red with pale flowers, open collar
  const shirt = ellipsoid(0.33, 0.32, 0.29, mat('#d8282c'), 0, -0.02, -0.02); body.add(shirt);
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3; const fl = P(G.sph(0.045, 8), mat('#f6e39a'), Math.cos(a) * 0.3, Math.sin(a * 1.9) * 0.22, Math.sin(a) * 0.27); body.add(fl); }
  for (const s of [-1, 1]) { const c = P(G.box(0.12, 0.12, 0.03), mat('#d8282c'), s * 0.1, 0.24, 0.26); c.rotation.z = s * 0.6; body.add(c); }
  body.add(ellipsoid(0.12, 0.14, 0.06, faceM, 0, 0.1, 0.27, false));
  root.userData.kind = 'dale'; return root;
}
export function makeGadget() {
  const { root, body, head, faceM } = chipmunkBase({ fur: '#e8c9a0', face: '#fbead2', dark: '#e8c9a0' });
  cartoonEyes(head, { y: 0.07, z: 0.3, spread: 0.15, r: 0.105, iris: '#3a7bd5', lashes: true });
  head.add(sph(0.06, mat('#e8707a'), 0, -0.1, 0.47, 10)); // pink nose
  // long blonde hair: cap, bangs, back fall
  const hair = mat('#f2d35b');
  head.add(ellipsoid(0.42, 0.36, 0.4, hair, 0, 0.1, -0.06));
  head.add(ellipsoid(0.42, 0.14, 0.18, hair, 0, 0.26, 0.26)); // bangs
  const fall = ellipsoid(0.3, 0.45, 0.14, hair, 0, -0.3, -0.34); body.add(fall);
  for (const s of [-1, 1]) head.add(ellipsoid(0.1, 0.28, 0.1, hair, s * 0.38, -0.1, 0.05)); // side locks
  // goggles on top of head
  for (const s of [-1, 1]) { const lens = P(G.cyl(0.11, 0.11, 0.08, 16), mat('#30343a', { metalness: 0.4 }), s * 0.13, 0.36, 0.26); lens.rotation.x = Math.PI / 2 - 0.4; head.add(lens); const glass = P(G.cyl(0.08, 0.08, 0.09, 16), mat('#a9e3ff', { transparent: true, opacity: 0.7 }), s * 0.13, 0.36, 0.26); glass.rotation.x = Math.PI / 2 - 0.4; head.add(glass); }
  const strap = P(G.torus(0.4, 0.03), mat('#30343a'), 0, 0.3, 0); strap.rotation.x = Math.PI / 2 + 0.4; head.add(strap);
  // lavender coveralls with belt and pocket
  const suit = ellipsoid(0.33, 0.35, 0.29, mat('#b08ad9'), 0, -0.03, -0.02); body.add(suit);
  body.add(P(G.torus(0.3, 0.04), mat('#5a3d7a'), 0, -0.14, 0).rotateX(Math.PI / 2));
  body.add(P(G.box(0.14, 0.1, 0.03), mat('#9a74c4'), 0.1, 0.02, 0.29));
  body.add(P(G.box(0.08, 0.14, 0.03), mat('#c7c7c7', { metalness: 0.6 }), 0.1, 0.06, 0.31)); // wrench in pocket
  body.add(ellipsoid(0.14, 0.12, 0.06, faceM, 0, 0.2, 0.26, false)); // neck/chest fur
  root.userData.kind = 'gadget'; root.userData.height = 1.35; return root;
}
export function makeMonty() {
  const root = grp(); const parts = {}; const fur = mat('#b98f68'), face = mat('#ecd6b4');
  const body = grp(0, 0.78, 0); root.add(body); parts.body = body;
  // big belly in a cream turtleneck, open green trench coat
  const belly = ellipsoid(0.5, 0.52, 0.45, mat('#f1e2c2'), 0, -0.02, 0.04); body.add(belly);
  const coat = ellipsoid(0.56, 0.6, 0.48, mat('#3b7d49'), 0, -0.02, -0.08); body.add(coat);
  body.add(P(G.box(0.2, 1.0, 0.1), mat('#f1e2c2'), 0, -0.05, 0.42)); // coat opening shows the sweater
  for (const s of [-1, 1]) { const lapel = P(G.box(0.14, 0.5, 0.06), mat('#2d6338'), s * 0.17, 0.2, 0.44); lapel.rotation.z = s * 0.25; body.add(lapel); }
  body.add(P(G.torus(0.5, 0.05), mat('#4a2a10'), 0, -0.3, 0).rotateX(Math.PI / 2)); // belt
  body.add(P(G.cyl(0.38, 0.42, 0.14, 16), mat('#f1e2c2'), 0, 0.48, 0)); // turtleneck
  const head = grp(0, 0.78, 0.06); body.add(head); parts.head = head;
  head.add(ellipsoid(0.46, 0.42, 0.42, fur, 0, 0, 0));
  head.add(ellipsoid(0.3, 0.22, 0.22, face, 0, -0.12, 0.3, false)); // muzzle
  head.add(sph(0.12, mat('#d9534f'), 0, -0.08, 0.6, 12)); // big nose
  for (const s of [-1, 1]) { // bushy orange moustache
    const m = ellipsoid(0.2, 0.09, 0.09, mat('#d9822b'), s * 0.19, -0.2, 0.54); m.rotation.z = -s * 0.35; head.add(m);
  }
  cartoonEyes(head, { y: 0.1, z: 0.36, spread: 0.17, r: 0.1, brow: '#7a5230', browY: 0.01 });
  for (const s of [-1, 1]) head.add(ellipsoid(0.13, 0.14, 0.05, fur, s * 0.36, 0.36, -0.02));
  // aviator hat (brown) with goggles pushed up
  const hat = grp(0, 0.3, 0); head.add(hat);
  hat.add(ellipsoid(0.47, 0.3, 0.45, mat('#8a4b24'), 0, 0.02, 0));
  for (const s of [-1, 1]) { const g = P(G.cyl(0.1, 0.1, 0.07, 16), mat('#30343a', { metalness: 0.4 }), s * 0.14, 0.2, 0.3); g.rotation.x = Math.PI / 2 - 0.5; hat.add(g); const gl = P(G.cyl(0.07, 0.07, 0.08, 16), mat('#a9e3ff', { transparent: true, opacity: 0.7 }), s * 0.14, 0.2, 0.3); gl.rotation.x = Math.PI / 2 - 0.5; hat.add(gl); }
  const strap = P(G.torus(0.44, 0.03), mat('#30343a'), 0, 0.14, 0); strap.rotation.x = Math.PI / 2 + 0.5; hat.add(strap);
  for (const s of [-1, 1]) hat.add(P(G.box(0.16, 0.3, 0.1), mat('#8a4b24'), s * 0.4, -0.2, 0.05)); // ear flaps
  // tail
  const tail = grp(0, 0, 0); body.add(tail); parts.tail = tail; tail.add(outlined(tube([[0, -0.4, -0.4], [0, -0.5, -0.7], [0.1, -0.2, -0.9], [0.2, 0.1, -0.8]], 0.07, fur), 1.1));
  const mkLeg = (s) => { const l = grp(s * 0.24, -0.58, 0.02); body.add(l); l.add(P(G.cyl(0.11, 0.12, 0.34, 12), mat('#4a4a6a'), 0, -0.12, 0)); l.add(ellipsoid(0.13, 0.09, 0.22, mat('#3a2410'), 0, -0.34, 0.07)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const mkArm = (s) => { const a = grp(s * 0.58, 0.22, 0.05); body.add(a); a.add(P(G.cyl(0.1, 0.11, 0.52, 12), mat('#3b7d49'), 0, -0.24, 0)); a.add(sph(0.13, face, 0, -0.54, 0, 12, false)); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  root.userData.parts = parts; root.userData.height = 1.95; root.userData.kind = 'monty'; return root;
}
export function makeZipper() {
  const root = grp(); const parts = {}; const skin = mat('#5fc257');
  const body = grp(0, 0.4, 0); root.add(body); parts.body = body;
  body.add(ellipsoid(0.17, 0.2, 0.16, mat('#d13b3b'), 0, 0, 0)); // red turtleneck sweater
  body.add(P(G.cyl(0.11, 0.13, 0.08, 12), mat('#d13b3b'), 0, 0.2, 0));
  const head = grp(0, 0.33, 0); body.add(head); parts.head = head;
  head.add(ellipsoid(0.23, 0.21, 0.22, skin, 0, 0, 0));
  cartoonEyes(head, { y: 0.03, z: 0.12, spread: 0.11, r: 0.12, iris: '#3a7bd5', irisR: 0.65 });
  head.add(P(G.box(0.1, 0.02, 0.02), mat('#1a3a1a'), 0, -0.12, 0.21)); // smile
  for (const s of [-1, 1]) { const a = P(G.cyl(0.012, 0.012, 0.28, 6), mat('#1a3a1a'), s * 0.07, 0.3, 0); a.rotation.z = -s * 0.45; head.add(a); head.add(sph(0.035, mat('#1a3a1a'), s * 0.15, 0.42, 0, 8, false)); }
  const wingMat = new THREE.MeshToonMaterial({ color: '#d6ecff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, gradientMap: toonRamp() });
  const wings = grp(0, 0.16, -0.12); body.add(wings); parts.wings = wings;
  for (const s of [-1, 1]) { const w = P(G.sph(1, 12), wingMat, s * 0.26, 0.02, 0); w.scale.set(0.26, 0.015, 0.11); w.userData.side = s; wings.add(w); }
  const mkLeg = (s) => { const l = grp(s * 0.06, -0.2, 0); body.add(l); l.add(P(G.cyl(0.018, 0.018, 0.18, 6), mat('#1a3a1a'), 0, -0.08, 0)); l.add(ellipsoid(0.04, 0.025, 0.06, mat('#1a3a1a'), 0, -0.17, 0.02, false)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const mkArm = (s) => { const a = grp(s * 0.17, 0.04, 0.05); body.add(a); a.add(P(G.cyl(0.022, 0.022, 0.2, 6), skin, 0, -0.1, 0)); a.add(sph(0.035, skin, 0, -0.2, 0, 8, false)); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  root.userData.parts = parts; root.userData.height = 0.8; root.userData.kind = 'zipper'; root.userData.flyer = true; return root;
}
// Hero model style: 'cartoon' (heroes.js, close to the TV series) or 'old' (the first blobby models, kept as an option).
let heroStyle = 'cartoon';
try { heroStyle = localStorage.getItem('cnd3d_models') || 'cartoon'; } catch (e) { }
export function getHeroStyle() { return heroStyle; }
export function setHeroStyle(v) { heroStyle = v; try { localStorage.setItem('cnd3d_models', v); } catch (e) { } }
const OLD = { chip: makeChip, dale: makeDale, gadget: makeGadget, monty: makeMonty, zipper: makeZipper };
const NEW = { chip: makeChip2, dale: makeDale2, gadget: makeGadget2, monty: makeMonty2, zipper: makeZipper2 };
export const RANGERS = Object.fromEntries(Object.keys(OLD).map(k => [k, () => (heroStyle === 'old' ? OLD : NEW)[k]()]));
export { P, grp, G, outlined, sph, ellipsoid, tube, cartoonEyes, toonRamp };

// Generic character animation. st: {facing, vx, vy, grounded, crouch, carrying, hurt, t, hidden}
export function animateCharacter(root, st, dt) {
  const p = root.userData.parts; if (!p) return;
  const speed = Math.abs(st.vx || 0); const t = st.t || 0;
  const walk = Math.min(1, speed / 5);
  const sw = Math.sin(t * 14) * walk;
  if (p.legL) { p.legL.rotation.x = st.grounded ? sw * 0.9 : 0.4; p.legR.rotation.x = st.grounded ? -sw * 0.9 : -0.3; }
  if (p.armL) {
    if (st.carrying) { p.armL.rotation.x = -2.6; p.armR.rotation.x = -2.6; p.armL.rotation.z = 0.3; p.armR.rotation.z = -0.3; }
    else if (!st.grounded) { p.armL.rotation.x = -2.2; p.armR.rotation.x = -2.2; p.armL.rotation.z = 0.5; p.armR.rotation.z = -0.5; }
    else { p.armL.rotation.x = -sw * 0.8; p.armR.rotation.x = sw * 0.8; p.armL.rotation.z = 0.15; p.armR.rotation.z = -0.15; }
  }
  if (p.body) {
    const bob = st.grounded ? Math.abs(Math.sin(t * 14)) * 0.06 * walk : 0;
    const baseY = root.userData.bodyY ?? (root.userData.kind === 'monty' ? 0.78 : root.userData.kind === 'zipper' ? 0.4 : 0.5);
    p.body.position.y = baseY + bob - (st.crouch ? baseY * 0.4 : 0);
    p.body.scale.y = st.crouch ? 0.62 : 1; p.body.scale.x = st.crouch ? 1.15 : 1;
    p.body.rotation.x = st.grounded ? walk * 0.12 : (st.vy > 0 ? -0.15 : 0.2);
    p.body.rotation.z = st.hurt ? Math.sin(t * 40) * 0.2 : 0;
  }
  if (p.tail) p.tail.rotation.x = Math.sin(t * 6) * 0.25 + (st.grounded ? 0 : 0.4);
  if (p.head) { p.head.rotation.z = Math.sin(t * 3) * 0.03; p.head.rotation.x = st.grounded ? 0 : -0.1; }
  if (p.wings) { p.wings.children.forEach(w => { w.rotation.y = w.userData.side * Math.sin(t * 60) * 0.7; }); }
  root.rotation.y = (st.facing || 1) > 0 ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35;
  root.visible = !st.hidden;
}

// ------------------------------------------------------------------ Items
export function makeItem(kind) {
  const g = grp();
  switch (kind) {
    case 'crate': { const m = new THREE.MeshStandardMaterial({ map: TEX.crate('#d08a3a'), roughness: 0.85 }); g.add(P(G.box(0.92, 0.92, 0.92), m, 0, 0.46, 0)); break; }
    case 'metal': { const m = new THREE.MeshStandardMaterial({ map: TEX.metalCrate(), roughness: 0.4, metalness: 0.6 }); g.add(P(G.box(0.92, 0.92, 0.92), m, 0, 0.46, 0)); break; }
    case 'apple': { // NES apple: 24x24 px, red with a highlight, short stem
      const a = sph(0.72, mat('#d81c1c'), 0, 0.72, 0, 22); a.scale.set(1, 0.95, 0.95); g.add(a); g.add(ellipsoid(0.16, 0.22, 0.08, mat('#ff9a9a'), -0.3, 0.98, 0.6, false));
      g.add(P(G.cyl(0.04, 0.05, 0.3, 6), mat('#5a3a1a'), 0.02, 1.48, 0)); const leaf = ellipsoid(0.2, 0.06, 0.1, mat('#3a9a3a'), 0.18, 1.5, 0, false); leaf.rotation.z = 0.3; g.add(leaf); break; }
    case 'nut': { // lab nut: a white hexagonal nut lying on its side
      const hex = P(G.cyl(0.5, 0.5, 0.62, 6), mat('#eeeeea', { metalness: 0.35, roughness: 0.35 }), 0, 0.49, 0); hex.rotation.x = Math.PI / 2; hex.rotation.y = Math.PI / 6; g.add(outlined(hex, 1.04));
      const hole = P(G.cyl(0.2, 0.2, 0.64, 14), mat('#3a3a40'), 0, 0.49, 0); hole.rotation.x = Math.PI / 2; g.add(hole); break; }
    case 'ball': { g.add(sph(0.42, mat('#e03030'), 0, 0.42, 0, 18)); const band = P(G.torus(0.42, 0.05), mat('#ffffff'), 0, 0.42, 0); band.rotation.x = Math.PI / 2; g.add(band); break; }
    case 'barrel': { g.add(outlined(P(G.cyl(0.42, 0.42, 0.95, 16), mat('#a06a30'), 0, 0.475, 0))); for (const y of [0.15, 0.8]) g.add(P(G.torus(0.43, 0.04), mat('#444'), 0, y, 0).rotateX(Math.PI / 2)); break; }
    case 'flower': { // NES flower token: white rounded tile, black frame, a smiling flower drawn on it
      g.add(P(G.box(0.74, 0.74, 0.12), mat('#1a1a1a'), 0, 0.45, -0.01)); g.add(P(G.box(0.64, 0.64, 0.14), mat('#f6f6f6'), 0, 0.45, 0));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(ellipsoid(0.085, 0.085, 0.02, mat('#2a2a2a'), Math.cos(a) * 0.15, 0.5 + Math.sin(a) * 0.15, 0.08, false)); g.add(ellipsoid(0.06, 0.06, 0.02, mat('#ffffff'), Math.cos(a) * 0.15, 0.5 + Math.sin(a) * 0.15, 0.095, false)); }
      g.add(sph(0.08, mat('#2a2a2a'), 0, 0.5, 0.07, 10, false)); g.add(P(G.box(0.04, 0.2, 0.02), mat('#2a2a2a'), 0, 0.28, 0.08)); for (const s of [-1, 1]) { const lf = ellipsoid(0.07, 0.035, 0.02, mat('#2a2a2a'), s * 0.07, 0.27, 0.08, false); lf.rotation.z = s * 0.5; g.add(lf); } break; }
    case 'star': case 'oneup': { const shape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.17 : 0.4; const a = i / 10 * Math.PI * 2 + Math.PI / 2; shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }); const m = kind === 'oneup' ? mat('#ffffff', { emissive: '#ff80ff', emissiveIntensity: 0.6 }) : mat('#ffffff', { emissive: '#404040', emissiveIntensity: 0.3 }); /* NES star is white */ g.add(outlined(P(geo, m, 0, 0.45, -0.07), 1.08)); g.userData.spin = true; break; }
    case 'acorn': case 'bigacorn': { const sc = kind === 'bigacorn' ? 1.3 : 1; const nut = sph(0.26 * sc, mat(kind === 'bigacorn' ? '#f2f2f2' : '#e08a30'), 0, 0.3 * sc, 0, 14); /* white acorn = the silver one of the original */ nut.scale.y = 1.25; g.add(nut); const cap = sph(0.28 * sc, mat(kind === 'bigacorn' ? '#a8a8a8' : '#6a3a14'), 0, 0.5 * sc, 0, 14); cap.scale.y = 0.55; g.add(cap); g.add(P(G.cyl(0.03, 0.03, 0.14, 6), mat('#4a2a10'), 0, 0.7 * sc, 0)); if (kind === 'bigacorn') g.userData.glow = true; break; }
    case 'chest': { g.add(outlined(P(G.box(1.1, 0.6, 0.8), mat('#8a5a2a'), 0, 0.3, 0))); const lid = P(G.cyl(0.4, 0.4, 1.1, 12, false, 0, Math.PI), mat('#a0702e'), 0, 0.6, 0); lid.rotation.z = Math.PI / 2; g.add(lid); g.add(P(G.box(0.2, 0.2, 0.1), mat('#f0d040'), 0, 0.5, 0.42)); for (const x of [-0.35, 0.35]) g.add(P(G.box(0.08, 0.62, 0.84), mat('#f0d040', { metalness: 0.6 }), x, 0.3, 0)); break; }
    case 'cheese': { const shape = new THREE.Shape(); shape.moveTo(-0.45, 0); shape.lineTo(0.45, 0); shape.lineTo(0, 0.6); shape.lineTo(-0.45, 0); const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }); g.add(outlined(P(geo, mat('#f0c030'), 0, 0.02, -0.3), 1.06)); for (const [x, y] of [[-0.1, 0.15], [0.15, 0.1], [0, 0.35]]) g.add(sph(0.07, mat('#c09020'), x, y, 0.3, 8, false)); break; }
    case 'zipper': { const z = RANGERS.zipper(); z.scale.setScalar(0.8); g.add(z); g.userData.hover = true; break; }
    case 'redbox': { // the big red box with the round emblem (zone 0, before the boss)
      g.add(outlined(P(G.box(1.9, 1.5, 1.2), mat('#d02828'), 0, 0.75, 0))); g.add(P(G.box(1.95, 0.12, 1.25), mat('#7a1010'), 0, 0.2, 0)); g.add(P(G.box(1.95, 0.12, 1.25), mat('#7a1010'), 0, 1.3, 0));
      const em = P(G.cyl(0.42, 0.42, 0.08, 18), mat('#f0b040'), 0, 0.75, 0.62); em.rotation.x = Math.PI / 2; g.add(em); const ring = P(G.cyl(0.26, 0.26, 0.1, 18), mat('#d02828'), 0, 0.75, 0.64); ring.rotation.x = Math.PI / 2; g.add(ring); break; }
    case 'gear': { const m = mat('#d0a030', { metalness: 0.7, roughness: 0.3 }); g.add(P(G.torus(0.3, 0.12), m, 0, 0.45, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(P(G.box(0.14, 0.14, 0.2), m, Math.cos(a) * 0.42, 0.45 + Math.sin(a) * 0.42, 0)); } g.userData.spin = true; break; }
    case 'boat': { g.add(P(G.box(1.8, 0.4, 0.9), mat('#8a5a2a'), 0, 0.2, 0)); g.add(P(G.box(1.6, 0.1, 0.7), mat('#c0a070'), 0, 0.42, 0)); break; }
    default: g.add(P(G.box(0.8, 0.8, 0.8), mat('#ff00ff'), 0, 0.4, 0));
  }
  g.userData.itemKind = kind; return g;
}
export function animateItem(g, t) {
  if (g.userData.spin) g.rotation.y = t * 2.5;
  if (g.userData.hover) g.position.y += Math.sin(t * 5) * 0.004;
  if (g.userData.glow) { g.userData.glow = false; g.userData.pulse = true; }
  if (g.userData.pulse) g.scale.setScalar(1 + Math.sin(t * 8) * 0.06);
}

// ------------------------------------------------------------------ Enemies
function simpleEyes(parent, y, z, spread, r = 0.09) { cartoonEyes(parent, { y, z, spread, r, irisR: 0.5 }); }
export function makeEnemy(type) {
  const g = grp(); const u = g.userData; u.type = type;
  switch (type) {
    case 'spark': { // electric spark running along a power line
      const core = sph(0.16, mat('#ffffff', { emissive: '#ffffa0', emissiveIntensity: 2 }), 0, 0.3, 0, 8, false); g.add(core);
      u.rotors = []; for (let i = 0; i < 3; i++) { const r = grp(0, 0.3, 0); for (let k = 0; k < 4; k++) { const ray = P(G.box(0.05, 0.42, 0.05), mat('#fff070', { emissive: '#ffd000', emissiveIntensity: 1.5 }), 0, 0, 0); ray.rotation.z = k * Math.PI / 4 + i; r.add(ray); } g.add(r); u.rotors.push(r); }
      u.flyer = true; u.w = 0.5; u.h = 0.6; break; }
    case 'mechdog': { // NES zone 0 robot bulldog: big cream head, black brow, angry eyes, huge toothy jaw, dark back plate, jointed robot legs, antenna tail (faces +x)
      const cream = mat('#efe6d2'), dark = mat('#2e2e32'), joint = mat('#9a9aa2', { metalness: 0.5, roughness: 0.4 });
      g.add(ellipsoid(0.56, 0.44, 0.42, cream, -0.22, 0.78, 0));
      const back = ellipsoid(0.5, 0.3, 0.44, dark, -0.3, 0.98, 0); g.add(back);
      const head = grp(0.42, 0.98, 0); g.add(head); u.head = head;
      head.add(ellipsoid(0.44, 0.34, 0.42, cream, 0, 0.06, 0));
      const brow = P(G.box(0.5, 0.09, 0.7), dark, 0.0, 0.33, 0); brow.rotation.z = -0.18; head.add(outlined(brow, 1.04));
      for (const s of [-1, 1]) { const eye = ellipsoid(0.08, 0.075, 0.1, mat('#ffffff'), 0.38, 0.15, s * 0.17, false); head.add(eye); head.add(sph(0.045, dark, 0.45, 0.13, s * 0.18, 8, false)); const lid = P(G.box(0.12, 0.045, 0.16), dark, 0.42, 0.22, s * 0.17); lid.rotation.z = -0.45; head.add(lid); }
      head.add(sph(0.08, dark, 0.46, 0.02, 0, 8, false));
      const jaw = grp(0.22, -0.3, 0); jaw.scale.setScalar(0.85); head.add(jaw); u.jaw = jaw;
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), cream); bowl.scale.set(1.15, 0.85, 1.0); bowl.castShadow = true; jaw.add(outlined(bowl, 1.05));
      const inside = P(G.cyl(0.38, 0.38, 0.04, 18), mat('#4a1c1c'), 0, -0.02, 0); inside.scale.x = 1.1; jaw.add(inside);
      for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.85 + i * (Math.PI * 1.7 / 8); const tooth = P(G.cone(0.06, 0.16, 5), mat('#ffffff'), Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.36); jaw.add(tooth); }
      u.legsZ = [];
      for (const [x, z] of [[0.1, 0.22], [-0.55, 0.22], [0.1, -0.22], [-0.55, -0.22]]) { const leg = grp(x, 0.62, z); g.add(leg); leg.add(P(G.cyl(0.08, 0.08, 0.3, 8), mat('#e8e8ec'), 0, -0.15, 0)); leg.add(sph(0.08, joint, 0, -0.32, 0, 8, false)); leg.add(P(G.cyl(0.07, 0.06, 0.26, 8), mat('#e8e8ec'), 0.04, -0.46, 0)); leg.add(P(G.box(0.22, 0.07, 0.14), dark, 0.07, -0.6, 0)); u.legsZ.push(leg); }
      g.add(P(G.cyl(0.025, 0.025, 0.55, 5), dark, -0.78, 1.28, 0).rotateZ(0.35)); g.add(sph(0.07, mat('#d8d8d8'), -0.88, 1.53, 0, 8, false));
      u.w = 1.4; u.h = 1.3; u.sideView = true; break; }
    case 'bee': { const b = ellipsoid(0.38, 0.3, 0.3, mat('#f2c12e'), 0, 0.5, 0); g.add(b); for (const x of [-0.12, 0.14]) { const s = P(G.torus(0.3, 0.06), mat('#222'), x, 0.5, 0); s.rotation.y = Math.PI / 2; g.add(s); } g.add(sph(0.2, mat('#222'), 0.4, 0.55, 0, 12)); g.add(P(G.cone(0.05, 0.25, 6), mat('#222'), -0.45, 0.45, 0).rotateZ(Math.PI / 2)); simpleEyes(g, 0.62, 0.52, 0.12, 0.07); const wm = new THREE.MeshToonMaterial({ color: '#dff', transparent: true, opacity: 0.5, side: THREE.DoubleSide, gradientMap: toonRamp() }); u.wings = []; for (const s of [-1, 1]) { const w = P(G.box(0.5, 0.02, 0.22), wm, 0, 0.8, s * 0.25); w.userData.side = s; g.add(w); u.wings.push(w); } u.w = 0.8; u.h = 0.7; u.flyer = true; break; }
    case 'mechmouse': { // NES mouse: cream fur, big round ear, black eye, pointy snout, thin tail with a white spring ball (faces +x)
      const fur = mat('#e8d4b4'), dark = mat('#2a2220'), pink = mat('#c89a84');
      const body = ellipsoid(0.32, 0.28, 0.26, fur, -0.05, 0.36, 0); g.add(body); g.add(ellipsoid(0.22, 0.14, 0.2, mat('#f6ead8'), 0.04, 0.26, 0, false));
      const head = grp(0.26, 0.56, 0); g.add(head); u.head = head;
      head.add(ellipsoid(0.24, 0.2, 0.2, fur, 0, 0, 0));
      const snout = P(G.cone(0.13, 0.32, 10), fur, 0.27, -0.04, 0); snout.rotation.z = -Math.PI / 2; head.add(outlined(snout, 1.06)); head.add(sph(0.05, dark, 0.44, -0.04, 0, 8, false));
      for (const s of [-1, 1]) { head.add(sph(0.055, dark, 0.13, 0.06, s * 0.15, 8, false)); head.add(sph(0.018, mat('#ffffff'), 0.16, 0.08, s * 0.19, 6, false)); }
      for (const s of [-1, 1]) { const ear = P(G.cyl(0.19, 0.19, 0.05, 16), fur, -0.06, 0.24, s * 0.11); ear.rotation.x = Math.PI / 2; ear.rotation.y = s * 0.3; head.add(outlined(ear, 1.08)); const inner = P(G.cyl(0.12, 0.12, 0.06, 14), pink, -0.05, 0.24, s * 0.12); inner.rotation.x = Math.PI / 2; inner.rotation.y = s * 0.3; head.add(inner); }
      u.legsZ = []; for (const x of [0.12, -0.2]) { const leg = grp(x, 0.18, 0); g.add(leg); leg.add(ellipsoid(0.11, 0.07, 0.16, dark, 0.04, -0.12, 0, false)); u.legsZ.push(leg); }
      g.add(tube([[-0.34, 0.34, 0], [-0.55, 0.5, 0], [-0.62, 0.78, 0], [-0.55, 0.98, 0]], 0.025, mat('#f4f4f4'))); g.add(sph(0.08, mat('#ffffff'), -0.53, 1.05, 0, 10));
      u.w = 0.9; u.h = 0.85; u.sideView = true; break; }
    case 'rat': { const fur = mat('#9a7b5a'); g.add(ellipsoid(0.42, 0.34, 0.3, fur, 0, 0.42, 0)); g.add(ellipsoid(0.28, 0.26, 0.26, fur, 0.45, 0.6, 0)); g.add(ellipsoid(0.16, 0.12, 0.14, mat('#e0c0a0'), 0.68, 0.52, 0, false)); g.add(sph(0.06, mat('#222'), 0.82, 0.54, 0, 8, false)); simpleEyes(g, 0.68, 0.58, 0.12, 0.07); for (const s of [-1, 1]) g.add(ellipsoid(0.1, 0.11, 0.04, mat('#e0a0a0'), 0.45, 0.85, s * 0.18)); g.add(outlined(tube([[-0.35, 0.4, 0], [-0.7, 0.3, 0.1], [-0.95, 0.5, 0.2]], 0.04, mat('#e0a0a0')), 1.1)); u.legs = []; for (const x of [-0.2, 0.25]) { const l = P(G.cyl(0.06, 0.06, 0.25, 6), fur, x, 0.12, 0); g.add(l); u.legs.push(l); } u.w = 1.2; u.h = 0.9; break; }
    case 'crab': { const m = mat('#e04040'); g.add(ellipsoid(0.6, 0.3, 0.42, m, 0, 0.4, 0)); simpleEyes(g, 0.72, 0.1, 0.18, 0.08); u.claws = []; for (const s of [-1, 1]) { const c = grp(s * 0.65, 0.5, 0.1); g.add(c); c.add(sph(0.2, m, 0, 0, 0, 12)); c.add(P(G.box(0.25, 0.1, 0.1), m, s * 0.2, 0.08, 0)); u.claws.push(c); } u.legs = []; for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const l = P(G.cyl(0.04, 0.04, 0.4, 5), m, s * (0.3 + i * 0.15), 0.2, -0.3 + i * 0.3); l.rotation.z = s * 0.6; g.add(l); u.legs.push(l); } u.w = 1.3; u.h = 0.8; break; }
    case 'spider': { const m = mat('#2a2a2a'); g.add(sph(0.32, m, 0, 0.4, 0, 14)); g.add(sph(0.2, m, 0.35, 0.45, 0, 12)); simpleEyes(g, 0.5, 0.15, 0.1, 0.06); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const l = P(G.cyl(0.03, 0.03, 0.6, 4), m, (i - 1.5) * 0.15, 0.35, s * 0.4); l.rotation.x = s * 1.0; g.add(l); } u.thread = P(G.cyl(0.01, 0.01, 1, 4), mat('#ddd'), 0, 1.2, 0); g.add(u.thread); u.w = 0.8; u.h = 0.7; u.hanger = true; break; }
    case 'wasphive': { g.add(outlined(P(G.cone(0.5, 1.0, 12), mat('#a04030'), 0, 0.5, 0).rotateX(Math.PI))); g.add(sph(0.42, mat('#b85040'), 0, 1.0, 0, 14)); g.add(P(G.cyl(0.02, 0.02, 1.2, 4), mat('#8a6a30'), 0, 1.9, 0)); g.add(sph(0.12, mat('#111'), 0, 0.5, 0.42, 8, false)); u.w = 0.9; u.h = 1.4; u.hanger = true; u.spawner = 'bee'; break; }
    case 'frog': { const m = mat('#48b048'); g.add(ellipsoid(0.46, 0.34, 0.42, m, 0, 0.42, 0)); g.add(ellipsoid(0.3, 0.25, 0.2, mat('#d0f0a0'), 0, 0.3, 0.22, false)); for (const s of [-1, 1]) { g.add(sph(0.14, m, s * 0.25, 0.8, 0.1, 10)); } simpleEyes(g, 0.82, 0.22, 0.25, 0.09); g.add(P(G.box(0.3, 0.02, 0.02), mat('#1a4a1a'), 0, 0.5, 0.42)); u.legs = []; for (const s of [-1, 1]) { const l = ellipsoid(0.18, 0.11, 0.25, m, s * 0.4, 0.18, -0.1); g.add(l); u.legs.push(l); } u.w = 1.0; u.h = 0.9; u.jumper = true; break; }
    case 'lizard': { const m = mat('#60b040'); g.add(ellipsoid(0.66, 0.24, 0.3, m, 0, 0.3, 0)); g.add(sph(0.22, m, 0.7, 0.4, 0, 12)); simpleEyes(g, 0.5, 0.1, 0.12, 0.06); g.add(outlined(tube([[-0.6, 0.3, 0], [-0.95, 0.35, 0.05], [-1.2, 0.55, 0.1]], 0.08, m), 1.1)); for (const x of [-0.3, 0.35]) for (const s of [-1, 1]) g.add(P(G.cyl(0.05, 0.05, 0.3, 5), m, x, 0.15, s * 0.3)); u.w = 1.6; u.h = 0.6; break; }
    case 'copter': { const m = mat('#e8c020'); g.add(ellipsoid(0.52, 0.35, 0.35, m, 0, 0.5, 0)); g.add(P(G.box(0.8, 0.12, 0.12), m, -0.7, 0.6, 0)); g.add(P(G.box(0.12, 0.35, 0.05), mat('#e04040'), -1.05, 0.75, 0)); g.add(P(G.cyl(0.04, 0.04, 0.3, 6), mat('#333'), 0, 0.95, 0)); u.rotor = P(G.box(1.6, 0.04, 0.12), mat('#333'), 0, 1.1, 0); g.add(u.rotor); g.add(sph(0.22, mat('#a0e0ff', { transparent: true, opacity: 0.6 }), 0.35, 0.6, 0, 10, false)); for (const s of [-1, 1]) g.add(P(G.box(0.8, 0.05, 0.05), mat('#333'), 0, 0.15, s * 0.22)); u.w = 1.4; u.h = 1.0; u.flyer = true; break; }
    case 'robot': { const m = mat('#d04040', { metalness: 0.4 }); g.add(outlined(P(G.box(0.8, 0.9, 0.5), m, 0, 0.85, 0))); g.add(outlined(P(G.box(0.55, 0.45, 0.45), mat('#c0c8d0', { metalness: 0.6 }), 0, 1.55, 0))); g.add(P(G.box(0.4, 0.12, 0.05), mat('#40e0ff', { emissive: '#40e0ff', emissiveIntensity: 0.8 }), 0, 1.6, 0.24)); g.add(P(G.cyl(0.03, 0.03, 0.3, 4), mat('#888'), 0, 1.9, 0)); g.add(sph(0.07, mat('#ff4040', { emissive: '#f00', emissiveIntensity: 1 }), 0, 2.05, 0, 6, false)); u.legs = []; for (const s of [-1, 1]) { const l = P(G.box(0.26, 0.45, 0.3), mat('#888', { metalness: 0.6 }), s * 0.22, 0.22, 0); g.add(l); u.legs.push(l); g.add(P(G.box(0.18, 0.7, 0.2), mat('#888', { metalness: 0.6 }), s * 0.55, 0.85, 0)); } u.w = 1.1; u.h = 2.0; break; }
    case 'bat': { const m = mat('#303040'); g.add(sph(0.25, m, 0, 0.5, 0, 12)); simpleEyes(g, 0.55, 0.18, 0.1, 0.06); for (const s of [-1, 1]) g.add(P(G.cone(0.08, 0.2, 5), m, s * 0.15, 0.75, 0)); u.wings = []; for (const s of [-1, 1]) { const w = P(G.box(0.7, 0.03, 0.4), m, s * 0.5, 0.55, 0); w.userData.side = s; g.add(w); u.wings.push(w); } u.w = 1.2; u.h = 0.6; u.flyer = true; break; }
    case 'pirat': { const fur = mat('#8a7a6a'); g.add(ellipsoid(0.32, 0.38, 0.29, fur, 0, 0.6, 0)); g.add(sph(0.3, fur, 0, 1.15, 0.05, 14)); g.add(ellipsoid(0.18, 0.14, 0.16, mat('#d0c0b0'), 0, 1.05, 0.28, false)); g.add(sph(0.06, mat('#222'), 0, 1.08, 0.45, 8, false)); g.add(sph(0.08, mat('#fff'), -0.13, 1.22, 0.24, 8, false)); g.add(sph(0.04, mat('#111'), -0.13, 1.22, 0.3, 6, false)); g.add(P(G.box(0.16, 0.12, 0.05), mat('#111'), 0.13, 1.22, 0.28)); g.add(outlined(P(G.box(0.7, 0.3, 0.7), mat('#222'), 0, 1.45, 0))); g.add(P(G.box(0.2, 0.15, 0.02), mat('#fff'), 0, 1.48, 0.36)); g.add(P(G.box(0.5, 0.3, 0.1), mat('#e03030'), 0, 0.6, 0.28)); for (const s of [-1, 1]) g.add(P(G.cyl(0.07, 0.07, 0.3, 6), fur, s * 0.14, 0.15, 0)); g.add(P(G.cyl(0.03, 0.03, 0.9, 5), mat('#c0c0c0', { metalness: 0.8 }), 0.45, 0.9, 0.1).rotateZ(-0.6)); u.w = 0.8; u.h = 1.6; break; }
    case 'rhino': { const m = mat('#8a8a90'); g.add(ellipsoid(0.65, 0.5, 0.5, m, 0, 0.7, 0)); g.add(sph(0.35, m, 0.6, 0.9, 0, 12)); g.add(P(G.cone(0.1, 0.4, 6), mat('#e8e0d0'), 0.95, 1.05, 0).rotateZ(-1.2)); g.add(sph(0.4, mat('#2050c0'), 0.55, 1.1, 0, 12)); g.add(P(G.box(0.5, 0.1, 0.5), mat('#c0c0c0'), 0.8, 0.9, 0)); for (const x of [-0.35, 0.35]) for (const s of [-1, 1]) g.add(P(G.cyl(0.12, 0.12, 0.4, 6), m, x, 0.2, s * 0.25)); g.add(P(G.box(0.6, 0.5, 0.1), mat('#e03030'), -0.1, 0.8, 0.5)); u.w = 1.6; u.h = 1.5; u.charger = true; break; }
    case 'antbot': { const m = mat('#505860', { metalness: 0.7, roughness: 0.3 }); for (const [x, r] of [[-0.4, 0.28], [0, 0.22], [0.4, 0.26]]) g.add(sph(r, m, x, 0.4, 0, 10)); for (const s of [-1, 1]) g.add(sph(0.06, mat('#40ff80', { emissive: '#40ff80', emissiveIntensity: 1 }), 0.6, 0.5, s * 0.1, 6, false)); for (const s of [-1, 1]) g.add(P(G.cyl(0.02, 0.02, 0.4, 4), m, 0.55, 0.75, s * 0.1).rotateZ(-s * 0.3)); u.legs = []; for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const l = P(G.cyl(0.03, 0.03, 0.4, 4), m, (i - 1) * 0.3, 0.2, s * 0.3); l.rotation.x = s * 0.9; g.add(l); u.legs.push(l); } u.w = 1.2; u.h = 0.7; break; }
    case 'jellyfish': { const m = new THREE.MeshToonMaterial({ color: '#c080ff', transparent: true, opacity: 0.7, emissive: '#6020c0', emissiveIntensity: 0.4, gradientMap: toonRamp() }); const dome = P(G.sph(0.45, 14), m, 0, 0.7, 0); dome.scale.y = 0.7; g.add(dome); u.tentacles = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const t = P(G.cyl(0.03, 0.02, 0.7, 4), m, Math.cos(a) * 0.25, 0.25, Math.sin(a) * 0.25); g.add(t); u.tentacles.push(t); } u.w = 0.9; u.h = 1.2; u.flyer = true; break; }
    case 'kangarat': { const fur = mat('#b08060'); g.add(ellipsoid(0.35, 0.45, 0.32, fur, 0, 0.75, 0)); g.add(sph(0.28, fur, 0, 1.3, 0.1, 14)); g.add(ellipsoid(0.15, 0.12, 0.14, mat('#e0c0a0'), 0, 1.22, 0.3, false)); simpleEyes(g, 1.38, 0.3, 0.12, 0.07); for (const s of [-1, 1]) g.add(ellipsoid(0.11, 0.16, 0.05, fur, s * 0.22, 1.58, 0)); for (const s of [-1, 1]) g.add(sph(0.17, mat('#e03030'), s * 0.45, 0.95, 0.2, 12)); u.legs = []; for (const s of [-1, 1]) { const l = P(G.box(0.2, 0.3, 0.5), fur, s * 0.2, 0.15, 0.1); g.add(l); u.legs.push(l); } g.add(outlined(tube([[-0.3, 0.5, 0], [-0.7, 0.3, 0], [-1.0, 0.45, 0.1]], 0.09, fur), 1.1)); u.w = 0.9; u.h = 1.7; u.jumper = true; break; }
    case 'firefly': { const m = mat('#404020'); g.add(sph(0.18, m, 0, 0.5, 0, 10)); g.add(sph(0.16, mat('#f0ff60', { emissive: '#e0ff40', emissiveIntensity: 1.5 }), -0.22, 0.45, 0, 10, false)); simpleEyes(g, 0.55, 0.14, 0.08, 0.05); const wm = new THREE.MeshToonMaterial({ color: '#dff', transparent: true, opacity: 0.5, side: THREE.DoubleSide, gradientMap: toonRamp() }); u.wings = []; for (const s of [-1, 1]) { const w = P(G.box(0.35, 0.02, 0.14), wm, 0, 0.68, s * 0.18); w.userData.side = s; g.add(w); u.wings.push(w); } const l = new THREE.PointLight('#e0ff40', 0.8, 5); l.position.set(0, 0.5, 0.3); g.add(l); u.w = 0.6; u.h = 0.6; u.flyer = true; break; }
    case 'drone': { const m = mat('#404850', { metalness: 0.7, roughness: 0.3 }); g.add(outlined(P(G.box(0.6, 0.25, 0.6), m, 0, 0.5, 0))); g.add(sph(0.14, mat('#ff3030', { emissive: '#f00', emissiveIntensity: 1 }), 0, 0.45, 0.3, 8, false)); u.rotors = []; for (const x of [-1, 1]) for (const z of [-1, 1]) { g.add(P(G.box(0.5, 0.05, 0.05), m, x * 0.5, 0.5, z * 0.5)); const r = P(G.box(0.5, 0.02, 0.08), mat('#222'), x * 0.75, 0.6, z * 0.75); g.add(r); u.rotors.push(r); } g.add(P(G.cone(0.08, 0.3, 6), mat('#ccc'), 0, 0.2, 0).rotateX(Math.PI)); u.w = 1.6; u.h = 0.7; u.flyer = true; u.shooter = true; break; }
    case 'snailbomb': { g.add(sph(0.4, mat('#222'), 0, 0.55, 0, 14)); g.add(P(G.cyl(0.08, 0.08, 0.15, 6), mat('#888'), 0, 0.98, 0)); g.add(P(G.cyl(0.02, 0.02, 0.25, 4), mat('#d0a060'), 0.05, 1.15, 0).rotateZ(-0.3)); g.add(sph(0.06, mat('#ffa020', { emissive: '#ff6000', emissiveIntensity: 1.5 }), 0.1, 1.28, 0, 6, false)); g.add(ellipsoid(0.4, 0.2, 0.25, mat('#c0a060'), 0.45, 0.25, 0)); for (const s of [-1, 1]) { g.add(P(G.cyl(0.02, 0.02, 0.3, 4), mat('#c0a060'), 0.75, 0.5, s * 0.1).rotateZ(-0.4)); g.add(sph(0.04, mat('#111'), 0.85, 0.66, s * 0.1, 6, false)); } u.w = 1.3; u.h = 1.2; u.bomb = true; break; }
    default: g.add(P(G.box(0.8, 0.8, 0.8), mat('#ff00ff'), 0, 0.4, 0)); u.w = 0.8; u.h = 0.8;
  }
  return g;
}
export function animateEnemy(g, dt, t, vx) {
  const u = g.userData; const sw = Math.sin(t * 12);
  if (u.legs) u.legs.forEach((l, i) => { l.rotation.x = (u.legs.length > 2 ? Math.sin(t * 12 + i) : 0) * 0.5; if (u.legs.length === 2) l.rotation.x = (i ? sw : -sw) * 0.6; });
  if (u.wings) u.wings.forEach(w => { w.rotation.x = w.userData.side * Math.sin(t * 50) * 0.6; });
  if (u.rotor) u.rotor.rotation.y = t * 30;
  if (u.rotors) u.rotors.forEach((r, i) => r.rotation.y = t * 40 + i);
  if (u.wheel) u.wheel.rotation.z -= vx * dt * 4;
  if (u.legsZ) u.legsZ.forEach((l, i) => { l.rotation.z = (i % 2 ? 1 : -1) * Math.sin(t * 14) * (Math.abs(vx) > 0.1 ? 0.55 : 0.08); });
  if (u.jaw && u.type === 'mechdog') u.jaw.rotation.z = -0.15 - Math.abs(Math.sin(t * 6)) * 0.25; // chomping
  if (u.claws) u.claws.forEach((c, i) => c.rotation.z = Math.sin(t * 6 + i) * 0.3);
  if (u.tentacles) u.tentacles.forEach((tt, i) => tt.rotation.x = Math.sin(t * 4 + i) * 0.3);
  if (u.flyer && !u.hanger) g.position.y += Math.sin(t * 6) * 0.003;
}

// ------------------------------------------------------------------ Bosses
export function makeBoss(type) {
  const g = grp(); const u = g.userData; u.type = type;
  const eyesBig = (parent, y, z, spread, r) => cartoonEyes(parent, { y, z, spread, r, irisR: 0.5 });
  switch (type) {
    case 'brusher': { // zone 0 boss as in the NES original: a purple striped column on a base, white jointed arms with gloves and brushes, a sprout on top
      const purple = mat('#9a3cc8'), pink = mat('#f070c8'), white = mat('#f4f4f4'), bristle = mat('#c08850'), wood = mat('#7a4a22');
      g.add(outlined(P(G.cyl(1.1, 1.3, 0.5, 18), mat('#5a2a80'), 0, 0.25, 0)));
      for (let i = 0; i < 13; i++) g.add(outlined(P(G.cyl(0.72, 0.72, 0.5, 18), i % 2 ? pink : purple, 0, 0.75 + i * 0.52, 0), 1.03));
      u.head = grp(0, 7.6, 0); g.add(u.head);
      u.head.add(outlined(P(G.cyl(0.5, 0.75, 0.5, 14), mat('#3a1a50'), 0, 0, 0)));
      for (const sx of [-1, 1]) { const leaf = ellipsoid(0.22, 0.5, 0.12, mat('#38c838'), sx * 0.22, 0.6, 0); leaf.rotation.z = -sx * 0.6; u.head.add(leaf); }
      u.arms = [];
      // [shoulder height, hand x, hand y, kind]  (gloves = the two guns, measured: (-4.6, 5.1) and (3.75, 7.5))
      for (const [sy, hx, hy, kind] of [[4.6, -4.6, 5.1, 'glove'], [6.4, 3.75, 7.5, 'glove'], [2.0, -3.4, 1.4, 'brush'], [3.0, 3.6, 2.4, 'brush']]) {
        const a = grp(0, 0, 0); g.add(a); const sxp = Math.sign(hx) * 0.7;
        const elbow = [sxp + (hx - sxp) * 0.5, sy + (hy - sy) * 0.5 + 0.9];
        for (const [x0, y0, x1, y1] of [[sxp, sy, elbow[0], elbow[1]], [elbow[0], elbow[1], hx, hy]]) {
          const len = Math.hypot(x1 - x0, y1 - y0); const bone = P(G.cyl(0.13, 0.13, len, 8), white, (x0 + x1) / 2, (y0 + y1) / 2, 0); bone.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2; a.add(outlined(bone));
          a.add(sph(0.22, white, x1, y1, 0, 10));
        }
        if (kind === 'glove') { a.add(ellipsoid(0.45, 0.38, 0.3, white, hx + Math.sign(hx) * 0.3, hy, 0)); for (let f = 0; f < 3; f++) a.add(P(G.cyl(0.09, 0.09, 0.35, 6), white, hx + Math.sign(hx) * 0.75, hy + 0.2 - f * 0.18, 0).rotateZ(Math.PI / 2)); }
        else { a.add(outlined(P(G.box(1.1, 0.3, 0.5), wood, hx, hy - 0.25, 0))); for (let b = 0; b < 5; b++) a.add(P(G.box(0.12, 0.35, 0.4), bristle, hx - 0.45 + b * 0.22, hy - 0.55, 0)); }
        u.arms.push(a);
      }
      u.core = null; u.noContact = true; u.weakY = 7.75; u.bodyW = 1.4; u.bodyH = 8; u.w = 9; u.h = 8.6; break; }
    case 'owl': { const fe = mat('#8a6a48'); g.add(ellipsoid(1.0, 1.3, 0.9, fe, 0, 1.3, 0)); g.add(ellipsoid(0.7, 0.9, 0.5, mat('#d8c0a0'), 0, 1.1, 0.4, false)); const head = grp(0, 2.6, 0.1); g.add(head); u.head = head; head.add(sph(0.8, fe, 0, 0, 0, 16)); for (const s of [-1, 1]) { head.add(sph(0.32, mat('#f0e0b0'), s * 0.34, 0.1, 0.6, 12, false)); head.add(P(G.cone(0.2, 0.5, 6), fe, s * 0.5, 0.75, 0)); } eyesBig(head, 0.1, 0.78, 0.34, 0.2); head.add(P(G.cone(0.15, 0.4, 6), mat('#f0a020'), 0, -0.15, 0.85).rotateX(Math.PI / 2)); u.wings = []; for (const s of [-1, 1]) { const w = grp(s * 0.9, 1.6, 0); g.add(w); w.add(ellipsoid(0.8, 0.9, 0.15, fe, s * 0.8, -0.5, 0)); u.wings.push(w); } for (const s of [-1, 1]) g.add(P(G.cyl(0.12, 0.12, 0.5, 6), mat('#f0a020'), s * 0.35, 0.2, 0.2)); u.w = 2.6; u.h = 3.5; u.flyer = true; break; }
    case 'rocket': { const m = mat('#e0e0e8', { metalness: 0.5, roughness: 0.3 }); g.add(outlined(P(G.cyl(0.8, 0.8, 2.4, 16), m, 0, 2.0, 0))); g.add(outlined(P(G.cone(0.8, 1.4, 16), mat('#e03030'), 0, 3.9, 0))); for (let i = 0; i < 3; i++) { const f = P(G.box(0.12, 1.2, 0.8), mat('#e03030'), Math.cos(i * 2.09) * 0.9, 0.9, Math.sin(i * 2.09) * 0.9); f.rotation.y = -i * 2.09; g.add(f); } g.add(P(G.cyl(0.5, 0.6, 0.4, 12), mat('#555'), 0, 0.6, 0)); u.flame = P(G.cone(0.45, 1.2, 10), mat('#ffa020', { emissive: '#ff6000', emissiveIntensity: 1.2 }), 0, -0.2, 0); u.flame.rotation.x = Math.PI; g.add(u.flame); g.add(sph(0.4, mat('#80c0ff', { transparent: true, opacity: 0.6 }), 0, 2.6, 0.6, 12, false)); eyesBig(g, 2.5, 0.8, 0.2, 0.1); u.w = 1.8; u.h = 4.5; u.flyer = true; break; }
    case 'robot': { const m = mat('#3060d0', { metalness: 0.4 }); g.add(outlined(P(G.box(1.8, 2.0, 1.1), m, 0, 2.1, 0))); g.add(outlined(P(G.box(1.2, 1.0, 1.0), mat('#c0c8d0', { metalness: 0.6 }), 0, 3.6, 0))); g.add(P(G.box(0.9, 0.25, 0.05), mat('#ff4040', { emissive: '#ff2020', emissiveIntensity: 1 }), 0, 3.7, 0.52)); g.add(P(G.cyl(0.05, 0.05, 0.6, 4), mat('#888'), 0, 4.4, 0)); g.add(sph(0.15, mat('#ffff40', { emissive: '#ff0', emissiveIntensity: 1 }), 0, 4.7, 0, 8, false)); g.add(P(G.box(1.0, 0.3, 0.1), mat('#f0c020'), 0, 2.4, 0.56)); u.arms = []; for (const s of [-1, 1]) { const a = grp(s * 1.2, 2.9, 0); g.add(a); a.add(P(G.box(0.5, 1.6, 0.5), mat('#888', { metalness: 0.6 }), 0, -0.7, 0)); a.add(sph(0.4, mat('#e03030'), 0, -1.6, 0, 10)); u.arms.push(a); } u.legs = []; for (const s of [-1, 1]) { const l = P(G.box(0.6, 1.1, 0.7), mat('#888', { metalness: 0.6 }), s * 0.5, 0.55, 0); g.add(l); u.legs.push(l); } u.w = 2.6; u.h = 4.8; break; }
    case 'grouper': { const m = mat('#40b060'); g.add(ellipsoid(1.9, 1.3, 1.0, m, 0, 1.3, 0)); g.add(ellipsoid(1.1, 0.8, 0.8, mat('#c0f0c0'), 0.3, 1.0, 0.3, false)); eyesBig(g, 1.7, 0.75, 0.6, 0.22); g.add(P(G.box(1.2, 0.3, 0.6), mat('#208040'), 1.6, 1.0, 0)); g.add(P(G.box(1.2, 1.6, 0.2), m, -1.9, 1.3, 0)); g.add(P(G.box(0.8, 0.9, 0.15), m, 0, 2.6, 0)); u.w = 3.5; u.h = 2.8; u.swimmer = true; break; }
    case 'casinocat': { const fur = mat('#e0b060'); g.add(ellipsoid(0.9, 1.15, 0.8, mat('#5040a0'), 0, 1.6, 0)); g.add(P(G.box(0.25, 1.2, 0.05), mat('#e03030'), 0, 1.7, 0.85)); const head = grp(0, 3.0, 0); g.add(head); u.head = head; head.add(sph(0.7, fur, 0, 0, 0, 16)); for (const s of [-1, 1]) head.add(P(G.cone(0.22, 0.5, 6), fur, s * 0.45, 0.65, 0)); eyesBig(head, 0.15, 0.6, 0.28, 0.14); head.add(sph(0.14, mat('#e07080'), 0, -0.1, 0.72, 8, false)); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) head.add(P(G.cyl(0.015, 0.015, 0.8, 4), mat('#eee'), s * 0.5, -0.15 + i * 0.08, 0.6).rotateZ(Math.PI / 2 + s * (i - 1) * 0.15)); head.add(P(G.cyl(0.45, 0.5, 0.35, 12), mat('#222'), 0, 0.75, 0)); head.add(P(G.cyl(0.7, 0.7, 0.06, 16), mat('#222'), 0, 0.6, 0)); u.arms = []; for (const s of [-1, 1]) { const a = grp(s * 0.95, 2.0, 0.2); g.add(a); a.add(P(G.cyl(0.2, 0.2, 1.4, 8), mat('#5040a0'), 0, -0.6, 0)); a.add(sph(0.3, fur, 0, -1.4, 0, 10)); u.arms.push(a); } for (const s of [-1, 1]) g.add(P(G.cyl(0.25, 0.3, 0.7, 8), mat('#5040a0'), s * 0.4, 0.35, 0)); u.w = 2.2; u.h = 4.0; u.thrower = true; break; }
    case 'caterpillar': { u.segs = []; const cols = ['#60c040', '#80d050']; for (let i = 0; i < 7; i++) { const s = sph(0.55, mat(cols[i % 2]), -i * 0.95, 0.6, 0, 14); g.add(s); u.segs.push(s); for (const z of [-1, 1]) g.add(P(G.cyl(0.06, 0.06, 0.5, 5), mat('#306020'), -i * 0.95, 0.2, z * 0.4)); } const head = grp(0.6, 0.9, 0); g.add(head); u.head = head; head.add(sph(0.7, mat('#e04040'), 0, 0, 0, 16)); eyesBig(head, 0.15, 0.6, 0.3, 0.16); for (const s of [-1, 1]) { head.add(P(G.cyl(0.03, 0.03, 0.7, 4), mat('#222'), s * 0.3, 0.8, 0).rotateZ(-s * 0.3)); head.add(sph(0.1, mat('#f0c020'), s * 0.42, 1.15, 0, 6, false)); } head.add(P(G.torus(0.2, 0.05), mat('#222'), 0, -0.2, 0.68)); u.w = 7; u.h = 1.8; break; }
    case 'fatcat': case 'fatcatfinal': { const fur = mat('#9a9aa0'); g.add(ellipsoid(1.45, 1.7, 1.3, mat('#6a40b0'), 0, 1.9, 0)); g.add(ellipsoid(0.95, 1.2, 0.6, mat('#f0f0f8'), 0, 1.6, 0.85, false)); g.add(P(G.box(0.3, 1.4, 0.05), mat('#e03030'), 0, 2.2, 1.3)); const head = grp(0, 4.0, 0); g.add(head); u.head = head; head.add(sph(1.0, fur, 0, 0, 0, 18)); head.add(ellipsoid(0.65, 0.5, 0.5, mat('#f0f0f8'), 0, -0.3, 0.7, false)); for (const s of [-1, 1]) { head.add(P(G.cone(0.3, 0.6, 6), fur, s * 0.6, 0.95, 0)); head.add(P(G.box(0.6, 0.12, 0.1), mat('#444'), s * 0.4, 0.5, 0.9).rotateZ(-s * 0.4)); } cartoonEyes(head, { y: 0.2, z: 0.85, spread: 0.38, r: 0.2, iris: '#e0c030', irisR: 0.55 }); head.add(sph(0.2, mat('#e08090'), 0, -0.05, 1.05, 10, false)); u.cigar = P(G.cyl(0.08, 0.08, 1.0, 8), mat('#6a4020'), 0.5, -0.4, 1.1); u.cigar.rotation.z = Math.PI / 2 - 0.4; head.add(u.cigar); head.add(sph(0.09, mat('#ff6020', { emissive: '#ff4000', emissiveIntensity: 1.5 }), 0.98, -0.2, 1.1, 6, false)); head.add(P(G.cyl(0.55, 0.6, 0.4, 12), mat('#2a2a2a'), 0, 1.0, 0)); head.add(P(G.cyl(0.9, 0.9, 0.08, 16), mat('#2a2a2a'), 0, 0.8, 0)); u.arms = []; for (const s of [-1, 1]) { const a = grp(s * 1.4, 2.6, 0.3); g.add(a); a.add(P(G.cyl(0.3, 0.3, 1.8, 8), mat('#6a40b0'), 0, -0.8, 0)); a.add(sph(0.4, fur, 0, -1.8, 0, 10)); u.arms.push(a); } for (const s of [-1, 1]) g.add(P(G.cyl(0.4, 0.45, 0.9, 8), mat('#6a40b0'), s * 0.6, 0.45, 0)); g.add(outlined(tube([[-1.2, 0.6, -0.5], [-1.9, 0.9, -0.5], [-2.3, 1.6, -0.3]], 0.22, fur), 1.08)); if (type === 'fatcatfinal') { const mech = grp(0, -0.4, 0); g.add(mech); mech.add(P(G.cyl(2.2, 2.6, 1.2, 16), mat('#505860', { metalness: 0.6 }), 0, 0, 0)); for (let i = 0; i < 4; i++) mech.add(P(G.cone(0.6, 1.4, 8), mat('#ff8020', { emissive: '#ff4000', emissiveIntensity: 1 }), Math.cos(i * 1.57) * 1.6, -1.0, Math.sin(i * 1.57) * 1.6).rotateX(Math.PI)); u.hover = true; } u.w = 3.2; u.h = 5.4; break; }
    case 'nimdrone': { const m = mat('#505860', { metalness: 0.7, roughness: 0.3 }); g.add(outlined(P(G.cyl(1.6, 1.8, 0.8, 16), m, 0, 1.5, 0))); g.add(P(G.sph(1.0, 14), mat('#80e0ff', { transparent: true, opacity: 0.5 }), 0, 2.4, 0)); u.core = sph(0.4, mat('#ff4040', { emissive: '#ff2020', emissiveIntensity: 1.5 }), 0, 2.4, 0, 10, false); g.add(u.core); u.rotors = []; for (let i = 0; i < 4; i++) { const a = i * 1.57; g.add(P(G.box(1.6, 0.1, 0.1), m, Math.cos(a) * 1.6, 1.9, Math.sin(a) * 1.6).rotateY(-a)); const r = P(G.box(1.4, 0.04, 0.2), mat('#222'), Math.cos(a) * 2.4, 2.1, Math.sin(a) * 2.4); g.add(r); u.rotors.push(r); } g.add(P(G.cyl(0.3, 0.4, 1.0, 8), mat('#333'), 0, 0.6, 0)); u.w = 4; u.h = 3.2; u.flyer = true; break; }
    case 'squid': { const m = mat('#e05090'); g.add(ellipsoid(1.1, 1.8, 1.1, m, 0, 3.0, 0)); eyesBig(g, 2.8, 0.95, 0.5, 0.3); g.add(outlined(P(G.box(1.2, 0.5, 0.5), mat('#222'), 0, 4.4, 0.6))); g.add(P(G.box(0.4, 0.3, 0.05), mat('#fff'), 0, 4.5, 0.86)); u.tentacles = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const t = P(G.cyl(0.2, 0.08, 2.2, 6), m, Math.cos(a) * 0.7, 0.9, Math.sin(a) * 0.7); t.rotation.x = Math.sin(a) * 0.4; t.rotation.z = -Math.cos(a) * 0.4; g.add(t); u.tentacles.push(t); } u.w = 3.2; u.h = 5; u.swimmer = true; break; }
    case 'siamese': { u.cats = []; for (const s of [-1, 1]) { const c = grp(s * 1.0, 0, 0); g.add(c); const fur = mat('#e8d8c0'); c.add(ellipsoid(0.7, 0.9, 0.65, mat(s < 0 ? '#c02020' : '#2040c0'), 0, 1.4, 0)); const head = grp(0, 2.6, 0); c.add(head); head.add(sph(0.6, fur, 0, 0, 0, 14)); head.add(ellipsoid(0.4, 0.35, 0.35, mat('#4a3020'), 0, -0.15, 0.4, false)); for (const q of [-1, 1]) head.add(P(G.cone(0.2, 0.45, 6), mat('#4a3020'), q * 0.4, 0.6, 0)); cartoonEyes(head, { y: 0.1, z: 0.52, spread: 0.25, r: 0.14, iris: '#40a0ff' }); head.add(P(G.cyl(0.5, 0.65, 0.35, 10), mat('#e8c040'), 0, 0.75, 0)); for (const q of [-1, 1]) c.add(P(G.cyl(0.22, 0.25, 0.7, 8), mat(s < 0 ? '#c02020' : '#2040c0'), q * 0.35, 0.35, 0)); const a = grp(s * 0.8, 1.9, 0.2); c.add(a); a.add(P(G.cyl(0.15, 0.15, 1.2, 8), mat(s < 0 ? '#c02020' : '#2040c0'), 0, -0.5, 0)); a.add(sph(0.22, fur, 0, -1.1, 0, 8)); u.cats.push({ c, a }); } g.add(P(G.box(0.6, 0.4, 0.6), mat('#e8c040'), 0, 2.0, 0)); u.w = 4; u.h = 3.6; break; }
    case 'capone': { const fur = mat('#8a8a8a'); g.add(ellipsoid(0.9, 1.25, 0.8, mat('#303040'), 0, 1.7, 0)); g.add(P(G.box(0.2, 1.6, 0.05), mat('#f0f0f0'), 0, 1.8, 0.85)); g.add(P(G.box(0.3, 0.5, 0.05), mat('#e03030'), 0, 2.4, 0.86)); const head = grp(0, 3.2, 0.1); g.add(head); u.head = head; head.add(sph(0.7, fur, 0, 0, 0, 16)); head.add(ellipsoid(0.4, 0.3, 0.4, mat('#c0b0a0'), 0, -0.1, 0.6, false)); head.add(sph(0.14, mat('#222'), 0, -0.02, 0.98, 8, false)); eyesBig(head, 0.2, 0.55, 0.3, 0.13); for (const s of [-1, 1]) head.add(P(G.cyl(0.25, 0.25, 0.08, 10), mat('#c0b0a0'), s * 0.6, 0.5, 0)); head.add(P(G.cyl(0.55, 0.6, 0.4, 12), mat('#303040'), 0, 0.85, 0)); head.add(P(G.cyl(0.9, 0.9, 0.08, 16), mat('#303040'), 0, 0.65, 0)); head.add(P(G.box(1.2, 0.1, 0.1), mat('#f0f0f0'), 0, 0.7, 0)); u.arms = []; for (const s of [-1, 1]) { const a = grp(s * 1.0, 2.3, 0.2); g.add(a); a.add(P(G.cyl(0.2, 0.2, 1.4, 8), mat('#303040'), 0, -0.6, 0)); a.add(sph(0.3, fur, 0, -1.4, 0, 10)); u.arms.push(a); } g.add(P(G.cyl(0.08, 0.06, 1.8, 6), fur, -0.8, 0.6, -0.3).rotateZ(1.1)); for (const s of [-1, 1]) g.add(P(G.cyl(0.25, 0.3, 0.7, 8), mat('#303040'), s * 0.4, 0.35, 0)); g.add(P(G.box(1.2, 0.25, 0.6), mat('#222'), 0.8, 1.6, 0.6)); u.w = 2.2; u.h = 4.2; u.thrower = true; break; }
    case 'dinoskel': { const bone = mat('#f0ece0'); for (let i = 0; i < 8; i++) g.add(P(G.box(0.4, 1.8 - Math.abs(i - 3.5) * 0.2, 0.4), bone, i * 0.9 - 3.2, 2.2, 0)); g.add(P(G.box(8, 0.5, 0.5), bone, 0, 3.2, 0)); const head = grp(4.8, 3.6, 0); g.add(head); u.head = head; head.add(outlined(P(G.box(1.8, 1.0, 1.0), bone, 0, 0, 0))); head.add(P(G.box(1.6, 0.4, 0.9), bone, 0.1, -0.7, 0)); for (let i = 0; i < 6; i++) head.add(P(G.cone(0.08, 0.3, 4), bone, -0.6 + i * 0.25, -0.6, 0.45).rotateX(Math.PI)); for (const s of [-1, 1]) head.add(sph(0.18, mat('#ff4020', { emissive: '#f00', emissiveIntensity: 1 }), 0.4, 0.2, s * 0.4, 8, false)); for (const x of [-2.4, 2.4]) for (const z of [-0.6, 0.6]) g.add(P(G.box(0.5, 2.6, 0.5), bone, x, 1.3, z)); g.add(P(G.cone(0.3, 3.0, 6), bone, -5.0, 2.6, 0).rotateZ(1.4)); const rider = grp(1.0, 3.6, 0); g.add(rider); rider.add(sph(0.45, mat('#d0a040'), 0, 0.5, 0, 12)); rider.add(sph(0.4, mat('#d0a040'), 0, 1.2, 0, 12)); for (const s of [-1, 1]) rider.add(P(G.cone(0.15, 0.35, 6), mat('#d0a040'), s * 0.3, 1.6, 0)); eyesBig(rider, 1.25, 0.35, 0.16, 0.08); rider.add(P(G.cyl(0.3, 0.35, 0.3, 10), mat('#4a4a4a'), 0, 1.65, 0)); u.w = 8; u.h = 4.5; break; }
    case 'python': { const m = mat('#60a040'); u.segs = []; for (let i = 0; i < 12; i++) { const s = sph(0.55 - i * 0.02, mat(i % 2 ? '#60a040' : '#406a20'), -i * 0.85, 0.55, 0, 12); g.add(s); u.segs.push(s); } const head = grp(0.7, 1.0, 0); g.add(head); u.head = head; head.add(ellipsoid(0.95, 0.6, 0.75, m, 0, 0, 0)); eyesBig(head, 0.35, 0.6, 0.35, 0.14); head.add(P(G.box(1.0, 0.04, 0.3), mat('#e03030'), 1.1, -0.2, 0)); u.w = 10; u.h = 2.0; break; }
    case 'winifred': { const dress = mat('#2a1848'); g.add(outlined(P(G.cone(1.2, 2.6, 12), dress, 0, 1.3, 0))); const head = grp(0, 3.0, 0); g.add(head); u.head = head; head.add(sph(0.55, mat('#b0d890'), 0, 0, 0, 14)); head.add(P(G.cone(0.1, 0.5, 6), mat('#b0d890'), 0, -0.05, 0.65).rotateX(Math.PI / 2)); eyesBig(head, 0.15, 0.45, 0.22, 0.1); head.add(P(G.cone(0.55, 1.6, 10), dress, 0, 1.2, 0)); head.add(P(G.cyl(0.9, 0.9, 0.08, 16), dress, 0, 0.45, 0)); for (const s of [-1, 1]) head.add(P(G.box(0.25, 0.9, 0.3), mat('#888'), s * 0.5, -0.3, -0.1)); const broom = grp(0, 0.4, 0); g.add(broom); u.broom = broom; broom.add(P(G.cyl(0.06, 0.06, 3.6, 6), mat('#8a5a2a'), 0, 0, 0).rotateZ(Math.PI / 2)); broom.add(P(G.cone(0.45, 1.2, 8), mat('#d0a040'), -2.2, 0, 0).rotateZ(Math.PI / 2)); u.arms = []; for (const s of [-1, 1]) { const a = grp(s * 0.9, 2.3, 0.2); g.add(a); a.add(P(G.cyl(0.15, 0.15, 1.2, 8), dress, 0, -0.5, 0)); a.add(sph(0.2, mat('#b0d890'), 0, -1.1, 0, 8)); u.arms.push(a); } u.w = 2.4; u.h = 4.2; u.flyer = true; break; }
    case 'sewernose': { const m = mat('#3a8a50'); g.add(outlined(P(G.box(4.5, 1.2, 1.6), m, 0, 0.9, 0))); const head = grp(2.6, 1.3, 0); g.add(head); u.head = head; head.add(outlined(P(G.box(2.4, 0.8, 1.2), m, 0.6, 0.1, 0))); u.jaw = P(G.box(2.3, 0.4, 1.1), mat('#d0e090'), 0.6, -0.4, 0); head.add(u.jaw); for (let i = 0; i < 6; i++) { head.add(P(G.cone(0.1, 0.35, 4), mat('#fff'), -0.3 + i * 0.4, -0.3, 0.5).rotateX(Math.PI)); head.add(P(G.cone(0.1, 0.35, 4), mat('#fff'), -0.3 + i * 0.4, -0.3, -0.5).rotateX(Math.PI)); } for (const s of [-1, 1]) { head.add(sph(0.25, mat('#f0e040'), -0.3, 0.6, s * 0.45, 10, false)); head.add(sph(0.1, mat('#111'), -0.15, 0.62, s * 0.45, 6, false)); } head.add(P(G.box(0.9, 0.5, 1.5), mat('#2a2a3a'), -0.5, 0.95, 0)); head.add(sph(0.2, mat('#fff'), 0.4, 1.0, 0, 8, false)); for (let i = 0; i < 8; i++) g.add(P(G.cone(0.2, 0.5, 4), mat('#2a6a3a'), -2 + i * 0.6, 1.7, 0)); for (const x of [-1.5, 1.5]) for (const z of [-0.6, 0.6]) g.add(P(G.cyl(0.25, 0.3, 0.6, 6), m, x, 0.3, z)); g.add(P(G.cone(0.4, 3.0, 6), m, -3.6, 0.9, 0).rotateZ(1.57)); g.add(P(G.box(1.2, 0.8, 0.05), mat('#f0e0c0'), -0.5, 1.5, 0.85)); u.w = 7; u.h = 2.6; break; }
    case 'nimmech': { const m = mat('#b0b8c0', { metalness: 0.6, roughness: 0.35 }); g.add(outlined(P(G.box(2.6, 2.4, 1.6), m, 0, 3.4, 0))); g.add(P(G.sph(1.1, 14), mat('#a0e0ff', { transparent: true, opacity: 0.45 }), 0, 5.2, 0)); const nim = makeNPC('nimnul'); nim.scale.setScalar(0.55); nim.position.set(0, 4.3, 0); g.add(nim); u.arms = []; for (const s of [-1, 1]) { const a = grp(s * 1.7, 4.0, 0); g.add(a); a.add(P(G.box(0.7, 2.4, 0.7), m, 0, -1.0, 0)); a.add(P(G.cyl(0.5, 0.5, 0.8, 10), mat('#444'), 0, -2.4, 0)); a.add(sph(0.3, mat('#40c0ff', { emissive: '#40c0ff', emissiveIntensity: 1.5 }), 0, -2.9, 0, 8, false)); u.arms.push(a); } u.legs = []; for (const s of [-1, 1]) { const l = P(G.box(0.9, 2.2, 1.0), m, s * 0.8, 1.1, 0); g.add(l); u.legs.push(l); g.add(P(G.box(1.3, 0.4, 1.4), mat('#444'), s * 0.8, 0.2, 0.1)); } for (const s of [-1, 1]) g.add(P(G.cyl(0.25, 0.25, 1.0, 8), mat('#666'), s * 0.9, 6.0, -0.5)); u.w = 3.6; u.h = 6.5; break; }
    default: g.add(P(G.box(2, 2, 2), mat('#ff00ff'), 0, 1, 0)); u.w = 2; u.h = 2;
  }
  return g;
}
export function animateBoss(g, dt, t, st = {}) {
  const u = g.userData;
  if (u.arms) u.arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 3 + i * 2) * 0.4 + (st.attack ? -1.5 : 0); });
  if (u.wings) u.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 8) * 0.6; });
  if (u.rotors) u.rotors.forEach((r, i) => r.rotation.y = t * 30 + i);
  if (u.flame) { u.flame.scale.y = 0.8 + Math.sin(t * 40) * 0.3; }
  if (u.core) u.core.scale.setScalar(1 + Math.sin(t * 10) * 0.15);
  if (u.segs) u.segs.forEach((s, i) => { s.position.y = (u.type === 'python' ? 0.55 : 0.6) + Math.sin(t * 5 - i * 0.8) * 0.2; });
  if (u.legs) u.legs.forEach((l, i) => { l.rotation.x = (i ? 1 : -1) * Math.sin(t * 6) * 0.3 * (st.walking ? 1 : 0); });
  if (u.head) u.head.rotation.y = Math.sin(t * 1.5) * 0.25;
  if (u.jaw) u.jaw.position.y = -0.4 - (st.attack ? 0.5 : Math.abs(Math.sin(t * 2)) * 0.2);
  if (u.tentacles) u.tentacles.forEach((tt, i) => { tt.rotation.x += Math.sin(t * 3 + i) * 0.01; });
  if (u.cats) u.cats.forEach((c, i) => { c.c.position.y = Math.abs(Math.sin(t * 4 + i * 1.5)) * 0.3; c.a.rotation.x = Math.sin(t * 3 + i) * 0.5; });
  if (u.broom) u.broom.rotation.z = Math.sin(t * 2) * 0.1;
  if (u.hover) g.position.y += Math.sin(t * 2) * 0.01;
  if (st.hurt) g.rotation.z = Math.sin(t * 50) * 0.08; else g.rotation.z = 0;
}

// ------------------------------------------------------------------ NPCs for cutscenes
export function makeNPC(kind) {
  const g = grp();
  switch (kind) {
    case 'fatcat': { const b = makeBoss('fatcat'); b.scale.setScalar(0.5); g.add(b); break; }
    case 'nimnul': { // Professor Nimnul: lab coat, round glasses, red hair, big nose, hunched
      g.add(ellipsoid(0.42, 0.5, 0.3, mat('#f4f4f4'), 0, 1.0, 0)); g.add(P(G.box(0.14, 0.9, 0.05), mat('#8a3030'), 0, 1.0, 0.3));
      const head = grp(0, 1.72, 0.02); g.add(head); head.add(ellipsoid(0.36, 0.4, 0.36, mat('#f3c7a8'), 0, 0, 0));
      head.add(ellipsoid(0.4, 0.22, 0.4, mat('#e0521f'), 0, 0.22, -0.04)); for (const s of [-1, 1]) head.add(ellipsoid(0.12, 0.18, 0.1, mat('#e0521f'), s * 0.36, 0.05, -0.05));
      for (const s of [-1, 1]) { head.add(P(G.cyl(0.15, 0.15, 0.04, 14), mat('#eef4ff', { transparent: true, opacity: 0.7 }), s * 0.16, 0.05, 0.36).rotateX(Math.PI / 2)); head.add(P(G.torus(0.15, 0.025), mat('#222'), s * 0.16, 0.05, 0.36)); head.add(sph(0.04, mat('#111'), s * 0.14, 0.05, 0.38, 6, false)); }
      head.add(ellipsoid(0.12, 0.1, 0.14, mat('#e39a7a'), 0, -0.1, 0.42)); head.add(P(G.box(0.2, 0.03, 0.02), mat('#8a3030'), 0, -0.26, 0.36));
      for (const s of [-1, 1]) g.add(P(G.cyl(0.1, 0.1, 0.8, 8), mat('#444'), s * 0.18, 0.4, 0)); for (const s of [-1, 1]) g.add(P(G.cyl(0.08, 0.08, 0.7, 8), mat('#f4f4f4'), s * 0.45, 1.0, 0)); g.userData.height = 2.1; break; }
    case 'mandy': { g.add(outlined(P(G.cone(0.5, 1.0, 12), mat('#f0a0c0'), 0, 0.9, 0))); g.add(P(G.box(0.5, 0.5, 0.35), mat('#f0a0c0'), 0, 1.5, 0)); const head = grp(0, 2.05, 0); g.add(head); head.add(sph(0.32, mat('#f8d8c0'), 0, 0, 0, 14)); head.add(ellipsoid(0.36, 0.25, 0.36, mat('#f0d060'), 0, 0.1, -0.05)); for (const s of [-1, 1]) head.add(sph(0.14, mat('#f0d060'), s * 0.36, -0.1, -0.05, 8)); cartoonEyes(head, { y: 0.02, z: 0.26, spread: 0.12, r: 0.07, iris: '#3a7bd5', lashes: true }); for (const s of [-1, 1]) g.add(P(G.cyl(0.07, 0.07, 0.5, 6), mat('#f8d8c0'), s * 0.15, 0.25, 0)); g.userData.height = 2.4; break; }
    case 'kitten': { const m = mat('#f0f0f0'); g.add(ellipsoid(0.4, 0.28, 0.27, m, 0, 0.35, 0)); g.add(sph(0.24, m, 0.3, 0.6, 0, 12)); for (const s of [-1, 1]) g.add(P(G.cone(0.08, 0.2, 5), m, 0.3 + s * 0.14, 0.85, 0)); cartoonEyes(g, { y: 0.65, z: 0.5, spread: 0.1, r: 0.06, iris: '#3a9a4a' }); g.add(sph(0.04, mat('#f08090'), 0.53, 0.58, 0, 6, false)); g.add(outlined(tube([[-0.35, 0.4, 0], [-0.6, 0.6, 0], [-0.75, 0.9, 0.05]], 0.05, m), 1.1)); for (const x of [-0.15, 0.2]) for (const s of [-1, 1]) g.add(P(G.cyl(0.05, 0.05, 0.25, 5), m, x, 0.12, s * 0.15)); g.userData.height = 0.9; break; }
    case 'mepps': { const fur = mat('#d0a040'); g.add(ellipsoid(0.4, 0.52, 0.36, fur, 0, 0.7, 0)); const head = grp(0, 1.4, 0); g.add(head); head.add(sph(0.38, fur, 0, 0, 0, 14)); for (const s of [-1, 1]) head.add(P(G.cone(0.14, 0.35, 6), fur, s * 0.26, 0.4, 0)); cartoonEyes(head, { y: 0.08, z: 0.3, spread: 0.16, r: 0.08 }); head.add(sph(0.08, mat('#e07080'), 0, -0.05, 0.4, 6, false)); head.add(P(G.cyl(0.3, 0.33, 0.25, 10), mat('#4a4a4a'), 0, 0.42, 0)); for (const s of [-1, 1]) g.add(P(G.cyl(0.1, 0.12, 0.5, 6), fur, s * 0.2, 0.25, 0)); g.userData.height = 1.9; break; }
    default: return RANGERS[kind] ? RANGERS[kind]() : (g.add(P(G.box(1, 1, 1), mat('#f0f'), 0, 0.5, 0)), g);
  }
  return g;
}
