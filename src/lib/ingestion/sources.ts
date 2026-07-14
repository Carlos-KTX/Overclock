import fs from "node:fs";
import path from "node:path";
import type { HtmlScrapeConfig } from "./fetchHtmlListing";

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  type: "rss" | "html";
  region: string;
  category: "news" | "regulator";
  isActive: boolean;
  notes?: string;
  /** Required when type is "html" - drives the generic cheerio-based scraper. */
  htmlScrapeConfig?: HtmlScrapeConfig;
}

const CONFIG_PATH = path.join(process.cwd(), "config", "sources.json");

export function loadSources(): SourceConfig[] {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as SourceConfig[];
}

export function loadActiveSources(): SourceConfig[] {
  return loadSources().filter((s) => s.isActive);
}
