// Gameplay entities: players, carryable/pickup items, enemies, bosses, projectiles, moving platforms, particles.
import * as THREE from 'three';
import { GRAVITY, MAX_FALL, PLAYER, THROW, SFX } from './constants.js';
import { RANGERS, animateCharacter, makeItem, animateItem, makeEnemy, animateEnemy, makeBoss, animateBoss, mat } from './models.js';
import { TILE_PLAT, TILE_SPIKES, TILE_WATER, TILE_KILL, TILE_JET, TILE_DOOR } from './level.js';

// ------------------------------------------------------------------ physics helpers
// body: {x, y, w, h, vx, vy, grounded, onPlatform} with (x,y) = bottom centre
export function moveBody(level, b, dt, world, opts = {}) {
  const solids = world ? world.solidBoxes(b) : [];
  // horizontal
  let nx = b.x + b.vx * dt; const hw = b.w / 2;
  const yA = b.y + 0.05, yB = b.y + b.h - 0.05;
  if (b.vx > 0) {
    const edge = nx + hw;
    for (let y = yA; y <= yB + 0.001; y += 0.5) { y = Math.min(y, yB); if (level.solidAtWorld(edge, y)) { nx = Math.floor(edge) - hw - 0.001; b.vx = 0; b.hitWall = 1; break; } if (y === yB) break; }
    for (const s of solids) if (s.y < yB && s.y + s.h > yA && s.x - s.w / 2 < nx + hw && s.x + s.w / 2 > b.x + hw - 0.01 && s.x > b.x) { nx = Math.min(nx, s.x - s.w / 2 - hw - 0.001); b.vx = 0; b.hitWall = 1; }
  } else if (b.vx < 0) {
    const edge = nx - hw;
    for (let y = yA; y <= yB + 0.001; y += 0.5) { y = Math.min(y, yB); if (level.solidAtWorld(edge, y)) { nx = Math.floor(edge) + 1 + hw + 0.001; b.vx = 0; b.hitWall = -1; break; } if (y === yB) break; }
    for (const s of solids) if (s.y < yB && s.y + s.h > yA && s.x + s.w / 2 > nx - hw && s.x - s.w / 2 < b.x - hw + 0.01 && s.x < b.x) { nx = Math.max(nx, s.x + s.w / 2 + hw + 0.001); b.vx = 0; b.hitWall = -1; }
  }
  b.x = nx;
  // vertical
  b.vy = Math.max(b.vy - GRAVITY * dt * (opts.gravityScale ?? 1), -MAX_FALL);
  let ny = b.y + b.vy * dt; const wasGrounded = b.grounded; b.grounded = false; b.onPlatform = null; b.standingOn = null;
  const xs = [b.x - hw + 0.04, b.x, b.x + hw - 0.04];
  if (b.vy <= 0) {
    for (const x of xs) {
      const t = level.tileAtWorld(x, ny);
      const rowTop = Math.floor(ny) + 1;
      if (level.isSolidTile(t)) { ny = rowTop; b.vy = 0; b.grounded = true; }
      else if (t === TILE_PLAT && !b.dropThrough) { const top = Math.floor(ny) + 1; if (b.y >= top - 0.02 || (level.original && b.isHero)) { ny = top; b.vy = 0; b.grounded = true; } } // NES: feet inside a ledge tile while falling = stand on it (reach ~ jump + 1 tile)
    }
    // stand on solid bodies (crates, platforms)
    for (const s of solids) { const top = s.y + s.h; if (b.x + hw > s.x - s.w / 2 + 0.02 && b.x - hw < s.x + s.w / 2 - 0.02 && b.y >= top - 0.25 && ny <= top) { ny = top; b.vy = 0; b.grounded = true; b.standingOn = s.ref; if (s.ref && s.ref.isPlatform) b.onPlatform = s.ref; } }
  } else {
    const top = ny + b.h;
    for (const x of xs) { if (level.solidAtWorld(x, top)) { ny = Math.floor(top) - b.h - 0.001; b.vy = 0; b.hitCeiling = true; } }
    for (const s of solids) { if (b.x + hw > s.x - s.w / 2 && b.x - hw < s.x + s.w / 2 && b.y + b.h <= s.y + 0.05 && top > s.y) { ny = s.y - b.h - 0.001; b.vy = 0; } }
  }
  b.y = ny; b.landed = b.grounded && !wasGrounded;
  if (b.grounded) b.dropThrough = false;
}
export function aabb(a, b) { return Math.abs(a.x - b.x) * 2 < a.w + b.w && a.y < b.y + b.h && b.y < a.y + a.h; }
function hazardUnder(level, b) {
  for (const x of [b.x - b.w / 2 + 0.1, b.x + b.w / 2 - 0.1]) { const t = level.tileAtWorld(x, b.y + 0.2); if (t === TILE_SPIKES) return 'spikes'; if (t === TILE_WATER) return 'water'; if (t === TILE_KILL) return 'kill'; }
  return null;
}

