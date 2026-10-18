// World: one gameplay session (a zone). Owns level geometry, players, items, enemies, boss, camera and interactions.
import * as THREE from 'three';
import { Level } from './level.js';
import { Player, Item, Enemy, Boss, Projectile, Platform, Particles, aabb } from './entities.js';
import { SFX, MUSIC } from './constants.js';
import { animateBackground } from './themes.js';
import { makeNPC, animateCharacter, RANGERS } from './models.js';

export class World {
  constructor(game, def, playerKinds) {
    this.game = game; this.scene = game.scene; this.camera = game.camera; this.audio = game.audio; this.def = def;
    this.level = new Level(def); this.level.build(this.scene);
    this.items = []; this.enemies = []; this.projectiles = []; this.platforms = []; this.players = [];
    this.particles = new Particles(this.scene); this.boss = null; this.bossActive = false; this.time = 0; this.state = 'play'; this.stateT = 0;
    this.camX = 0; this.camY = 0; this.camLockL = -Infinity; this.camLockR = Infinity; this.shake = 0;
    this.hasP = false; this.montyNPC = null; this.flags = {}; this.gearsCollected = 0; this.gearsTotal = 0;
    this.fallerTimer = 0; this.fans = []; this.steams = []; this.events = [];
    const sp = this.level.spawns;
    playerKinds.forEach((k, i) => { const p = new Player(i, k, this); const s = sp.players[Math.min(i, sp.players.length - 1)]; p.spawnAt(s.x + i * 0.8, s.y + 0.01); this.players.push(p); });
    for (const it of sp.items) { const item = Item.fromChar(it.ch, it.x, it.y, this); if (item) { this.items.push(item); if (item.kind === 'gear') this.gearsTotal++; } }
    for (const e of sp.enemies) this.enemies.push(new Enemy(e.type, e.x, e.y, this));
    // original-level extras: power-line sparks, collectibles hidden under crates, the red box
    for (const e of def.extra || []) {
      if (e.k === 'spark') { const en = new Enemy('spark', e.x, e.y, this); en.range = e.r; en.dir = e.d; en.x0 = e.x; en.y0 = e.y; this.enemies.push(en); }
      else if (e.k === 'hidden') { const it = Item.fromChar(e.ch, e.x, e.y, this); if (it) { it.hiddenUnder = true; it.floating = true; it.mesh.visible = false; this.items.push(it); } }
      else if (e.k === 'redbox') { const it = Item.fromChar('R', e.x, e.y, this); if (it) { it.floating = true; this.items.push(it); } }
    }
    for (const p of sp.platforms) this.platforms.push(new Platform(p.x, p.y, p.axis, this, { range: p.axis === 'x' ? 3 : 2.5 }));
    for (const c of sp.cranes) this.platforms.push(new Platform(c.x, c.y + 0.3, 'y', this, { kind: 'crane', w: 1.6, color: '#e8e8e0' }));
    for (const b of sp.boats) { const bt = new Platform(b.x, b.y, 'x', this, { kind: 'boat', w: 2.2, color: '#8a5a2a' }); bt.isBoat = true; this.platforms.push(bt); }
    for (const f of sp.fans) { this.fans.push(this._makeFan(f.x, f.y)); }
    for (const s of sp.steams) this.steams.push({ x: s.x, y: s.y, t: Math.random() * 3, mesh: this._makeSteam(s.x, s.y) });
    this.fallers = sp.fallers.map(f => ({ x: f.x, y: f.y, t: Math.random() * 2 }));
    this.switches = sp.switches.map(s => ({ x: s.x, y: s.y, on: false, mesh: this._makeSwitch(s.x, s.y) }));
    for (const p of this.players) for (const it of this.items) if (it.carryable && Math.abs(it.x - p.x) < (it.w + p.w) / 2 && p.y >= it.y - 0.1 && p.y < it.y + it.h) p.y = it.y + it.h + 0.01; /* start on top of the apple, not inside it */
    if (sp.exit) this._makeExit(sp.exit);
    this.camX = this.players[0].x; this.camY = this.players[0].y + 3;
    this.deathPending = false; this.clock = 0;
  }
  // ---- factories for decor entities
  _makeFan(x, y) { const g = new THREE.Group(); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#555' })); hub.rotation.x = Math.PI / 2; g.add(hub); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.06), new THREE.MeshStandardMaterial({ color: '#d8d0c0' })); b.position.set(Math.cos(i * Math.PI / 2) * 0.8, Math.sin(i * Math.PI / 2) * 0.8, 0); b.rotation.z = i * Math.PI / 2; g.add(b); } g.position.set(x, y + 0.5, 0.1); this.scene.add(g); return { x, y: y + 0.5, mesh: g, w: 2.6, h: 2.6 }; }
  _makeSteam(x, y) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }); for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), m); s.position.set((Math.random() - 0.5) * 0.4, i * 0.6, 0); g.add(s); } g.position.set(x, y, 0.1); g.visible = false; this.scene.add(g); return g; }
  _makeSwitch(x, y) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), new THREE.MeshStandardMaterial({ color: '#444' }))); const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 12), new THREE.MeshStandardMaterial({ color: '#e03030', emissive: '#800000', emissiveIntensity: 0.5 })); btn.position.y = 0.3; g.add(btn); g.userData.btn = btn; g.position.set(x, y + 0.15, 0); this.scene.add(g); return g; }
  _makeExit(e) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#ffd040', emissive: '#ff9000', emissiveIntensity: 0.8 }); const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 4), m); arrow.rotation.x = Math.PI; arrow.position.y = 2.6; g.add(arrow); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24), m); ring.position.y = 1.0; g.add(ring); const l = new THREE.PointLight('#ffb040', 1.5, 8); l.position.y = 1.5; g.add(l); g.position.set(e.x, e.y, 0); this.scene.add(g); this.exitMesh = g; }

  // ---- queries used by entities
  sfx(n) { this.audio.playSfx(n); }
  nearestPlayer(x, y) { let best = null, bd = 1e9; for (const p of this.players) { if (!p.active || p.dead || p.carriedBy) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best; }
  solidBoxes(body) {
    const out = [];
    for (const it of this.items) { if (!it.carryable || it === body || it.carriedBy || it.dead) continue; if (it.thrown && body instanceof Player) continue; if (Math.abs(it.x - body.x) < 3 && Math.abs(it.y - body.y) < 3) out.push({ x: it.x, y: it.y, w: it.w, h: it.h, ref: it }); }
    for (const p of this.platforms) { if (Math.abs(p.x - body.x) < 4 && Math.abs(p.y - body.y) < 4) out.push({ x: p.x, y: p.y, w: p.w, h: p.h, ref: p, platformOnly: true }); }
    return out.filter(s => !s.platformOnly || (body.y >= s.y + s.h - 0.3)); // platforms are one-way
  }
  itemsSolidWorld(item) { return { solidBoxes: (b) => this.solidBoxes(item).filter(s => s.ref !== item && !(s.ref instanceof Item && s.ref.thrown)) }; }
  solidBodyAt(x, y) { for (const it of this.items) { if (it.carryable && !it.carriedBy && Math.abs(it.x - x) < it.w / 2 && y >= it.y && y <= it.y + it.h) return it; } for (const p of this.platforms) { if (Math.abs(p.x - x) < p.w / 2 && y >= p.y - 0.2 && y <= p.y + p.h) return p; } return null; }
  boatUnder(p) { for (const b of this.platforms) if (b.isBoat && Math.abs(b.x - p.x) < b.w / 2 + 0.3 && Math.abs(p.y - (b.y + b.h)) < 0.6) return b; return null; }
  spawnParticles(x, y, color, n) { this.particles.spawn(x, y, color, n); }
  spawnProjectile(x, y, vx, vy, kind) { const pr = new Projectile(x, y, vx, vy, kind, this); this.projectiles.push(pr); return pr; }
  spawnEnemy(type, x, y) { const e = new Enemy(type, x, y, this); this.enemies.push(e); return e; }
  spawnItem(kind, x, y) { const it = new Item(kind, x, y, this); it.vy = 6; this.items.push(it); return it; }
  explode(x, y) { this.spawnParticles(x, y, '#ff8020', 20); this.sfx(SFX.explode); this.shake = 0.4; for (const p of this.players) if (Math.hypot(p.x - x, p.y - y) < 2.2) p.hurt(1, Math.sign(p.x - x)); for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 2.5) e.hit(); }
  onPlayerDied(p, reason) { this.sfx(reason === 'fall' ? SFX.fall : SFX.hurt); this.game.onPlayerDied(p, reason); }
  onBossDefeated(b) { this.shake = 0.6; this.game.onBossDefeated(b); this.game.rumble(0, 1, 1, 500); this.game.rumble(1, 1, 1, 500); }
  useDoor(p) {
    const lv = this.level; const tx = Math.floor(p.x), ty = lv.tyOf(p.y + 0.5);
    const d = lv.spawns.doors.find(d => d.tx === tx && Math.abs(d.ty - ty) <= 1 && d.dest && !d.lock);
    if (!d || this.doorCd > 0) return;
    this.doorCd = 1.0; this.sfx(SFX.menuOk); this.game.fadeFlash();
    for (const q of this.players) { if (q.dead || !q.active) continue; q.x = d.dest.x + (q === p ? 0 : 0.8); q.y = d.dest.y + 0.05; q.vx = 0; q.vy = 0; if (q.carry && !q.carry.isPlayer) { q.carry.x = q.x; q.carry.y = q.y + q.h; } }
    this.camX = d.dest.x; this.camY = d.dest.y + 3; this.camBand = null; this.camInit = false; this.checkpoint = { x: d.dest.x, y: d.dest.y }; this.camLockL = -Infinity; this.camLockR = Infinity;
    for (const pr of this.projectiles) pr.dead = true;
  }

  // ---- main update
  update(dt, input) {
    this.time += dt; this.stateT += dt; this.clock += dt; if (this.doorCd > 0) this.doorCd -= dt;
    const lv = this.level;
    if (this.state === 'play' || this.state === 'boss') {
      this.players.forEach((p, i) => p.update(dt, p.active ? input.players[i] : null, lv));
      // riders on boats
      for (const b of this.platforms) { b.rider = null; } for (const p of this.players) if (p.onPlatform && p.onPlatform.isBoat) { p.onPlatform.rider = p; p.vxWish = input.players[p.index] ? input.players[p.index].axisX : 0; }
      for (const p of this.platforms) { p.update(dt); }
      for (const p of this.players) if (p.onPlatform && !p.dead) { p.x += p.onPlatform.dx; p.y += p.onPlatform.dy; }
      for (const it of this.items) it.update(dt, lv);
      for (const it of this.items) if (it.hiddenUnder && !this.items.some(c => c.kind === 'crate' && !c.dead && !c.carriedBy && Math.abs(c.x - it.x) < 0.5 && Math.abs(c.y - it.y) < 0.5)) { it.hiddenUnder = false; it.mesh.visible = true; }
      for (const p of this.players) { if (!p.active || p.dead || p.carriedBy) continue; const tx = Math.floor(p.x), ty = lv.tyOf(p.y + 0.5); if (lv.spawns.doors.some(d => (d.edge || lv.original) && !d.lock && d.dest && d.tx === tx && Math.abs(d.ty - ty) <= 1)) this.useDoor(p); /* NES: you walk into a doorway */ }
      for (const e of this.enemies) e.update(dt, lv);
      if (this.redboxEvent) this._updateRedbox(dt);
      const zip = this.players.some(p => p.zipperT > 0); /* the Zipper tune plays while the bonus lasts */
      if (zip && !this.zipMusic) { this.zipMusic = true; this.audio.playMusic(MUSIC.gadget); } else if (!zip && this.zipMusic) { this.zipMusic = false; this.audio.playMusic(this.bossActive && this.boss ? MUSIC.boss : this.def.music); }
      for (const pr of this.projectiles) pr.update(dt, lv);
      if (this.boss) { this.boss.update(dt, lv); if (this.boss.gone) { this.boss.dispose(); this.boss = null; } }
      this.particles.update(dt);
      this._hazards(dt); this._interactions(dt); this._cleanup();
      this._checkBossTrigger(); this._checkExit();
    } else if (this.state === 'clear' || this.state === 'dead') {
      for (const it of this.items) it.update(dt, lv); this.particles.update(dt);
      this.players.forEach(p => { if (p.dead) p.update(dt, null, lv); else if (this.state === 'clear') { p.t += dt; animateCharacter(p.mesh, { facing: p.facing, vx: 0, vy: 0, grounded: true, t: p.t, hidden: false }, dt); } });
      if (this.boss) { this.boss.update(dt, lv); if (this.boss.gone) { this.boss.dispose(); this.boss = null; } }
    }
    this._camera(dt); animateBackground(this.level.background, dt);
    if (this.exitMesh) { this.exitMesh.rotation.y += dt; this.exitMesh.children[0].position.y = 2.6 + Math.sin(this.time * 4) * 0.2; this.exitMesh.visible = !this.def.boss || (this.bossActive && !this.boss); }
    for (const f of this.fans) f.mesh.rotation.z += dt * 9;
    for (const s of this.switches) s.mesh.userData.btn.position.y = s.on ? 0.18 : 0.3;
    if (this.montyNPC) { this.montyNPC.t += dt; const m = this.montyNPC; m.x += m.dir * dt * 7; m.mesh.position.set(m.x, m.y, 0.1); animateCharacter(m.mesh, { facing: m.dir, vx: 7, grounded: true, t: m.t }, dt); if (m.t > 2.5) { this.scene.remove(m.mesh); this.montyNPC = null; } }
  }
  _hazards(dt) {
    // falling iron balls (toy store), steam (kitchen), ceiling fans (office)
    for (const f of this.fallers) { f.t -= dt; if (f.t <= 0) { const near = this.players.some(p => Math.abs(p.x - f.x) < 9); if (near) this.spawnProjectile(f.x, f.y, 0, -1, 'ironball'); f.t = 2.2 + Math.random() * 1.5; } }
    for (const s of this.steams) { s.t += dt; const on = (s.t % 3) < 1.3; s.mesh.visible = on; if (on) { s.mesh.children.forEach((c, i) => { c.position.y = ((s.t * 2 + i * 0.6) % 2.4); c.scale.setScalar(0.6 + c.position.y * 0.4); }); for (const p of this.players) if (!p.dead && Math.abs(p.x - s.x) < 0.5 && p.y > s.y - 0.5 && p.y < s.y + 2.4) p.hurt(1, 0); } }
    for (const f of this.fans) for (const p of this.players) if (!p.dead && Math.abs(p.x - f.x) < 1.3 && Math.abs(p.y + p.h / 2 - f.y) < 1.3) p.hurt(1, Math.sign(p.x - f.x) || 1);
  }
  _interactions(dt) {
    const lv = this.level;
    for (const p of this.players) {
      if (!p.active || p.dead || p.carriedBy) continue;
      // pickups
      for (const it of this.items) {
        if (it.dead || it.carryable || it.hiddenUnder || it.used) continue;
        if (aabb(p, it)) { this._collect(p, it); }
      }
      // enemies
      for (const e of this.enemies) {
        if (e.dead || !e.contact) continue;
        const eb = { x: e.x, y: e.y, w: e.w * 0.8, h: e.h * 0.85 };
        if (aabb(p, eb)) {
          if (p.zipperT > 0) { e.hit(); continue; }
          if (p.hidden && p.carry) { // enemy bumps into the box: it is hit as if by a thrown crate and the crate flies off
            const c = p.carry, dir = Math.sign(e.x - p.x) || p.facing; p.carry = null; p.hidden = false;
            c.carriedBy = null; c.anchored = false; c.thrown = true; c.straight = false; c.thrower = p; c.thrownT = 0; c.x = p.x; c.y = p.y + 0.4; c.vx = dir * 7; c.vy = 10;
            e.hit(c); continue;
          }
          p.hurt(1, Math.sign(p.x - e.x) || 1);
        }
      }
      // projectiles
      for (const pr of this.projectiles) { if (pr.dead || pr.harmless) continue; if (aabb(p, pr)) { if (p.hidden && p.carry) { pr.dead = true; continue; } if (p.hurt(1, Math.sign(p.x - pr.x) || 1)) pr.dead = true; } }
      // boss contact
      if (this.boss && !this.boss.dead && !this.boss.mesh.userData.noContact && aabb(p, this.boss.body)) p.hurt(1, Math.sign(p.x - this.boss.x) || 1);
      // switches
      for (const s of this.switches) if (!s.on && aabb(p, { x: s.x, y: s.y, w: 0.9, h: 0.6 }) && p.vy < 0) { this._pressSwitch(s); }
      // breakable walls (Monty or cheese)
      if (p.stats.strong && p.hitWall) { const tx = Math.floor(p.x + p.hitWall * (p.w / 2 + 0.15)); const ty = lv.tyOf(p.y + 0.5); if (lv.tileAt(tx, ty) === 4) { this._breakWall(tx, ty); } }
    }
    // thrown items vs enemies/boss/walls/switches
    for (const it of this.items) {
      if (it.dead || !it.carryable) continue;
      const moving = it.thrown || Math.abs(it.vx) > 4 || it.vy < -6;
      if (!moving) continue;
      for (const e of this.enemies) { if (e.dead || e.dying > 0 || e.invulnerable) continue; if (aabb(it, { x: e.x, y: e.y - 0.35, w: e.w + 0.3, h: Math.max(e.h, 1.0) + 0.7 })) { /* NES hit boxes are generous */ e.hit(it); if (it.kind !== 'ball') { it.breakIt(); } else { it.vx *= -0.6; } break; } }
      if (it.dead) continue;
      if (this.boss && !this.boss.dead && aabb(it, this.boss.hitBox)) { if (this.boss.hit()) { if (it.kind !== 'ball') it.breakIt(); else if (this.level.original) { it.vx = 0; it.vy = 0; it.bounces = 0; it.thrown = false; it.straight = false; } else { it.vx = -Math.sign(it.vx || 1) * 8; it.vy = 6; it.bounces = 0; it.thrown = false; } } }
      for (const pr of this.projectiles) if (!pr.dead && pr.kind !== 'ironball' && aabb(it, pr)) { pr.dead = true; this.spawnParticles(pr.x, pr.y, '#ffffff', 5); }
      for (const s of this.switches) if (!s.on && aabb(it, { x: s.x, y: s.y, w: 1, h: 0.8 })) this._pressSwitch(s);
      // walls (breakable) hit by thrown crates: small chance to crack? Only Monty/cheese breaks them
      // partner hit (co-op stun)
      if (it.thrown) for (const p of this.players) if (p !== it.thrower && !p.dead && p.active && !p.carriedBy && aabb(it, p)) { p.stun = 0.8; p.vx = Math.sign(it.vx) * 4; if (it.kind !== 'ball') it.breakIt(); break; }
      // iron ball vs ironball projectile? skip
    }
    // thrown players hit enemies
    for (const p of this.players) if (!p.dead && !p.grounded && Math.abs(p.vx) > 7 && !p.carriedBy) for (const e of this.enemies) if (!e.dead && aabb(p, { x: e.x, y: e.y, w: e.w, h: e.h })) { e.hit(); p.vx *= 0.3; }
    // projectiles vs boss' own? no. Iron balls crush enemies
    for (const pr of this.projectiles) if (!pr.dead && pr.kind === 'ironball') for (const e of this.enemies) if (!e.dead && aabb(pr, { x: e.x, y: e.y, w: e.w, h: e.h })) e.hit();
  }
  _collect(p, it) {
    const g = this.game.progress;
    switch (it.kind) {
      case 'flower': g.flowers++; this.sfx(SFX.star); if (g.flowers >= 100) { g.flowers -= 100; this.spawnItem('oneup', it.x, it.y + 0.5).floating = false; } break;
      case 'star': g.stars++; this.sfx(SFX.item); if (g.stars >= 20) { g.stars -= 20; this.spawnItem('oneup', it.x, it.y + 0.5); } break;
      case 'acorn': p.heal(1); this.sfx(SFX.heal); break;
      case 'bigacorn': p.heal(3); for (const q of this.players) q.heal(3); this.sfx(SFX.heal); break;
      case 'oneup': g.lives++; this.sfx(SFX.oneup); this.game.toast('1 UP!'); break;
      case 'chest': { this.sfx(SFX.item); const roll = Math.random(); if (roll < 0.45) this.spawnItem('bigacorn', it.x, it.y + 0.6); else if (roll < 0.8) this.spawnItem('star', it.x, it.y + 0.6); else { this.hasP = true; this.game.toast('СИЛА! Тяжёлое — легко'); this.spawnParticles(it.x, it.y + 0.5, '#ffd040', 14); } break; }
      case 'cheese': { this.sfx(SFX.powerup); this._summonMonty(p); break; }
      case 'zipper': { this.sfx(SFX.powerup); for (const q of this.players) q.zipperT = this.level.original ? 520 / 60 : 8; if (!this.level.original) for (const e of this.enemies) if (!e.dead && Math.abs(e.x - this.camX) < 14) e.hit(); this.game.toast('ВЖИК! Неуязвимость!'); break; } /* NES: 520 frames with its own tune */
      case 'redbox': { if (!it.used) { it.used = true; this._startRedbox(it); } return; } /* Monty smells the cheese and breaks through to the boss */
      case 'gear': { this.gearsCollected++; this.game.progress.gears++; this.sfx(SFX.oneup); this.game.toast(`Деталь ${this.gearsCollected}/${this.gearsTotal}`); break; }
    }
    it.dead = true; this.spawnParticles(it.x, it.y + 0.4, '#ffffff', 6);
  }
  // NES zone 0: touching the big red box (cheese inside) brings Monterey Jack running in from the left edge of the screen at
  // 2 px/frame; he gobbles the cheese box on his way and smashes the wall on the right, opening the passage to the boss.
  _startRedbox(it) {
    const room0 = Math.floor(it.x / 16) * 16; const door = this.level.spawns.doors.find(d => d.lock === 'redbox');
    const monty = RANGERS.monty(); monty.scale.setScalar(0.78); this.scene.add(monty);
    this.redboxEvent = { t: 0, monty, box: it, x: room0 + 0.3, y: it.y, doorX: door ? door.tx : it.x + 5, broke: false };
    this.sfx(SFX.powerup); this.game.toast('Рокфор почуял сыр!');
  }
  _updateRedbox(dt) {
    const ev = this.redboxEvent; ev.t += dt; ev.x += 7.5 * dt;
    ev.monty.position.set(ev.x, ev.y, 0.4); animateCharacter(ev.monty, { facing: 1, vx: 7.5, vy: 0, grounded: true, t: ev.t }, dt);
    if (ev.box && ev.x >= ev.box.x - 0.3) { ev.box.dead = true; this.spawnParticles(ev.box.x, ev.box.y + 0.6, '#f0c030', 14); this.sfx(SFX.item); ev.box = null; }
    if (!ev.broke && ev.x >= ev.doorX - 0.7) { ev.broke = true; this.level.unlockDoors('redbox'); this.spawnParticles(ev.doorX + 0.5, ev.y + 1, '#c8c8c8', 24); this.sfx(SFX.explode); this.shake = 0.5; }
    if (ev.broke && ev.x > ev.doorX + 1.5) { this.scene.remove(ev.monty); this.redboxEvent = null; }
  }
  _summonMonty(p) {
    // Monterey Jack runs through and smashes breakable walls in range
    const mesh = makeNPC('monty'); mesh.scale.setScalar(0.78); this.scene.add(mesh);
    this.montyNPC = { mesh, x: p.x - p.facing * 8, y: p.y, dir: p.facing, t: 0 };
    this.game.toast('Рокки: «Сы-ы-ыр!»');
    const lv = this.level; let broke = 0;
    for (const w of [...lv.spawns.walls]) { if (Math.abs(w.tx + 0.5 - p.x) < 14 && lv.tileAt(w.tx, w.ty) === 4) { setTimeout(() => this._breakWall(w.tx, w.ty), 600 + broke * 60); broke++; } }
  }
  _breakWall(tx, ty) { const lv = this.level; if (lv.tileAt(tx, ty) !== 4) return; lv.breakWall(tx, ty); lv.spawns.walls = lv.spawns.walls.filter(w => !(w.tx === tx && w.ty === ty)); this.spawnParticles(tx + 0.5, lv.rowY(ty) + 0.5, '#9a7a5a', 12); this.sfx(SFX.crateBreak); this.shake = 0.2; }
  _pressSwitch(s) { s.on = true; this.sfx(SFX.menuOk); this.game.toast('Щёлк!'); // switches toggle platforms' speed / open a wall above
    for (const w of [...this.level.spawns.walls]) if (Math.abs(w.tx + 0.5 - s.x) < 12) this._breakWall(w.tx, w.ty); for (const p of this.platforms) if (Math.abs(p.x - s.x) < 14) p.speed *= 1.8; }
  _cleanup() {
    this.items = this.items.filter(it => { if (it.dead) { if (it.carriedBy) { it.carriedBy.carry = null; } it.dispose(); return false; } return true; });
    this.enemies = this.enemies.filter(e => { if (e.dead) { e.dispose(); return false; } return true; });
    this.projectiles = this.projectiles.filter(pr => { if (pr.dead) { pr.dispose(); return false; } return true; });
  }
  _checkBossTrigger() {
    const sp = this.level.spawns; if (!sp.boss || this.bossActive || !this.def.boss) return;
    const p = this.nearestPlayer(sp.boss.x, sp.boss.y); if (!p) return;
    const scr = (x, y) => Math.floor(x / 16) + ',' + Math.floor((this.level.height - 1 - y) / 16);
    const inRoom = this.level.original ? scr(p.x, p.y + 0.5) === scr(sp.boss.x, sp.boss.y + 0.5) && p.grounded : p.x > sp.boss.x - 7; /* NES: once the hero stands in the boss screen */ // NES: only once you are in the boss screen
    if (inRoom) { this.bossActive = true; this.state = 'boss'; const rx = Math.floor(sp.boss.x / 16) * 16; this.camLockL = this.level.original ? rx : sp.boss.x - 8; this.camLockR = this.level.original ? rx + 16 : sp.boss.x + 8; this.boss = new Boss(this.def.boss, this.level.original ? rx + 8 : sp.boss.x + 4, sp.boss.y, this); this.boss.arenaL = sp.boss.x - 7; this.boss.arenaR = sp.boss.x + 7; this._spawnBossBall(); this.game.onBossStart(this.boss); for (const q of this.players) if (q.active && !q.dead && q.x < this.camLockL - 8) { q.x = this.camLockL - 7; q.y = sp.boss.y + 1; } }
  }
  _spawnBossBall() { const sp = this.level.spawns; const x = this.level.original ? Math.floor(sp.boss.x / 16) * 16 + 8 : sp.boss.x - 3; const b = this.spawnItem('ball', x, sp.boss.y + 1); b.home = { x, y: sp.boss.y }; return b; }
  _checkExit() {
    if (this.level.original && this.def.boss && this.bossActive && this.boss === null && this.state !== 'clear') { this.state = 'clear'; this.stateT = 0; this.game.onLevelClear(); return; } /* NES: the zone ends right after the boss */ if (this.players.some(p => p.exited && !p.dead) && (!this.def.boss || !this.bossActive || (this.boss === null && this.bossActive))) { this.state = 'clear'; this.stateT = 0; this.game.onLevelClear(); } }

  _camera(dt) {
    const alive = this.players.filter(p => p.active && !p.dead && !p.carriedBy);
    let tx = this.camX, ty = this.camY;
    if (alive.length) { tx = alive.reduce((s, p) => s + p.x, 0) / alive.length; ty = alive.reduce((s, p) => s + p.y, 0) / alive.length + 3.2; }
    else if (this.players.length) { tx = this.players[0].x; ty = this.players[0].y + 3; }
    const orig = this.level.original;
    if (orig) {
      // NES-style: the camera is locked to the current 16-row screen band; vertical scrolling happens only when the player
      // actually leaves the band (shafts), with a short smooth transition.
      const lead = alive.length ? alive[0] : this.players[0];
      const band = Math.floor((this.level.height - 1 - (lead.y + 0.6)) / 16); // screen row index (0 = top)
      if (this.camBand == null) this.camBand = band;
      if (band !== this.camBand) { const inBand = (this.level.height - 1 - lead.y) - band * 16; if (inBand > 1.5 && inBand < 14.5) this.camBand = band; }
      ty = this.level.height - this.camBand * 16 - 7.5; // NES shows the top 240 of the 256 px of a screen: 15 rows
      const halfW = 8; if (isFinite(this.camLockL)) tx = (this.camLockL + this.camLockR) / 2; tx = Math.max(halfW, Math.min(this.level.width - halfW, tx));
      const route = this.def.route; if (route && !isFinite(this.camLockL)) { /* NES: the camera only scrolls over real screens of this row */
        const has = (c) => route.some(([rc, rr]) => rc === c && rr === this.camBand); let c0 = Math.floor(lead.x / 16), c1 = c0;
        if (has(c0)) { while (has(c0 - 1)) c0--; while (has(c1 + 1)) c1++; tx = Math.max(c0 * 16 + halfW, Math.min((c1 + 1) * 16 - halfW, tx)); }
      } // boss screen: fixed camera
    } else {
      const halfW = 10.5; tx = Math.max(this.camLockL + 0.5, Math.min(this.camLockR - 0.5, tx)); tx = Math.max(halfW, Math.min(this.level.width - halfW, tx)); ty = Math.max(5.5, Math.min(this.level.height - 2, ty));
    }
    const k = 1 - Math.pow(0.001, dt);
    if (!this.camInit) { this.camInit = true; this.camX = tx; this.camY = ty; } // start on the right spot, no swoop
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k * 0.8;
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0; if (this.shake > 0) this.shake -= dt;
    if (orig) { this.camera.position.set(this.camX + sx, this.camY + sy, 7.5 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))); /* exactly 15 rows visible */ this.camera.lookAt(this.camX + sx, this.camY + sy, 0); }
    else { this.camera.position.set(this.camX + sx + 1.5, this.camY + sy + 1.5, 15.5); this.camera.lookAt(this.camX + sx, this.camY + sy - 0.8, 0); }
    this.level.updateLight(this.camX, this.camY);
  }
  // Respawn after death (checkpoint = start or boss arena)
  respawn(p) {
    const sp = this.level.spawns; let s = sp.players[0];
    if (this.bossActive && sp.boss) { s = { x: sp.boss.x - 6, y: sp.boss.y + 1 }; }
    else if (this.checkpoint) s = this.checkpoint;
    p.spawnAt(s.x, s.y + 0.02); p.mesh.rotation.set(0, 0, 0); this.state = this.bossActive ? 'boss' : 'play';
    if (this.bossActive && this.boss && !this.items.some(i => i.kind === 'ball')) this._spawnBossBall();
  }
  setCheckpoint() { const alive = this.players.find(p => !p.dead && p.active); if (alive && alive.grounded) this.checkpoint = { x: alive.x, y: alive.y }; }
  dispose() {
    this.level.dispose(this.scene); for (const p of this.players) this.scene.remove(p.mesh); for (const it of this.items) it.dispose(); for (const e of this.enemies) e.dispose(); for (const pr of this.projectiles) pr.dispose(); for (const p of this.platforms) p.dispose(); if (this.boss) this.boss.dispose(); this.particles.clear();
    for (const f of this.fans) this.scene.remove(f.mesh); for (const s of this.steams) this.scene.remove(s.mesh); for (const s of this.switches) this.scene.remove(s.mesh); if (this.exitMesh) this.scene.remove(this.exitMesh); if (this.montyNPC) this.scene.remove(this.montyNPC.mesh);
  }
}
