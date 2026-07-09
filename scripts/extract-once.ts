import "dotenv/config";
import { runExtractionCycle } from "../src/lib/ingestion/runExtraction";

runExtractionCycle(console.log)
  .then((summary) => {
    console.log(
      `\nDone. ${summary.skipped} skipped (no signal), ${summary.irrelevant} irrelevant (LLM), ${summary.extracted} extracted, ${summary.errors} errors.`
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
