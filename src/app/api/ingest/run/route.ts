import { NextResponse } from "next/server";
import { runIngestionCycle } from "@/lib/ingestion/runIngestion";
import { runExtractionCycle } from "@/lib/ingestion/runExtraction";

export const runtime = "nodejs";

export async function POST() {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  try {
    const ingestion = await runIngestionCycle(log);
    const extraction = await runExtractionCycle(log);
    return NextResponse.json({ ok: true, ingestion, extraction, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, logs }, { status: 500 });
  }
}
