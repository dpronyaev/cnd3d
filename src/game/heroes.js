// Rescue Rangers as close to the 1989 cartoon as procedural geometry allows: smooth lathe bodies, cartoon faces,
// proper clothes (Chip's bomber jacket + fedora, Dale's Hawaiian shirt, Gadget's coveralls, Monty's coat) and bushy tails.
// Every model faces +z, stands on y = 0 and exposes the same animation parts as the old ones (body/head/arms/legs/tail).
import * as THREE from 'three';
import { mat, P, grp, G, outlined, sph, ellipsoid, tube, cartoonEyes, toonRamp } from './models.js';

const texCache = new Map();
function canvasTex(key, size, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; texCache.set(key, t); return t;
}
function texMat(key, size, draw, opts = {}) { return new THREE.MeshToonMaterial({ map: canvasTex(key, size, draw), gradientMap: toonRamp(), side: opts.side || THREE.FrontSide }); }
const hawaii = () => texMat('hawaii', 256, (g, s) => {
  g.fillStyle = '#d82a2e'; g.fillRect(0, 0, s, s);
  const r = (a) => { let x = Math.sin(a * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 26; i++) { // leaves then flowers
    const x = r(i + 1) * s, y = r(i + 7.3) * s; g.fillStyle = '#2f8f3a'; g.beginPath(); g.ellipse(x + 10, y + 6, 14, 6, r(i) * 3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 22; i++) {
    const x = r(i + 3.1) * s, y = r(i + 9.7) * s; g.fillStyle = i % 3 ? '#f7e04a' : '#ffffff';
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#f08a1a'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
  }
}, { side: THREE.DoubleSide });
const leather = () => texMat('leather', 128, (g, s) => {
  g.fillStyle = '#7a4524'; g.fillRect(0, 0, s, s); g.strokeStyle = '#5e331a'; g.lineWidth = 3;
  for (let y = 18; y < s; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); }
  g.fillStyle = 'rgba(255,220,180,0.08)'; for (let i = 0; i < 40; i++) g.fillRect((i * 37) % s, (i * 53) % s, 6, 2);
}, { side: THREE.DoubleSide });

// helpers ---------------------------------------------------------------------------------------------
const V2 = (r, y) => new THREE.Vector2(r, y);
function lathe(profile, m, segs = 24) { const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => V2(r, y)), segs), m); mesh.castShadow = true; return mesh; }
// an open garment shell (cylinder with a slit at the front, +z)
function shell(rTop, rBot, h, gap, m, y = 0) { const g = new THREE.CylinderGeometry(rTop, rBot, h, 26, 1, true, gap, Math.PI * 2 - gap * 2); const mesh = new THREE.Mesh(g, m); mesh.position.y = y; mesh.castShadow = true; return mesh; }
function limb(len, r0, r1, m, y0 = 0) { const c = P(G.cyl(r1, r0, len, 12), m, 0, y0 - len / 2, 0); return c; }
function mitten(m, s) { const h = grp(); h.add(ellipsoid(0.07, 0.075, 0.06, m, 0, 0, 0)); h.add(ellipsoid(0.03, 0.04, 0.03, m, s * 0.055, 0.03, 0.03, false)); return h; }
// bushy tail: overlapping blobs along a curve, a darker stripe along the back
function bushyTail(pts, radii, m, stripe) {
  const t = grp(); const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const n = 9; for (let i = 0; i < n; i++) { const u = i / (n - 1); const p = curve.getPoint(u); const rr = radii[0] + (radii[1] - radii[0]) * Math.sin(u * Math.PI * 0.85) + (radii[2] - radii[0]) * u * u * 0.3;
    t.add(ellipsoid(rr, rr * 1.05, rr * 0.9, m, p.x, p.y, p.z, i % 2 === 0));
    if (stripe && i > 0 && i < n - 1) t.add(ellipsoid(rr * 0.35, rr * 0.9, rr * 0.35, stripe, p.x, p.y, p.z - rr * 0.72, false)); }
  return t;
}

