// Draws the app icons (five rising steps in the scale-degree colours) into public/.
// No dependencies: a tiny rasteriser plus a PNG writer. Run with `node scripts/make-icons.mjs`.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// Same values as the dark theme tokens in src/styles.css.
const BG = [0.18, 0.02, 270];
const DEG = { l: 0.72, c: 0.12, hues: [160, 211, 262, 313, 4] };

function oklchToRgb([l, c, h]) {
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return lin.map((v) => {
    v = Math.max(0, Math.min(1, v));
    return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
  });
}
const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

/** Bars as fractions of the icon: x, y (top), width, height, radius. `pad` shrinks toward the centre. */
function bars(pad) {
  const inner = 1 - 2 * pad, w = 0.1 * inner, gap = 0.035 * inner;
  const total = 5 * w + 4 * gap, x0 = 0.5 - total / 2, base = 0.5 + 0.2 * inner;
  return DEG.hues.map((h, i) => {
    const height = (0.16 + i * 0.065) * inner;
    return { x: x0 + i * (w + gap), y: base - height, w, h: height, r: w * 0.28, color: oklchToRgb([DEG.l, DEG.c, h]) };
  });
}

function inRoundRect(px, py, { x, y, w, h, r }) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.max(x + r, Math.min(x + w - r, px)), cy = Math.max(y + r, Math.min(y + h - r, py));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function png(size, { pad, corner }) {
  const bg = oklchToRgb(BG), shapes = bars(pad), SS = 4;
  const bgShape = { x: 0, y: 0, w: 1, h: 1, r: corner };
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = (x + (sx + 0.5) / SS) / size, py = (y + (sy + 0.5) / SS) / size;
        if (!inRoundRect(px, py, bgShape)) continue;
        const hit = shapes.find((s) => inRoundRect(px, py, s));
        const col = hit ? hit.color : bg;
        r += col[0]; g += col[1]; b += col[2]; a += 255;
      }
      const n = SS * SS, o = y * (size * 4 + 1) + 1 + x * 4, cov = a / n / 255;
      raw[o] = cov ? r / n / cov : 0; raw[o + 1] = cov ? g / n / cov : 0; raw[o + 2] = cov ? b / n / cov : 0; raw[o + 3] = a / n;
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const v of buf) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function svg() {
  const s = 64, body = bars(0.06).map((b) =>
    `<rect x="${(b.x * s).toFixed(2)}" y="${(b.y * s).toFixed(2)}" width="${(b.w * s).toFixed(2)}" height="${(b.h * s).toFixed(2)}" rx="${(b.r * s).toFixed(2)}" fill="${hex(b.color)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" rx="14" fill="${hex(oklchToRgb(BG))}"/>${body}</svg>\n`;
}

const out = new URL("../public/", import.meta.url);
writeFileSync(new URL("favicon.svg", out), svg());
writeFileSync(new URL("pwa-192.png", out), png(192, { pad: 0.06, corner: 0.22 }));
writeFileSync(new URL("pwa-512.png", out), png(512, { pad: 0.06, corner: 0.22 }));
// Maskable: full-bleed background, artwork inside the 80% safe zone.
writeFileSync(new URL("pwa-maskable-512.png", out), png(512, { pad: 0.16, corner: 0 }));
// iOS rounds the corners itself.
writeFileSync(new URL("apple-touch-icon.png", out), png(180, { pad: 0.08, corner: 0 }));
console.log("Icons written to public/; background", hex(oklchToRgb(BG)));
