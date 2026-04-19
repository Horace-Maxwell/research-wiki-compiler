import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium } from "@playwright/test";

import {
  DEMO_DATA_ROOT,
  DEMO_WORKSPACE_ROOT,
  OPENCLAW_EXAMPLE_MANIFEST_PATH,
  OPENCLAW_EXAMPLE_SNAPSHOT_ROOT,
  REPO_ROOT,
} from "@/server/lib/repo-paths";

type VerifiedPathContract = {
  officialVerifiedPath: {
    machine?: {
      os?: string;
      arch?: string;
    };
    node?: {
      verified?: string;
      minimum?: string;
    };
    officialShowcase?: string;
    routes?: string[];
    commands?: string[];
  };
};

function readNodeMajorVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

  if (!Number.isFinite(major)) {
    throw new Error(`Unable to parse Node.js version from "${process.versions.node}".`);
  }

  return major;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be a non-empty string array.`);
  }

  return value;
}

async function assertPathExists(label: string, targetPath: string) {
  try {
    await fs.access(targetPath);
  } catch {
    throw new Error(`${label} is missing: ${targetPath}`);
  }
}

async function assertWritableDirectory(label: string, directoryPath: string) {
  await fs.mkdir(directoryPath, { recursive: true });
  const sentinelPath = path.join(directoryPath, ".env-check.tmp");
  await fs.writeFile(sentinelPath, "ok\n", "utf8");
  await fs.rm(sentinelPath, { force: true });
  console.log(`${label}: writable`);
}

async function assertVerifiedPathContract(): Promise<VerifiedPathContract["officialVerifiedPath"]> {
  const contractPath = path.join(REPO_ROOT, "verified-path.json");

  await assertPathExists("Verified-path contract", contractPath);

  let parsed: unknown;

  try {
    parsed = JSON.parse(await fs.readFile(contractPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Verified-path contract is not valid JSON: ${contractPath}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(`Verified-path contract must contain a top-level object: ${contractPath}`);
  }

  const officialPath = parsed.officialVerifiedPath;

  if (!isRecord(officialPath)) {
    throw new Error(`verified-path.json is missing an "officialVerifiedPath" object.`);
  }

  const routes = readStringArray(officialPath.routes, "verified-path.json officialVerifiedPath.routes");
  const commands = readStringArray(officialPath.commands, "verified-path.json officialVerifiedPath.commands");

  if (officialPath.officialShowcase !== "openclaw") {
    throw new Error(`verified-path.json must declare "openclaw" as the official showcase.`);
  }

  console.log(`Verified-path contract: ${routes.length} routes / ${commands.length} commands`);
  return officialPath;
}

function reportVerifiedEnvironmentStatus(officialPath: VerifiedPathContract["officialVerifiedPath"]) {
  const expectedOs = officialPath.machine?.os;
  const expectedArch = officialPath.machine?.arch;
  const verifiedNode = officialPath.node?.verified;
  const currentPlatform = os.platform();
  const currentArch = os.arch();

  const osMatches = expectedOs
    ? (expectedOs.toLowerCase().includes("macos") && currentPlatform === "darwin") ||
      expectedOs.toLowerCase() === currentPlatform
    : false;
  const archMatches = expectedArch ? expectedArch === currentArch : false;

  if (osMatches && archMatches) {
    console.log(`Support status: official verified OS/arch match (${expectedOs}, ${expectedArch})`);
  } else {
    console.warn(
      `Support status: best-effort environment (current ${currentPlatform} ${currentArch}; official verified ${expectedOs ?? "unknown"} ${expectedArch ?? "unknown"}).`,
    );
  }

  if (verifiedNode === process.versions.node) {
    console.log(`Node status: exact verified version match (${verifiedNode})`);
  } else if (verifiedNode) {
    console.warn(
      `Node status: supported but not the exact verified version (current ${process.versions.node}; verified ${verifiedNode}).`,
    );
  }
}

async function assertPlaywrightChromiumInstalled() {
  const executablePath = chromium.executablePath();

  if (!executablePath) {
    throw new Error("Playwright Chromium is not configured. Run `npx playwright install chromium`.");
  }

  try {
    await fs.access(executablePath);
  } catch {
    throw new Error(
      `Playwright Chromium is missing or not accessible at ${executablePath}.\nRun \`npx playwright install chromium\` and rerun \`npm run env:check\`.`,
    );
  }

  console.log(`Playwright Chromium: ${executablePath}`);
}

async function main() {
  const nodeMajor = readNodeMajorVersion();

  if (nodeMajor < 20) {
    throw new Error(`Node.js 20+ is required. Current version: ${process.versions.node}`);
  }

  console.log(`Node.js: ${process.versions.node}`);
  console.log(`Platform: ${os.platform()} ${os.release()} (${os.arch()})`);
  console.log(`Repository root: ${REPO_ROOT}`);

  const officialVerifiedPath = await assertVerifiedPathContract();
  reportVerifiedEnvironmentStatus(officialVerifiedPath);
  await assertPathExists("Demo dataset", DEMO_DATA_ROOT);
  await assertPathExists("OpenClaw manifest", OPENCLAW_EXAMPLE_MANIFEST_PATH);
  await assertPathExists("OpenClaw canonical workspace", OPENCLAW_EXAMPLE_SNAPSHOT_ROOT);
  await assertPlaywrightChromiumInstalled();

  await assertWritableDirectory("Demo workspace", DEMO_WORKSPACE_ROOT);
  await assertWritableDirectory("Temporary build directory", path.join(REPO_ROOT, "tmp"));

  console.log(
    `Live provider: ${process.env.OPENAI_API_KEY?.trim() ? "configured (OPENAI_API_KEY present)" : "optional and currently not configured"}`,
  );
  console.log("Environment check passed.");
}

main().catch((error) => {
  console.error("Environment check failed.");
  console.error(error);
  process.exitCode = 1;
});
