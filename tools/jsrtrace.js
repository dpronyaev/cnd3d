import { createEmu, B } from "./emu.js";
const e = createEmu("../ChipAndDale.nes");
const cpu=e.nes.cpu, mm=e.nes.mmap;
// track current $8000 bank
let bank8=0; const olb=mm.loadRomBank.bind(mm); mm.loadRomBank=(b,a)=>{ if(a===0x8000) bank8=b; return olb(b,a); };
const ol32=mm.load32kRomBank.bind(mm); mm.load32kRomBank=(b,a)=>{ bank8=b*2; return ol32(b,a); };
const oem=cpu.emulate.bind(cpu); const calls=[]; let watch=false;
cpu.emulate=()=>{ if(watch){ const pc=(cpu.REG_PC+1)&0xffff; const op=cpu.mem? cpu.load(pc):0; if(op===0x20){ const t=cpu.load(pc+1)|(cpu.load(pc+2)<<8); if(pc>=0xc000 && t<0xc000) calls.push([e.frame,pc,t,cpu.REG_ACC,cpu.REG_X,cpu.REG_Y,bank8]); } } return oem(); };
const W=(a,b)=>{ watch=true; };
e.step(3); watch=true; e.step(6); watch=false; // boot: title music start
e.step(191); watch=true; e.press(B.BUTTON_START,4); e.step(4); watch=false; e.step(52);
watch=true; e.press(B.BUTTON_START,4); e.step(8); watch=false;
for(let i=0;i<60;i++){ if(e.frame>=1685) watch=true; e.step(20); e.press(B.BUTTON_A,3); e.step(7); if(e.frame>1710) watch=false; }
// summarize
const agg={}; for(const c of calls){ const k=`${c[2].toString(16)}@bank${c[6]} from ${c[1].toString(16)}`; agg[k]=agg[k]||[]; if(agg[k].length<12) agg[k].push(`f${c[0]} A=${c[3].toString(16)} X=${c[4].toString(16)} Y=${c[5].toString(16)}`); }
for(const k in agg) console.log(k, agg[k].length, agg[k].join(' | '));
