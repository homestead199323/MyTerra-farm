/* Renders every crop, tree, animal and area icon from the 3D map's models into src/assets/toy/.
   Needs the dev server running (npx vite --port 5179) and Playwright. Run after changing the map style:
     node scripts/render-icons.mjs [http://127.0.0.1:5179] [filter]
   CHROME_PATH=/path/to/chrome uses an installed browser instead of Playwright's own.
   MARKER: RENDER_ICONS_V1 */
import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const pw = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.argv[2] || "http://127.0.0.1:5179", only = process.argv[3] || "";
const out = new URL("../src/assets/toy/", import.meta.url);
const OUT = 192, PAD = .03; // picture size; breathing room around the plant, as a share of the frame
await mkdir(out, { recursive: true });
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
// rendered at twice the list size, then trimmed: the plant fills its picture instead of sitting small in an empty frame
await page.goto(`${base}/tests/icons-render.html?size=${OUT * 2}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__icons, null, { timeout: 60000 });
const jobs = (await page.evaluate(() => window.__icons.jobs)).filter((j) => !only || `${j.kind}-${j.slug}`.includes(only));
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
/** Where the drawing sits inside its transparent frame. */
async function inkBox(png) {
  const { info } = await sharp(png).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
  const left = -(info.trimOffsetLeft || 0), top = -(info.trimOffsetTop || 0);
  return { left, top, right: left + info.width, bottom: top + info.height };
}
/** A square around `box` (same square for every stage of one crop, so the stages still show growth), standing on its bottom edge. */
async function squareCrop(png, box) {
  const meta = await sharp(png).metadata(), pad = Math.round(meta.width * PAD);
  const side = Math.max(box.right - box.left, box.bottom - box.top) + pad * 2;
  const x = Math.round((box.left + box.right) / 2 - side / 2), y = box.bottom + pad - side;
  const m = side; // margin wide enough for the square to hang over any edge
  const wide = await sharp(png).extend({ top: m, bottom: m, left: m, right: m, background: clear }).png().toBuffer();
  return sharp(wide).extract({ left: x + m, top: y + m, width: side, height: side }).resize(OUT, OUT);
}
let n = 0, bytes = 0;
for (const job of jobs) {
  const files = (await page.evaluate((j) => window.__icons.render(j), job)).map((f) => ({ file: f.file, png: Buffer.from(f.url.split(",")[1], "base64") }));
  const fitted = files.length && /^(animal|zone)-/.test(files[0].file);
  let union = null;
  if (!fitted) for (const f of files) { const b = await inkBox(f.png); union = union ? { left: Math.min(union.left, b.left), top: Math.min(union.top, b.top), right: Math.max(union.right, b.right), bottom: Math.max(union.bottom, b.bottom) } : b; }
  for (const f of files) {
    const img = fitted ? sharp(await sharp(f.png).trim({ threshold: 0 }).toBuffer()).extend({ top: 12, bottom: 12, left: 12, right: 12, background: clear }).resize(OUT, OUT, { fit: "contain", position: "bottom", background: clear }) : await squareCrop(f.png, union);
    const webp = await img.webp({ quality: 78, alphaQuality: 85, effort: 6 }).toBuffer();
    await writeFile(new URL(f.file, out), webp); n++; bytes += webp.length;
  }
}
await browser.close();
console.log(`${n} icons, ${(bytes / 1024).toFixed(0)} KB`);
