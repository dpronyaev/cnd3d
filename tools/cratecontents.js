// What drops out of crate-like objects 0A-0E? Replace the start apple (0,5,24,180) with the type at y=184, pick it up by
// pushing into it, throw it at the 2x2 crate stack, screenshot what appears.
import { NES, Controller as B } from "jsnes";
import fs from "fs";
import { PNG } from "pngjs";
import path from "path";
import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const type = parseInt(process.argv[2] || '0D', 16);
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
const addr = 0x10388, cnt = 76; let idx = -1;
for (let i = 0; i < cnt; i++) { const sx = rom.charCodeAt(addr - 4 * cnt + i), x = rom.charCodeAt(addr - 3 * cnt + i), sy = rom.charCodeAt(addr - 2 * cnt + i), y = rom.charCodeAt(addr - cnt + i); if (sx === 0 && sy === 5 && x === 24 && y === 180) idx = i; }
put(addr + idx, type); put(addr - cnt + idx, 184); put(addr - 3 * cnt + idx, 40);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false });
nes.loadROM(rom);
let songStarted = false; const cpu = nes.cpu; const oem = cpu.emulate.bind(cpu); const m = cpu.mem;
cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) songStarted = true; return oem(); };
const step = (n) => { for (let i = 0; i < n; i++) nes.frame(); };
const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4);
for (let i = 0; i < 200 && !songStarted; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(60);
const T = type.toString(16).toUpperCase().padStart(2, '0');
shot(`../ref/levels/crate_${T}_0.png`);
// Chip falls in at x=24; walk right past the crate, turn, push into it and press B
nes.buttonDown(1, B.BUTTON_RIGHT); step(30); nes.buttonUp(1, B.BUTTON_RIGHT); step(10);
nes.buttonDown(1, B.BUTTON_LEFT); step(20); press(B.BUTTON_B, 2); step(4); nes.buttonUp(1, B.BUTTON_LEFT); step(20);
console.log(T, 'carry', m[0x56].toString(16), 'P', m[0x4f0], m[0x510]);
shot(`../ref/levels/crate_${T}_1.png`);
press(B.BUTTON_RIGHT, 2); step(4); press(B.BUTTON_B, 2);
for (let f = 0; f < 60; f++) { step(1); if (f === 30) shot(`../ref/levels/crate_${T}_2.png`); }
shot(`../ref/levels/crate_${T}_3.png`);
const objs = []; for (let s = 1; s < 16; s++) if (m[0x4d0 + s] & 0x80) objs.push(`s${s} ${m[0x4f0 + s] + 256 * m[0x500 + s]},${m[0x510 + s]} st${m[0x4d0 + s].toString(16)} a${m[0x420 + s].toString(16)}`);
console.log(objs.join(' | '));
