import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildTopicBootstrap,
  initTopicBootstrap,
  validateTopicBootstrap,
} from "@/server/services/topic-bootstrap-service";

describe("topic bootstrap service", () => {
  let topicsRoot = "";
  let corpusRoot = "";

  beforeEach(async () => {
    topicsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-topic-bootstrap-topics-"));
    corpusRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-topic-bootstrap-corpus-"));
    await fs.writeFile(
      path.join(corpusRoot, "2026-04-05-local-first-notes.md"),
      "# Local-first notes\n\nA starter corpus note.\n",
      "utf8",
    );
  });

  afterEach(async () => {
    if (topicsRoot) {
      await fs.rm(topicsRoot, { recursive: true, force: true });
    }

    if (corpusRoot) {
      await fs.rm(corpusRoot, { recursive: true, force: true });
    }
  });

  it("initializes, builds, and validates a deterministic starter topic", async () => {
    const initResult = await initTopicBootstrap({
      slug: "local-first-software",
      title: "Local-First Software",
      copyCorpusFrom: corpusRoot,
      seedTimestamp: "2026-04-05T12:00:00.000Z",
      topicsRoot,
    });

    expect(initResult.config.corpus.files).toHaveLength(1);

    const buildResult = await buildTopicBootstrap({
      slug: "local-first-software",
      topicsRoot,
    });

    expect(buildResult.manifest.pages.some((page) => page.title === "Local-First Software")).toBe(
      true,
    );
    await expect(
      fs.access(path.join(buildResult.paths.topicRoot, "workspace", "wiki", "index.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(
        path.join(
          buildResult.paths.topicRoot,
          "obsidian-vault",
          "00 Atlas",
          "Start Here.md",
        ),
      ),
    ).resolves.toBeUndefined();

    const validationResult = await validateTopicBootstrap({
      slug: "local-first-software",
      topicsRoot,
    });

    expect(validationResult.manifest.qualityBar.requiredContextPackTitles.length).toBeGreaterThan(0);
  });
});
