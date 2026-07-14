import Parser from "rss-parser";

const USER_AGENT = "OverclockPharmaWatch/0.1 (+local research tool)";

export interface FeedItem {
  title: string;
  link: string;
  excerpt: string;
  publishedAt: string | null;
}

const parser = new Parser({
  headers: { "User-Agent": USER_AGENT },
  timeout: 15_000,
});

/**
 * Some outlets (e.g. FiercePharma/FierceBiotech) wrap <title> in a nested <a> tag,
 * which rss-parser/xml2js turns into `{ a: [{ _: "text", $: {...} }] }` instead of
 * a plain string. Unwrap that shape here rather than dropping the item.
 */
function extractText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj._ === "string") return obj._.trim() || null;
    if (Array.isArray(obj.a) && obj.a.length > 0) return extractText(obj.a[0]);
  }
  return null;
}

/**
 * Some outlets (e.g. FiercePharma/FierceBiotech) publish pubDate strings like
 * "Jul 9, 2026 10:47am" that Date can't parse (isoDate ends up unset too, since
 * rss-parser derives it the same way). Only pass through dates we can actually
 * parse - downstream code falls back to fetched/created time when this is null.
 */
function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function fetchRssFeed(url: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(url);
  return (feed.items ?? [])
    .map((item) => ({
      title: extractText(item.title),
      // Some outlets (e.g. ANVISA) omit <link> and rely on <guid> as the
      // permalink instead, which is valid per the RSS spec.
      link: typeof item.link === "string" ? item.link.trim() : extractText(item.guid),
      excerpt: (item.contentSnippet ?? item.summary ?? item.content ?? "")
        .toString()
        .trim()
        .slice(0, 1000),
      publishedAt: normalizeDate(item.isoDate ?? item.pubDate),
    }))
    .filter((item): item is FeedItem => Boolean(item.title && item.link));
}
