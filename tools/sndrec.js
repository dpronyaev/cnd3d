import { createEmu, B, TOOLS } from "./emu.js"; import fs from "fs"; import path from "path";
function playSound(id, frames){
  const e=createEmu("../ChipAndDale.nes"); const cpu=e.nes.cpu;
  // block the game's own sound requests (JSR $8003 at $C0F0) so only ours play
  const oem=cpu.emulate.bind(cpu); let block=false;
  cpu.emulate=()=>{ if(block && ((cpu.REG_PC+1)&0xffff)===0xc0f0){ cpu.REG_PC=(cpu.REG_PC+3)&0xffff; return 6; } return oem(); };
  e.step(120); block=true;
  const m=cpu.mem;
  const tr=[0xa9,0xf0,0x20,0x03,0x80,0xa9,id,0x20,0x03,0x80,0x4c,0x00,0x80]; for(let i=0;i<tr.length;i++) m[0x7e0+i]=tr[i];
  const saved=[m[0xc0f6],m[0xc0f7],m[0xc0f8]]; m[0xc0f6]=0x20; m[0xc0f7]=0xe0; m[0xc0f8]=0x07;
  e.clearLog(); const f0=e.frame; e.step(1); m[0xc0f6]=saved[0]; m[0xc0f7]=saved[1]; m[0xc0f8]=saved[2];
  e.step(frames-1); return e.apuLog.map(([f,a,v])=>[f-f0,a-0x4000,v]);
}
const songs=new Set([...Array(14).keys(),0x23]);
for(let id=0;id<0x2a;id++){
  if(id===0x0e||id===0x0f) continue;
  const frames= songs.has(id)? 13000 : 400;
  const log=playSound(id,frames);
  fs.writeFileSync(path.join(TOOLS,`../ref/sound/raw_${id.toString(16).padStart(2,'0')}.json`), JSON.stringify(log));
  console.log(id.toString(16), log.length, log.length?log[log.length-1][0]:0);
}