// ------------------------------------------------------------------ Player
export const CHAR_STATS = {
  chip: { speed: 1, jump: 1, heavyOK: false, fly: 0, glide: false, strong: false },
  dale: { speed: 1.05, jump: 1, heavyOK: false, fly: 0, glide: false, strong: false },
  gadget: { speed: 1, jump: 0.95, heavyOK: false, fly: 0, glide: true, strong: false },
  monty: { speed: 0.9, jump: 0.92, heavyOK: true, fly: 0, glide: false, strong: true },
  zipper: { speed: 1.1, jump: 0.9, heavyOK: false, fly: 1.1, glide: false, strong: false, small: true },
};
export class Player {
  constructor(index, kind, world) {
    this.index = index; this.kind = kind; this.world = world; this.stats = CHAR_STATS[kind] || CHAR_STATS.chip; this.isHero = true;
    this.mesh = RANGERS[kind](); world.scene.add(this.mesh);
    const sc = kind === 'monty' ? 0.78 : kind === 'zipper' ? 1.4 : 1; this.mesh.scale.setScalar(sc);
    this.w = PLAYER.w; this.h = PLAYER.h; this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.grounded = false; this.facing = 1;
    this.hearts = PLAYER.hearts; this.invuln = 0; this.hurtT = 0; this.dead = false; this.deadT = 0; this.carry = null; this.hidden = false; this.crouch = false;
    this.t = Math.random() * 10; this.jumpHeld = false; this.coyote = 0; this.flyT = 0; this.throwCd = 0; this.zipperT = 0; this.active = true; this.exited = false;
    this.carriedBy = null; this.stun = 0;
  }
  get body() { return this; }
  spawnAt(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.dead = false; this.hearts = PLAYER.hearts; this.invuln = 2; this.carry = null; this.hidden = false; this.active = true; this.exited = false; this.mesh.visible = true; }
  update(dt, inp, level) {
    const w = this.world; this.t += dt;
    if (this.throwCd > 0) this.throwCd -= dt; if (this.invuln > 0) this.invuln -= dt; if (this.hurtT > 0) this.hurtT -= dt; if (this.zipperT > 0) this.zipperT -= dt; if (this.stun > 0) this.stun -= dt;
    if (this.dead) { this.deadT += dt; this.vy -= GRAVITY * dt; this.y += this.vy * dt; this.mesh.position.set(this.x, this.y, 0.2); this.mesh.rotation.z += dt * 6; return; }
    if (this.carriedBy) { // being carried by partner
      const c = this.carriedBy; this.x = c.x; this.y = c.y + c.h * 0.95; this.vx = 0; this.vy = 0; this.grounded = false;
      this.mesh.position.set(this.x, this.y, 0.1); animateCharacter(this.mesh, { facing: this.facing, vx: 0, vy: 0, grounded: false, t: this.t }, dt); return;
    }
    if (!this.active) return;
    const st = this.stats; const heavy = this.carry && this.carry.heavy && !st.heavyOK && !level.original;
    const speed = PLAYER.speed * st.speed * (heavy ? PLAYER.carrySpeedHeavy : 1) * (this.crouch && this.grounded ? 0 : 1);
    const ax = (inp && this.stun <= 0) ? inp.axisX : 0;
    // crouch / hide
    this.crouch = !!(inp && inp.down && this.grounded && this.stun <= 0 && !(this.carry && ['apple', 'nut', 'ball'].includes(this.carry.kind))); /* only a crate can be ducked under */
    this.hidden = this.crouch && this.carry && this.carry.kind !== 'apple' && this.carry.kind !== 'ball' && this.carry.kind !== 'nut'; /* only a crate makes a hiding box */
    if (this.crouch && this.carry) this.carry.shield = true; else if (this.carry) this.carry.shield = false;
    // horizontal motion
    const target = ax * speed; const acc = (this.grounded ? PLAYER.accel : PLAYER.airAccel) * dt;
    if (Math.abs(target - this.vx) <= acc) this.vx = target; else this.vx += Math.sign(target - this.vx) * acc;
    if (ax !== 0 && !this.crouch) this.facing = ax > 0 ? 1 : -1;
    // jump
    if (this.grounded) this.coyote = 0.1; else this.coyote -= dt;
    const jumpV = PLAYER.jumpV * (level.original ? 1 : st.jump) * (heavy ? PLAYER.carryJumpHeavy : 1); /* original zones: every Ranger jumps like the NES hero */
    if (inp && inp.jumpPressed && this.stun <= 0) {
      if (inp.down && this.grounded && this.canDropThrough(level)) { this.dropThrough = true; this.y -= 0.1; this.grounded = false; }
      else if (this.coyote > 0) { this.vy = jumpV; this.grounded = false; this.coyote = 0; this.jumpHeld = true; w.sfx(SFX.jump); }
      else if (st.fly && this.flyT < 1.2) { this.vy = Math.max(this.vy, jumpV * 0.55); this.flyT += 0.3; w.sfx(SFX.jump); }
    }
    if (inp && !inp.jump && this.jumpHeld && this.vy > 0) { this.vy *= PLAYER.jumpCut; this.jumpHeld = false; }
    if (!inp || !inp.jump) this.jumpHeld = false;
    // glide (Gadget) / hover (Zipper)
    let gscale = 1;
    if (st.glide && inp && inp.jump && this.vy < 0 && !this.grounded) { gscale = 0.25; this.vy = Math.max(this.vy, -2.5); }
    if (st.fly && inp && inp.jump && this.vy < 0 && !this.grounded && this.flyT < 1.2) { gscale = 0.35; this.flyT += dt * 0.5; }
    if (this.grounded) this.flyT = 0;
    // updraft jets (water/steam columns in the original levels)
    if (level.tileAtWorld(this.x, this.y + 0.3) === TILE_JET || level.tileAtWorld(this.x, this.y + 1.0) === TILE_JET) { this.vy = Math.max(this.vy, 7.5); gscale = 0.2; this.grounded = false; }
    const prevVy = this.vy;
    moveBody(level, this, dt, w, { gravityScale: gscale });
    if (this.landed && prevVy < -6) w.sfx(SFX.land);
    // pick up / throw
    if (inp && inp.actPressed && this.throwCd <= 0 && this.stun <= 0) {
      if (this.carry) this.throwCarried(inp);
      else this.tryPickup(level, inp);
    }
    // carried item follows
    if (this.carry) { const c = this.carry; c.x = this.x; c.y = this.y + (this.crouch ? 0.05 : this.h * 0.92); c.vx = 0; c.vy = 0; c.grounded = false; c.dropping = false; }
    // hazards
    const hz = hazardUnder(level, this);
    if (hz === 'spikes') this.hurt(1, 0); else if (hz === 'water' && !this.world.boatUnder(this)) this.kill('water'); else if (hz === 'kill') this.kill('fall');
    // doors: press up while standing in a doorway
    if (inp && inp.upPressed && this.grounded && level.tileAtWorld(this.x, this.y + 0.5) === TILE_DOOR) w.useDoor(this);
    if (this.y < -3) this.kill('fall');
    // exit
    const ex = level.spawns.exit;
    if (ex && Math.abs(this.x - ex.x) < 0.8 && Math.abs(this.y - ex.y) < 1.5) this.exited = true;
    // visuals
    this.mesh.position.set(this.x, this.y, 0.05);
    const blink = this.invuln > 0 && Math.floor(this.t * 20) % 2 === 0;
    animateCharacter(this.mesh, { facing: this.facing, vx: this.vx, vy: this.vy, grounded: this.grounded, crouch: this.crouch, carrying: !!this.carry && !this.crouch, hurt: this.hurtT > 0, t: this.t, hidden: blink || this.hidden }, dt);
    if (this.zipperT > 0) { this.mesh.traverse(o => { if (o.material && o.material.emissive) { if (!o.userData.origEm) { o.material = o.material.clone(); o.userData.origEm = true; } o.material.emissive.setHSL((this.t * 2) % 1, 1, 0.5); o.material.emissiveIntensity = 0.5; } }); }
    else if (this.mesh.userData.wasGlowing) { this.mesh.traverse(o => { if (o.material && o.userData.origEm) { o.material.emissive.set(0); o.material.emissiveIntensity = 0; } }); this.mesh.userData.wasGlowing = false; }
    if (this.zipperT > 0) this.mesh.userData.wasGlowing = true;
  }
  canDropThrough(level) {
    const ty = level.tyOf(this.y - 0.1); const t1 = level.tileAt(Math.floor(this.x - this.w / 2 + 0.05), ty), t2 = level.tileAt(Math.floor(this.x + this.w / 2 - 0.05), ty);
    const platOnly = (t) => t === TILE_PLAT || t === 0;
    return (t1 === TILE_PLAT || t2 === TILE_PLAT) && platOnly(t1) && platOnly(t2) && !this.standingOn;
  }
  tryPickup(level, inp) {
    const w = this.world;
    // pick partner?
    for (const p of w.players) { if (p !== this && p.active && !p.dead && !p.carriedBy && !p.carry && aabb({ x: this.x + this.facing * 0.5, y: this.y, w: 1.0, h: this.h }, p) && this.grounded) { p.carriedBy = this; this.carry = { kind: 'player', ref: p, heavy: false, isPlayer: true }; w.sfx(SFX.pickup); this.throwCd = 0.25; return; } }
    // nearest carryable item in front or on top
    let best = null, bd = 1e9;
    for (const it of w.items) {
      if (!it.carryable || it.carriedBy || (it.thrown && it.kind !== 'ball')) continue;
      const dx = it.x - this.x, dy = it.y - this.y; const d = Math.abs(dx) + Math.abs(dy);
      const inFront = w.level.original ? (it.y < this.y + this.h - 0.2 && it.y + it.h > this.y + 0.05 && Math.abs(dx) < 1.25 && (Math.sign(dx) === this.facing || Math.abs(dx) < 0.3)) : (Math.abs(dy) < 1.0 && Math.abs(dx) < 1.15 && (Math.sign(dx) === this.facing || Math.abs(dx) < 0.5));
      if (inFront && d < bd) { best = it; bd = d; }
    }
    if (best) {
      if (best.kind === 'metal' && !this.stats.strong && !w.hasP) { /* metal: can lift but slow */ }
      if (best.heavy && !this.stats.heavyOK && this.stats.small) return; // Zipper can't lift heavy things
      best.carriedBy = this; this.carry = best; best.shield = false; w.sfx(SFX.pickup); this.throwCd = 0.2;
      // if someone stands on it... ignore
    }
  }
  throwCarried(inp) {
    const c = this.carry; const w = this.world; this.carry = null; this.throwCd = 0.25;
    if (c.isPlayer) { const p = c.ref; p.carriedBy = null; p.x = this.x + this.facing * 0.6; p.y = this.y + 0.9; p.vx = this.facing * THROW.speed * 0.6; p.vy = inp && inp.up ? THROW.up * 0.8 : THROW.up * 0.4; w.sfx(SFX.throw); return; }
    c.carriedBy = null; c.thrown = true; c.thrower = this; c.shield = false; c.thrownT = 0;
    c.straight = false; c.flown = 0;
    if (c.kind === 'nut') { let nx = Math.floor(this.x + this.facing * 1.0) + 0.5; if (w.level.solidAtWorld(nx, this.y + this.h * 0.92)) nx = Math.floor(this.x) + 0.5; c.x = nx; c.y = this.grounded ? this.y + 1.0 : this.y + this.h * 0.92 - 0.56; for (const o of w.items) if (o !== c && o.carryable && !o.dead && !o.carriedBy && Math.abs(o.x - nx) < 0.5 && o.y < c.y + c.h - 0.1 && o.y + o.h > c.y) c.y = o.y + o.h; c.vx = 0; c.vy = 0; c.thrown = false; c.straight = false; c.anchored = false; c.dropping = true; w.sfx(SFX.throw); return; }
    if (c.kind === 'ball' && !w.level.original) { // themed levels: the boss ball keeps its bouncing arc
      if (inp && inp.up) { c.x = this.x; c.y = this.y + this.h; c.vx = this.facing * 1.5; c.vy = THROW.up; }
      else { c.x = this.x + this.facing * 0.5; c.y = this.y + this.h * 0.55; c.vx = this.facing * THROW.speed; c.vy = 5; }
    } else if (inp && inp.up && !this.crouch) { c.x = this.x; c.y = this.y + this.h; c.vx = 0; c.vy = THROW.up; c.straight = true; }
    else { c.x = this.x + this.facing * THROW.ahead; c.y = this.y + THROW.height; c.vx = this.facing * THROW.speed; c.vy = 0; c.straight = true; } // NES: crouch throw flies at the same height
    w.sfx(SFX.throw);
  }
  hurt(amount = 1, kx = 0) {
    if (this.invuln > 0 || this.dead || this.zipperT > 0 || this.hidden) return false;
    this.hearts -= amount; this.invuln = PLAYER.invulnTime; this.hurtT = 0.4; this.vy = 6; this.vx = kx * 5; this.stun = 0.3; this.world.game.rumble(this.index, 0.7, 0.4, 200);
    if (this.carry && !this.carry.isPlayer) { this.carry.carriedBy = null; this.carry.vy = 3; this.carry = null; }
    if (this.hearts <= 0) { this.kill('hit'); } else this.world.sfx(SFX.hurt);
    return true;
  }
  kill(reason) {
    if (this.dead) return; this.dead = true; this.deadT = 0; this.vy = 11; this.vx = 0; this.hearts = 0;
    if (this.carry) { if (this.carry.isPlayer) this.carry.ref.carriedBy = null; else this.carry.carriedBy = null; this.carry = null; }
    this.world.onPlayerDied(this, reason);
  }
  heal(n) { this.hearts = Math.min(PLAYER.hearts, this.hearts + n); }
}

