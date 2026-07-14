import * as cheerio from "cheerio";
import type { FeedItem } from "./fetchFeed";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface HtmlScrapeConfig {
  /** CSS selector matching each news item on the listing page. */
  itemSelector: string;
  /**
   * CSS selector (relative to the item) for the link. Use the literal
   * string "self" when the item element itself is the <a> tag.
   */
  linkSelector: string;
  /** CSS selector (relative to the item) for the title text. */
  titleSelector: string;
  /** CSS selector (relative to the item) for the date, if present. */
  dateSelector?: string;
  /** Read the date from this attribute instead of the element's text (e.g. "datetime"). */
  dateAttr?: string;
  /** CSS selector (relative to the item) for a short excerpt, if present. */
  excerptSelector?: string;
  /** Used to resolve relative hrefs found on the page. */
  baseUrl: string;
}

const MONTHS: Record<string, string> = {
  enero: "01",
  janeiro: "01",
  febrero: "02",
  fevereiro: "02",
  marzo: "03",
  "março": "03",
  abril: "04",
  mayo: "05",
  maio: "05",
  junio: "06",
  junho: "06",
  julio: "07",
  julho: "07",
  agosto: "08",
  septiembre: "09",
  setembro: "09",
  octubre: "10",
  outubro: "10",
  noviembre: "11",
  novembro: "11",
  diciembre: "12",
  dezembro: "12",
};

/**
 * Best-effort parser for Spanish/Portuguese long-form dates like
 * "martes, 07 de julio de 2026" or "07 de julio de 2026". Returns null
 * (rather than throwing) for anything else - callers fall back to the
 * fetch/ingestion timestamp, same as the RSS date-normalization path.
 */
function parseLatamDate(text: string): string | null {
  const match = text
    .toLowerCase()
    .match(/(\d{1,2})\s+de\s+([a-zçãáéíóõôêú]+)\s+de\s+(\d{4})/i);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName];
  if (!month) return null;
  const parsed = new Date(`${year}-${month}-${day.padStart(2, "0")}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  return parseLatamDate(raw);
}

export async function fetchHtmlListing(config: HtmlScrapeConfig): Promise<FeedItem[]> {
  const response = await fetch(config.baseUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${config.baseUrl}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const items: FeedItem[] = [];
  $(config.itemSelector).each((_, el) => {
    const $item = $(el);
    const $link = config.linkSelector === "self" ? $item : $item.find(config.linkSelector).first();
    const href = $link.attr("href");
    if (!href) return;

    const title = $item.find(config.titleSelector).first().text().trim();
    if (!title) return;

    const link = new URL(href, config.baseUrl).toString();

    let publishedAt: string | null = null;
    if (config.dateSelector) {
      const $date = $item.find(config.dateSelector).first();
      const raw = config.dateAttr ? $date.attr(config.dateAttr) : $date.text();
      publishedAt = normalizeDate(raw?.trim());
    }

    const excerpt = config.excerptSelector
      ? $item.find(config.excerptSelector).first().text().trim().slice(0, 1000)
      : "";

    items.push({ title, link, excerpt, publishedAt });
  });

  // Unlike an RSS feed (where 0 *new* items just means nothing changed
  // since last time), a hand-tuned CSS selector matching 0 items on a page
  // that always has real content when working is almost always a sign the
  // scrape itself broke - a bot-challenge page instead of the real one, a
  // geo/IP block, or the site's markup changing - not a real "no news"
  // day. Throwing here (instead of silently returning []) surfaces that as
  // a visible per-source error instead of a quiet, misleading zero.
  if (items.length === 0) {
    throw new Error(
      `Matched 0 items for selector "${config.itemSelector}" (HTTP ${response.status}, ${html.length} bytes received) - the scrape likely broke rather than the page having no news`
    );
  }

  return items;
}
