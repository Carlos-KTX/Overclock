import { runIngestionCycle } from "../src/lib/ingestion/runIngestion";

runIngestionCycle(console.log)
  .then((summary) => {
    console.log(`\nDone. ${summary.sourcesChecked} sources checked, ${summary.itemsFetched} new raw items.`);
    if (summary.errors.length) console.log(`Errors:\n${summary.errors.join("\n")}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
