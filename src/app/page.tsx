"use client";

import { useEffect, useMemo, useState } from "react";
import { REGIONS, THERAPEUTIC_LINES, RELEASE_TYPES } from "@/lib/constants";
import { MultiSelectDropdown } from "./components/MultiSelectDropdown";
import { SingleSelectDropdown } from "./components/SingleSelectDropdown";

const DATE_RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Last 12 months", value: "365" },
];
const DEFAULT_DATE_RANGE = "all";

interface Release {
  id: number;
  product_name: string;
  company: string | null;
  region: string;
  therapeutic_line: string;
  release_type: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_date: string | null;
  created_at: string;
}

type SortColumn = "date" | "product_name" | "company" | "region" | "therapeutic_line" | "release_type";
type SortDirection = "asc" | "desc";

function releaseDate(release: Release): string {
  return release.published_date ?? release.created_at;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function sortReleases(releases: Release[], column: SortColumn, direction: SortDirection): Release[] {
  const sorted = [...releases].sort((a, b) => {
    let cmp = 0;
    if (column === "date") {
      cmp = new Date(releaseDate(a)).getTime() - new Date(releaseDate(b)).getTime();
    } else if (column === "company") {
      cmp = (a.company ?? "").localeCompare(b.company ?? "");
    } else if (column === "product_name") {
      cmp = a.product_name.localeCompare(b.product_name);
    } else if (column === "region") {
      cmp = a.region.localeCompare(b.region);
    } else if (column === "therapeutic_line") {
      cmp = a.therapeutic_line.localeCompare(b.therapeutic_line);
    } else if (column === "release_type") {
      cmp = a.release_type.localeCompare(b.release_type);
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export default function Home() {
  const [regions, setRegions] = useState<string[]>([]);
  const [therapeuticLines, setTherapeuticLines] = useState<string[]>([]);
  const [releaseTypes, setReleaseTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>(DEFAULT_DATE_RANGE);
  const [releases, setReleases] = useState<Release[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    regions.forEach((r) => params.append("region", r));
    therapeuticLines.forEach((t) => params.append("therapeuticLine", t));
    releaseTypes.forEach((t) => params.append("releaseType", t));
    if (dateRange !== DEFAULT_DATE_RANGE) params.set("days", dateRange);
    return params.toString();
  }, [regions, therapeuticLines, releaseTypes, dateRange]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/releases?${query}`)
      .then((res) => res.json())
      .then((data) => {
        setReleases(data.releases);
        setTotal(data.total);
        setError(null);
      })
      .catch(() => setError("Failed to load releases."))
      .finally(() => setLoading(false));
  }, [query]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const runRes = await fetch("/api/ingest/run", { method: "POST" });
      const runData = await runRes.json().catch(() => null);
      if (!runRes.ok || runData?.ok === false) {
        throw new Error(runData?.error ?? `Ingestion request failed (HTTP ${runRes.status}).`);
      }

      const res = await fetch(`/api/releases?${query}`);
      if (!res.ok) throw new Error(`Failed to reload releases (HTTP ${res.status}).`);
      const data = await res.json();
      setReleases(data.releases);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(`Refresh failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefreshing(false);
    }
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const sortedReleases = useMemo(
    () => sortReleases(releases, sortColumn, sortDirection),
    [releases, sortColumn, sortDirection]
  );

  const hasActiveFilters =
    regions.length + therapeuticLines.length + releaseTypes.length > 0 || dateRange !== DEFAULT_DATE_RANGE;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <header className="border-b border-slate-300 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Pharmaceutical &amp; Medical Product Release Register
            </h1>
            <p className="text-xs text-slate-300">
              Aggregated approvals, launches, and pipeline signals from tracked medical/pharma publications and
              regulatory bodies.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-sm border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-300 bg-white px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by</span>
        <MultiSelectDropdown label="Release Type" options={RELEASE_TYPES} selected={releaseTypes} onChange={setReleaseTypes} />
        <MultiSelectDropdown label="Region" options={REGIONS} selected={regions} onChange={setRegions} />
        <MultiSelectDropdown
          label="Therapeutic Line"
          options={THERAPEUTIC_LINES}
          selected={therapeuticLines}
          onChange={setTherapeuticLines}
        />
        <SingleSelectDropdown
          label="Date Range"
          options={DATE_RANGE_OPTIONS}
          selected={dateRange}
          onChange={setDateRange}
          defaultValue={DEFAULT_DATE_RANGE}
        />
        {hasActiveFilters && (
          <button
            onClick={() => {
              setRegions([]);
              setTherapeuticLines([]);
              setReleaseTypes([]);
              setDateRange(DEFAULT_DATE_RANGE);
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline"
          >
            Clear all filters
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {loading ? "Loading…" : `${total} record${total === 1 ? "" : "s"}`}
        </span>
      </div>

      <main className="p-6">
        {error && (
          <p className="mb-4 rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="overflow-x-auto rounded-sm border border-slate-300 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <SortableHeader label="Date" column="date" current={sortColumn} direction={sortDirection} onSort={handleSort} width="w-24" />
                <SortableHeader label="Product" column="product_name" current={sortColumn} direction={sortDirection} onSort={handleSort} width="w-44" />
                <SortableHeader label="Company" column="company" current={sortColumn} direction={sortDirection} onSort={handleSort} width="w-40" />
                <SortableHeader label="Region" column="region" current={sortColumn} direction={sortDirection} onSort={handleSort} width="w-32" />
                <SortableHeader label="Therapeutic Line" column="therapeutic_line" current={sortColumn} direction={sortDirection} onSort={handleSort} width="w-36" />
                <SortableHeader label="Type" column="release_type" current={sortColumn} direction={sortDirection} onSort={handleSort} width="w-24" />
                <th className="border-l border-slate-200 px-3 py-2 font-semibold">Summary</th>
                <th className="border-l border-slate-200 px-3 py-2 font-semibold w-32">Source</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : sortedReleases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    No releases match these filters. Try clearing filters or hitting Refresh now.
                  </td>
                </tr>
              ) : (
                sortedReleases.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-200 align-top ${idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"} hover:bg-blue-50/50`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDate(releaseDate(r))}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.product_name}</td>
                    <td className="px-3 py-2 text-slate-700">{r.company ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{r.region}</td>
                    <td className="px-3 py-2 text-slate-700">{r.therapeutic_line}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block rounded-sm border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                        {r.release_type}
                      </span>
                    </td>
                    <td className="border-l border-slate-100 px-3 py-2 text-slate-600">{r.summary}</td>
                    <td className="border-l border-slate-100 px-3 py-2 text-slate-600">
                      <div>{r.source_name}</div>
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-700 hover:underline"
                      >
                        View source →
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function SortableHeader({
  label,
  column,
  current,
  direction,
  onSort,
  width,
}: {
  label: string;
  column: SortColumn;
  current: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  width?: string;
}) {
  const isActive = column === current;
  return (
    <th className={`px-3 py-2 ${width ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
      >
        {label}
        <span className="text-[10px] leading-none">
          {isActive ? (direction === "asc" ? "▲" : "▼") : "⇕"}
        </span>
      </button>
    </th>
  );
}
