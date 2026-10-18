// Lab nuts (block type E): start on lab screen (3,0) with the lab graphics, walk into the 2x2 nut stack, lift one, throw it.
// Logs the flying object (slots 2-5) per frame. Usage: node nutthrow.js [R|L|U] [walkFrames]
import { NES, Controller as B } from "jsnes";
import fs from "fs"; import { PNG } from "pngjs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] || 'R', walk = +(process.argv[3] || 40), cell = +(process.argv[4] || 3);
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const F = (a) => 16 + 7 * 0x4000 + (a - 0xC000); const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
put(F(0xE200), cell); put(F(0xE20F), Math.floor(cell / 7)); put(F(0xE0C9), cell % 7); put(F(0xE23C), 0x91); put(F(0xE24B), 1);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false }); nes.loadROM(rom);
let s = false; const cpu = nes.cpu; const m = cpu.mem; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
const step = (n) => { for (let i = 0; i < n; i++) { m[0x5e] = 60; nes.frame(); } };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(60);
const X = (k) => m[0x4f0 + k] + 256 * m[0x500 + k], Y = (k) => m[0x510 + k];
console.log('start P', X(0), Y(0));
m[0x4f0] = +(process.env.PX || 120); m[0x510] = +(process.env.PY || 180); step(30); console.log('placed P', X(0), Y(0)); shot('../ref/levels/nut_0.png');
const toward = process.env.TOWARD === 'R' ? B.BUTTON_RIGHT : B.BUTTON_LEFT;
nes.buttonDown(1, toward); step(walk); press(B.BUTTON_B, 2); step(6); nes.buttonUp(1, toward); step(20);
const slot = m[0x56] & 15; console.log('carry', m[0x56].toString(16), 'P', X(0), Y(0), 'obj', X(slot), Y(slot), 'walk speed check'); shot('../ref/levels/nut_1.png');
const x0 = X(0); nes.buttonDown(1, B.BUTTON_RIGHT); step(30); nes.buttonUp(1, B.BUTTON_RIGHT); console.log('carry walk px/frame', ((X(0) - x0) / 30).toFixed(2), 'P', X(0), Y(0)); step(4);
if (dir === 'L') { press(B.BUTTON_LEFT, 2); step(2); }
if (dir === 'U') nes.buttonDown(1, B.BUTTON_UP);
if (dir === 'J') { nes.buttonDown(1, B.BUTTON_A); step(14); }
press(B.BUTTON_B, 2); nes.buttonUp(1, B.BUTTON_UP); nes.buttonUp(1, B.BUTTON_A);
let px = X(slot), py = Y(slot); const rows = [];
for (let f = 0; f < 70; f++) { step(1); const x = X(slot), y = Y(slot); rows.push(`f${f} P${X(0)},${Y(0)} x${x} y${y} dx${x - px} dy${y - py} st${m[0x4d0 + slot].toString(16)}`); px = x; py = y; if (f === 20) shot('../ref/levels/nut_2.png'); }
console.log(rows.join('\n')); shot('../ref/levels/nut_3.png');
