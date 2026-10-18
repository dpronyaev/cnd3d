// Zone 0 boss: repeatedly fetch the ball and throw it upward at the top target; log hits and what changes.
import { NES, Controller as B } from "jsnes";
import fs from "fs"; import { PNG } from "pngjs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const F = (a) => 16 + 7 * 0x4000 + (a - 0xC000); const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
put(F(0xE200), 18); put(F(0xE20F), 2); put(F(0xE0C9), 4);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false }); nes.loadROM(rom);
let s = false; const cpu = nes.cpu; const m = cpu.mem; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
let frame = 0; const step = (n) => { for (let i = 0; i < n; i++) { m[0x5e] = 60; nes.frame(); frame++; } }; // keep Chip invulnerable
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(40);
const PX = () => m[0x4f0] + 256 * m[0x500];
const ballSlot = () => { for (let k = 2; k < 6; k++) if (m[0x4d0 + k] & 0x80) return k; return -1; };
const walkTo = (x, tol = 2) => { for (let i = 0; i < 300; i++) { const d = x - PX(); if (Math.abs(d) <= tol) break; const b = d > 0 ? B.BUTTON_RIGHT : B.BUTTON_LEFT; nes.buttonDown(1, b); step(1); nes.buttonUp(1, b); } };
let prev = Uint8Array.from(m.subarray(0, 0x800));
for (let round = 0; round < 12; round++) {
  const k = ballSlot(); if (k < 0) { console.log('no ball; room', m[0x500], m[0x520]); break; }
  const bx = m[0x4f0 + k] + 256 * m[0x500 + k];
  // approach from the left side and push into it while pressing B
  walkTo(bx - 24); nes.buttonDown(1, B.BUTTON_RIGHT); step(12); press(B.BUTTON_B, 2); step(4); nes.buttonUp(1, B.BUTTON_RIGHT); step(4);
  if (!m[0x56]) { walkTo(bx + 24); nes.buttonDown(1, B.BUTTON_LEFT); step(12); press(B.BUTTON_B, 2); step(4); nes.buttonUp(1, B.BUTTON_LEFT); step(4); }
  const carried = m[0x56];
  walkTo(1152); nes.buttonDown(1, B.BUTTON_UP); press(B.BUTTON_B, 2); step(6); nes.buttonUp(1, B.BUTTON_UP); step(70);
  const now = Uint8Array.from(m.subarray(0, 0x800)); const d = [];
  for (let a = 0x300; a < 0x800; a++) if (now[a] !== prev[a] && Math.abs(now[a] - prev[a]) <= 2 && a !== 0x5e) d.push(a.toString(16) + ':' + prev[a] + '>' + now[a]);
  console.log('round', round, 'f', frame, 'carried', carried.toString(16), 'P', PX(), 'boss parts', [13, 14, 15].map(q => m[0x4d0 + q].toString(16)).join(','), '| small diffs', d.slice(0, 24).join(' '));
  prev = now; shot(`../ref/levels/boss0_r${round}.png`);
}
