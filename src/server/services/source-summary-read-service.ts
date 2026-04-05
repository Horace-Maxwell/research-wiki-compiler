import { sourceCompilationStateSchema, sourceSummaryArtifactSchema } from "@/lib/contracts/source-summary";
import { getLatestSourceSummaryJobRun } from "@/server/services/job-run-service";
import {
  readSourceSummaryArtifactJson,
  readSourceSummaryArtifactMarkdown,
} from "@/server/services/source-summary-file-service";

export async function readSourceSummaryState(params: {
  workspaceRoot: string;
  source: {
    summaryStatus: string;
    summaryMarkdownPath: string | null;
    summaryJsonPath: string | null;
    summaryPromptHash: string | null;
    summaryProvider: string | null;
    summaryModel: string | null;
    summaryUpdatedAt: Date | null;
    summaryError: string | null;
    id: string;
  };
}) {
  const markdown = await readSourceSummaryArtifactMarkdown(
    params.workspaceRoot,
    params.source.summaryMarkdownPath,
  );
  const rawArtifact = await readSourceSummaryArtifactJson(
    params.workspaceRoot,
    params.source.summaryJsonPath,
  );
  const artifact = rawArtifact ? sourceSummaryArtifactSchema.parse(rawArtifact) : null;
  const latestJobRun = await getLatestSourceSummaryJobRun(
    params.workspaceRoot,
    params.source.id,
  );

  return sourceCompilationStateSchema.parse({
    status: params.source.summaryStatus,
    markdownPath: params.source.summaryMarkdownPath,
    jsonPath: params.source.summaryJsonPath,
    promptHash: params.source.summaryPromptHash,
    provider:
      params.source.summaryProvider === "openai" || params.source.summaryProvider === "anthropic"
        ? params.source.summaryProvider
        : null,
    model: params.source.summaryModel,
    updatedAt: params.source.summaryUpdatedAt?.toISOString() ?? null,
    error: params.source.summaryError,
    markdown,
    artifact,
    latestJobRun: latestJobRun
      ? {
          id: latestJobRun.id,
          status:
            latestJobRun.status === "running" ||
            latestJobRun.status === "completed" ||
            latestJobRun.status === "failed"
              ? latestJobRun.status
              : "failed",
          retryCount: latestJobRun.retryCount,
          durationMs: latestJobRun.durationMs ?? null,
          provider:
            latestJobRun.metadataJson?.provider === "openai" ||
            latestJobRun.metadataJson?.provider === "anthropic"
              ? latestJobRun.metadataJson.provider
              : null,
          model:
            typeof latestJobRun.metadataJson?.model === "string"
              ? latestJobRun.metadataJson.model
              : null,
          promptHash:
            typeof latestJobRun.metadataJson?.promptHash === "string"
              ? latestJobRun.metadataJson.promptHash
              : null,
          error:
            typeof latestJobRun.metadataJson?.error === "string"
              ? latestJobRun.metadataJson.error
              : null,
          createdAt: latestJobRun.createdAt.toISOString(),
          completedAt: latestJobRun.completedAt?.toISOString() ?? null,
        }
      : null,
  });
}
