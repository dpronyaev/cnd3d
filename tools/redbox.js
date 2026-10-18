import { NES, Controller as B } from "jsnes";
import fs from "fs"; import { PNG } from "pngjs"; import path from "path"; import { fileURLToPath } from "url";
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
let rom = fs.readFileSync(path.resolve(TOOLS, "../ChipAndDale.nes"), "binary");
const F = (a) => 16 + 7 * 0x4000 + (a - 0xC000); const put = (o, v) => { rom = rom.slice(0, o) + String.fromCharCode(v) + rom.slice(o + 1); };
put(F(0xE200), 20); put(F(0xE20F), 2); put(F(0xE0C9), 6);
let last = null; const nes = new NES({ onFrame: (fb) => { last = fb; }, emulateSound: false }); nes.loadROM(rom);
let s = false; const cpu = nes.cpu; const m = cpu.mem; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
const step = (n) => { for (let i = 0; i < n; i++) nes.frame(); }; const press = (b, n = 3) => { nes.buttonDown(1, b); step(n); nes.buttonUp(1, b); };
const shot = (p) => { const png = new PNG({ width: 256, height: 240 }); for (let i = 0; i < 256 * 240; i++) { const c = last[i]; png.data[i * 4] = c & 255; png.data[i * 4 + 1] = (c >> 8) & 255; png.data[i * 4 + 2] = (c >> 16) & 255; png.data[i * 4 + 3] = 255; } fs.writeFileSync(path.resolve(TOOLS, p), PNG.sync.write(png)); };
step(200); press(B.BUTTON_START, 4); step(60); press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { step(16); press(B.BUTTON_A, 3); step(6); }
step(60);
nes.buttonDown(1, B.BUTTON_RIGHT); step(60); press(B.BUTTON_B, 2); step(6); nes.buttonUp(1, B.BUTTON_RIGHT); step(20);
console.log('carry', m[0x56].toString(16), 'P', m[0x4f0] + 256 * m[0x500], m[0x510]); shot('../ref/levels/redbox_1.png');
const X = (k) => m[0x4f0 + k] + 256 * m[0x500 + k]; for (let f = 0; f < 240; f += 6) { step(6); const r = []; for (let k = 1; k < 16; k++) if (m[0x4d0 + k] & 0x80) r.push(k + ':' + (X(k) - 1536) + ',' + m[0x510 + k]); console.log('f' + f, 'P', X(0) - 1536, '|', r.join(' ')); if (f === 60) shot('../ref/levels/redbox_mid.png'); }
console.log('room', m[0x500], m[0x520], 'P', m[0x4f0] + 256 * m[0x500], m[0x510]);