// true if the box (x centre, y bottom) overlaps a solid tile
function isSolidAt(level, b) {
  for (const px of [b.x - b.w / 2 + 0.05, b.x + b.w / 2 - 0.05]) for (const py of [b.y + 0.05, b.y + b.h - 0.05]) if (level.solidAtWorld(px, py)) return true;
  return false;
}

// ------------------------------------------------------------------ Items
const CARRY_KINDS = { X: 'crate', M: 'metal', A: 'apple', O: 'ball', B: 'barrel', N: 'nut' };
const PICK_KINDS = { f: 'flower', '*': 'star', a: 'acorn', h: 'bigacorn', 1: 'oneup', T: 'chest', C: 'cheese', Z: 'zipper', g: 'gear', R: 'redbox' };
export class Item {
  constructor(kind, x, y, world) {
    this.kind = kind; this.x = x; this.y = y; this.world = world; this.vx = 0; this.vy = 0; this.grounded = false;
    this.carryable = ['crate', 'metal', 'apple', 'ball', 'barrel', 'nut'].includes(kind);
    this.heavy = kind === 'apple' || kind === 'metal' || kind === 'nut'; this.throwable = kind !== 'metal';
    this.w = kind === 'ball' ? 0.84 : kind === 'apple' ? 1.4 : kind === 'nut' ? 0.98 : this.carryable ? 0.92 : 0.6; this.h = kind === 'ball' ? 0.84 : kind === 'apple' ? 1.45 : kind === 'nut' ? 0.98 : this.carryable ? 0.92 : 0.8; /* NES apple is 24x24 px */
    this.mesh = makeItem(kind); world.scene.add(this.mesh); this.t = Math.random() * 5; this.dead = false; this.thrown = false; this.carriedBy = null; this.bounces = 0; this.hits = 0;
    this.isSolidForOthers = this.carryable; this.spin = 0;
    this.anchored = (kind === 'crate' || kind === 'nut') && world.level.original; // NES: crates are map blocks, they never fall by themselves
  }
  static fromChar(ch, x, y, world) { const k = CARRY_KINDS[ch] || PICK_KINDS[ch]; return k ? new Item(k, x, y, world) : null; }
  update(dt, level) {
    this.t += dt;
    if (this.carriedBy) { this.anchored = false; this.mesh.position.set(this.x, this.y, 0.05); this.mesh.rotation.set(0, 0, 0); return; }
    if (this.anchored && !this.thrown) { this.vx = 0; this.vy = 0; this.mesh.position.set(this.x, this.y, 0.05); return; }
    if (this.hiddenUnder) return;
    if (this.carryable) {
      const wasThrown = this.thrown; if (this.thrown) this.thrownT += dt;
      if (this.thrown && this.straight) { // NES throw: constant speed, straight line, through terrain, gone at the screen edge
        const w = this.world, orig = w.level.original;
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (!orig && isSolidAt(level, this)) { this.breakIt(); return; }
        const hw = orig && !w.game.widescreen ? 8.5 : 12, hh = orig && !w.game.widescreen ? 8 : 9;
        if (Math.abs(this.x - w.camX) > hw + this.w || Math.abs(this.y + this.h / 2 - w.camY) > hh + this.h) {
          if (this.kind === 'ball' && this.home) { this.thrown = false; this.straight = false; this.x = this.home.x; this.y = this.home.y + 6; this.vx = 0; this.vy = 0; this.bounces = 0; return; } // the boss ball drops back in
          this.dead = true; return;
        }
        this.mesh.position.set(this.x, this.y, 0.05); this.mesh.rotation.set(0, 0, 0); return;
      }
      moveBody(level, this, dt, this.world.itemsSolidWorld(this));
      if (this.kind === 'ball') {
        if (this.grounded && Math.abs(this.vy) < 0.1 && this.thrown) { this.vy = 9 * (this.bounces === 0 ? 1 : 0.85); this.bounces++; if (this.bounces > 8) { this.thrown = false; this.vy = 0; this.vx = 0; this.bounces = 0; } this.world.sfx(SFX.bounce); }
        if (this.hitWall) { this.vx = -this.hitWall * Math.abs(this.vx || 8); this.hitWall = 0; if (!this.thrown) this.vx *= 0.5; }
        if (!this.thrown && this.grounded) this.vx *= (1 - dt * 2);
        this.mesh.rotation.z -= this.vx * dt * 2;
      } else {
        if (this.thrown && (this.hitWall || this.hitCeiling)) { this.breakIt(); return; }
        if (this.thrown && this.grounded) { if (this.kind === 'barrel') { this.vx = this.vx || 0; if (Math.abs(this.vx) < 1) { this.thrown = false; } } else if (this.vy <= 0 && this.thrownT > 0.1) { if (this.kind === 'crate' && Math.abs(this.vx) > 6) this.breakIt(); else { this.thrown = false; this.vx = 0; } } }
        if (!this.thrown && this.grounded) { this.vx *= (1 - dt * 8); if (Math.abs(this.vx) < 0.05) this.vx = 0; }
        if (this.kind === 'barrel') this.mesh.rotation.z -= this.vx * dt * 2;
        if (this.dropping && this.grounded) { this.dropping = false; this.anchored = this.world.level.original; this.vx = 0; this.y = Math.round(this.y * 16) / 16; } // a set-down nut is a block again
        if (this.hitWall) this.hitWall = 0; this.hitCeiling = false;
      }
      if (this.onPlatform) { this.x += this.onPlatform.dx || 0; this.y += this.onPlatform.dy || 0; }
      if (this.y < -4) this.dead = true;
      if (!this.thrown && this.grounded && hazardUnder(level, this) === 'water') this.dead = true;
    } else {
      // pickups: gentle float, settle to ground if in air
      if (!this.grounded && !this.floating) { moveBody(level, this, dt, null); }
      animateItem(this.mesh, this.t);
    }
    this.mesh.position.set(this.x, this.y, 0.05);
  }
  breakIt() { this.dead = true; this.world.spawnParticles(this.x, this.y + 0.4, this.kind === 'apple' ? '#d82828' : '#c08040', 10); this.world.sfx(SFX.crateBreak); }
  dispose() { this.world.scene.remove(this.mesh); }
}

