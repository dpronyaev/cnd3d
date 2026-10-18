// Robot bulldog behaviour: Chip walks right for N frames and then waits; log every live object slot over time.
import { createEmu, B } from "./emu.js";
const walk = +(process.argv[2] || 60), total = +(process.argv[3] || 500);
const e = createEmu("../ChipAndDale.nes"); const cpu = e.nes.cpu; const m = cpu.mem;
let s = false; const o = cpu.emulate.bind(cpu); cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) s = true; return o(); };
e.step(200); e.press(B.BUTTON_START, 4); e.step(60); e.press(B.BUTTON_START, 4); for (let i = 0; i < 200 && !s; i++) { e.step(16); e.press(B.BUTTON_A, 3); e.step(6); }
e.step(60);
const X = (k) => m[0x4f0 + k] + 256 * m[0x500 + k], Y = (k) => m[0x510 + k];
e.hold(B.BUTTON_RIGHT);
for (let f = 0; f < total; f++) {
  if (f === walk) e.release(B.BUTTON_RIGHT);
  m[0x5e] = 60; e.step(1);
  if (f % 4 === 0) { const r = []; for (let k = 1; k < 16; k++) if (k < 10 || k > 15) if (m[0x4d0 + k] & 0x80) r.push(`${k}:${X(k)},${Y(k)} a${m[0x420 + k].toString(16)}`); console.log(`f${f} P${X(0)},${Y(0)} | ${r.join(' ')}`); }
  if (f === 200) e.shot('../ref/levels/dog_200.png');
}
