import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal pure PNG generator using node:zlib without external dependencies
function createPNG(width, height, drawFn) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc((width * bytesPerPixel + 1) * height);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: Adaptive
  ihdr[12] = 0; // Interlace: None

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }

  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcVal]);
}

// Drawing algorithm for SIVI WALLET icon with Sage Green gradient & Golden Gemini Sparkle
function drawSiviIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded squircle / canvas
  const bgRadius = 0.22;
  const inBgX = nx >= bgRadius && nx <= 1 - bgRadius;
  const inBgY = ny >= bgRadius && ny <= 1 - bgRadius;
  
  // Calculate corner distance
  let inCorner = true;
  if (!inBgX && !inBgY) {
    const cx = nx < bgRadius ? bgRadius : 1 - bgRadius;
    const cy = ny < bgRadius ? bgRadius : 1 - bgRadius;
    const dist = Math.hypot(nx - cx, ny - cy);
    if (dist > bgRadius) inCorner = false;
  }

  if (!inCorner) {
    return [0, 0, 0, 0]; // Transparent outside icon canvas
  }

  // Base canvas color: Warm Sage Green Gradient (#7D8F69 -> #5C6E49)
  const gradT = (nx + ny) / 2;
  let r = Math.round(125 * (1 - gradT) + 92 * gradT);
  let g = Math.round(143 * (1 - gradT) + 110 * gradT);
  let b = Math.round(105 * (1 - gradT) + 73 * gradT);
  let a = 255;

  // Draw Wallet Body (Center Rect with rounded corners)
  const wx1 = 0.20, wy1 = 0.32, wx2 = 0.80, wy2 = 0.74;
  const wr = 0.08;

  const inWalX = nx >= wx1 && nx <= wx2;
  const inWalY = ny >= wy1 && ny <= wy2;

  let insideWallet = false;
  if (inWalX && inWalY) {
    insideWallet = true;
    // Check rounded corners of wallet
    const nearLeft = nx < wx1 + wr;
    const nearRight = nx > wx2 - wr;
    const nearTop = ny < wy1 + wr;
    const nearBottom = ny > wy2 - wr;

    if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
      const cx = nearLeft ? wx1 + wr : wx2 - wr;
      const cy = nearTop ? wy1 + wr : wy2 - wr;
      if (Math.hypot(nx - cx, ny - cy) > wr) {
        insideWallet = false;
      }
    }
  }

  if (insideWallet) {
    // Wallet Body Color: Dark Warm Charcoal (#2D2926) with soft cream rim
    const edgeDist = Math.min(nx - wx1, wx2 - nx, ny - wy1, wy2 - ny);
    if (edgeDist < 0.015) {
      // Golden / Cream border highlight
      r = 241; g = 239; b = 231;
    } else {
      r = 45; g = 41; b = 38;
    }

    // Top Card Slot
    if (ny >= 0.40 && ny <= 0.45 && nx >= 0.28 && nx <= 0.72) {
      r = 217; g = 139; b = 114; // Terracotta Accent Line
    }

    // Wallet Clasp Badge (Right circle)
    const claspCx = 0.68, claspCy = 0.53, claspR = 0.085;
    const distClasp = Math.hypot(nx - claspCx, ny - claspCy);
    if (distClasp <= claspR) {
      if (distClasp <= claspR * 0.4) {
        r = 245; g = 158; b = 11; // Amber center
      } else {
        r = 255; g = 255; b = 255; // White outer ring
      }
    }
  }

  // Draw 4-Pointed Gemini AI Sparkle (✦) on top-right / center-left
  // Sparkle Center 1 (Big Sparkle: cx=0.42, cy=0.53)
  const spCx = 0.42, spCy = 0.53;
  const dx = Math.abs(nx - spCx);
  const dy = Math.abs(ny - spCy);
  const sparkRadius = 0.15;

  // Star formula: (dx/R)^0.5 + (dy/R)^0.5 <= 1
  if (dx < sparkRadius && dy < sparkRadius) {
    const starVal = Math.pow(dx / sparkRadius, 0.5) + Math.pow(dy / sparkRadius, 0.5);
    if (starVal <= 1.0) {
      // Glowing Amber to Gold Gradient (#FBBF24 to #F59E0B)
      const starT = 1.0 - starVal;
      r = Math.round(251 * starT + 255 * (1 - starT));
      g = Math.round(191 * starT + 230 * (1 - starT));
      b = Math.round(36 * starT + 120 * (1 - starT));
    }
  }

  // Mini Accent Sparkle (Top-right corner of canvas: cx=0.76, cy=0.25)
  const miniCx = 0.76, miniCy = 0.25;
  const mdx = Math.abs(nx - miniCx);
  const mdy = Math.abs(ny - miniCy);
  const miniR = 0.09;
  if (mdx < miniR && mdy < miniR) {
    const miniStar = Math.pow(mdx / miniR, 0.5) + Math.pow(mdy / miniR, 0.5);
    if (miniStar <= 1.0) {
      r = 255; g = 220; b = 100;
    }
  }

  return [r, g, b, a];
}

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 PNG
const png192 = createPNG(192, 192, drawSiviIcon);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
console.log('✓ Generated public/icon-192.png');

// Generate 512x512 PNG
const png512 = createPNG(512, 512, drawSiviIcon);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log('✓ Generated public/icon-512.png');
