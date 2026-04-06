import { evaluateTopicQuality } from "@/server/services/topic-evaluation-service";

type ParsedArgs = {
  slug?: string;
  example?: "openclaw";
  writeReport: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    writeReport: true,
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

    if (argument.startsWith("--example=")) {
      const value = argument.slice("--example=".length).trim();

      if (value === "openclaw") {
        parsed.example = value;
      }

      continue;
    }

    if (argument === "--example" && nextValue) {
      if (nextValue.trim() === "openclaw") {
        parsed.example = "openclaw";
      }

      index += 1;
      continue;
    }

    if (argument === "--no-write-report") {
      parsed.writeReport = false;
    }
  }

  if (Boolean(parsed.slug) === Boolean(parsed.example)) {
    throw new Error("Pass exactly one of --slug <topic-slug> or --example openclaw.");
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = args.slug
    ? await evaluateTopicQuality({
        slug: args.slug,
        writeReport: args.writeReport,
      })
    : await evaluateTopicQuality({
        example: "openclaw",
        writeReport: args.writeReport,
      });

  console.log("Topic evaluation complete.");
  console.log(`Target: ${report.target.kind} ${report.target.id}`);
  console.log(`Title: ${report.target.title}`);
  console.log(`Maturity stage: ${report.maturity.stage}`);
  console.log(`Overall score: ${report.overall.score}/5 (${report.overall.percent}%)`);
  console.log(
    `Weak surfaces: ${report.weakSurfaces.length > 0 ? report.weakSurfaces.join(", ") : "none"}`,
  );
  console.log(
    `Next step: ${report.recommendedNextSteps[0] ?? "No immediate next step was generated."}`,
  );

  if (args.writeReport) {
    console.log(`JSON report: ${report.reportPaths.json}`);
    console.log(`Markdown report: ${report.reportPaths.markdown}`);
  } else {
    console.log("Report writing skipped (--no-write-report).");
  }
}

main().catch((error) => {
  console.error("Failed to evaluate topic quality.");
  console.error(error);
  process.exitCode = 1;
});
