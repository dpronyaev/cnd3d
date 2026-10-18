// Where does a door lead in the original? Start on a screen, stand Chip in the doorway, press Up, log the arrival.
// Usage: node doortest.js <cell> <localX> <localY>
import { NES, Controller as B } from "jsnes";
import fs from "fs"; import { PNG } from "pngjs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const cell = +(process.argv[2] || 13), lx = +(process.argv[3] || 200), ly = +(process.argv[4] || 180);
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const F = (a) => 16 + 7 * 0x4000 + (a - 0xC000); const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
put(F(0xE200), cell); put(F(0xE20F), Math.floor(cell / 7)); put(F(0xE0C9), cell % 7);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false }); nes.loadROM(rom);
let s = false; const cpu = nes.cpu; const m = cpu.mem; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
const step = (n) => { for (let i = 0; i < n; i++) { m[0x5e] = 60; nes.frame(); } };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(60);
const st = () => `col ${m[0x500]} row ${m[0x520]} x ${m[0x4f0]} y ${m[0x510]} act ${m[0x54]}`;
m[0x4f0] = lx; m[0x510] = ly; step(20); console.log('at door', st()); shot('../ref/levels/door_0.png');
const K = process.env.KEY || "RIGHT"; nes.buttonDown(1, B["BUTTON_" + K]); step(40); nes.buttonUp(1, B["BUTTON_" + K]);
for (let f = 0; f < 240; f += 20) { step(20); console.log('f' + f, st()); }
shot('../ref/levels/door_1.png');
