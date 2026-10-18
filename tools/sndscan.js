import { createEmu, B } from "./emu.js"; import fs from "fs";
// Verify $07E0..$07EF unused
{ const e=createEmu("../ChipAndDale.nes"); const cpu=e.nes.cpu; const ow=cpu.write.bind(cpu); let bad=0;
  cpu.write=(a,v)=>{ if(a>=0x7e0&&a<0x7f0) bad++; return ow(a,v); }; e.step(300); console.log("writes to 7e0-7ef:",bad); }
function playSound(id, frames){
  const e=createEmu("../ChipAndDale.nes"); e.step(120); // title
  const m=e.nes.cpu.mem;
  // trampoline at $07E0: LDA #$F0; JSR $8003; LDA #id; JSR $8003; JMP $8000
  const tr=[0xa9,0xf0,0x20,0x03,0x80,0xa9,id,0x20,0x03,0x80,0x4c,0x00,0x80]; for(let i=0;i<tr.length;i++) m[0x7e0+i]=tr[i];
  const saved=[m[0xc0f6],m[0xc0f7],m[0xc0f8]]; m[0xc0f6]=0x20; m[0xc0f7]=0xe0; m[0xc0f8]=0x07;
  e.clearLog(); e.step(1); m[0xc0f6]=saved[0]; m[0xc0f7]=saved[1]; m[0xc0f8]=saved[2];
  e.step(frames-1); return e.apuLog;
}
const out={};
for(let id=0;id<0x40;id++){
  const log=playSound(id,240);
  const frames=new Set(log.map(w=>w[0])); const last=log.length?log[log.length-1][0]:0;
  const regs=new Set(log.map(w=>w[1]&0xf));
  out[id]={writes:log.length,lastFrame:last,activeFrames:frames.size,regs:[...regs].sort().map(r=>r.toString(16)).join('')};
  console.log(id.toString(16).padStart(2,'0'), JSON.stringify(out[id]));
}
