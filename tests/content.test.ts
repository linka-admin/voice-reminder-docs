// The top page's text (_data/home.yml) and voice credits (_data/voices.yml): both languages say the same things,
// every clip and screenshot they name exists, and nothing quotes a price (prices differ by country and change).
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const root = `${import.meta.dir}/..`;
const yaml = (path: string) => Bun.YAML.parse(readFileSync(`${root}/${path}`, "utf8")) as Record<string, unknown>;
const home = yaml("_data/home.yml") as Record<"ja" | "en", Home>;
const voices = yaml("_data/voices.yml") as { nemo: string[]; characters: string[] };
const config = yaml("_config.yml");

type Home = {
  hero: { title: string; lead: string; listen: string; shot: string };
  samples: { title: string; more: string; items: { id: string; name: string; line: string }[] };
  features: { title: string; items: { title: string; detail: string; shot: string }[] };
  plans: { title: string; items: { name: string; points: string[] }[]; note: string };
  faq: { title: string; items: { q: string; a: string }[]; more: string };
  closing: { title: string };
  credits: { title: string; intro: string };
};

/// The structure of a value with the text left out: keys, list lengths and the ids that must match.
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, ["id", "shot", "focus"].includes(k) ? v : shape(v)]),
    );
  return typeof value;
}

describe("top page text", () => {
  test("Japanese and English have the same sections, items and clips", () => {
    expect(shape(home.en)).toEqual(shape(home.ja));
  });

  test("four voices to hear, six features, two plans, three questions", () => {
    expect(home.ja.samples.items.map((s) => s.id)).toEqual(["zundamon", "metan", "tsumugi", "nemo-f6"]);
    expect(home.ja.features.items).toHaveLength(6);
    expect(home.ja.plans.items).toHaveLength(2);
    expect(home.ja.faq.items).toHaveLength(3);
  });

  test("every clip and screenshot exists", () => {
    for (const s of home.ja.samples.items) expect(existsSync(`${root}/assets/voices/${s.id}.m4a`)).toBe(true);
    for (const lang of ["ja", "en"] as const) {
      const shots = [home[lang].hero.shot, ...home[lang].features.items.map((f) => f.shot)];
      for (const shot of shots) expect(existsSync(`${root}/assets/shots/${lang}/${shot}.jpg`)).toBe(true);
    }
  });

  test("no prices", () => {
    const text = readFileSync(`${root}/_data/home.yml`, "utf8");
    expect(text).not.toMatch(/[¥$€£]\s?\d|\d\s?円|\bUSD\b|\bJPY\b/);
  });

  test("the free plan's limits are the app's", () => {
    expect(home.ja.plans.items[0].points.join()).toContain("5件");
    expect(home.en.plans.items[0].points.join()).toContain("5 reminders");
  });
});

describe("voice credits", () => {
  test("VOICEVOX Nemo's nine voices and 32 characters, credited as their terms ask", () => {
    expect(voices.nemo).toHaveLength(9);
    expect(voices.characters).toHaveLength(32);
    for (const name of voices.characters) expect(name).toMatch(/^VOICEVOX[: ]/);
    expect(new Set(voices.characters).size).toBe(32);
  });
});

describe("share images", () => {
  test("one per language (made by scripts/og.ts)", () => {
    for (const lang of ["ja", "en"]) expect(existsSync(`${root}/assets/og-${lang}.png`)).toBe(true);
  });
});

describe("App Store link", () => {
  test("the app's id, and a switch for before release", () => {
    expect(config.app_store_id).toBe(6818977423);
    expect(typeof config.released).toBe("boolean");
  });
});