// ------------------------------------------------------------------ Moving platforms, cranes, boats
export class Platform {
  constructor(x, y, axis, world, opts = {}) {
    this.world = world; this.x = x; this.y = y + 0.1; this.axis = axis; this.w = opts.w || 2.0; this.h = 0.4; this.range = opts.range || 3; this.speed = opts.speed || 1.6; this.t = Math.random() * 6; this.isPlatform = true; this.dx = 0; this.dy = 0; this.x0 = this.x; this.y0 = this.y;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.w, this.h, 1.1), opts.material || mat(opts.color || '#d8d0c0', { metalness: 0.4, roughness: 0.5 })); this.mesh.castShadow = true; this.mesh.receiveShadow = true; world.scene.add(this.mesh);
    this.kind = opts.kind || 'platform';
  }
  update(dt) {
    this.t += dt; const px = this.x, py = this.y;
    if (this.kind === 'crane') { // faucet handle: up/down slowly
      this.y = this.y0 + Math.sin(this.t * 0.8) * 1.2;
    } else if (this.kind === 'boat') {
      this.y = this.y0 + Math.sin(this.t * 2) * 0.08; this.x = this.x0 + Math.sin(this.t * 0.3) * 0.0;
      if (this.rider) { this.x += this.rider.vxWish * dt * 3.5; }
    } else if (this.axis === 'x') this.x = this.x0 + Math.sin(this.t * this.speed / 2) * this.range; else this.y = this.y0 + Math.sin(this.t * this.speed / 2) * this.range;
    this.dx = this.x - px; this.dy = this.y - py;
    this.mesh.position.set(this.x, this.y + this.h / 2, 0);
  }
  dispose() { this.world.scene.remove(this.mesh); }
}

