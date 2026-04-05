import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(moduleDirectory, "../../..");
export const DEMO_WORKSPACE_ROOT = path.join(REPO_ROOT, "demo-workspace");
export const DEMO_DATA_ROOT = path.join(REPO_ROOT, "demo-data");
export const EXAMPLES_ROOT = path.join(REPO_ROOT, "examples");
export const OPENCLAW_EXAMPLE_ROOT = path.join(EXAMPLES_ROOT, "openclaw-wiki");
export const OPENCLAW_EXAMPLE_SNAPSHOT_ROOT = path.join(
  OPENCLAW_EXAMPLE_ROOT,
  "workspace",
);
export const OPENCLAW_EXAMPLE_MANIFEST_PATH = path.join(
  OPENCLAW_EXAMPLE_ROOT,
  "manifest.json",
);
export const OPENCLAW_RENDERED_WORKSPACE_ROOT = path.join(
  REPO_ROOT,
  "tmp",
  "rendered-examples",
  "openclaw",
);
export const DRIZZLE_MIGRATIONS_DIRECTORY = path.join(REPO_ROOT, "drizzle");
export const PROMPTS_DIRECTORY = path.join(REPO_ROOT, "prompts");
export const WIKI_TEMPLATE_DIRECTORY = path.join(REPO_ROOT, "templates", "wiki");
