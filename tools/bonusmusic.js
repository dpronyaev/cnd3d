// Which sounds does the game request when Chip picks up a given object? The start apple is replaced by the object
// (Chip lands on/next to it), every call of the sound request routine ($C0F0, A = id) is logged.
import { NES, Controller as B } from "jsnes";
import fs from "fs"; import { PNG } from "pngjs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const type = parseInt(process.argv[2] || '14', 16), ox = +(process.argv[3] || 40), oy = +(process.argv[4] || 180);
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
const addr = 0x10388, cnt = 76; let idx = -1;
for (let i = 0; i < cnt; i++) { const sx = rom.charCodeAt(addr - 4 * cnt + i), x = rom.charCodeAt(addr - 3 * cnt + i), sy = rom.charCodeAt(addr - 2 * cnt + i), y = rom.charCodeAt(addr - cnt + i); if (sx === 0 && sy === 5 && x === 24 && y === 180) idx = i; }
put(addr + idx, type); put(addr - 3 * cnt + idx, ox); put(addr - cnt + idx, oy);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false }); nes.loadROM(rom);
let frame = 0, s = false; const cpu = nes.cpu; const m = cpu.mem; const log = []; const o = cpu.emulate.bind(cpu);
cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0) { if (cpu.REG_ACC === 0) s = true; log.push([frame, cpu.REG_ACC]); } return o(); };
const step = (n) => { for (let i = 0; i < n; i++) { nes.frame(); frame++; } };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
const t0 = frame; log.length = 0; step(40);
nes.buttonDown(1, B.BUTTON_RIGHT); step(30); nes.buttonUp(1, B.BUTTON_RIGHT); const zt0 = frame; for (let i = 0; i < 1800; i++) { step(1); if (m[0x5e] === 0 && i > 10 && !globalThis.zEnd) { globalThis.zEnd = i; } }
shot('../ref/levels/bonus_after.png');
console.log('sound requests after level start:', log.map(([f, a]) => `f${f - t0}:${a.toString(16)}`).join(' '));
