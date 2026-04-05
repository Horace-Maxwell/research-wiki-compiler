import { resetOpenClawExampleRuntime } from "./generate-openclaw-example";

async function main() {
  await resetOpenClawExampleRuntime();
  console.log("OpenClaw example runtime directories cleared.");
}

main().catch((error) => {
  console.error("Failed to reset the OpenClaw example runtime directories.");
  console.error(error);
  process.exitCode = 1;
});