// ------------------------------------------------------------------ Enemies
export class Enemy {
  constructor(type, x, y, world) {
    this.type = type; this.x = x; this.y = y; this.world = world; this.mesh = makeEnemy(type); world.scene.add(this.mesh);
    const u = this.mesh.userData; this.w = u.w || 0.9; this.h = u.h || 0.9; this.flyer = !!u.flyer; this.hanger = !!u.hanger; this.jumper = !!u.jumper; this.charger = !!u.charger; this.spawner = u.spawner; this.shooter = !!u.shooter; this.bomb = !!u.bomb;
    this.vx = 0; this.vy = 0; this.dir = -1; this.t = Math.random() * 10; this.hp = type === 'robot' || type === 'rhino' ? 2 : 1; this.dead = false; this.x0 = x; this.y0 = y; this.grounded = false; this.state = 'idle'; this.timer = 0; this.hurtT = 0;
    this.speed = { mechdog: 4.7, mechmouse: 3.75, crab: 1.8, lizard: 2.2, antbot: 2.8, pirat: 2.0, rhino: 1.5, robot: 1.2, snailbomb: 1.0, kangarat: 0, frog: 0 }[type] || 2;
    if (this.flyer) this.y = y + 0.5; this.damage = 1; this.contact = true;
    this.invulnerable = type === 'spark'; this.range = 1; // sparks: patrol x0 +- range along a power line
  }
  update(dt, level) {
    this.t += dt; this.timer -= dt; if (this.hurtT > 0) this.hurtT -= dt;
    if (this.dying > 0) { // NES knock-out: the enemy flips and flies off the screen
      this.dying -= dt; this.vy -= GRAVITY * 0.6 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.mesh.position.set(this.x, this.y, 0.3); this.mesh.rotation.z += dt * 9 * Math.sign(this.vx || 1); if (this.dying <= 0) this.dead = true; return;
    }
    const w = this.world; const target = w.nearestPlayer(this.x, this.y);
    const dxp = target ? target.x - this.x : 0; const dist = Math.abs(dxp);
    if ((this.type === 'mechdog' || this.type === 'mechmouse') && level.original) { // NES: sits until the hero comes within ~7 tiles, then runs at him (1.25 px/frame), jumps over
      // crates and steps, never turns and leaves the screen
      const mouse = this.type === 'mechmouse', run = mouse ? 5.6 : 4.7, hop = mouse ? 15 : 18.6, sight = mouse ? 8.5 : 7.2; /* mice: 1.5 px/frame, dogs 1.25 */
      if (this.state !== 'run') { this.vx = 0; if (target && dist < sight && Math.abs(target.y - this.y) < 7) { this.state = 'run'; this.dir = dxp > 0 ? 1 : -1; } }
      else { this.vx = this.dir * run; const ax = this.x + this.dir * (this.w / 2 + 0.25); if (this.grounded && (level.solidAtWorld(ax, this.y + 0.5) || w.solidBodyAt(ax, this.y + 0.5))) this.vy = hop; }
      moveBody(level, this, dt, w); if (this.hitWall && this.grounded) this.vy = hop; this.hitWall = 0;
      if (this.state === 'run' && Math.abs(this.x - w.camX) > 13) this.dead = true;
      if (this.y < -3) this.dead = true;
      this.mesh.position.set(this.x, this.y, 0.05); this.mesh.rotation.y = this.dir > 0 ? -0.35 : Math.PI + 0.35; this.mesh.rotation.z = this.hurtT > 0 ? Math.sin(this.t * 60) * 0.2 : 0;
      animateEnemy(this.mesh, dt, this.t, this.vx); return;
    }
    if (this.flyer) {
      switch (this.type) {
        case 'bee': case 'firefly': { this.x += Math.cos(this.t * 1.1) * dt * 2.4; this.y = this.y0 + 0.5 + Math.sin(this.t * 2.2) * 1.3; if (target && dist < 6 && this.type === 'bee') { this.x += Math.sign(dxp) * dt * 1.5; } this.dir = Math.cos(this.t * 1.1) > 0 ? 1 : -1; break; }
        case 'copter': { this.x += this.dir * dt * 3.2; this.y = this.y0 + 0.5 + Math.sin(this.t * 1.5) * 0.8; if (Math.abs(this.x - this.x0) > 6) this.dir *= -1; if (this.timer <= 0 && target && dist < 3) { w.spawnProjectile(this.x, this.y, 0, -6, 'bolt'); this.timer = 2.0; } break; }
        case 'bat': { if (this.state === 'idle') { this.y = this.y0 + 0.5; if (target && dist < 5) { this.state = 'swoop'; this.timer = 1.6; this.sx = this.x; this.sy = this.y; this.tx = target.x; this.ty = target.y + 0.5; } } else { const k = 1 - this.timer / 1.6; const kk = Math.sin(k * Math.PI); this.x = this.sx + (this.tx - this.sx) * k; this.y = this.sy + (this.ty - this.sy) * kk; if (this.timer <= 0) { this.state = 'idle'; this.x0 = this.x; } } break; }
        case 'spark': { this.x += this.dir * dt * 5.6; if (this.x < this.x0 - this.range) { this.x = this.x0 - this.range; this.dir = 1; } if (this.x > this.x0 + this.range) { this.x = this.x0 + this.range; this.dir = -1; } this.y = this.y0; break; } // 1.5 px/frame, measured
        case 'jellyfish': { this.y = this.y0 + 0.5 + Math.sin(this.t * 1.2) * 2.2; this.x += Math.sin(this.t * 0.6) * dt; break; }
        case 'drone': { this.x += Math.sign(dxp) * dt * 1.5 * (dist > 3 ? 1 : 0); this.y = this.y0 + 0.5 + Math.sin(this.t * 2) * 0.5; if (this.timer <= 0 && target && dist < 7) { w.spawnProjectile(this.x, this.y + 0.2, Math.sign(dxp) * 5, -4, 'bolt'); this.timer = 1.8; } this.dir = dxp > 0 ? 1 : -1; break; }
      }
    } else if (this.hanger) {
      if (this.type === 'spider') {
        if (this.state === 'idle') { this.y = this.y0; if (target && dist < 1.6 && target.y < this.y) { this.state = 'drop'; this.vy = 0; } }
        else if (this.state === 'drop') { this.vy -= GRAVITY * 0.5 * dt; this.y += this.vy * dt; if (this.y < this.y0 - 6 || level.solidAtWorld(this.x, this.y - 0.1)) { this.state = 'up'; } }
        else { this.y += dt * 2.5; if (this.y >= this.y0) { this.y = this.y0; this.state = 'idle'; } }
        const th = this.mesh.userData.thread; if (th) { const len = Math.max(0.2, this.y0 + 1.2 - this.y + 1); th.scale.y = len; th.position.y = 0.7 + len / 2; }
      } else if (this.type === 'wasphive') { if (this.timer <= 0 && target && dist < 7 && w.enemies.filter(e => e.type === 'bee' && e.parent === this).length < 2) { const b = w.spawnEnemy('bee', this.x, this.y - 0.5); b.parent = this; this.timer = 3.0; } }
    } else if (this.jumper) {
      if (this.grounded && this.timer <= 0) { this.vy = this.type === 'kangarat' ? 11 : 8.5; this.dir = dxp > 0 ? 1 : -1; this.vx = this.dir * (this.type === 'kangarat' ? 3.5 : 2.5); this.timer = this.type === 'kangarat' ? 1.0 : 1.4; }
      if (this.grounded && this.timer > 0) this.vx = 0;
      moveBody(level, this, dt, w);
    } else {
      // walkers
      if (this.charger && target && dist < 7 && Math.abs(target.y - this.y) < 1.5 && this.state !== 'charge') { this.state = 'charge'; this.dir = dxp > 0 ? 1 : -1; this.timer = 2.0; }
      const spd = this.state === 'charge' ? this.speed * 3.5 : this.speed;
      if (this.state === 'charge' && this.timer <= 0) this.state = 'idle';
      this.vx = this.dir * spd;
      if (this.type === 'pirat' && target && dist < 5 && this.state !== 'charge') this.dir = dxp > 0 ? 1 : -1;
      moveBody(level, this, dt, w);
      if (this.hitWall) { this.dir *= -1; this.hitWall = 0; if (this.state === 'charge') this.state = 'idle'; }
      // turn at ledges (not when charging)
      if (this.grounded && this.state !== 'charge') { const ahead = this.x + this.dir * (this.w / 2 + 0.2); if (!level.solidAtWorld(ahead, this.y - 0.3) && level.tileAtWorld(ahead, this.y - 0.3) !== TILE_PLAT && !w.solidBodyAt(ahead, this.y - 0.3)) this.dir *= -1; }
      if (this.type === 'robot' && this.timer <= 0 && target && dist < 6) { w.spawnProjectile(this.x + this.dir * 0.6, this.y + 1.6, this.dir * 6, 0, 'bolt'); this.timer = 2.5; }
      if (this.y < -3) this.dead = true;
    }
    this.mesh.position.set(this.x, this.y, 0.05);
    this.mesh.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (this.type === 'crab' || this.type === 'rhino' || this.type === 'lizard') this.mesh.rotation.y = this.dir > 0 ? 0 : Math.PI;
    if (this.mesh.userData.sideView) this.mesh.rotation.y = this.dir > 0 ? -0.35 : Math.PI + 0.35; /* NES side view, turned a bit to the camera */
    if (this.hurtT > 0) this.mesh.rotation.z = Math.sin(this.t * 60) * 0.2; else this.mesh.rotation.z = 0;
    animateEnemy(this.mesh, dt, this.t, this.vx);
  }
  hit(from) {
    if (this.invulnerable || this.dying > 0) return false;
    this.hp--; this.hurtT = 0.3;
    if (this.hp <= 0) {
      this.world.sfx(SFX.enemyHit); if (this.bomb) { this.dead = true; this.world.explode(this.x, this.y + 0.5); return true; }
      this.contact = false; this.dying = 1.4; this.vx = (from && from.vx ? Math.sign(from.vx) : -this.dir || 1) * 6; this.vy = 13; this.world.spawnParticles(this.x, this.y + this.h / 2, '#ffffff', 6); return true;
    }
    this.world.sfx(SFX.enemyHit); return false;
  }
  dispose() { this.world.scene.remove(this.mesh); }
}

