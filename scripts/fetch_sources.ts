import { mkdir, readFile, writeFile } from "node:fs/promises";

type Source = {
  name: string;
  url: string;
  type: "rss";
};

type Config = {
  timezone: string;
  sources: Source[];
};

type CandidateItem = {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  summary: string;
};

const configPath = new URL(process.env.SOURCES_CONFIG ?? "../config/sources.yml", import.meta.url);
const outputPath = new URL(process.env.CANDIDATES_OUTPUT ?? "../briefs/candidates.json", import.meta.url);

function parseSimpleYaml(input: string): Config {
  const timezone = input.match(/^timezone:\s*(.+)$/m)?.[1]?.trim() ?? "Asia/Singapore";
  const sources: Source[] = [];
  const blocks = input.split(/\n\s*-\s+name:\s+/).slice(1);

  for (const block of blocks) {
    const name = block.split("\n")[0].trim();
    const url = block.match(/\n\s*url:\s*(.+)/)?.[1]?.trim();
    const type = block.match(/\n\s*type:\s*(.+)/)?.[1]?.trim() as Source["type"] | undefined;

    if (name && url && type === "rss") {
      sources.push({ name, url, type });
    }
  }

  return { timezone, sources };
}

function xmlText(item: string, tag: string): string {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return cleanText(match?.[1] ?? "");
}

function xmlLink(item: string): string {
  const href = item.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return decodeXml(href ?? xmlText(item, "link"));
}

function cleanText(value: string): string {
  return decodeXml(value)
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function dateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function yesterdayKey(timezone: string): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return dateKey(yesterday, timezone);
}

async function fetchRss(source: Source, timezone: string, targetDate: string): Promise<CandidateItem[]> {
  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.name}: ${response.status}`);
  }

  const xml = await response.text();
  const items = [
    ...(xml.match(/<item[\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? []),
  ];

  return items
    .map((item) => {
      const publishedRaw =
        xmlText(item, "pubDate") || xmlText(item, "dc:date") || xmlText(item, "published") || xmlText(item, "updated");
      const published = new Date(publishedRaw);
      return {
        source: source.name,
        title: xmlText(item, "title"),
        url: xmlLink(item),
        publishedAt: Number.isNaN(published.getTime()) ? "" : published.toISOString(),
        summary: xmlText(item, "description") || xmlText(item, "summary") || xmlText(item, "content"),
      };
    })
    .filter((item) => item.title && item.url && item.publishedAt)
    .filter((item) => dateKey(new Date(item.publishedAt), timezone) === targetDate);
}

const config = parseSimpleYaml(await readFile(configPath, "utf8"));
const targetDate = yesterdayKey(config.timezone);
const results = await Promise.allSettled(
  config.sources.map((source) => fetchRss(source, config.timezone, targetDate)),
);

const rankedCandidates = results
  .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
  .sort((a, b) => relevanceScore(b) - relevanceScore(a));
const candidates = capPerSource(rankedCandidates, 2).slice(0, 20);

function relevanceScore(item: CandidateItem): number {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const terms = [
    "launch",
    "release",
    "agent",
    "api",
    "tool",
    "workflow",
    "enterprise",
    "pricing",
    "model",
    "copilot",
    "gemini",
    "claude",
    "openai",
    ...(process.env.RELEVANCE_TERMS?.split(",").map((term) => term.trim().toLowerCase()).filter(Boolean) ?? []),
  ];

  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function capPerSource(items: CandidateItem[], maxPerSource: number): CandidateItem[] {
  const counts = new Map<string, number>();

  return items.filter((item) => {
    const count = counts.get(item.source) ?? 0;
    if (count >= maxPerSource) {
      return false;
    }

    counts.set(item.source, count + 1);
    return true;
  });
}

await mkdir(new URL("../briefs/", import.meta.url), { recursive: true });
await writeFile(outputPath, JSON.stringify({ targetDate, candidates }, null, 2));
console.log(`Wrote ${candidates.length} candidates for ${targetDate}`);
