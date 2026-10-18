import { createEmu, B } from "./emu.js";
const zone=+process.argv[2];
const e = createEmu("../ChipAndDale.nes");
e.step(200); e.press(B.BUTTON_START,4); e.step(60); e.press(B.BUTTON_START,4);
for(let i=0;i<40;i++){ e.poke(0x31,zone); e.step(20); e.press(B.BUTTON_A,3); e.step(7);}
e.poke(0x31,zone); e.step(240);
let k=0;
for(let i=0;i<600;i++){ e.hold(B.BUTTON_RIGHT); e.step(3); if(i%12==0) e.press(B.BUTTON_A,8); if(i%75==0){e.shot(`../ref/shots/z${zone}_${String(k++).padStart(2,'0')}.png`);} }
console.log("zone",zone,"done");