// ------------------------------------------------------------------ Projectiles (enemy/boss)
export class Projectile {
  constructor(x, y, vx, vy, kind, world) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.kind = kind; this.world = world; this.t = 0; this.dead = false; this.w = 0.5; this.h = 0.5;
    const geo = kind === 'ash' ? new THREE.SphereGeometry(0.22, 8, 6) : kind === 'ironball' ? new THREE.SphereGeometry(0.45, 12, 10) : kind === 'fish' ? new THREE.SphereGeometry(0.3, 8, 6) : kind === 'bubble' ? new THREE.SphereGeometry(0.4, 10, 8) : new THREE.SphereGeometry(0.16, 8, 6);
    const m = kind === 'ash' ? mat('#ff8020', { emissive: '#ff4000', emissiveIntensity: 1.2 }) : kind === 'ironball' ? mat('#555', { metalness: 0.8, roughness: 0.3 }) : kind === 'fish' ? mat('#60c0f0') : kind === 'bubble' ? new THREE.MeshStandardMaterial({ color: '#c0f0ff', transparent: true, opacity: 0.5 }) : kind === 'lightning' ? mat('#80e0ff', { emissive: '#40c0ff', emissiveIntensity: 2 }) : mat('#ffe040', { emissive: '#ffa000', emissiveIntensity: 1 });
    this.mesh = new THREE.Mesh(geo, m); if (kind === 'fish') this.mesh.scale.set(1.6, 0.8, 0.8); world.scene.add(this.mesh); this.gravity = kind === 'ash' || kind === 'ironball' || kind === 'fish' || kind === 'chip' ? 1 : 0;
    if (kind === 'ironball') { this.w = this.h = 0.9; } if (kind === 'bubble') { this.gravity = -0.15; this.w = this.h = 0.7; }
    this.harmless = false;
  }
  update(dt, level) {
    this.t += dt; this.vy -= GRAVITY * this.gravity * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.kind === 'ironball') { if (level.solidAtWorld(this.x, this.y - 0.45)) { this.vy = Math.abs(this.vy) * 0.5; this.y = Math.floor(this.y - 0.45) + 1.45; this.bounces = (this.bounces || 0) + 1; if (this.bounces > 2) this.dead = true; this.world.sfx(SFX.land); } }
    else if (level.solidAtWorld(this.x, this.y) && this.t > 0.1) this.dead = true;
    if (this.t > 6 || this.y < -3) this.dead = true;
    this.mesh.position.set(this.x, this.y, 0.1); this.mesh.rotation.z += dt * 5;
  }
  dispose() { this.world.scene.remove(this.mesh); }
}

