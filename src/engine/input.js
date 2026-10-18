// Keyboard + gamepad input for two local players.
// Keyboard — P1: arrows + Z/Space (jump), X/C (grab & throw).  P2: WASD + G (jump), H (grab & throw).
// Gamepads — first connected pad drives P1, second drives P2 (in a 1-player game any pad drives P1).
//   Standard layout: A/B (bottom/right) = jump, X/Y (left/top) = grab & throw, D-pad or left stick = move,
//   Start = pause/confirm, Back/Select = status, B = back in menus. Non-standard mappings use heuristics.
// Extra P1 keys (Ctrl, PageUp/PageDown, Tab) match what Steam's default *desktop* layout types for a Steam Controller / Steam Deck
// (D-pad = arrows, Y = Space, A = Enter, B = Esc, LB = Ctrl, R5 = PageUp, R4 = PageDown, Menu = Tab), so the pad works even without XInput emulation.
const P1 = { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], jump: ['KeyZ', 'Space'], act: ['KeyX', 'KeyC', 'ControlLeft', 'ControlRight', 'PageUp', 'PageDown'] };
const P2 = { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], jump: ['KeyG'], act: ['KeyH'] };
const GLOBAL = { start: ['Enter', 'Tab'], select: ['ShiftLeft', 'ShiftRight'], mute: ['KeyM'], escape: ['Escape'], view: ['KeyV'] };
const DEADZONE = 0.35;

