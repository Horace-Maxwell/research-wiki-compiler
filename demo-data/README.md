# Demo Dataset

This folder contains the deterministic source materials used by `npm run demo:reset`.

The seed script rebuilds `demo-workspace/` from scratch using the real product services:

- workspace initialization
- wiki page creation and editing
- source import and normalization
- source summarization
- patch proposal generation
- review approve/reject actions
- Ask answer generation
- answer archive
- audits

The workspace is generated from these visible inputs plus mocked structured LLM responses so the demo remains local, repeatable, and inspectable.
