// The built site (jekyll build) in a browser: phone and desktop widths without sideways scrolling,
// the App Store call to action, the voice samples, and pages opened from the app (?app=1) without the site header.
// Uses Playwright's Chromium; PW_CHROMIUM points at another Chromium build when the bundled one isn't installed.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { type Browser, chromium } from "playwright";

const root = `${import.meta.dir}/..`;
const site = `${root}/_site`;
let browser: Browser;
let server: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  const build = Bun.spawnSync(["jekyll", "build", "-q", "-d", site], { cwd: root, stderr: "pipe" });
  if (build.exitCode !== 0) throw new Error(build.stderr.toString());
  server = Bun.serve({
    port: 0,
    fetch(req) {
      let path = decodeURIComponent(new URL(req.url).pathname);
      if (path.endsWith("/")) path += "index.html";
      const file = `${site}${path}`;
      return existsSync(file) ? new Response(Bun.file(file)) : new Response("not found", { status: 404 });
    },
  });
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
}, 60_000);

afterAll(async () => {
  await browser?.close();
  server?.stop(true);
});

const url = (path: string) => `http://localhost:${server.port}${path}`;

async function open(path: string, width = 375) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const failed: string[] = [];
  page.on("response", (r) => r.status() >= 400 && failed.push(r.url()));
  await page.goto(url(path), { waitUntil: "networkidle" });
  return { page, errors, failed };
}

const pages = ["/", "/en/", "/support/", "/en/support/", "/privacy/", "/en/privacy/"];

describe("every page", () => {
  for (const path of pages)
    for (const width of [375, 1280])
      test(`${path} at ${width}px: no sideways scrolling, no errors, nothing missing`, async () => {
        const { page, errors, failed } = await open(path, width);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
        expect(failed).toEqual([]);
        await page.close();
      });

  test("opened from the app, the site header and footer are hidden", async () => {
    const { page } = await open("/support/?app=1");
    expect(await page.locator("body > header").isVisible()).toBe(false);
    expect(await page.locator("body > footer").isVisible()).toBe(false);
    await page.close();
  });
});

describe("top page", () => {
  for (const [path, lang] of [
    ["/", "ja"],
    ["/en/", "en"],
  ] as const)
    test(`${lang}: a call to action at the top and the bottom, four voices, the credits`, async () => {
      const { page } = await open(path);
      expect(await page.getAttribute("html", "lang")).toBe(lang);
      expect(await page.locator("[data-cta]").count()).toBe(2);
      await expect(page.locator("[data-cta]").first().isVisible()).resolves.toBe(true);
      expect(await page.locator("[data-sample]").count()).toBe(4);
      expect(await page.locator("[data-credits] li").count()).toBe(41);
      await page.close();
    });

  test("a sample's button plays its clip and says so", async () => {
    const { page } = await open("/");
    const button = page.locator("[data-sample] button").first();
    expect(await button.getAttribute("aria-pressed")).toBe("false");
    // Headless Chromium has no AAC decoder, so stub play() and check what the page asks for.
    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = function () {
        (window as unknown as { played: string }).played = this.currentSrc || this.src;
        this.dispatchEvent(new Event("playing"));
        return Promise.resolve();
      };
    });
    await button.click();
    expect(await page.evaluate(() => (window as unknown as { played: string }).played)).toContain(
      "/assets/voices/zundamon.m4a",
    );
    expect(await button.getAttribute("aria-pressed")).toBe("true");
    await page.close();
  });

  test("every clip is served as audio", async () => {
    for (const id of ["zundamon", "metan", "tsumugi", "nemo-f6"]) {
      const res = await fetch(url(`/assets/voices/${id}.m4a`));
      expect(res.status).toBe(200);
    }
  });
});