// ------------------------------------------------------------------ Bosses
export const BOSS_INFO = {
  brusher: { hp: 5, name: 'Робот-уборщик Нимнула' }, owl: { hp: 5, name: 'Сова' }, rocket: { hp: 5, name: 'Игрушечная ракета' }, robot: { hp: 5, name: 'Робот-игрушка' },
  grouper: { hp: 5, name: 'Зелёный окунь' }, casinocat: { hp: 5, name: 'Мепс' }, caterpillar: { hp: 5, name: 'Гусеница' }, fatcat: { hp: 5, name: 'Толстопуз' },
  nimdrone: { hp: 5, name: 'Дрон Нимнула' }, squid: { hp: 5, name: 'Билли-Кальмар' }, siamese: { hp: 6, name: 'Сиамские близнецы' }, capone: { hp: 5, name: 'Рэт Капоне' },
  dinoskel: { hp: 6, name: 'Банда Толстопуза' }, python: { hp: 5, name: 'Питон' }, winifred: { hp: 5, name: 'Ведьма Уинифред' }, sewernose: { hp: 6, name: 'Сьюэрноуз де Бержерак' },
  nimmech: { hp: 7, name: 'Робот Нимнула' }, fatcatfinal: { hp: 8, name: 'Толстопуз' },
};
export class Boss {
  constructor(type, x, y, world) {
    this.type = type; this.x = x; this.y = y; this.world = world; this.info = BOSS_INFO[type] || { hp: 5, name: '???' }; this.hp = this.info.hp; this.maxHp = this.hp;
    this.mesh = makeBoss(type); world.scene.add(this.mesh); const u = this.mesh.userData; this.w = u.w || 2; this.h = u.h || 2; this.flyer = !!u.flyer || !!u.swimmer;
    this.vx = 0; this.vy = 0; this.t = 0; this.timer = 1.5; this.state = 'enter'; this.dir = -1; this.dead = false; this.hurtT = 0; this.x0 = x; this.y0 = y; this.grounded = false; this.phase = 0; this.attack = false; this.deathT = 0; this.invuln = 0;
    this.arenaL = x - 9; this.arenaR = x + 9;
  }
  get body() { const u = this.mesh.userData; if (u.bodyW) return { x: this.x, y: this.y, w: u.bodyW, h: u.bodyH }; return { x: this.x, y: this.y, w: this.w * 0.8, h: this.h * 0.9 }; }
  get hitBox() { const u = this.mesh.userData; return u.weakY ? { x: this.x, y: this.y + u.weakY, w: 1.6, h: 1.4 } : this.body; } // where thrown things hurt the boss
  update(dt, level) {
    this.t += dt; this.timer -= dt; if (this.hurtT > 0) this.hurtT -= dt; if (this.invuln > 0) this.invuln -= dt;
    const w = this.world; const target = w.nearestPlayer(this.x, this.y); const dxp = target ? target.x - this.x : 0; const dist = Math.abs(dxp);
    if (this.dead) { this.deathT += dt; this.mesh.position.y -= dt * 1.5; this.mesh.rotation.z += dt * 2; if (Math.floor(this.deathT * 10) % 2 === 0) w.spawnParticles(this.x + (Math.random() - 0.5) * this.w, this.y + Math.random() * this.h, '#ffd040', 3); if (this.deathT > 2.5) this.gone = true; return; }
    this.attack = false;
    switch (this.type) {
      case 'brusher': if (w.level.original) { // NES zone 0 boss: does not move; hands at (-4.6, +5.1) and (+3.75, +7.5) shoot at the player every 2 s
        if (this.timer <= 0) { this.attack = true; this.timer = 2.0; for (const [hx, hy] of [[-4.6, 5.1], [3.75, 7.5]]) { const sx = this.x + hx, sy = this.y + hy; const tx = target ? target.x : this.x, ty = target ? target.y + 0.6 : this.y; const d = Math.hypot(tx - sx, ty - sy) || 1; w.spawnProjectile(sx, sy, (tx - sx) / d * 7.5, (ty - sy) / d * 7.5, 'bolt').straight = true; } }
        this.dir = 1; break;
      } else { // slides left/right, arms swipe; electric sparks fall
        this.x += Math.sin(this.t * 0.9) * dt * 3.5; if (this.timer <= 0) { this.attack = true; w.spawnProjectile(this.x + (Math.random() - 0.5) * 6, this.y + 4, 0, -2, 'lightning'); this.timer = 1.1 - Math.min(0.5, (this.maxHp - this.hp) * 0.1); } break;
      }
      case 'owl': { this.y = this.y0 + 2.5 + Math.sin(this.t * 1.5) * 1.5; if (this.state === 'enter' || this.state === 'hover') { this.x += Math.sign(dxp) * dt * 2.2; if (this.timer <= 0) { this.state = 'dive'; this.timer = 1.2; this.tx = target ? target.x : this.x; } } if (this.state === 'dive') { const k = 1 - this.timer / 1.2; this.y = this.y0 + 2.5 + Math.sin(k * Math.PI) * -2.3; this.x += (this.tx - this.x) * dt * 3; if (this.timer <= 0) { this.state = 'hover'; this.timer = 2.0; } } if (this.timer < 0.3 && this.state === 'hover' && Math.random() < 0.05) w.spawnProjectile(this.x, this.y + 1, (Math.random() - 0.5) * 4, -3, 'chip'); break; }
      case 'rocket': { this.y = this.y0 + 1.5 + Math.sin(this.t * 2) * 0.5; if (this.state !== 'dash') { this.x += Math.sign(dxp) * dt * 1.5; if (this.timer <= 0) { this.state = 'dash'; this.timer = 0.8; this.dir = Math.sign(dxp) || 1; } } else { this.x += this.dir * dt * 12; this.attack = true; if (this.timer <= 0 || this.x < this.arenaL || this.x > this.arenaR) { this.state = 'float'; this.timer = 1.6; } } if (this.timer < 0.1 && this.state === 'float') w.spawnProjectile(this.x, this.y + 0.5, 0, -1, 'ash'); break; }
      case 'robot': { this.vx = this.dir * 2.2; moveBody(level, this, dt, null); if (this.hitWall || this.x < this.arenaL || this.x > this.arenaR) { this.dir *= -1; this.hitWall = 0; } if (this.timer <= 0) { this.attack = true; for (const s of [-1, 1]) w.spawnProjectile(this.x + s * 1.3, this.y + 2.8, s * 6, 4, 'bolt'); this.timer = 2.0; } this.walking = true; break; }
      case 'grouper': { // leaps out of water
        if (this.state === 'enter' || this.state === 'under') { this.y = this.y0 - 2.5; if (this.timer <= 0) { this.state = 'leap'; this.timer = 1.6; this.lx = target ? target.x : this.x; this.dir = Math.sign(this.lx - this.x) || 1; } } else { const k = 1 - this.timer / 1.6; this.y = this.y0 - 2.5 + Math.sin(k * Math.PI) * 7; this.x += (this.lx - this.x) * dt * 1.5; this.attack = true; if (k > 0.45 && k < 0.5 && !this.spat) { this.spat = true; for (const s of [-1, 1]) w.spawnProjectile(this.x, this.y + 1.5, s * 4, 6, 'fish'); } if (this.timer <= 0) { this.state = 'under'; this.timer = 1.4; this.spat = false; w.spawnParticles(this.x, this.y0 - 0.5, '#80c0ff', 12); } } break; }
      case 'casinocat': case 'capone': { this.x += Math.sign(dxp) * dt * 1.2 * (dist > 4 ? 1 : 0); this.dir = Math.sign(dxp) || 1; if (this.timer <= 0) { this.attack = true; w.spawnProjectile(this.x + this.dir * 1.2, this.y + 2.8, this.dir * 7 + (Math.random() - 0.5) * 2, 6, this.type === 'capone' ? 'ash' : 'chip'); this.timer = 1.4; } break; }
      case 'caterpillar': { this.x += this.dir * dt * 2.6; if (this.x < this.arenaL + 2 || this.x > this.arenaR - 2) this.dir *= -1; this.mesh.scale.x = this.dir > 0 ? 1 : -1; if (this.timer <= 0) { this.attack = true; w.spawnProjectile(this.x + this.dir * 1.2, this.y + 1.2, this.dir * 6, 3, 'bubble'); this.timer = 1.6; } break; }
      case 'fatcat': { this.x += Math.sign(dxp) * dt * 0.8 * (dist > 5 ? 1 : 0); this.dir = Math.sign(dxp) || 1; if (this.timer <= 0) { this.attack = true; for (let i = 0; i < 3; i++) w.spawnProjectile(this.x + this.dir * 1.5, this.y + 4.2, this.dir * (3 + i * 2) + (Math.random() - 0.5), 5 + Math.random() * 3, 'ash'); this.timer = 1.6; } break; }
      case 'fatcatfinal': { this.y = this.y0 + 2 + Math.sin(this.t * 1.3) * 1.5; this.x += Math.sign(dxp) * dt * 2.0 * (dist > 2 ? 1 : 0); this.dir = Math.sign(dxp) || 1; if (this.timer <= 0) { this.attack = true; if (this.phase % 2 === 0) { for (let i = -1; i <= 1; i++) w.spawnProjectile(this.x, this.y + 1, i * 4, -3, 'bolt'); } else { w.spawnProjectile(this.x, this.y + 1, 0, 0, 'ironball'); } this.phase++; this.timer = 1.3; } break; }
      case 'nimdrone': { this.y = this.y0 + 3 + Math.sin(this.t * 2) * 1.2; this.x += Math.sin(this.t * 0.7) * dt * 4; if (this.timer <= 0) { this.attack = true; w.spawnProjectile(this.x, this.y + 0.5, (target ? Math.sign(dxp) : 1) * 4, -5, 'bolt'); this.timer = 1.0; } break; }
      case 'squid': { this.y = this.y0 - 1 + Math.sin(this.t * 1.2) * 1.5; this.x += Math.sign(dxp) * dt * 1.5 * (dist > 3 ? 1 : 0); if (this.timer <= 0) { this.attack = true; for (let i = 0; i < 3; i++) w.spawnProjectile(this.x, this.y + 3, (i - 1) * 3 + (Math.random() - 0.5), 8, 'bubble'); this.timer = 1.8; } break; }
      case 'siamese': { this.x += this.dir * dt * 2.0; if (this.x < this.arenaL + 2 || this.x > this.arenaR - 2) this.dir *= -1; if (this.timer <= 0) { this.attack = true; for (const s of [-1, 1]) w.spawnProjectile(this.x + s, this.y + 2.5, s * 5, 7, 'bubble'); this.timer = 1.5; } break; }
      case 'dinoskel': { this.x += this.dir * dt * 1.6; if (this.x < this.arenaL + 4 || this.x > this.arenaR - 4) this.dir *= -1; this.mesh.scale.x = this.dir > 0 ? 1 : -1; if (this.timer <= 0) { this.attack = true; w.spawnProjectile(this.x + this.dir * 4, this.y + 3.5, this.dir * 5, 2, 'chip'); this.timer = 1.2; } break; }
      case 'python': { this.x += this.dir * dt * 3.0; if (this.x < this.arenaL + 5 || this.x > this.arenaR - 5) this.dir *= -1; this.mesh.scale.x = this.dir > 0 ? 1 : -1; if (this.timer <= 0) { this.state = this.state === 'low' ? 'high' : 'low'; this.timer = 2.2; } this.y += ((this.state === 'high' ? this.y0 + 2.2 : this.y0) - this.y) * dt * 3; break; }
      case 'winifred': { this.y = this.y0 + 3 + Math.sin(this.t * 1.1) * 2; this.x += Math.sin(this.t * 0.5) * dt * 5; if (this.timer <= 0) { this.attack = true; w.spawnProjectile(this.x, this.y + 1.5, (Math.random() - 0.5) * 6, -2, 'lightning'); this.timer = 0.9; } break; }
      case 'sewernose': { this.x += this.dir * dt * 2.2; if (this.x < this.arenaL + 3 || this.x > this.arenaR - 3) this.dir *= -1; this.mesh.scale.x = this.dir > 0 ? 1 : -1; if (this.timer <= 0) { this.attack = true; this.timer = 1.4; w.spawnProjectile(this.x + this.dir * 3.5, this.y + 1.2, this.dir * 6, 5, 'bubble'); } break; }
      case 'nimmech': { this.vx = this.dir * 1.8; moveBody(level, this, dt, null); if (this.hitWall || this.x < this.arenaL + 2 || this.x > this.arenaR - 2) { this.dir *= -1; this.hitWall = 0; } this.walking = true; if (this.timer <= 0) { this.attack = true; for (const s of [-1, 1]) w.spawnProjectile(this.x + s * 1.7, this.y + 1.2, s * 5, 1, 'lightning'); if (this.phase++ % 3 === 2) w.spawnProjectile(this.x, this.y + 6, 0, 0, 'ironball'); this.timer = 1.6; } break; }
    }
    this.x = Math.max(this.arenaL, Math.min(this.arenaR, this.x));
    this.mesh.position.set(this.x, this.y, this.type === 'brusher' && w.level.original ? -1.8 : 0); /* the zone 0 robot stands behind the play line */
    if (!['caterpillar', 'dinoskel', 'python', 'sewernose'].includes(this.type) && !(this.type === 'brusher' && w.level.original)) this.mesh.rotation.y = this.dir > 0 ? Math.PI / 2 - 1.2 : -Math.PI / 2 + 1.2;
    animateBoss(this.mesh, dt, this.t, { attack: this.attack, hurt: this.hurtT > 0, walking: this.walking });
  }
  hit() {
    if (this.invuln > 0 || this.dead) return false;
    this.hp--; this.hurtT = 0.5; this.invuln = 0.8; this.world.sfx(SFX.bossHit); this.world.spawnParticles(this.x, this.y + this.h / 2, '#ffffff', 8);
    if (this.hp <= 0) { this.dead = true; this.world.sfx(SFX.explode); this.world.onBossDefeated(this); }
    return true;
  }
  dispose() { this.world.scene.remove(this.mesh); }
}

// ------------------------------------------------------------------ Particles
export class Particles {
  constructor(scene) { this.scene = scene; this.list = []; this.geo = new THREE.BoxGeometry(0.18, 0.18, 0.18); }
  spawn(x, y, color, n = 8, speed = 6) {
    const m = mat(color);
    for (let i = 0; i < n; i++) { const mesh = new THREE.Mesh(this.geo, m); mesh.position.set(x, y, 0.3); this.scene.add(mesh); const a = Math.random() * Math.PI * 2; this.list.push({ mesh, vx: Math.cos(a) * speed * (0.4 + Math.random()), vy: Math.sin(a) * speed * (0.4 + Math.random()) + 3, t: 0.6 + Math.random() * 0.5 }); }
  }
  update(dt) {
    for (const p of this.list) { p.t -= dt; p.vy -= GRAVITY * dt; p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.rotation.x += dt * 8; p.mesh.rotation.y += dt * 6; if (p.t <= 0) this.scene.remove(p.mesh); }
    this.list = this.list.filter(p => p.t > 0);
  }
  clear() { for (const p of this.list) this.scene.remove(p.mesh); this.list = []; }
}
