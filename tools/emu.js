// Headless NES runner built on jsnes: screenshots + APU register logging + RAM access.
import { NES, Controller } from "jsnes";
import fs from "fs";
import { PNG } from "pngjs";
import path from "path";
import { fileURLToPath } from "url";
export const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const R = (p) => path.resolve(TOOLS, p);

export function createEmu(romPath) {
  const romData = fs.readFileSync(R(romPath), "binary");
  const nes = new NES({ onFrame: (fb) => { lastFrame = fb; }, emulateSound: true });
  let lastFrame = null;
  const apuLog = []; // [frame, addr, value]
  let frameNo = 0;
  const origWrite = nes.papu.writeReg.bind(nes.papu);
  const hook = () => {
    const w = nes.papu.writeReg.bind(nes.papu);
    nes.papu.writeReg = (a, v) => { if (a >= 0x4000 && a <= 0x4015) apuLog.push([frameNo, a, v]); return w(a, v); };
  };
  nes.loadROM(romData);
  hook();
  const api = {
    nes, apuLog,
    get frame() { return frameNo; },
    step(n = 1) { for (let i = 0; i < n; i++) { nes.frame(); frameNo++; } },
    press(btn, frames = 2, pad = 1) { nes.buttonDown(pad, btn); api.step(frames); nes.buttonUp(pad, btn); },
    hold(btn, pad = 1) { nes.buttonDown(pad, btn); },
    release(btn, pad = 1) { nes.buttonUp(pad, btn); },
    ram(addr) { return nes.cpu.mem[addr]; },
    poke(addr, v) { nes.cpu.mem[addr] = v; },
    ramSnapshot() { return Uint8Array.from(nes.cpu.mem.subarray(0, 0x800)); },
    shot(p) {
      if (!lastFrame) return;
      const png = new PNG({ width: 256, height: 240 });
      for (let i = 0; i < 256 * 240; i++) {
        const c = lastFrame[i];
        png.data[i * 4] = c & 0xff; png.data[i * 4 + 1] = (c >> 8) & 0xff; png.data[i * 4 + 2] = (c >> 16) & 0xff; png.data[i * 4 + 3] = 255;
      }
      fs.writeFileSync(R(p), PNG.sync.write(png));
    },
    clearLog() { apuLog.length = 0; },
  };
  return api;
}
export const B = Controller;
