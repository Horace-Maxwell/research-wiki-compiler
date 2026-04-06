import { buildTopicBootstrap } from "@/server/services/topic-bootstrap-service";

function parseArgs(argv: string[]) {
  let slug = "";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument.startsWith("--slug=")) {
      slug = argument.slice("--slug=".length).trim();
      continue;
    }

    if (argument === "--slug" && argv[index + 1]) {
      slug = argv[index + 1].trim();
      index += 1;
    }
  }

  if (!slug) {
    throw new Error("Missing required --slug argument.");
  }

  return { slug };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await buildTopicBootstrap({
    slug: args.slug,
  });

  console.log("Topic bootstrap built.");
  console.log(`Topic: ${result.config.topic.title}`);
  console.log(`Topic root: ${result.paths.topicRoot}`);
  console.log(`Manifest: ${result.paths.manifestPath}`);
  console.log(`Baseline: ${result.paths.baselinePath}`);
  console.log(`Workspace: ${result.paths.workspaceRoot}`);
  console.log(`Obsidian vault: ${result.paths.obsidianVaultRoot}`);
}

main().catch((error) => {
  console.error("Failed to build topic bootstrap.");
  console.error(error);
  process.exitCode = 1;
});