// Read one gamepad into a normalised digital state.
function readPad(pad) {
  const b = (n) => !!(pad.buttons[n] && (pad.buttons[n].pressed || pad.buttons[n].value > 0.5));
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  const st = { left: ax < -DEADZONE, right: ax > DEADZONE, up: ay < -DEADZONE, down: ay > DEADZONE, jump: false, act: false, start: false, select: false, back: false, any: false };
  if (pad.mapping === 'standard') {
    st.left ||= b(14); st.right ||= b(15); st.up ||= b(12); st.down ||= b(13);
    st.jump = b(0) || b(1); st.act = b(2) || b(3) || b(4) || b(5); st.start = b(9); st.select = b(8); st.back = b(1);
  } else {
    // unknown layout (e.g. raw HID): face buttons 0-3, shoulders 4-7, start usually 9 or 7, hat on the last axis
    st.jump = b(0) || b(1); st.act = b(2) || b(3) || b(4) || b(5); st.start = b(9) || b(7) || b(11); st.select = b(8) || b(6) || b(10); st.back = b(1);
    const n = pad.axes.length;
    if (n >= 10 || (n % 2 === 1)) { // POV hat encoded as an axis in [-1, 1] (8 directions)
      const h = pad.axes[n - 1];
      if (typeof h === 'number' && h > -1.01 && h < 1.01 && Math.abs(h) <= 1 && h !== 0 || h === -1) {
        const idx = Math.round((h + 1) / 2 * 7); // 0=up,1=up-right,2=right,...7=up-left
        if ([7, 0, 1].includes(idx)) st.up = true; if ([1, 2, 3].includes(idx)) st.right = true; if ([3, 4, 5].includes(idx)) st.down = true; if ([5, 6, 7].includes(idx)) st.left = true;
      }
    }
    if (pad.buttons.length >= 16) { st.left ||= b(14); st.right ||= b(15); st.up ||= b(12); st.down ||= b(13); }
  }
  st.any = st.jump || st.act || st.start || st.select || pad.buttons.some(x => x.pressed);
  return st;
}

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressedThisFrame = new Set();
    this.players = [this._blank(), this._blank()];
    this.startPressed = false; this.selectPressed = false; this.mutePressed = false; this.escapePressed = false;
    this.anyPressed = false; this.padAnyPressed = false;
    this.pads = []; this.padOrder = []; this.padStates = {}; this.padPrev = {}; this.lastPadState = {};
    this.twoPlayer = false; this.onPadEvent = null; this.lastDevice = 'keyboard';
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab', 'PageUp', 'PageDown'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressedThisFrame.add(e.code);
      this.keys.add(e.code); this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', (e) => { this._registerPad(e.gamepad); if (this.onPadEvent) this.onPadEvent('connected', e.gamepad); });
    window.addEventListener('gamepaddisconnected', (e) => { this.padOrder = this.padOrder.filter(i => i !== e.gamepad.index); if (this.onPadEvent) this.onPadEvent('disconnected', e.gamepad); });
  }
  _registerPad(pad) { if (pad && !this.padOrder.includes(pad.index)) this.padOrder.push(pad.index); }
  _blank() {
    return { left: false, right: false, up: false, down: false, jump: false, act: false,
      jumpPressed: false, actPressed: false, upPressed: false, downPressed: false, leftPressed: false, rightPressed: false, axisX: 0 };
  }
  _down(codes) { return codes.some(c => this.keys.has(c)); }
  _hit(codes) { return codes.some(c => this.pressedThisFrame.has(c)); }
  // which pad (index) drives player i
  padForPlayer(i) {
    const order = this.padOrder.filter(idx => this.pads[idx]);
    if (!order.length) return null;
    if (!this.twoPlayer) return i === 0 ? order : null; // every pad drives P1
    return order[i] != null ? [order[i]] : null;
  }
  update() {
    const raw = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    this.pads = raw.map(p => (p && p.connected) ? p : null);
    for (const p of this.pads) if (p) this._registerPad(p);
    this.padOrder = this.padOrder.filter(i => this.pads[i]);
    const states = {}; this.padAnyPressed = false; let padStart = false, padSelect = false, padBack = false;
    for (const idx of this.padOrder) {
      const st = readPad(this.pads[idx]); states[idx] = st; const prev = this.padPrev[idx] || {};
      if (st.any && !prev.any) this.padAnyPressed = true;
      if (st.start && !prev.start) padStart = true; if (st.select && !prev.select) padSelect = true; if (st.back && !prev.back) padBack = true;
      if (st.any) this.lastDevice = 'gamepad';
    }
    this.padPrev = states; this.padStates = states;
    const maps = [P1, P2];
    this.anyPressed = this.pressedThisFrame.size > 0 || this.padAnyPressed;
    for (let i = 0; i < 2; i++) {
      const m = maps[i], p = this.players[i];
      const prev = { jump: p.jump, act: p.act, up: p.up, down: p.down, left: p.left, right: p.right };
      p.left = this._down(m.left); p.right = this._down(m.right); p.up = this._down(m.up); p.down = this._down(m.down);
      p.jump = this._down(m.jump); p.act = this._down(m.act);
      const padIdx = this.padForPlayer(i);
      if (padIdx) for (const idx of padIdx) { const st = states[idx]; if (!st) continue; p.left ||= st.left; p.right ||= st.right; p.up ||= st.up; p.down ||= st.down; p.jump ||= st.jump; p.act ||= st.act; }
      p.jumpPressed = p.jump && !prev.jump; p.actPressed = p.act && !prev.act;
      p.upPressed = p.up && !prev.up; p.downPressed = p.down && !prev.down;
      p.leftPressed = p.left && !prev.left; p.rightPressed = p.right && !prev.right;
      p.axisX = (p.right ? 1 : 0) - (p.left ? 1 : 0);
    }
    this.startPressed = this._hit(GLOBAL.start) || padStart;
    this.selectPressed = this._hit(GLOBAL.select) || padSelect;
    this.mutePressed = this._hit(GLOBAL.mute); this.pressedViewToggle = this._hit(GLOBAL.view);
    this.escapePressed = this._hit(GLOBAL.escape) || padBack;
    this.pressedThisFrame.clear();
  }
  // Combined menu navigation (either player, keyboard or any pad)
  menu() {
    const a = this.players[0], b = this.players[1];
    return {
      left: a.leftPressed || b.leftPressed, right: a.rightPressed || b.rightPressed,
      up: a.upPressed || b.upPressed, down: a.downPressed || b.downPressed,
      ok: a.jumpPressed || b.jumpPressed || a.actPressed || b.actPressed || this.startPressed,
      back: this.escapePressed,
      start: this.startPressed,
    };
  }
  // Haptics (if the pad supports it)
  rumble(playerIndex, strong = 0.6, weak = 0.3, ms = 120) {
    const idxs = this.padForPlayer(playerIndex) || []; for (const idx of idxs) { const pad = this.pads[idx]; const act = pad && (pad.vibrationActuator || (pad.hapticActuators && pad.hapticActuators[0]));
      try { if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); else if (act && act.pulse) act.pulse(strong, ms); } catch (e) { } }
  }
  // Snapshot for the diagnostics screen
  describePads() {
    return this.padOrder.map((idx, n) => { const p = this.pads[idx]; const st = this.padStates[idx] || {}; return { index: idx, player: this.twoPlayer ? n + 1 : 1, id: p.id, mapping: p.mapping || 'нестандартная', buttons: p.buttons.map(b => b.pressed ? 1 : 0), axes: p.axes.map(a => Math.round(a * 100) / 100), state: st }; });
  }
}
