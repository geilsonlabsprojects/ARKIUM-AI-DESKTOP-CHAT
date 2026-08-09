/**
 * Generates minimal valid PNG icons for Tauri bundling.
 * Creates solid-color arkium-branded icons without external deps.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";

import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "..", "src-tauri", "icons");

// ─── Minimal PNG writer ───────────────────────────────────────────────────────
function crc32(buf, crc = 0xffffffff) {
  const T = crc32.T || (crc32.T = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c; }
    return t;
  })());
  for (let i = 0; i < buf.length; i++) crc = T[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePng(size, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Raw pixel rows: each row = filter byte (0) + RGB pixels
  const rowLen = size * 3;
  const raw = Buffer.alloc(size * (1 + rowLen));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + rowLen)] = 0; // filter none
    for (let x = 0; x < size; x++) {
      // Draw a simple 'A' shape in white on arkium purple background
      const cx = Math.abs(x - size / 2) / (size / 2);
      const cy = Math.abs(y - size / 2) / (size / 2);
      const inCircle = cx * cx + cy * cy < 0.7;
      const off = y * (1 + rowLen) + 1 + x * 3;
      if (inCircle) { raw[off] = 255; raw[off+1] = 255; raw[off+2] = 255; }
      else { raw[off] = r; raw[off+1] = g; raw[off+2] = b; }
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Arkium brand color: #3d3ef7 = rgb(61, 62, 247)
const R = 61, G = 62, B = 247;

const icons = [
  { name: "32x32.png",      size: 32  },
  { name: "128x128.png",    size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png",       size: 512 },
];

for (const { name, size } of icons) {
  const png = makePng(size, R, G, B);
  fs.writeFileSync(path.join(ICONS_DIR, name), png);
  console.log(`  Created ${name} (${size}x${size})`);
}

// .ico = embed the 32x32 PNG (ICO with PNG compression, Windows Vista+)
function makeIco(pngBuf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ico
  header.writeUInt16LE(1, 4); // count: 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = 32; dirEntry[1] = 32; // width, height (0 = 256)
  dirEntry[2] = 0;  dirEntry[3] = 0;  // color count, reserved
  dirEntry.writeUInt16LE(1, 4);  // color planes
  dirEntry.writeUInt16LE(32, 6); // bits per pixel
  dirEntry.writeUInt32LE(pngBuf.length, 8);
  dirEntry.writeUInt32LE(6 + 16, 12); // offset to image data

  return Buffer.concat([header, dirEntry, pngBuf]);
}

const ico32 = makePng(32, R, G, B);
fs.writeFileSync(path.join(ICONS_DIR, "icon.ico"), makeIco(ico32));
console.log("  Created icon.ico");

// .icns = minimal Apple Icon Image (just embed the 512px PNG)
function makeIcns(pngBuf) {
  // ic09 = 512x512 PNG
  const typeCode = Buffer.from("ic09");
  const size = 8 + pngBuf.length;
  const sizeBuf = Buffer.alloc(4); sizeBuf.writeUInt32BE(size);
  const header = Buffer.alloc(8);
  Buffer.from("icns").copy(header, 0);
  header.writeUInt32BE(8 + size, 4);
  return Buffer.concat([header, typeCode, sizeBuf, pngBuf]);
}

const png512 = makePng(512, R, G, B);
fs.writeFileSync(path.join(ICONS_DIR, "icon.icns"), makeIcns(png512));
console.log("  Created icon.icns");

console.log("\nAll icons generated successfully.");
