import { initTopicBootstrap } from "@/server/services/topic-bootstrap-service";

type ParsedArgs = {
  slug: string;
  title: string;
  aliases: string[];
  description?: string;
  seedTimestamp?: string;
  copyCorpusFrom?: string;
  force: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    slug: "",
    title: "",
    aliases: [],
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument.startsWith("--slug=")) {
      parsed.slug = argument.slice("--slug=".length).trim();
      continue;
    }

    if (argument === "--slug" && nextValue) {
      parsed.slug = nextValue.trim();
      index += 1;
      continue;
    }

    if (argument.startsWith("--title=")) {
      parsed.title = argument.slice("--title=".length).trim();
      continue;
    }

    if (argument === "--title" && nextValue) {
      parsed.title = nextValue.trim();
      index += 1;
      continue;
    }

    if (argument.startsWith("--aliases=")) {
      parsed.aliases = argument
        .slice("--aliases=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }

    if (argument === "--aliases" && nextValue) {
      parsed.aliases = nextValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (argument.startsWith("--description=")) {
      parsed.description = argument.slice("--description=".length).trim();
      continue;
    }

    if (argument === "--description" && nextValue) {
      parsed.description = nextValue.trim();
      index += 1;
      continue;
    }

    if (argument.startsWith("--seed-timestamp=")) {
      parsed.seedTimestamp = argument.slice("--seed-timestamp=".length).trim();
      continue;
    }

    if (argument === "--seed-timestamp" && nextValue) {
      parsed.seedTimestamp = nextValue.trim();
      index += 1;
      continue;
    }

    if (argument.startsWith("--copy-corpus-from=")) {
      parsed.copyCorpusFrom = argument.slice("--copy-corpus-from=".length).trim();
      continue;
    }

    if (argument === "--copy-corpus-from" && nextValue) {
      parsed.copyCorpusFrom = nextValue.trim();
      index += 1;
      continue;
    }

    if (argument === "--force") {
      parsed.force = true;
      continue;
    }
  }

  if (!parsed.title) {
    throw new Error("Missing required --title argument.");
  }

  if (!parsed.slug) {
    throw new Error("Missing required --slug argument.");
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await initTopicBootstrap({
    slug: args.slug,
    title: args.title,
    aliases: args.aliases,
    description: args.description,
    seedTimestamp: args.seedTimestamp,
    copyCorpusFrom: args.copyCorpusFrom,
    force: args.force,
  });

  console.log("Topic bootstrap initialized.");
  console.log(`Topic root: ${result.paths.topicRoot}`);
  console.log(`Contract: ${result.paths.configPath}`);
  console.log(`Corpus root: ${result.paths.sourceCorpusRoot}`);
  console.log(`Starter corpus files: ${result.config.corpus.files.length}`);
}

main().catch((error) => {
  console.error("Failed to initialize topic bootstrap.");
  console.error(error);
  process.exitCode = 1;
});
