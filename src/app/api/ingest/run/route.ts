import { NextResponse } from "next/server";
import { runIngestionCycle } from "@/lib/ingestion/runIngestion";
import { runExtractionCycle } from "@/lib/ingestion/runExtraction";

export const runtime = "nodejs";
// Vercel Hobby caps this at 60s regardless of what's set here; Pro allows more.
export const maxDuration = 60;

export async function POST() {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);
  // Leave ~10s of headroom under the 60s cap for the response itself to be sent.
  const deadline = Date.now() + 48_000;

  try {
    const ingestion = await runIngestionCycle(log);
    const extraction = await runExtractionCycle(log, deadline);
    return NextResponse.json({ ok: true, ingestion, extraction, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, logs }, { status: 500 });
  }
}
