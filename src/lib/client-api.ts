import { z } from "zod";

const apiErrorPayloadSchema = z
  .object({
    error: z.string().optional(),
    message: z.string().optional(),
    details: z.unknown().optional(),
  })
  .passthrough();

const errorHints: Record<string, string> = {
  workspace_not_initialized:
    "Initialize or refresh the workspace from Onboarding or Dashboard first.",
  invalid_workspace_root:
    "Choose a real local folder path inside your machine-accessible workspace area.",
  unsafe_workspace_root:
    "Pick a workspace path that stays inside the intended local root instead of traversing elsewhere.",
  missing_llm_provider: "Open Settings and choose an active provider for this workspace.",
  missing_llm_api_key: "Add the provider API key in Settings for this workspace.",
  missing_llm_model: "Set a default model in Settings for this workspace.",
  workspace_settings_missing:
    "Refresh the workspace setup or reinitialize the workspace settings file before retrying.",
  source_not_ready_for_summary:
    "Only processed normalized sources can be summarized. Reprocess or inspect the source detail first.",
  source_summary_required:
    "Summarize the source first so patch planning has a visible summary artifact to work from.",
  answer_not_archiveable:
    "Archive only grounded answers that include citations and are not marked insufficient.",
  answer_already_archived: "Open the archived wiki page instead of archiving this answer again.",
  answer_artifact_not_found:
    "Open the answer from Dashboard recent activity or rerun Ask to generate a fresh artifact.",
  review_status_not_pending:
    "Refresh the review queue and reopen the latest pending proposal before acting again.",
  review_proposal_not_found: "Refresh the review queue and select a proposal from current history.",
  source_not_found: "Refresh Sources and reopen the item from the current list.",
  wiki_page_not_found: "Refresh the wiki index and reopen the page from the browser tree.",
  audit_run_not_found: "Refresh Audits and select a run from the current history list.",
  openai_summary_request_failed:
    "Check the configured OpenAI key, model, and account quota, then retry.",
  anthropic_summary_request_failed:
    "Check the configured Anthropic key, model, and account quota, then retry.",
  invalid_summary_provider_output:
    "Retry the run or inspect the visible prompt contract if the provider returned malformed structured output.",
  invalid_patch_planner_output:
    "Retry patch planning or inspect the planner prompt contract before trusting the draft.",
  invalid_answerer_output:
    "Retry Ask or inspect the answerer prompt contract because the structured answer payload was invalid.",
  patch_insert_section_missing:
    "Edit the proposal or update the target page first, because the intended section is missing.",
  patch_insert_anchor_missing:
    "Edit the proposal draft to use a real local anchor before applying the patch.",
  patch_replace_missing_before_text:
    "Edit the proposal draft to include the exact local excerpt that should be replaced.",
  patch_replace_target_missing:
    "Refresh the proposal and review the current page state before applying, because the target excerpt no longer matches.",
};

export async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function describeApiError(payload: unknown, fallbackMessage: string) {
  const parsed = apiErrorPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return fallbackMessage;
  }

  const baseMessage = parsed.data.message?.trim() || fallbackMessage;
  const hint =
    parsed.data.error && parsed.data.error in errorHints
      ? errorHints[parsed.data.error]
      : null;

  return hint ? `${baseMessage} ${hint}` : baseMessage;
}
