"use client";

import { useEffect, useState } from "react";

interface SourceHealth {
  id: string;
  name: string;
  url: string;
  type: string;
  region: string;
  category: string;
  is_active: number;
  last_fetched_at: string | null;
  last_error: string | null;
  raw_item_count: number;
}

export default function AdminPage() {
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/sources")
      .then((res) => res.json())
      .then((data) => setSources(data.sources))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRunNow() {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/ingest/run", { method: "POST" });
      const data = await res.json();
      setLastResult(
        data.ok
          ? `Checked ${data.ingestion.sourcesChecked} sources, ${data.ingestion.itemsFetched} new items, ${data.extraction.extracted} releases extracted.`
          : `Failed: ${data.error}`
      );
      load();
    } catch (err) {
      setLastResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Source health</h1>
        <button
          onClick={handleRunNow}
          disabled={running}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {running ? "Running..." : "Run ingestion now"}
        </button>
      </div>
      {lastResult && <p className="mb-4 text-sm text-neutral-600">{lastResult}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <th className="p-2">Source</th>
              <th className="p-2">Category</th>
              <th className="p-2">Region</th>
              <th className="p-2">Active</th>
              <th className="p-2">Last fetched</th>
              <th className="p-2">Raw items</th>
              <th className="p-2">Last error</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-neutral-100">
                <td className="p-2">
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {s.name}
                  </a>
                </td>
                <td className="p-2 capitalize">{s.category}</td>
                <td className="p-2">{s.region}</td>
                <td className="p-2">{s.is_active ? "Yes" : "No"}</td>
                <td className="p-2">{s.last_fetched_at ? new Date(s.last_fetched_at).toLocaleString() : "Never"}</td>
                <td className="p-2">{s.raw_item_count}</td>
                <td className="p-2 text-red-600">{s.last_error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
