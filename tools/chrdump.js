import fs from "fs"; import { PNG } from "pngjs";
const d = fs.readFileSync("../ChipAndDale.nes"); const prgSize = d[4]*16384; const chr = d.subarray(16+prgSize);
const banks = chr.length/8192; fs.mkdirSync("../ref/chr",{recursive:true});
const pal=[[0,0,0],[90,90,90],[170,170,170],[255,255,255]];
for(let b=0;b<banks;b++){ // 512 tiles per 8K bank, 32 per row -> 256x128 px, scale 2
  const png=new PNG({width:512,height:256});
  for(let t=0;t<512;t++){const off=b*8192+t*16; const tx=(t%32)*8, ty=Math.floor(t/32)*8;
    for(let y=0;y<8;y++){const lo=chr[off+y],hi=chr[off+y+8];for(let x=0;x<8;x++){const c=((lo>>(7-x))&1)|(((hi>>(7-x))&1)<<1);
      for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){const i=(((ty+y)*2+sy)*512+(tx+x)*2+sx)*4;png.data[i]=pal[c][0];png.data[i+1]=pal[c][1];png.data[i+2]=pal[c][2];png.data[i+3]=255;}}}}
  fs.writeFileSync(`../ref/chr/bank${String(b).padStart(2,'0')}.png`,PNG.sync.write(png));}
console.log("banks",banks);
