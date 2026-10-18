// Mouse (object 01) behaviour and look: put one on the start floor at x, Chip stays (or stands at chipX), log positions and
// save enlarged crops of the sprite. Usage: node mousetrace.js [mouseX] [chipX]
import { NES, Controller as B } from "jsnes";
import fs from "fs"; import { PNG } from "pngjs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const mx = +(process.argv[2] || 200), chipX = +(process.argv[3] || 24);
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
const addr = 0x10388, cnt = 76; let idx = -1;
for (let i = 0; i < cnt; i++) { const sx = rom.charCodeAt(addr - 4 * cnt + i), x = rom.charCodeAt(addr - 3 * cnt + i), sy = rom.charCodeAt(addr - 2 * cnt + i), y = rom.charCodeAt(addr - cnt + i); if (sx === 0 && sy === 5 && x === 24 && y === 180) idx = i; }
put(addr + idx, 1); put(addr - 3 * cnt + idx, mx); put(addr - cnt + idx, 180);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false }); nes.loadROM(rom);
let s = false; const cpu = nes.cpu; const m = cpu.mem; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
const step = (n) => { for (let i = 0; i < n; i++) { m[0x5e] = 60; nes.frame(); } };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const frameImg = () => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } return png; };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(30); m[0x4f0] = chipX; m[0x510] = 180;
const X = (k) => m[0x4f0 + k] + 256 * m[0x500 + k], Y = (k) => m[0x510 + k];
let mslot = -1; const rows = [];
for (let f = 0; f < 240; f++) {
  step(1); if (f < 3) { m[0x4f0] = chipX; }
  if (mslot < 0) for (let k = 6; k < 16; k++) if ((m[0x4d0 + k] & 0x80) && Math.abs(X(k) - mx) < 40 && Y(k) > 150) mslot = k;
  if (f % 6 === 0 && mslot >= 0) rows.push(`f${f} mouse ${X(mslot)},${Y(mslot)} chip ${X(0)}`);
  if (mslot >= 0 && [12, 18, 24, 30].includes(f)) { const png = frameImg(); const cx = Math.max(0, Math.min(256 - 40, X(mslot) - 22)), cy = Math.max(0, Math.min(200, Y(mslot) - 22)); const out = new PNG({ width: 320, height: 320 }); for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) { const si = ((cy + (y >> 3)) * 256 + cx + (x >> 3)) * 4, di = (y * 320 + x) * 4; for (let c = 0; c < 4; c++) out.data[di + c] = png.data[si + c]; } fs.writeFileSync(path.resolve(TOOLS, `../ref/levels/mouse_f${f}.png`), PNG.sync.write(out)); }
}
console.log(rows.join('\n'));
