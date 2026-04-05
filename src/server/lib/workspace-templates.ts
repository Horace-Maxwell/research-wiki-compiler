import { PROMPT_TEMPLATE_FILES } from "@/lib/constants";

export function buildIndexPageTemplate(workspaceName: string, timestamp: string) {
  return `---
title: ${workspaceName}
slug: index
type: index
created_at: ${timestamp}
updated_at: ${timestamp}
status: active
aliases: []
tags:
  - workspace
  - index
source_refs: []
page_refs: []
confidence: 1
review_status: approved
---

# ${workspaceName}

## Purpose

This workspace is the durable, reviewable knowledge base for compiled research.

## Current State

- Workspace structure initialized
- Prompt templates available under \`/prompts\`
- Runtime metadata available under \`/.research-wiki\`

## Next Steps

1. Import source material into \`raw/inbox/\`
2. Build structured wiki pages under \`wiki/\`
3. Review and apply patch proposals under \`reviews/\`
`;
}

export function buildRepoPromptManifest() {
  return {
    files: [...PROMPT_TEMPLATE_FILES],
    version: "0.1.0-m0",
  };
}

