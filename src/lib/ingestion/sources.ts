import fs from "node:fs";
import path from "node:path";

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  type: "rss" | "html";
  region: string;
  category: "news" | "regulator";
  isActive: boolean;
  notes?: string;
}

const CONFIG_PATH = path.join(process.cwd(), "config", "sources.json");

export function loadSources(): SourceConfig[] {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as SourceConfig[];
}

export function loadActiveSources(): SourceConfig[] {
  return loadSources().filter((s) => s.isActive);
}
