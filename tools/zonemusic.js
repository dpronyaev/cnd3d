import { createEmu, B } from "./emu.js";
function trace(zone){
  const e = createEmu("../ChipAndDale.nes"); const cpu=e.nes.cpu;
  const oem=cpu.emulate.bind(cpu); const calls=[];
  cpu.emulate=()=>{ const pc=(cpu.REG_PC+1)&0xffff; if(pc===0xc0f0){ const a=cpu.REG_ACC; if(a<0x0e||a===0x23||a>=0x80) calls.push(`f${e.frame}:${a.toString(16)}`);} return oem(); };
  e.step(200); e.press(B.BUTTON_START,4); e.step(60); e.press(B.BUTTON_START,4);
  for(let i=0;i<40;i++){ if(zone!==null) e.poke(0x31,zone); e.step(20); e.press(B.BUTTON_A,3); e.step(7);}
  if(zone!==null) e.poke(0x31,zone); e.step(600);
  return calls.join(' ');
}
console.log("default:", trace(null));
for(let z=0;z<=10;z++) console.log("zone",z,":",trace(z));