// chipmunk body shared by Chip and Dale ------------------------------------------------------------------------
function chipmunk({ fur, face, dark }) {
  const root = grp(); const parts = {}; const furM = mat(fur), faceM = mat(face), darkM = mat(dark);
  const body = grp(0, 0.42, 0); root.add(body); parts.body = body;
  body.add(outlined(lathe([[0, -0.21], [0.16, -0.2], [0.22, -0.1], [0.235, 0.02], [0.2, 0.15], [0.14, 0.26], [0.05, 0.31], [0, 0.31]], furM), 1.04));
  body.add(ellipsoid(0.15, 0.19, 0.08, faceM, 0, -0.03, 0.165, false)); // cream belly
  const head = grp(0, 0.6, 0.02); body.add(head); parts.head = head;
  head.add(ellipsoid(0.33, 0.3, 0.29, furM, 0, 0, 0));
  head.add(ellipsoid(0.25, 0.22, 0.17, faceM, 0, -0.04, 0.15, false)); // face
  head.add(ellipsoid(0.17, 0.12, 0.14, faceM, 0, -0.13, 0.24)); // muzzle
  for (const s of [-1, 1]) head.add(ellipsoid(0.12, 0.1, 0.1, faceM, s * 0.15, -0.11, 0.19, false)); // cheeks
  const stripe = ellipsoid(0.06, 0.17, 0.05, darkM, 0, 0.16, 0.235, false); stripe.rotation.x = -0.5; head.add(stripe); // forehead stripe
  for (const s of [-1, 1]) { head.add(ellipsoid(0.085, 0.1, 0.04, furM, s * 0.24, 0.21, -0.05)); head.add(ellipsoid(0.05, 0.06, 0.02, darkM, s * 0.245, 0.21, -0.02, false)); }
  cartoonEyes(head, { y: 0.05, z: 0.235, spread: 0.095, r: 0.095, brow: dark });
  head.add(tube([[-0.07, -0.16, 0.33], [0, -0.19, 0.36], [0.07, -0.16, 0.33]], 0.011, darkM, 6)); // smile
  // arms: shoulder pivots
  const mkArm = (s, sleeveM) => { const a = grp(s * 0.21, 0.19, 0.0); body.add(a); a.add(limb(0.2, 0.075, 0.06, sleeveM || furM, 0)); a.add(limb(0.14, 0.05, 0.045, furM, -0.19)); const h = mitten(faceM, s); h.position.y = -0.36; a.add(h); return a; };
  const mkLeg = (s) => { const l = grp(s * 0.1, -0.14, 0); body.add(l); l.add(limb(0.16, 0.075, 0.06, furM, 0)); l.add(ellipsoid(0.085, 0.05, 0.16, faceM, 0, -0.235, 0.06)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  // short bushy chipmunk tail: one smooth teardrop tuft low on the back, tilted up, with a darker stripe
  const tail = grp(0, -0.12, -0.2); tail.rotation.x = -0.75;
  const tuft = lathe([[0, 0], [0.07, 0.03], [0.11, 0.1], [0.12, 0.18], [0.1, 0.26], [0.06, 0.32], [0, 0.35]], furM, 18); tuft.scale.z = 0.8; tail.add(outlined(tuft, 1.06));
  const st = lathe([[0, 0.04], [0.035, 0.08], [0.045, 0.18], [0.035, 0.28], [0, 0.33]], darkM, 12); st.position.z = -0.075; st.scale.z = 0.6; tail.add(st);
  const tg = grp(0, 0, 0); tg.add(tail); body.add(tg); parts.tail = tg;
  root.userData.parts = parts; root.userData.height = 1.35; root.userData.bodyY = 0.42;
  return { root, parts, body, head, furM, faceM, darkM, mkArm };
}

export function makeChip2() {
  const c = chipmunk({ fur: '#9c5428', face: '#f2dcb0', dark: '#4a2412' }); const { root, body, head, parts } = c;
  head.add(ellipsoid(0.055, 0.045, 0.045, mat('#141414'), 0, -0.07, 0.385)); // small black nose
  for (const s of [-1, 1]) head.add(P(G.box(0.03, 0.05, 0.02), mat('#ffffff'), s * 0.017, -0.21, 0.35));
  // bomber jacket: brown leather, open at the front, shearling collar and cuffs
  const lm = leather(); body.add(outlined(shell(0.205, 0.255, 0.36, 0.5, lm, 0.05), 1.03));
  body.add(P(G.torus(0.17, 0.065), mat('#f3e3c4'), 0, 0.25, 0).rotateX(Math.PI / 2)); // shearling collar
  body.add(P(G.torus(0.25, 0.025), mat('#5e331a'), 0, -0.13, 0).rotateX(Math.PI / 2)); // waistband
  parts.armL = c.mkArm(-1, lm); parts.armR = c.mkArm(1, lm);
  for (const a of [parts.armL, parts.armR]) a.add(P(G.torus(0.06, 0.022), mat('#f3e3c4'), 0, -0.2, 0).rotateX(Math.PI / 2));
  // fedora tilted back
  const hat = grp(0, 0.235, -0.03); hat.rotation.x = -0.18; head.add(hat);
  const felt = mat('#6b3c1e');
  const brim = P(G.cyl(0.41, 0.41, 0.028, 32), felt, 0, 0, 0); brim.scale.z = 0.92; hat.add(outlined(brim, 1.03));
  const crown = P(G.cyl(0.2, 0.245, 0.22, 24), felt, 0, 0.12, 0); hat.add(outlined(crown, 1.04));
  hat.add(P(G.cyl(0.25, 0.25, 0.06, 24), mat('#33200f'), 0, 0.045, 0));
  const crease = P(G.box(0.07, 0.05, 0.3), mat('#55301a'), 0, 0.225, 0); hat.add(crease);
  for (const s of [-1, 1]) { const pinch = P(G.box(0.05, 0.12, 0.08), mat('#55301a'), s * 0.09, 0.17, 0.17); pinch.rotation.z = s * 0.4; hat.add(pinch); }
  root.userData.kind = 'chip'; return root;
}
export function makeDale2() {
  const c = chipmunk({ fur: '#b5652d', face: '#f4ddb4', dark: '#4e2612' }); const { root, body, head, parts, furM } = c;
  head.add(sph(0.075, mat('#e0262a'), 0, -0.075, 0.385, 16)); // big red nose
  for (const s of [-1, 1]) head.add(outlined(P(G.box(0.05, 0.085, 0.025), mat('#ffffff'), s * 0.03, -0.225, 0.345), 1.08)); // buck teeth with a gap
  for (let i = 0; i < 3; i++) { const h = outlined(P(G.cone(0.045, 0.2, 8), furM, (i - 1) * 0.06, 0.32, 0.06)); h.rotation.z = (i - 1) * 0.5; h.rotation.x = -0.35; head.add(h); } // hair tuft
  // Hawaiian shirt: red with yellow/white flowers, open with a big collar
  const hm = hawaii(); body.add(outlined(shell(0.205, 0.255, 0.36, 0.42, hm, 0.05), 1.03));
  for (const s of [-1, 1]) { const col = P(G.box(0.13, 0.13, 0.02), hm, s * 0.095, 0.24, 0.15); col.rotation.z = s * 0.7; col.rotation.x = -0.4; body.add(col); }
  parts.armL = c.mkArm(-1, hm); parts.armR = c.mkArm(1, hm);
  root.userData.kind = 'dale'; return root;
}

export function makeGadget2() {
  const root = grp(); const parts = {}; const fur = mat('#d8b089'), face = mat('#f3dfc4'), suit = mat('#8e6ccf'), suitD = mat('#6e4fb0'), hair = mat('#f2b85c'), pink = mat('#f08a9a');
  const body = grp(0, 0.5, 0); root.add(body); parts.body = body;
  // slim figure in lavender coveralls
  body.add(outlined(lathe([[0, -0.2], [0.15, -0.19], [0.19, -0.1], [0.185, 0.04], [0.16, 0.16], [0.11, 0.26], [0.04, 0.3], [0, 0.3]], suit), 1.04));
  body.add(P(G.torus(0.18, 0.022), suitD, 0, -0.12, 0).rotateX(Math.PI / 2)); // belt line
  body.add(P(G.box(0.1, 0.08, 0.02), suitD, 0.07, 0.02, 0.18)); // chest pocket
  const vneck = P(G.cone(0.07, 0.14, 3), face, 0, 0.22, 0.12); vneck.rotation.x = Math.PI; vneck.rotation.y = Math.PI; body.add(vneck);
  const head = grp(0, 0.57, 0.02); body.add(head); parts.head = head;
  head.add(ellipsoid(0.27, 0.26, 0.26, fur, 0, 0, 0));
  head.add(ellipsoid(0.2, 0.18, 0.15, face, 0, -0.05, 0.14, false));
  head.add(ellipsoid(0.12, 0.1, 0.15, face, 0, -0.1, 0.22)); // snout
  head.add(sph(0.042, pink, 0, -0.08, 0.375, 12)); // pink nose
  head.add(tube([[-0.05, -0.15, 0.31], [0, -0.17, 0.33], [0.05, -0.15, 0.31]], 0.009, mat('#7a3a3a'), 6));
  cartoonEyes(head, { y: 0.04, z: 0.2, spread: 0.095, r: 0.098, iris: '#3a7bd5', lashes: true });
  for (const s of [-1, 1]) { const ear = P(G.cyl(0.165, 0.165, 0.04, 24), fur, s * 0.22, 0.25, -0.06); ear.rotation.x = Math.PI / 2; ear.rotation.y = -s * 0.25; head.add(outlined(ear, 1.06)); const inn = P(G.cyl(0.11, 0.11, 0.045, 20), pink, s * 0.225, 0.25, -0.05); inn.rotation.x = Math.PI / 2; inn.rotation.y = -s * 0.25; head.add(inn); }
  // strawberry-blonde hair: cap, sweeping bangs, long fall down the back
  head.add(ellipsoid(0.285, 0.2, 0.27, hair, 0, 0.11, -0.03));
  for (let i = 0; i < 4; i++) { const b = ellipsoid(0.09, 0.13, 0.06, hair, -0.12 + i * 0.08, 0.15, 0.2, false); b.rotation.z = 0.5 - i * 0.12; b.rotation.x = -0.6; head.add(b); }
  const fall = tube([[0, 0.1, -0.22], [0, -0.1, -0.32], [0, -0.38, -0.3], [0, -0.6, -0.22]], 0.12, hair, 12); head.add(outlined(fall, 1.06));
  // goggles pushed up on the hair
  for (const s of [-1, 1]) { const rim = P(G.torus(0.065, 0.022), mat('#3a3040'), s * 0.09, 0.24, 0.17); rim.rotation.x = -0.9; head.add(rim); const lens = P(G.cyl(0.06, 0.06, 0.02, 16), new THREE.MeshToonMaterial({ color: '#c9b4ff', transparent: true, opacity: 0.75, gradientMap: toonRamp() }), s * 0.09, 0.24, 0.17); lens.rotation.x = Math.PI / 2 - 0.9; head.add(lens); }
  const mkArm = (s) => { const a = grp(s * 0.205, 0.19, 0.02); body.add(a); const arm = grp(); arm.rotation.z = s * 0.3; a.add(arm); /* shoulders outside the slim body, arms slightly spread */
    arm.add(limb(0.15, 0.072, 0.064, suit, 0)); arm.add(P(G.torus(0.064, 0.024), suitD, 0, -0.15, 0).rotateX(Math.PI / 2)); arm.add(limb(0.17, 0.05, 0.043, fur, -0.15));
    const h = mitten(fur, s); h.position.y = -0.36; arm.add(h); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  const mkLeg = (s) => { const l = grp(s * 0.085, -0.15, 0); body.add(l); l.add(limb(0.26, 0.07, 0.06, suit, 0)); l.add(ellipsoid(0.07, 0.045, 0.13, mat('#6a4a2a'), 0, -0.3, 0.05)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const tg = grp(0, 0, 0); tg.add(tube([[0, -0.15, -0.15], [0, -0.28, -0.4], [0, -0.1, -0.62], [0, 0.18, -0.66]], 0.022, pink, 6)); body.add(tg); parts.tail = tg;
  root.userData.parts = parts; root.userData.height = 1.4; root.userData.bodyY = 0.5; root.userData.kind = 'gadget'; return root;
}

export function makeMonty2() {
  const root = grp(); const parts = {}; const fur = mat('#c79a68'), face = mat('#ecd3ae'), coat = mat('#3f7a45'), coatD = mat('#2e5e35'), sweater = mat('#f1e4c6'), stache = mat('#d9822b');
  const body = grp(0, 0.72, 0); root.add(body); parts.body = body;
  // barrel chest in a cream turtleneck, open green coat
  body.add(outlined(lathe([[0, -0.36], [0.34, -0.34], [0.46, -0.16], [0.49, 0.04], [0.44, 0.22], [0.33, 0.36], [0.16, 0.44], [0, 0.45]], sweater), 1.03));
  body.add(outlined(shell(0.38, 0.52, 0.72, 0.62, coat, 0.0), 1.02));
  body.add(P(G.cyl(0.24, 0.27, 0.13, 20), sweater, 0, 0.45, 0)); body.add(P(G.torus(0.24, 0.05), sweater, 0, 0.5, 0).rotateX(Math.PI / 2)); // rolled collar
  const head = grp(0, 0.8, 0.05); body.add(head); parts.head = head;
  head.add(ellipsoid(0.38, 0.35, 0.35, fur, 0, 0, 0));
  head.add(ellipsoid(0.27, 0.2, 0.2, face, 0, -0.1, 0.22, false));
  head.add(sph(0.12, mat('#d8484a'), 0, -0.05, 0.44, 18)); // big nose
  for (const s of [-1, 1]) { // handlebar moustache curling up, bushy sideburns
    head.add(outlined(tube([[s * 0.04, -0.15, 0.42], [s * 0.18, -0.19, 0.38], [s * 0.3, -0.13, 0.3], [s * 0.34, -0.02, 0.26]], 0.05, stache, 10), 1.08));
    head.add(ellipsoid(0.09, 0.16, 0.1, stache, s * 0.32, -0.07, 0.08));
  }
  cartoonEyes(head, { y: 0.1, z: 0.29, spread: 0.12, r: 0.085, brow: '#7a4c24', browY: 0.02 });
  for (const s of [-1, 1]) { const ear = P(G.cyl(0.22, 0.22, 0.05, 24), fur, s * 0.32, 0.3, -0.08); ear.rotation.x = Math.PI / 2; ear.rotation.y = -s * 0.3; head.add(outlined(ear, 1.05)); const inn = P(G.cyl(0.15, 0.15, 0.055, 20), mat('#e8b9a0'), s * 0.325, 0.3, -0.07); inn.rotation.x = Math.PI / 2; inn.rotation.y = -s * 0.3; head.add(inn); }
  const mkArm = (s) => { const a = grp(s * 0.47, 0.24, 0.02); body.add(a); a.add(limb(0.3, 0.12, 0.1, coat, 0)); a.add(P(G.torus(0.1, 0.03), coatD, 0, -0.3, 0).rotateX(Math.PI / 2)); a.add(limb(0.16, 0.08, 0.07, fur, -0.3)); const h = mitten(face, s); h.scale.setScalar(1.6); h.position.y = -0.52; a.add(h); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  const mkLeg = (s) => { const l = grp(s * 0.2, -0.36, 0.02); body.add(l); l.add(limb(0.26, 0.11, 0.1, fur, 0)); l.add(ellipsoid(0.12, 0.07, 0.22, face, 0, -0.32, 0.07)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const tg = grp(0, 0, 0); tg.add(outlined(tube([[0, -0.3, -0.42], [0, -0.55, -0.7], [0, -0.35, -0.95], [0, 0.0, -1.0]], 0.05, mat('#e0b09a'), 8), 1.1)); body.add(tg); parts.tail = tg;
  root.userData.parts = parts; root.userData.height = 1.95; root.userData.bodyY = 0.72; root.userData.kind = 'monty'; return root;
}

export function makeZipper2() {
  const root = grp(); const parts = {}; const skin = mat('#58b88c'), belly = mat('#c8ecb8'), dark = mat('#1e4a34');
  const body = grp(0, 0.38, 0); root.add(body); parts.body = body;
  body.add(outlined(lathe([[0, -0.2], [0.11, -0.18], [0.15, -0.05], [0.14, 0.08], [0.09, 0.16], [0, 0.18]], skin), 1.06));
  body.add(ellipsoid(0.09, 0.12, 0.05, belly, 0, -0.04, 0.11, false));
  for (let i = 0; i < 3; i++) body.add(P(G.torus(0.12 - i * 0.015, 0.012), dark, 0, -0.12 + i * 0.05, -0.01).rotateX(Math.PI / 2)); // abdomen rings
  const head = grp(0, 0.32, 0.02); body.add(head); parts.head = head;
  head.add(ellipsoid(0.22, 0.2, 0.2, skin, 0, 0, 0));
  cartoonEyes(head, { y: 0.04, z: 0.1, spread: 0.1, r: 0.12, iris: '#2f7fe0', irisR: 0.7 }); // huge eyes
  head.add(sph(0.035, mat('#2a6a4a'), 0, -0.08, 0.2, 10)); head.add(tube([[-0.05, -0.12, 0.18], [0, -0.14, 0.2], [0.05, -0.12, 0.18]], 0.008, dark, 6));
  for (const s of [-1, 1]) { head.add(tube([[s * 0.05, 0.17, 0.02], [s * 0.1, 0.32, 0.0], [s * 0.17, 0.4, 0.04]], 0.01, dark, 5)); head.add(sph(0.03, dark, s * 0.17, 0.4, 0.04, 8, false)); }
  const wm = new THREE.MeshToonMaterial({ color: '#dff2ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, gradientMap: toonRamp() });
  const wings = grp(0, 0.12, -0.12); body.add(wings); parts.wings = wings;
  for (const s of [-1, 1]) { const w = P(G.sph(1, 14), wm, s * 0.24, 0.04, 0); w.scale.set(0.24, 0.012, 0.11); w.rotation.z = s * 0.2; w.userData.side = s; wings.add(w); }
  const mkLeg = (s) => { const l = grp(s * 0.05, -0.17, 0); body.add(l); l.add(limb(0.17, 0.016, 0.016, dark, 0)); l.add(ellipsoid(0.035, 0.022, 0.05, dark, 0, -0.18, 0.02, false)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const mkArm = (s) => { const a = grp(s * 0.13, 0.08, 0.04); body.add(a); a.add(limb(0.17, 0.018, 0.016, skin, 0)); a.add(sph(0.03, skin, 0, -0.18, 0, 8, false)); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  root.userData.parts = parts; root.userData.height = 0.8; root.userData.bodyY = 0.38; root.userData.kind = 'zipper'; root.userData.flyer = true; return root;
}
