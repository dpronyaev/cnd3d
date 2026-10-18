// Does an electric spark hurt Chip? Start on screen 010 (power lines), put Chip on the upper wire in the path of a spark,
// do NOT force invulnerability, and watch the invulnerability timer $5E / hearts.
import { NES, Controller as B } from "jsnes";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const F = (a) => 16 + 7 * 0x4000 + (a - 0xC000); const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
put(F(0xE200), 8); put(F(0xE20F), 1); put(F(0xE0C9), 1);
const nes = new NES({ onFrame: () => {}, emulateSound: false }); nes.loadROM(rom);
let s = false; const cpu = nes.cpu; const m = cpu.mem; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
const step = (n) => { for (let i = 0; i < n; i++) nes.frame(); };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(5);
const X = (k) => m[0x4f0 + k] + 256 * m[0x500 + k], Y = (k) => m[0x510 + k];
// kill the mice so only sparks remain: clear every live slot that is not a spark (sparks sit at y 96 on the wire)
for (let f = 0; f < 200; f++) {
  for (let k = 1; k < 16; k++) if ((m[0x4d0 + k] & 0x80) && m[0x510 + k] !== 96) m[0x4d0 + k] = 0;
  if (f < 3) { m[0x4f0] = 100; m[0x500] = 1; m[0x510] = 80; }
  step(1);
  if (f % 5 === 0) { const r = []; for (let k = 1; k < 16; k++) if (m[0x4d0 + k] & 0x80) r.push(`${k}:${X(k)},${Y(k)}`); console.log(`f${f} P${X(0)},${Y(0)} inv${m[0x5e]} act${m[0x54]} | ${r.join(' ')}`); }
}
