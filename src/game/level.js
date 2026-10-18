// Level: parses ASCII rows into a tile grid, builds 3D geometry, provides collision queries.
// Two sources: generated recipe levels (theme materials) and original ripped levels (per-cell colours from the ROM data).
import * as THREE from 'three';
import { T, ITEM_CHARS, ENEMY_CHARS } from './constants.js';
import { THEMES, makeThemeMaterials, buildBackground, TEX } from './themes.js';

export const TILE_SOLID = 1, TILE_ALT = 2, TILE_PLAT = 3, TILE_WALL = 4, TILE_SPIKES = 5, TILE_WATER = 6, TILE_PILLAR = 7, TILE_LEAF = 8, TILE_VOID = 9, TILE_KILL = 10, TILE_JET = 11, TILE_DOOR = 12;

export class Level {
  constructor(def) {
    this.def = def; this.theme = THEMES[def.theme] || THEMES.street;
    this.rows = def.rows; this.height = this.rows.length; this.width = Math.max(...this.rows.map(r => r.length));
    this.grid = new Uint8Array(this.width * this.height);
    this.spawns = { players: [], items: [], enemies: [], platforms: [], fallers: [], fans: [], steams: [], cranes: [], switches: [], boats: [], walls: [], doors: [], jets: [], exit: null, boss: null };
    this.group = new THREE.Group();
    this.groundY = 0; this.original = !!def.cells;
    this._parse();
  }
  rowY(ty) { return this.height - 1 - ty; }
  tyOf(y) { return this.height - 1 - Math.floor(y); }
  _parse() {
    for (let ty = 0; ty < this.height; ty++) {
      const row = this.rows[ty];
      for (let tx = 0; tx < this.width; tx++) {
        const c = row[tx] || '.'; const wx = tx + 0.5, wy = this.rowY(ty);
        let g = 0;
        switch (c) {
          case T.SOLID: g = TILE_SOLID; break;
          case T.SOLID_ALT: g = TILE_ALT; break;
          case T.PLATFORM: g = TILE_PLAT; break;
          case T.WALL: g = TILE_WALL; this.spawns.walls.push({ tx, ty }); break;
          case T.SPIKES: g = TILE_SPIKES; break;
          case T.WATER: g = TILE_WATER; break;
          case T.DECOR_PILLAR: g = TILE_PILLAR; break;
          case T.DECOR_LEAF: g = TILE_LEAF; break;
          case T.VOID: g = TILE_VOID; break;
          case T.KILL: g = TILE_KILL; break;
          case T.JET: g = TILE_JET; this.spawns.jets.push({ x: wx, y: wy }); break;
          case T.DOOR: g = TILE_DOOR; this.spawns.doors.push({ tx, ty, x: wx, y: wy }); break;
          case T.START: this.spawns.players.push({ x: wx, y: wy }); break;
          case T.EXIT: this.spawns.exit = { x: wx, y: wy }; break;
          case T.BOSS: this.spawns.boss = { x: wx, y: wy }; break;
          case T.PLAT_H: this.spawns.platforms.push({ x: wx, y: wy, axis: 'x' }); break;
          case T.PLAT_V: this.spawns.platforms.push({ x: wx, y: wy, axis: 'y' }); break;
          case T.FALLER: this.spawns.fallers.push({ x: wx, y: wy }); break;
          case T.FAN: this.spawns.fans.push({ x: wx, y: wy }); break;
          case T.STEAM: this.spawns.steams.push({ x: wx, y: wy }); break;
          case T.CRANE: this.spawns.cranes.push({ x: wx, y: wy }); g = TILE_PLAT; break;
          case T.SWITCH: this.spawns.switches.push({ x: wx, y: wy }); break;
          case T.BOAT: this.spawns.boats.push({ x: wx, y: wy }); break;
          default:
            if (ITEM_CHARS.has(c)) this.spawns.items.push({ ch: c, x: wx, y: wy });
            else if (ENEMY_CHARS[c]) this.spawns.enemies.push({ type: ENEMY_CHARS[c], x: wx, y: wy });
        }
        this.grid[ty * this.width + tx] = g;
      }
    }
    if (!this.spawns.players.length) this.spawns.players.push({ x: 2.5, y: 2 });
    // doors: attach destinations from def.doors (original levels)
    if (this.def.doors) for (const d of this.spawns.doors) {
      const rec = this.def.doors.find(r => r.x === d.tx && d.ty >= r.y && d.ty < r.y + r.h); if (!rec) continue;
      d.dest = { x: rec.dest[0], y: rec.dest[1] }; d.edge = !!rec.edge; d.lock = rec.lock || null; // edge: walking into it transfers; lock: stays a wall until opened
      if (d.lock) this.grid[d.ty * this.width + d.tx] = TILE_SOLID;
    }
  }
  tileAt(tx, ty) { if (tx < 0 || tx >= this.width) return TILE_SOLID; if (ty < 0) return 0; if (ty >= this.height) return 0; return this.grid[ty * this.width + tx]; }
  tileAtWorld(x, y) { return this.tileAt(Math.floor(x), this.tyOf(y)); }
  isSolidTile(t) { return t === TILE_SOLID || t === TILE_ALT || t === TILE_WALL || t === TILE_VOID; }
  solidAtWorld(x, y) { return this.isSolidTile(this.tileAtWorld(x, y)); }
  // open doors locked by an event (zone 0: the red box opens the passage to the boss)
  unlockDoors(lock) { for (const d of this.spawns.doors) if (d.lock === lock) { d.lock = null; this.grid[d.ty * this.width + d.tx] = TILE_DOOR; for (const m of d.cover || []) this.group.remove(m); d.cover = null; } }
  breakWall(tx, ty) { this.grid[ty * this.width + tx] = 0; const m = this.wallMeshes && this.wallMeshes.get(tx + ',' + ty); if (m) { this.group.remove(m); } }

