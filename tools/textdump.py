import sys
d=open(sys.argv[1],'rb').read()[16:]; prg=d[:0x20000]
m={}
for i,c in enumerate("0123456789АБВГДЕЖЗИЙКЛМНОПРСТУ"): m[0x80+i]=c
m[0x9e]='Ъ'; m[0x9f]='Х'
for i,c in enumerate("ЫЧШЯ .-=?!(·)Ь/:"): m[0xa0+i]=c
for i,c in enumerate('"ФЦЁЭЩ'): m[0xc0+i]=c
m.update({0xaf:',',0xfe:'\n',0xff:'\n[PAGE]\n'})
def dec(b):
    out=[]
    for x in b:
        out.append(m[x] if x in m else '[%02x]'%x)
    return ''.join(out)
start=int(sys.argv[2],16); end=int(sys.argv[3],16)
open(sys.argv[4],'w',encoding='utf-8').write(dec(prg[start:end]))
