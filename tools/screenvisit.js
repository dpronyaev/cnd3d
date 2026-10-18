// Start zone 0 on an arbitrary layout cell (patches the level start byte in the ROM image) and screenshot it,
// listing live objects (type byte $03A0+slot, X $04F0/$0500, Y $0510). Usage: node screenvisit.js <cellIndex> [frames...]
import { NES, Controller as B } from "jsnes";
import fs from "fs";
import { PNG } from "pngjs";
import path from "path";
import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const cell = +(process.argv[2] || 35);
const frames = (process.argv[3] || '60,200').split(',').map(Number);
const hold = process.argv[4] || '';
const objType = process.argv[5]; // optional: replace the starting apple (object #0 of level 0 list at 24,180) with this type
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
// level start (bank 7 $E0B4..): $E200[lvl] = layout index, $E20F[lvl] = start row, column is the immediate at $E0C9 (normally 0)
const F = (cpuAddr) => 16 + 7 * 0x4000 + (cpuAddr - 0xC000);
const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
put(F(0xE200), cell); put(F(0xE20F), Math.floor(cell / 7)); put(F(0xE0C9), cell % 7);
if (process.env.BACK) put(F(0xE23C), parseInt(process.env.BACK, 16)); if (process.env.PAL) put(F(0xE24B), +process.env.PAL);
if (objType !== undefined) {
  const addr = 0x10388, cnt = 76; let idx = -1;
  for (let i = 0; i < cnt; i++) { const sx = rom.charCodeAt(addr - 4 * cnt + i), x = rom.charCodeAt(addr - 3 * cnt + i), sy = rom.charCodeAt(addr - 2 * cnt + i), y = rom.charCodeAt(addr - cnt + i); if (sx === 0 && sy === 5 && x === 24 && y === 180) idx = i; }
  rom = rom.slice(0, addr + idx) + String.fromCharCode(parseInt(objType, 16)) + rom.slice(addr + idx + 1);
  console.log('patched object', idx, 'to type', objType);
}
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false });
nes.loadROM(rom);
let songStarted = false; const cpu = nes.cpu; const oem = cpu.emulate.bind(cpu);
cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) songStarted = true; return oem(); };
const step = (n) => { for (let i = 0; i < n; i++) nes.frame(); };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4);
for (let i = 0; i < 200 && !songStarted; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
const m = cpu.mem; let t = 0;
if (hold) nes.buttonDown(1, B['BUTTON_' + hold]);
if (process.env.TRACE) { const sl = process.env.TRACE.split(',').map(Number); const rows = []; for (let f = 0; f < (+process.env.TRACEN || 240); f++) { step(1); rows.push(f + ' ' + sl.map(s => `${s}:${m[0x4f0 + s] + 256 * m[0x500 + s]},${m[0x510 + s]},st${m[0x4d0 + s].toString(16)}`).join(' ')); } console.log(rows.filter((r, i) => i % 6 === 0).join(String.fromCharCode(10))); process.exit(0); }
for (const f of frames) {
  step(f - t); t = f;
  const objs = []; for (let s = 1; s < 16; s++) if (m[0x4d0 + s] & 0x80 || m[0x510 + s]) objs.push(`s${s}:t${m[0x3a0 + s].toString(16)} st${m[0x4d0 + s].toString(16)} ${m[0x4f0 + s] + 256 * m[0x500 + s]},${m[0x510 + s]}`);
  console.log(`cell ${cell} f${f} P ${m[0x4f0] + 256 * m[0x500]},${m[0x510]} | ${objs.join(' ')}`);
  shot(`../ref/levels/visit_${cell}_f${f}.png`);
}
