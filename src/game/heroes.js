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

// one-piece cartoon moustache: a sphere deformed into two thick lobes spreading from under the nose, drooping a little,
// tapering to points and bent around the muzzle (width/height/depth in model units)
function moustacheGeo(width, height, depth, droop = 0.35, wrap = 0.3) {
  const g = new THREE.SphereGeometry(1, 48, 20); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ax = Math.abs(x);
    const taper = Math.pow(Math.max(0, 1 - ax * ax), 0.55) * (1 - 0.18 * Math.exp(-x * x / 0.01)); // thick lobes, small dip in the middle, sharp tips
    const cy = -droop * ax * ax + 0.5 * droop * Math.pow(ax, 4); // droop, tips curl back out
    p.setXYZ(i, x * width / 2, (y * taper * 0.5 + cy) * height, z * taper * depth / 2 - wrap * x * x * width / 2);
  }
  g.computeVertexNormals(); return g;
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
  for (const s of [-1, 1]) head.add(P(G.box(0.022, 0.03, 0.015), mat('#ffffff'), s * 0.014, -0.195, 0.352)); // two tiny front teeth
  for (let i = 0; i < 3; i++) { const h = outlined(P(G.cone(0.045, 0.2, 8), furM, (i - 1) * 0.06, 0.32, 0.06)); h.rotation.z = (i - 1) * 0.5; h.rotation.x = -0.35; head.add(h); } // hair tuft
  // Hawaiian shirt: red with yellow/white flowers, open with a big collar
  const hm = hawaii(); body.add(outlined(shell(0.205, 0.255, 0.36, 0.42, hm, 0.05), 1.03));
  for (const s of [-1, 1]) { const col = P(G.box(0.13, 0.13, 0.02), hm, s * 0.095, 0.24, 0.15); col.rotation.z = s * 0.7; col.rotation.x = -0.4; body.add(col); }
  parts.armL = c.mkArm(-1, hm); parts.armR = c.mkArm(1, hm);
  root.userData.kind = 'dale'; return root;
}