  build(scene) {
    const mats = this.mats = makeThemeMaterials(this.theme);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const m4 = new THREE.Matrix4();
    if (this.original) this._buildOriginal(scene, geo, m4, mats); else this._buildThemed(scene, geo, m4, mats);
    // breakable walls as separate meshes
    this.wallMeshes = new Map();
    for (const w of this.spawns.walls) { const m = new THREE.Mesh(geo, mats.wall); m.position.set(w.tx + 0.5, this.rowY(w.ty) + 0.5, 0); m.castShadow = true; this.group.add(m); this.wallMeshes.set(w.tx + ',' + w.ty, m); }
    // doors
    for (const d of this.spawns.doors) {
      if (this.original) continue; // original levels: the doorway is part of the painted screen
      if (d.ty > 0 && this.tileAt(d.tx, d.ty - 1) === TILE_DOOR) continue; // draw once per door (top cell)
      const h = this.tileAt(d.tx, d.ty + 1) === TILE_DOOR ? 2 : 1;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, h + 0.2, 0.3), new THREE.MeshStandardMaterial({ color: '#2a8a3a', roughness: 0.6 })); frame.position.set(d.x, this.rowY(d.ty + h - 1) + h / 2, -0.2); this.group.add(frame);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.7, h - 0.2, 0.1), new THREE.MeshStandardMaterial({ color: '#80ff90', emissive: '#40c060', emissiveIntensity: 0.8 })); glow.position.set(d.x, this.rowY(d.ty + h - 1) + h / 2, -0.02); this.group.add(glow);
    }
    this.background = this.original ? new THREE.Group() : buildBackground(this.theme, this); // original zones: only what the NES screen shows
    scene.add(this.background); scene.add(this.group);
    const hemi = this.original ? new THREE.HemisphereLight('#ffffff', '#c8c8c8', 2.4) : new THREE.HemisphereLight(this.theme.sky[1], '#303030', this.theme.ambient); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff8e8', this.original ? 1.3 : this.theme.sun); sun.position.set(-6, 14, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.near = 1; sc.far = 60; sc.left = -18; sc.right = 18; sc.top = 14; sc.bottom = -14; sun.shadow.bias = -0.0005;
    scene.add(sun); scene.add(sun.target); this.sun = sun; this.lights = [hemi, sun, sun.target];
    const skyTop = this.def.sky && this.original ? this.def.sky : this.theme.sky[0]; const skyBottom = this.original && this.def.sky ? this.def.sky : this.theme.sky[1];
    scene.background = new THREE.Color(skyTop); scene.fog = new THREE.Fog(this.original ? skyTop : this.theme.fog, 25, 70);
    const skyGeo = new THREE.SphereGeometry(120, 16, 8); const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color(skyTop) }, bottom: { value: new THREE.Color(skyBottom).lerp(new THREE.Color('#ffffff'), this.original ? 0.25 : 0) } }, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y/80.0 + 0.3, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }' });
    this.sky = new THREE.Mesh(skyGeo, skyMat); scene.add(this.sky);
  }
  _buildThemed(scene, geo, m4, mats) {
    const counts = { solid: 0, alt: 0, plat: 0, pillar: 0, leaf: 0, spikes: 0, water: 0 };
    const cells = [];
    for (let ty = 0; ty < this.height; ty++) for (let tx = 0; tx < this.width; tx++) {
      const g = this.grid[ty * this.width + tx]; if (!g || g === TILE_WALL || g === TILE_VOID || g === TILE_KILL || g === TILE_JET || g === TILE_DOOR) continue;
      const k = g === TILE_SOLID ? 'solid' : g === TILE_ALT ? 'alt' : g === TILE_PLAT ? 'plat' : g === TILE_PILLAR ? 'pillar' : g === TILE_LEAF ? 'leaf' : g === TILE_SPIKES ? 'spikes' : 'water';
      counts[k]++; cells.push([k, tx, ty]);
    }
    const inst = {}; const idx = {};
    for (const k in counts) { if (!counts[k]) continue; const im = new THREE.InstancedMesh(k === 'plat' ? new THREE.BoxGeometry(1, 0.35, 1.1) : k === 'pillar' ? new THREE.CylinderGeometry(0.42, 0.42, 1, 10) : k === 'spikes' ? new THREE.ConeGeometry(0.3, 0.9, 6) : k === 'water' ? new THREE.BoxGeometry(1, 0.9, 1) : geo, mats[k], k === 'spikes' ? counts[k] * 3 : counts[k]); im.castShadow = k !== 'water' && k !== 'leaf'; im.receiveShadow = true; inst[k] = im; idx[k] = 0; this.group.add(im); }
    for (const [k, tx, ty] of cells) {
      const y = this.rowY(ty); let px = tx + 0.5, py = y + 0.5, pz = 0;
      if (k === 'plat') py = y + 0.825; if (k === 'pillar') pz = -0.6; if (k === 'spikes') py = y + 0.45; if (k === 'leaf') pz = -0.3;
      if (k === 'spikes') { for (const dx of [-0.3, 0, 0.3]) { m4.makeTranslation(px + dx, py, pz); inst[k].setMatrixAt(idx[k]++, m4); } continue; }
      m4.makeTranslation(px, py, pz); inst[k].setMatrixAt(idx[k]++, m4);
    }
    for (const k in inst) { inst[k].count = idx[k]; inst[k].instanceMatrix.needsUpdate = true; }
  }
  // Original levels: every cell carries the colour of the ROM block it came from.
  _buildOriginal(scene, geo, m4, mats) {
    const def = this.def; const colors = def.colors; const density = def.density; const skyId = def.skyId;
    // NES palette colours are dark; lift them (gamma + gain) so lit 3D blocks read like the original screen, then quantise
    const lift = (v) => Math.min(255, Math.round(Math.pow(v / 255, 0.95) * 255));
    const quant = (hex) => { const n = parseInt(hex.slice(1), 16); const q = (v) => Math.min(255, Math.round(lift(v) / 20) * 20); return ((q(n >> 16) << 16) | (q((n >> 8) & 255) << 8) | q(n & 255)).toString(16).padStart(6, '0'); };
    const groups = { solid: new Map(), plat: new Map(), back: new Map() };
    const add = (kind, key, tx, ty) => { const g = groups[kind]; if (!g.has(key)) g.set(key, []); g.get(key).push([tx, ty]); };
    const spikes = [], water = [], voids = [];
    const locked = new Map(); for (const d of this.spawns.doors) if (d.lock) locked.set(d.tx + ',' + d.ty, d);
    const bs = def.bossScreen; const inBossRoom = (tx, ty) => bs && Math.floor(tx / 16) === bs[0] && Math.floor(ty / 16) === bs[1]; // the boss is a 3D model there: do not paint its picture
    for (let ty = 0; ty < this.height; ty++) for (let tx = 0; tx < this.width; tx++) {
      const g = this.grid[ty * this.width + tx]; const cid = def.cells[ty][tx];
      if (g === TILE_VOID) { voids.push([tx, ty]); continue; }
      if (cid < 0) continue;
      const col = colors[cid]; const key = quant(col);
      const ld = locked.get(tx + ',' + ty);
      if (ld) { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color('#' + key), map: TEX.planks('#ffffff', '#e2e2e2'), roughness: 0.85 })); m.position.set(tx + 0.5, this.rowY(ty) + 0.5, 0); m.castShadow = true; this.group.add(m); (ld.cover = ld.cover || []).push(m); continue; }
      if (g === TILE_SOLID || g === TILE_ALT) add(density[cid] < 0.3 ? 'plat' : 'solid', key, tx, ty); // thinly drawn solid cells (wires) look like ledges
      else if (g === TILE_PLAT) { add('plat', key, tx, ty); if (density[cid] > 0.45) add('back', key, tx, ty); } // the ledge + its painted cell behind (thin wires stay thin)
      else if (g === TILE_SPIKES) spikes.push([tx, ty]);
      else if (g === TILE_WATER) water.push([tx, ty]);
      else if (ITEM_CHARS.has(this.rows[ty][tx]) || ENEMY_CHARS[this.rows[ty][tx]]) { // items/enemies are models: paint the backdrop that surrounds them instead
        for (const [nx, ny] of [[tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx - 2, ty], [tx + 2, ty], [tx, ty + 1]]) {
          if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue; const ch = this.rows[ny][nx], nc = def.cells[ny][nx];
          if (this.grid[ny * this.width + nx] !== 0 || ITEM_CHARS.has(ch) || ENEMY_CHARS[ch] || nc < 0) continue;
          if (nc !== skyId && density[nc] > 0.04) add('back', quant(colors[nc]), tx, ty); break;
        }
      }
      else if (cid !== skyId && density[cid] > 0.04 && !inBossRoom(tx, ty)) add('back', key, tx, ty);
    }
    const tex = TEX.planks('#ffffff', '#e2e2e2'); const stoneTex = TEX.stone('#ffffff'); const flatTex = TEX.dirt('#f4f4f4'); // light textures: keep the NES palette colours
    for (const [kind, map] of Object.entries(groups)) {
      for (const [key, list] of map) {
        const color = new THREE.Color('#' + key);
        let mat, g;
        if (kind === 'solid') { mat = new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.85 }); g = geo; }
        else if (kind === 'plat') { mat = new THREE.MeshStandardMaterial({ color, map: stoneTex, roughness: 0.7, metalness: 0.1 }); g = new THREE.BoxGeometry(1, 0.4, 1.1); }
        else { mat = new THREE.MeshStandardMaterial({ color, map: flatTex, roughness: 1 }); g = new THREE.BoxGeometry(1, 1, 0.25); }
        const im = new THREE.InstancedMesh(g, mat, list.length); im.castShadow = kind !== 'back'; im.receiveShadow = true;
        const q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
        list.forEach(([tx, ty], i) => { const y = this.rowY(ty); if (kind === 'plat') { const h = Math.max(0.12, Math.min(0.4, density[def.cells[ty][tx]] * 1.2)); sc.set(1, h / 0.4, 1); pos.set(tx + 0.5, y + 1 - h / 2, 0); m4.compose(pos, q, sc); } else m4.makeTranslation(tx + 0.5, y + 0.5, kind === 'back' ? -0.62 : 0); im.setMatrixAt(i, m4); }); // ledges as thick as drawn
        this.group.add(im);
      }
    }
    if (spikes.length) { // hazard cells (plants, needles): three thin cones tinted with the original block colour
      const byCol = new Map(); for (const [tx, ty] of spikes) { const cid = def.cells[ty][tx]; const key = cid >= 0 ? quant(colors[cid]) : 'c0c8d0'; if (!byCol.has(key)) byCol.set(key, []); byCol.get(key).push([tx, ty]); }
      for (const [key, list] of byCol) { const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 0.9, 6), new THREE.MeshStandardMaterial({ color: new THREE.Color('#' + key), roughness: 0.6 }), list.length * 3); let i = 0; for (const [tx, ty] of list) for (const dx of [-0.3, 0, 0.3]) { m4.makeTranslation(tx + 0.5 + dx, this.rowY(ty) + 0.45, 0); im.setMatrixAt(i++, m4); } im.castShadow = true; this.group.add(im); } }
    if (water.length) { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.9, 1), mats.water, water.length); water.forEach(([tx, ty], i) => { m4.makeTranslation(tx + 0.5, this.rowY(ty) + 0.5, 0); im.setMatrixAt(i, m4); }); this.group.add(im); }
    // out-of-route screens ('@') are invisible solid walls: the original camera never scrolled into them
    // per-screen background: if a screen's dominant background colour differs from the sky (e.g. the lab), draw a backdrop plane
    for (let sy = 0; sy < this.height / 16; sy++) for (let sx = 0; sx < this.width / 16; sx++) {
      const cnt = new Map(); let any = false;
      for (let ty = sy * 16; ty < Math.min(this.height, sy * 16 + 16); ty++) for (let tx = sx * 16; tx < Math.min(this.width, sx * 16 + 16); tx++) { const cid = def.cells[ty][tx]; if (cid < 0 || this.grid[ty * this.width + tx] !== 0) continue; any = true; cnt.set(cid, (cnt.get(cid) || 0) + 1); }
      if (!any) continue; let best = -1, bc = 0; for (const [k, v] of cnt) if (v > bc) { bc = v; best = k; }
      if (best < 0 || best === skyId || bc < 60) continue;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ color: new THREE.Color(colors[best]), roughness: 1 })); pl.position.set(sx * 16 + 8, this.rowY(sy * 16 + 15) + 8, -0.85); this.group.add(pl);
    }
    // jets (updraft water/steam columns): translucent pillars
    for (const j of this.spawns.jets) { const jm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1, 10), new THREE.MeshStandardMaterial({ color: '#b0e8ff', transparent: true, opacity: 0.45, emissive: '#60a0ff', emissiveIntensity: 0.3 })); jm.position.set(j.x, j.y + 0.5, 0.1); this.group.add(jm); }
    // kill zones: subtle dark gradient markers
    for (let ty = 0; ty < this.height; ty++) for (let tx = 0; tx < this.width; tx++) if (this.grid[ty * this.width + tx] === TILE_KILL) { const km = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: 0.6 })); km.position.set(tx + 0.5, this.rowY(ty) + 0.15, 0); this.group.add(km); }
  }
  updateLight(camX, camY) { if (this.sun) { this.sun.position.set(camX - 6, camY + 14, 12); this.sun.target.position.set(camX, camY, 0); } if (this.sky) this.sky.position.set(camX, camY, 0); }
  dispose(scene) {
    scene.remove(this.group); scene.remove(this.background); scene.remove(this.sky); for (const l of this.lights) scene.remove(l);
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.background.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
}
