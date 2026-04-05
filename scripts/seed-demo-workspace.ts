import path from "node:path";

import { DEMO_DATA_ROOT, DEMO_WORKSPACE_ROOT } from "../src/server/lib/repo-paths";
import { resetAndSeedDemoWorkspace } from "../src/server/services/demo-workspace-service";

async function main() {
  const workspaceRoot =
    process.argv[2] && process.argv[2].trim().length > 0
      ? path.resolve(process.argv[2])
      : DEMO_WORKSPACE_ROOT;
  const datasetRoot = DEMO_DATA_ROOT;

  const seeded = await resetAndSeedDemoWorkspace({
    workspaceRoot,
    datasetRoot,
  });

  console.log("Demo workspace ready.");
  console.log(`Workspace: ${seeded.workspaceRoot}`);
  console.log(
    `Pages: ${Object.values(seeded.pageIds).length}, Sources: ${Object.values(seeded.sourceIds).length}, Reviews: ${Object.values(seeded.reviewIds).length}, Audits: ${seeded.auditIds.length}`,
  );
  console.log(`Answer ready to archive: ${seeded.answerIds.readyToArchive}`);
  console.log(`Archived answer artifact: ${seeded.answerIds.archived}`);
}

main().catch((error) => {
  console.error("Failed to seed demo workspace.");
  console.error(error);
  process.exitCode = 1;
});
