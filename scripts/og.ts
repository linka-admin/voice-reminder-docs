// Share images (assets/og-<lang>.png, 1200x630): the top page's headline beside the home screen.
// Run: bun scripts/og.ts (PW_CHROMIUM points at another Chromium build when the bundled one isn't installed).
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const root = `${import.meta.dir}/..`;
const home = Bun.YAML.parse(readFileSync(`${root}/_data/home.yml`, "utf8")) as Record<
  string,
  { hero: { title: string; shot: string } }
>;
const i18n = Bun.YAML.parse(readFileSync(`${root}/_data/i18n.yml`, "utf8")) as Record<string, { title: string }>;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
for (const lang of ["ja", "en"]) {
  const shot = readFileSync(`${root}/assets/shots/${lang}/${home[lang].hero.shot}.jpg`).toString("base64");
  const font = lang === "ja" ? `"Hiragino Sans"` : `-apple-system, "SF Pro Display"`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; overflow: hidden; position: relative; font-family: ${font}, sans-serif; color: #fff;
      background: linear-gradient(160deg, #1a64dc, #3586f3 55%, #56a5ff); }
    body::before { content: ""; position: absolute; width: 700px; height: 700px; border-radius: 50%; background: rgba(255,255,255,.08); right: -200px; top: -300px; }
    .name { position: absolute; left: 80px; top: 70px; font-size: 34px; font-weight: 800; }
    h1 { position: absolute; left: 80px; top: 190px; font-size: ${lang === "ja" ? 84 : 88}px; line-height: 1.25; font-weight: 900; }
    h1 em { font-style: normal; color: #ffd166; }
    img { position: absolute; right: 110px; top: 70px; width: 340px; border-radius: 48px; border: 9px solid rgba(255,255,255,.55); box-shadow: 0 30px 70px rgba(0,30,90,.35); }
  </style><div class="name">${i18n[lang].title}</div><h1>${home[lang].hero.title}</h1><img src="data:image/jpeg;base64,${shot}">`);
  await page.screenshot({ path: `${root}/assets/og-${lang}.png` });
  await page.close();
}
await browser.close();
