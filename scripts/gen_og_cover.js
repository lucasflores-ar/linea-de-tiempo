#!/usr/bin/env node
/** Genera og-cover.png 1200×630 para tarjetas sociales. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200, H = 630;
const BG = [245, 242, 232];
const INK = [44, 40, 36];
const ACC = [53, 96, 111];
const GOLD = [122, 100, 32];
const MUTED = [99, 94, 80];
const LANES = [
  [122, 100, 32],
  [158, 74, 74],
  [107, 91, 138],
  [61, 107, 122],
  [21, 117, 140],
  [74, 122, 85],
];

const G = {};
function def(ch, rows){ G[ch] = rows; }
def('A',['01110','10001','10001','11111','10001','10001','10001']);
def('B',['11110','10001','10001','11110','10001','10001','11110']);
def('C',['01110','10001','10000','10000','10000','10001','01110']);
def('D',['11110','10001','10001','10001','10001','10001','11110']);
def('E',['11111','10000','10000','11110','10000','10000','11111']);
def('F',['11111','10000','10000','11110','10000','10000','10000']);
def('G',['01110','10001','10000','10111','10001','10001','01110']);
def('H',['10001','10001','10001','11111','10001','10001','10001']);
def('I',['11111','00100','00100','00100','00100','00100','11111']);
def('J',['00111','00010','00010','00010','00010','10010','01100']);
def('K',['10001','10010','10100','11000','10100','10010','10001']);
def('L',['10000','10000','10000','10000','10000','10000','11111']);
def('M',['10001','11011','10101','10101','10001','10001','10001']);
def('N',['10001','11001','10101','10011','10001','10001','10001']);
def('O',['01110','10001','10001','10001','10001','10001','01110']);
def('P',['11110','10001','10001','11110','10000','10000','10000']);
def('Q',['01110','10001','10001','10001','10101','10010','01101']);
def('R',['11110','10001','10001','11110','10100','10010','10001']);
def('S',['01111','10000','10000','01110','00001','00001','11110']);
def('T',['11111','00100','00100','00100','00100','00100','00100']);
def('U',['10001','10001','10001','10001','10001','10001','01110']);
def('V',['10001','10001','10001','10001','10001','01010','00100']);
def('W',['10001','10001','10001','10101','10101','10101','01010']);
def('X',['10001','10001','01010','00100','01010','10001','10001']);
def('Y',['10001','10001','01010','00100','00100','00100','00100']);
def('Z',['11111','00001','00010','00100','01000','10000','11111']);
def('Á',['00100','00000','01110','10001','11111','10001','10001']);
def('Í',['00100','00000','11111','00100','00100','00100','11111']);
def('Ó',['00100','00000','01110','10001','10001','10001','01110']);
def(' ',['00000','00000','00000','00000','00000','00000','00000']);
def(',',['00000','00000','00000','00000','00000','00100','01000']);
def('.',['00000','00000','00000','00000','00000','01100','01100']);
def('Y',['10001','10001','01010','00100','00100','00100','00100']);

const buf = Buffer.alloc(W * H * 3);
function setPx(x, y, rgb){
  if(x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = rgb[0]; buf[i+1] = rgb[1]; buf[i+2] = rgb[2];
}
function fill(x, y, w, h, rgb){
  for(let yy = y; yy < y + h; yy++){
    for(let xx = x; xx < x + w; xx++) setPx(xx, yy, rgb);
  }
}
function drawChar(ch, x, y, scale, rgb){
  const rows = G[ch] || G[ch.toUpperCase()] || G[' '];
  for(let r = 0; r < 7; r++){
    for(let c = 0; c < 5; c++){
      if(rows[r][c] === '1'){
        fill(x + c * scale, y + r * scale, scale, scale, rgb);
      }
    }
  }
}
function drawText(text, x, y, scale, rgb){
  let cx = x;
  for(const ch of text){
    drawChar(ch, cx, y, scale, rgb);
    cx += 6 * scale;
  }
  return cx;
}

fill(0, 0, W, H, BG);
fill(0, 0, W, 18, ACC);
fill(0, H - 18, W, 18, ACC);
fill(48, 70, 8, H - 140, ACC);

// timeline bars
LANES.forEach((c, i)=>{
  const yy = 210 + i * 42;
  fill(120, yy, 180 + i * 110, 14, c);
  fill(120 + 180 + i * 110, yy + 4, 8, 6, c);
});

drawText('CRONOLOGIA BIBLICA', 120, 88, 6, INK);
drawText('SUCESOS, PERSONAJES Y PREGUNTAS', 120, 148, 3, MUTED);
drawText('EN UN MISMO EJE CRONOLOGICO', 120, 178, 3, GOLD);

function crc32(data){
  let c = ~0;
  for(let i = 0; i < data.length; i++){
    c ^= data[i];
    for(let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data){
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, crc]);
}

const raw = Buffer.alloc((W * 3 + 1) * H);
for(let y = 0; y < H; y++){
  raw[y * (W * 3 + 1)] = 0;
  buf.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, '..', 'og-cover.png');
fs.writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
