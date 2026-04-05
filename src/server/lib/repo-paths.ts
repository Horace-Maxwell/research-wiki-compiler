import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(moduleDirectory, "../../..");
export const DEMO_WORKSPACE_ROOT = path.join(REPO_ROOT, "demo-workspace");
export const DEMO_DATA_ROOT = path.join(REPO_ROOT, "demo-data");
export const DRIZZLE_MIGRATIONS_DIRECTORY = path.join(REPO_ROOT, "drizzle");
export const PROMPTS_DIRECTORY = path.join(REPO_ROOT, "prompts");
export const WIKI_TEMPLATE_DIRECTORY = path.join(REPO_ROOT, "templates", "wiki");
