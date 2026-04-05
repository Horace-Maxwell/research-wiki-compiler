import { validateOpenClawExampleReference } from "./generate-openclaw-example";

async function main() {
  const result = await validateOpenClawExampleReference();

  console.log("OpenClaw reference example validated.");
  console.log(`Workspace: ${result.buildResult.workspaceRoot}`);
  console.log(`Manifest: ${result.buildResult.runtimeManifestPath}`);
  console.log(`Obsidian vault: ${result.buildResult.runtimeObsidianVaultRoot}`);
  console.log(`Rendered workspace: ${result.renderedWorkspaceRoot}`);
}

main().catch((error) => {
  console.error("Failed to validate the OpenClaw example.");
  console.error(error);
  process.exitCode = 1;
});
