import { createEmu, B } from "./emu.js";
const e = createEmu("../ChipAndDale.nes"); const cpu = e.nes.cpu;
let songStarted = false; const oem = cpu.emulate.bind(cpu);
cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) songStarted = true; return oem(); };
e.step(200); e.press(B.BUTTON_START, 4); e.step(60); e.press(B.BUTTON_START, 4);
for (let i = 0; i < 200 && !songStarted; i++) { e.step(16); e.press(B.BUTTON_A, 3); e.step(6); }
console.log('level music started at frame', e.frame); e.step(150);
e.shot("../ref/levels/jump_before.png");
// walk right 60 frames
const ws = []; e.hold(B.BUTTON_RIGHT); for (let f = 0; f < 60; f++) { e.step(1); ws.push(e.ramSnapshot()); } e.release(B.BUTTON_RIGHT); e.step(10);
const wc = [];
for (let a = 0; a < 0x800; a++) { let ok = true, total = 0; const ds = new Set(); for (let i = 1; i < ws.length; i++) { const d = (ws[i][a] - ws[i - 1][a] + 256) % 256; if (d > 4 && d < 252) { ok = false; break; } if (d < 128) total += d; ds.add(ws[i][a]); } if (ok && total >= 30 && total <= 200 && ds.size > 15) wc.push(a.toString(16) + ':' + ws[0][a] + '->' + ws[59][a]); }
console.log('walk candidates', wc.join('  '));
const js = []; e.hold(B.BUTTON_A); for (let f = 0; f < 40; f++) { e.step(1); js.push(e.ramSnapshot()); if (f === 14) e.shot("../ref/levels/jump_apex.png"); } e.release(B.BUTTON_A); for (let f = 0; f < 40; f++) { e.step(1); js.push(e.ramSnapshot()); }
for (let a = 0; a < 0x800; a++) {
  const v = js.map(s => s[a]); const start = v[0], min = Math.min(...v), max = Math.max(...v), end = v[v.length - 1];
  const smooth = v.every((x, i) => i === 0 || Math.abs(x - v[i - 1]) <= 12);
  if (smooth && (max - min) >= 16 && Math.abs(end - start) <= 2 && new Set(v).size >= 8) console.log('jump cand', a.toString(16), 'range', max - min, v.slice(0, 48).join(','));
}
