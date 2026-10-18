// Original crate throw, measured: stand on the crate stack in zone 0, press B (pickup works on block types E/F under the feet),
// then throw (B) left/right/up/crouched and log the thrown object (slots 2-5: X $04F0/$0500, Y $0510).
import { createEmu, B } from "./emu.js";
const dir = process.argv[2] || 'left';
const e = createEmu("../ChipAndDale.nes"); const cpu = e.nes.cpu;
let songStarted = false; const oem = cpu.emulate.bind(cpu);
cpu.emulate = () => { if (((cpu.REG_PC + 1) & 0xffff) === 0xc0f0 && cpu.REG_ACC === 0) songStarted = true; return oem(); };
e.step(200); e.press(B.BUTTON_START, 4); e.step(60); e.press(B.BUTTON_START, 4);
for (let i = 0; i < 200 && !songStarted; i++) { e.step(16); e.press(B.BUTTON_A, 3); e.step(6); }
e.step(150);
const X = (i) => e.ram(0x4f0 + i) + 256 * e.ram(0x500 + i), Y = (i) => e.ram(0x510 + i);
e.hold(B.BUTTON_RIGHT); e.step(112); e.press(B.BUTTON_B, 2); e.step(6); e.release(B.BUTTON_RIGHT); e.step(16);
console.log('pushing', X(0), Y(0));
console.log('carry', e.ram(0x56).toString(16), 'slots', [2, 3, 4, 5].map(i => `${i}:${X(i)},${Y(i)} st${e.ram(0x4d0 + i).toString(16)}`).join(' '));
e.shot(`../ref/levels/throw3_pick.png`);
if (dir === 'left') { e.press(B.BUTTON_LEFT, 2); e.step(2); }
if (dir === 'back') { e.hold(B.BUTTON_LEFT); e.step(60); e.release(B.BUTTON_LEFT); e.press(B.BUTTON_RIGHT, 2); e.step(4); console.log('moved to', X(0), 'scroll?', e.ram(0xfc), e.ram(0xfd), e.ram(0xfe), e.ram(0xff)); }
if (dir === 'up') e.hold(B.BUTTON_UP);
if (dir === 'down') e.hold(B.BUTTON_DOWN);
if (dir === 'airdown') { e.hold(B.BUTTON_A); e.step(10); e.hold(B.BUTTON_DOWN); }
if (dir === 'air') { e.hold(B.BUTTON_A); e.step(10); }
const slot = e.ram(0x56) & 0x0f;
e.press(B.BUTTON_B, 2);
e.step(8); e.release(B.BUTTON_UP); e.release(B.BUTTON_DOWN); e.release(B.BUTTON_A);
let px = X(slot), py = Y(slot);
const rows = [];
for (let f = 0; f < 110; f++) {
  e.step(1);
  const x = X(slot), y = Y(slot);
  rows.push(`f${f} x${x} y${y} dx${x - px} dy${y - py} st${e.ram(0x4d0 + slot).toString(16)} P${X(0)},${Y(0)}`);
  px = x; py = y;
  if (f === 10 || f === 30 || f === 50) e.shot(`../ref/levels/throw3_${dir}_f${f}.png`);
}
console.log('slot', slot); console.log(rows.join('\n'));