export function makeGadget2() {
  // Gadget Hackwrench: slender, feminine inventor mouse - hourglass figure in lavender coveralls, long strawberry-blonde
  // hair, big blue eyes with lashes, purple-lens goggles on her head, small pink nose, long thin tail.
  const root = grp(); const parts = {};
  const fur = mat('#dcb48e'), face = mat('#f6e2c8'), suit = mat('#9b7fd8'), suitD = mat('#7458b8'), hair = mat('#f1b25c'), hairL = mat('#f8cf86'), pink = mat('#f2909e'), blush = mat('#f7b6b6');
  const body = grp(0, 0.6, 0); root.add(body); parts.body = body;
  // hourglass torso: hips, narrow waist, soft bust, narrow shoulders
  body.add(outlined(lathe([[0, -0.13], [0.09, -0.125], [0.13, -0.08], [0.128, -0.01], [0.108, 0.05], [0.118, 0.12], [0.132, 0.18], [0.115, 0.25], [0.07, 0.3], [0, 0.31]], suit, 28), 1.04));
  body.add(P(G.torus(0.118, 0.018), suitD, 0, 0.04, 0).rotateX(Math.PI / 2)); // belt at the waist
  body.add(P(G.box(0.05, 0.035, 0.02), mat('#d8c060', { metalness: 0.5 }), 0, 0.04, 0.12)); // buckle
  body.add(P(G.box(0.012, 0.22, 0.01), suitD, 0, 0.15, 0.135)); // front seam / zipper
  for (const s of [-1, 1]) { const col = P(G.box(0.08, 0.06, 0.015), suitD, s * 0.05, 0.27, 0.075); col.rotation.z = s * 0.5; col.rotation.x = -0.5; body.add(col); } // collar
  body.add(ellipsoid(0.045, 0.06, 0.03, face, 0, 0.275, 0.06, false)); // neckline
  body.add(P(G.cyl(0.04, 0.05, 0.08, 10), fur, 0, 0.33, 0)); // slim neck
  const head = grp(0, 0.6, 0.02); body.add(head); parts.head = head;
  head.add(ellipsoid(0.26, 0.25, 0.25, fur, 0, 0, 0));
  head.add(ellipsoid(0.2, 0.17, 0.15, face, 0, -0.05, 0.13, false));
  head.add(ellipsoid(0.1, 0.075, 0.12, face, 0, -0.1, 0.22)); // small snout
  head.add(sph(0.035, pink, 0, -0.085, 0.34, 12)); // little pink nose
  head.add(tube([[-0.045, -0.15, 0.29], [0, -0.165, 0.305], [0.045, -0.15, 0.29]], 0.008, mat('#b0505a'), 6)); // smile
  for (const s of [-1, 1]) head.add(ellipsoid(0.045, 0.025, 0.01, blush, s * 0.13, -0.07, 0.2, false)); // blush
  // big blue eyes with lids and long lashes
  cartoonEyes(head, { y: 0.04, z: 0.185, spread: 0.085, r: 0.09, iris: '#3f86e0', irisR: 0.62 });
  for (const s of [-1, 1]) {
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.094, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.2), mat('#e9c6a2')); lid.scale.set(1, 1.25, 0.8); lid.position.set(s * 0.085, 0.04, 0.185); head.add(lid);
    for (let k = 0; k < 3; k++) { const l = P(G.cyl(0.006, 0.012, 0.07, 5), mat('#1a1010'), s * (0.085 + 0.03 + k * 0.02), 0.14 - k * 0.022, 0.24); l.rotation.z = -s * (0.6 + k * 0.35); l.rotation.x = -0.4; head.add(l); }
  }
  for (const s of [-1, 1]) { const ear = P(G.cyl(0.15, 0.15, 0.035, 24), fur, s * 0.21, 0.24, -0.07); ear.rotation.x = Math.PI / 2; ear.rotation.y = -s * 0.3; head.add(outlined(ear, 1.06)); const inn = P(G.cyl(0.1, 0.1, 0.04, 20), pink, s * 0.215, 0.24, -0.06); inn.rotation.x = Math.PI / 2; inn.rotation.y = -s * 0.3; head.add(inn); }
  // hair: crown, a big sweeping fringe, side locks, and long waves down the back
  head.add(ellipsoid(0.27, 0.19, 0.27, hair, 0, 0.11, -0.04));
  const fringe = ellipsoid(0.2, 0.09, 0.1, hair, 0.03, 0.2, 0.17); fringe.rotation.z = -0.35; head.add(outlined(fringe, 1.05));
  const curl = ellipsoid(0.07, 0.11, 0.05, hairL, -0.12, 0.15, 0.22, false); curl.rotation.z = 0.6; head.add(curl);
  for (const s of [-1, 1]) head.add(outlined(tube([[s * 0.2, 0.06, 0.04], [s * 0.23, -0.1, 0.0], [s * 0.21, -0.26, -0.04]], 0.05, hair, 10), 1.06));
  for (const [x, w] of [[-0.11, 0.075], [0, 0.085], [0.11, 0.075]]) head.add(outlined(tube([[x, 0.12, -0.2], [x * 1.3, -0.12, -0.27], [x * 1.1, -0.42, -0.24], [x * 1.4, -0.66, -0.18], [x, -0.82, -0.2]], w, hair, 10), 1.05));
  head.add(tube([[0.02, 0.1, -0.26], [0.03, -0.3, -0.33], [0.0, -0.7, -0.27]], 0.025, hairL, 6)); // highlight
  // purple-lens goggles on the forehead
  const gog = grp(0, 0.22, 0.16); gog.rotation.x = -0.75; head.add(gog);
  for (const s of [-1, 1]) { gog.add(P(G.torus(0.06, 0.02), mat('#4a3a5a'), s * 0.08, 0, 0)); const lens = P(G.cyl(0.055, 0.055, 0.02, 18), new THREE.MeshToonMaterial({ color: '#b48cff', transparent: true, opacity: 0.85, gradientMap: toonRamp() }), s * 0.08, 0, 0); lens.rotation.x = Math.PI / 2; gog.add(lens); }
  gog.add(P(G.box(0.05, 0.02, 0.02), mat('#4a3a5a'), 0, 0, 0));
  // arms: rolled-up sleeves, slim forearms
  const mkArm = (s) => { const a = grp(s * 0.15, 0.24, 0.0); body.add(a); const arm = grp(); arm.rotation.z = s * 0.22; a.add(arm);
    arm.add(sph(0.055, suit, 0, 0, 0, 10)); arm.add(limb(0.14, 0.055, 0.05, suit, 0)); arm.add(P(G.torus(0.05, 0.02), suitD, 0, -0.14, 0).rotateX(Math.PI / 2));
    arm.add(limb(0.15, 0.036, 0.03, fur, -0.14)); const h = mitten(fur, s); h.scale.setScalar(0.72); h.position.y = -0.31; arm.add(h); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  // long slim legs in the coverall trousers, small feet
  const mkLeg = (s) => { const l = grp(s * 0.062, -0.1, 0); body.add(l); l.add(limb(0.43, 0.06, 0.048, suit, 0)); l.add(P(G.torus(0.048, 0.015), suitD, 0, -0.41, 0).rotateX(Math.PI / 2)); l.add(ellipsoid(0.055, 0.04, 0.11, fur, 0, -0.46, 0.045)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const tg = grp(0, 0, 0); tg.add(tube([[0, -0.08, -0.11], [0, -0.3, -0.36], [0, -0.2, -0.62], [0, 0.08, -0.7], [0, 0.22, -0.62]], 0.018, pink, 6)); body.add(tg); parts.tail = tg;
  root.userData.parts = parts; root.userData.height = 1.5; root.userData.bodyY = 0.6; root.userData.kind = 'gadget'; return root;
}

export function makeMonty2() {
  // Monterey Jack as in the TV series: very rotund golden-ochre mouse, cream jowls and muzzle, small round light ears set high,
  // green eyes, a small dark nose with a highlight, a huge red-brown moustache, open grinning mouth, a little grey-blue cap with
  // goggles, an open white coat with lapels over a light-blue turtleneck sweater.
  const root = grp(); const parts = {};
  const fur = mat('#c99a52'), cream = mat('#f6e6d4'), coat = mat('#efebe4'), coatS = mat('#d6d0c6'), sweater = mat('#6f9cc8'), sweaterD = mat('#5582b0'), stache = mat('#b8481e'), cap = mat('#7c8498');
  const body = grp(0, 0.66, 0); root.add(body); parts.body = body;
  // big round belly in the blue turtleneck
  body.add(outlined(lathe([[0, -0.32], [0.3, -0.31], [0.44, -0.17], [0.49, 0.0], [0.47, 0.18], [0.4, 0.32], [0.27, 0.42], [0.1, 0.46], [0, 0.46]], sweater, 28), 1.03));
  body.add(P(G.torus(0.3, 0.045), sweaterD, 0, -0.29, 0).rotateX(Math.PI / 2)); // ribbed hem
  for (let i = 0; i < 4; i++) body.add(P(G.box(0.012, 0.09, 0.02), sweaterD, -0.15 + i * 0.1, -0.26, 0.33));
  // open white coat with long lapels
  const coatM = new THREE.MeshToonMaterial({ color: '#efebe4', gradientMap: toonRamp(), side: THREE.DoubleSide }); /* open coat hugging the round body */
  const coatShell = new THREE.Mesh(new THREE.LatheGeometry([[0.36, -0.36], [0.47, -0.2], [0.525, 0.0], [0.505, 0.18], [0.44, 0.32], [0.3, 0.43]].map(([r, y]) => new THREE.Vector2(r, y)), 32, 0.6, Math.PI * 2 - 1.2), coatM); coatShell.castShadow = true; body.add(outlined(coatShell, 1.02));
  body.add(P(G.torus(0.25, 0.06), sweater, 0, 0.44, 0.02).rotateX(Math.PI / 2)); // rolled collar
  // head sits right on the body (no neck)
  const head = grp(0, 0.74, 0.08); head.scale.setScalar(1.17); body.add(head); parts.head = head;
  head.add(ellipsoid(0.36, 0.33, 0.33, fur, 0, 0.04, 0));
  head.add(ellipsoid(0.39, 0.25, 0.29, cream, 0, -0.15, 0.1, false)); // wide cream jowls down to the chest
  head.add(ellipsoid(0.2, 0.15, 0.13, cream, 0, -0.04, 0.27, false)); // muzzle
  head.add(ellipsoid(0.07, 0.055, 0.055, mat('#4a1a12'), 0, 0.02, 0.42)); head.add(sph(0.02, mat('#ffffff'), -0.02, 0.04, 0.47, 6, false)); // small dark nose
  // open mouth with a pink tongue under the moustache
  const mouth = ellipsoid(0.13, 0.08, 0.05, mat('#5a1a14'), 0, -0.2, 0.33, false); head.add(mouth); head.add(ellipsoid(0.09, 0.04, 0.04, mat('#f08a90'), 0, -0.24, 0.35, false));
  head.add(P(G.box(0.04, 0.035, 0.02), mat('#ffffff'), 0.03, -0.14, 0.37));
  // huge red-brown moustache in one piece, spreading sideways from under the nose
  head.add(outlined(P(moustacheGeo(1.0, 0.24, 0.13, 0.3, 0.72), stache, 0, -0.085, 0.38), 1.04));
  cartoonEyes(head, { y: 0.15, z: 0.25, spread: 0.1, r: 0.095, iris: '#58a84a', irisR: 0.6 }); // green eyes
  for (const s of [-1, 1]) { const ear = P(G.cyl(0.14, 0.14, 0.045, 22), cream, s * 0.29, 0.3, -0.04); ear.rotation.x = Math.PI / 2; ear.rotation.y = -s * 0.35; head.add(outlined(ear, 1.07)); const inn = P(G.cyl(0.09, 0.09, 0.05, 18), mat('#f2c8bc'), s * 0.295, 0.3, -0.03); inn.rotation.x = Math.PI / 2; inn.rotation.y = -s * 0.35; head.add(inn); }
  // little grey-blue cap with goggles, perched on top
  const hat = grp(0, 0.34, -0.02); hat.rotation.z = 0.12; hat.rotation.x = -0.15; head.add(hat);
  hat.add(outlined(ellipsoid(0.2, 0.11, 0.19, cap, 0, 0, 0), 1.06));
  const brim = P(G.cyl(0.21, 0.23, 0.03, 20), cap, 0, -0.06, 0.02); brim.scale.z = 0.95; hat.add(brim);
  for (const s of [-1, 1]) { hat.add(P(G.torus(0.055, 0.018), mat('#3a3e4a'), s * 0.07, 0.07, 0.13).rotateX(-0.5)); const lens = P(G.cyl(0.05, 0.05, 0.02, 14), mat('#a8d8f0'), s * 0.07, 0.07, 0.13); lens.rotation.x = Math.PI / 2 - 0.5; hat.add(lens); }
  // arms: white coat sleeves, golden hands
  const mkArm = (s) => { const a = grp(s * 0.44, 0.26, 0.02); body.add(a); const arm = grp(); arm.rotation.z = s * 0.18; a.add(arm);
    arm.add(sph(0.13, coat, 0, 0, 0, 12)); arm.add(limb(0.32, 0.13, 0.115, coat, 0)); arm.add(P(G.torus(0.11, 0.035), coatS, 0, -0.32, 0).rotateX(Math.PI / 2));
    arm.add(limb(0.1, 0.08, 0.075, fur, -0.32)); const h = mitten(fur, s); h.scale.setScalar(1.75); h.position.y = -0.5; arm.add(h); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  const mkLeg = (s) => { const l = grp(s * 0.18, -0.3, 0.02); body.add(l); l.add(limb(0.24, 0.12, 0.1, fur, 0)); l.add(ellipsoid(0.13, 0.075, 0.24, fur, 0, -0.3, 0.08)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const tg = grp(0, 0, 0); tg.add(outlined(tube([[0, -0.26, -0.4], [0, -0.5, -0.66], [0, -0.32, -0.95], [0, 0.0, -1.02]], 0.035, mat('#e8b8a0'), 8), 1.1)); body.add(tg); parts.tail = tg;
  root.userData.parts = parts; root.userData.height = 1.95; root.userData.bodyY = 0.66; root.userData.kind = 'monty'; return root;
}

export function makeZipper2() {
  // Zipper as in the series: teal-green housefly; the top of the head is two huge yellow compound eyes merging into a heart
  // shape with tiny black pupils at the bottom; big black nose, wide open grin with a pink tongue, double antennae;
  // red T-shirt with a rolled collar and short sleeves; long thin arms and legs, big flat feet, small pale-blue wings.
  const root = grp(); const parts = {};
  const skin = mat('#3fae96'), eye = mat('#fff35a', { emissive: '#a09000', emissiveIntensity: 0.9 }), black = mat('#151515'), shirt = mat('#e2262a'), shirtD = mat('#b81a1e'), mouthM = mat('#6a1a1a');
  const body = grp(0, 0.36, 0); root.add(body); parts.body = body;
  // red T-shirt torso
  body.add(outlined(lathe([[0, -0.11], [0.085, -0.1], [0.115, -0.04], [0.12, 0.04], [0.105, 0.1], [0.06, 0.13], [0, 0.135]], shirt), 1.06));
  body.add(P(G.torus(0.055, 0.022), shirtD, 0, 0.125, 0).rotateX(Math.PI / 2)); // rolled collar
  body.add(ellipsoid(0.08, 0.07, 0.07, skin, 0, -0.14, 0)); // abdomen below the shirt
  // head: wide teal face, huge yellow eye dome on top
  const head = grp(0, 0.29, 0.02); body.add(head); parts.head = head;
  head.add(ellipsoid(0.23, 0.14, 0.18, skin, 0, -0.085, 0)); // cheeks / jaw
  for (const s of [-1, 1]) { const lobe = ellipsoid(0.145, 0.19, 0.16, eye, s * 0.085, 0.1, 0.0); lobe.rotation.z = -s * 0.12; head.add(lobe); }
  for (const s of [-1, 1]) head.add(ellipsoid(0.024, 0.034, 0.015, black, s * 0.034, 0.035, 0.157, false)); // little pupils at the bottom of the yellow eyes
  head.add(outlined(ellipsoid(0.075, 0.055, 0.06, black, 0, -0.065, 0.17), 1.05)); head.add(ellipsoid(0.025, 0.015, 0.01, mat('#ffffff'), 0, -0.045, 0.228, false)); // nose
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mouthM); mouth.scale.set(0.13, 0.07, 0.06); mouth.position.set(0, -0.1, 0.13); head.add(mouth);
  head.add(ellipsoid(0.05, 0.02, 0.03, mat('#f0409a'), 0, -0.15, 0.15, false)); // tongue
  head.add(tube([[-0.19, -0.04, 0.09], [-0.1, -0.11, 0.15], [0, -0.115, 0.17], [0.1, -0.11, 0.15], [0.19, -0.04, 0.09]], 0.007, black, 6)); // grin line
  for (const s of [-1, 1]) for (const k of [0, 1]) head.add(tube([[s * (0.05 + k * 0.03), 0.26, -0.02], [s * (0.07 + k * 0.05), 0.36, -0.01], [s * (0.13 + k * 0.06), 0.42 - k * 0.02, 0.0]], 0.008, skin, 5)); // double antennae
  // wings
  const wm = new THREE.MeshToonMaterial({ color: '#c6d8f4', transparent: true, opacity: 0.7, side: THREE.DoubleSide, gradientMap: toonRamp() });
  const wings = grp(0, 0.02, -0.11); body.add(wings); parts.wings = wings;
  for (const s of [-1, 1]) { const w = P(G.sph(1, 14), wm, s * 0.12, -0.02, 0); w.scale.set(0.13, 0.09, 0.012); w.rotation.z = s * 0.5; w.userData.side = s; wings.add(w); }
  // long thin limbs, big flat feet
  const mkLeg = (s) => { const l = grp(s * 0.045, -0.17, 0); body.add(l); l.add(limb(0.17, 0.022, 0.02, skin, 0)); l.add(outlined(ellipsoid(0.055, 0.025, 0.08, skin, s * 0.02, -0.18, 0.035), 1.08)); return l; };
  parts.legL = mkLeg(-1); parts.legR = mkLeg(1);
  const mkArm = (s) => { const a = grp(s * 0.11, 0.08, 0); body.add(a); a.add(sph(0.045, shirt, 0, 0, 0, 10)); const arm = grp(); arm.rotation.z = s * 0.25; a.add(arm); arm.add(limb(0.2, 0.02, 0.018, skin, -0.02)); arm.add(ellipsoid(0.03, 0.035, 0.025, skin, 0, -0.23, 0)); return a; };
  parts.armL = mkArm(-1); parts.armR = mkArm(1);
  root.userData.parts = parts; root.userData.height = 0.8; root.userData.bodyY = 0.36; root.userData.kind = 'zipper'; root.userData.flyer = true; return root;
}
