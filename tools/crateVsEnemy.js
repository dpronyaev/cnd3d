// Does a thrown crate hit a given enemy type? Replace the start apple with the enemy (type, x, y), pick a crate from the
// 2x2 stack, turn left and throw at it; log every live slot until the crate is gone. Usage: node crateVsEnemy.js 01 120 180
import { NES, Controller as B } from "jsnes";
import fs from "fs"; import { PNG } from "pngjs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const type = parseInt(process.argv[2] || '01', 16), ox = +(process.argv[3] || 120), oy = +(process.argv[4] || 180), throwAt = +(process.argv[5] || 0);
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
const addr = 0x10388, cnt = 76; let idx = -1;
for (let i = 0; i < cnt; i++) { const sx = rom.charCodeAt(addr - 4 * cnt + i), x = rom.charCodeAt(addr - 3 * cnt + i), sy = rom.charCodeAt(addr - 2 * cnt + i), y = rom.charCodeAt(addr - cnt + i); if (sx === 0 && sy === 5 && x === 24 && y === 180) idx = i; }
put(addr + idx, type); put(addr - 3 * cnt + idx, ox); put(addr - cnt + idx, oy);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false }); nes.loadROM(rom);
let s = false; const cpu = nes.cpu; const m = cpu.mem; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
const step = (n) => { for (let i = 0; i < n; i++) { m[0x5e] = 60; nes.frame(); } };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(40);
const live = () => { const r = []; for (let k = 1; k < 16; k++) if (m[0x4d0 + k] & 0x80) r.push(`${k}:${m[0x4f0 + k] + 256 * m[0x500 + k]},${m[0x510 + k]}`); return r.join(' '); };
console.log('start', live());
nes.buttonDown(1, B.BUTTON_RIGHT); step(112); press(B.BUTTON_B, 2); step(6); nes.buttonUp(1, B.BUTTON_RIGHT); step(4);
console.log('carry', m[0x56].toString(16), 'P', m[0x4f0], m[0x510], '|', live());
if (process.argv[6] === 'L') press(B.BUTTON_LEFT, 2); step(throwAt); press(B.BUTTON_B, 2);
for (let f = 0; f < 60; f++) { step(1); if (f % 3 === 0) console.log('f' + f, live()); if (f === 15) shot('../ref/levels/cve.png'); }
