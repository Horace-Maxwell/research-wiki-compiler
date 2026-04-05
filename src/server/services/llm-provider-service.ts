import type { ZodType } from "zod";

import { llmProviderSchema } from "@/lib/contracts/source-summary";
import type { WorkspaceLlmSettings } from "@/lib/contracts/workspace";
import { AppError } from "@/server/lib/errors";
import { readWorkspaceSettings } from "@/server/services/settings-service";

export type ActiveLlmProviderConfig = {
  provider: "openai" | "anthropic";
  model: string;
  apiKey: string;
};

type StructuredGenerationParams<T> = {
  config: ActiveLlmProviderConfig;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  maxOutputTokens?: number;
};

function trimNullable(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export function resolveProviderConfig(llm: WorkspaceLlmSettings): ActiveLlmProviderConfig {
  const provider = llm.provider;

  if (!provider) {
    throw new AppError(
      "Configure an active LLM provider in Settings before summarizing sources.",
      400,
      "missing_llm_provider",
    );
  }

  const activeProfile = llm[provider];
  const apiKey = trimNullable(activeProfile.apiKey);
  const model = trimNullable(llm.model) ?? trimNullable(activeProfile.model);

  if (!apiKey) {
    throw new AppError(
      `Missing ${provider} API key in workspace settings.`,
      400,
      "missing_llm_api_key",
    );
  }

  if (!model) {
    throw new AppError(
      `Missing ${provider} model in workspace settings.`,
      400,
      "missing_llm_model",
    );
  }

  return {
    provider,
    model,
    apiKey,
  };
}

export async function getActiveLlmProviderConfig(workspaceRoot: string) {
  const settings = await readWorkspaceSettings(workspaceRoot);

  if (!settings) {
    throw new AppError(
      "Workspace settings are unavailable.",
      400,
      "workspace_settings_missing",
    );
  }

  return resolveProviderConfig(settings.llm);
}

async function callOpenAiStructuredObject<T>(params: StructuredGenerationParams<T>) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.config.apiKey}`,
    },
    body: JSON.stringify({
      model: params.config.model,
      temperature: 0.2,
      max_tokens: params.maxOutputTokens ?? 2500,
      messages: [
        {
          role: "system",
          content: params.systemPrompt,
        },
        {
          role: "user",
          content: params.userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: params.schemaName,
          strict: true,
          schema: params.jsonSchema,
        },
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        error?: { message?: string };
        choices?: Array<{
          message?: {
            content?: string;
            refusal?: string;
          };
        }>;
      }
    | null;

  if (!response.ok) {
    throw new AppError(
      data?.error?.message ?? "OpenAI summarization request failed.",
      response.status,
      "openai_summary_request_failed",
      data,
    );
  }

  const message = data?.choices?.[0]?.message;

  if (message?.refusal) {
    throw new AppError(
      `OpenAI refused the summarization request: ${message.refusal}`,
      422,
      "openai_summary_refused",
      data,
    );
  }

  if (!message?.content) {
    throw new AppError(
      "OpenAI returned an empty structured response.",
      502,
      "openai_summary_empty_response",
      data,
    );
  }

  return JSON.parse(message.content) as unknown;
}

async function callAnthropicStructuredObject<T>(params: StructuredGenerationParams<T>) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.config.model,
      max_tokens: params.maxOutputTokens ?? 2500,
      temperature: 0.2,
      system: params.systemPrompt,
      messages: [
        {
          role: "user",
          content: params.userPrompt,
        },
      ],
      tools: [
        {
          name: params.schemaName,
          description: "Emit the structured source summary artifact.",
          input_schema: params.jsonSchema,
        },
      ],
      tool_choice: {
        type: "tool",
        name: params.schemaName,
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        error?: { message?: string };
        content?: Array<{
          type?: string;
          input?: unknown;
          text?: string;
        }>;
      }
    | null;

  if (!response.ok) {
    throw new AppError(
      data?.error?.message ?? "Anthropic summarization request failed.",
      response.status,
      "anthropic_summary_request_failed",
      data,
    );
  }

  const toolUse = data?.content?.find((item) => item.type === "tool_use");

  if (!toolUse?.input) {
    throw new AppError(
      "Anthropic did not return the required structured tool output.",
      502,
      "anthropic_summary_missing_tool_output",
      data,
    );
  }

  return toolUse.input;
}

export async function generateStructuredObject<T>(params: StructuredGenerationParams<T>) {
  llmProviderSchema.parse(params.config.provider);

  const rawObject =
    params.config.provider === "openai"
      ? await callOpenAiStructuredObject(params)
      : await callAnthropicStructuredObject(params);

  try {
    return params.schema.parse(rawObject);
  } catch (error) {
    throw new AppError(
      "The summarization provider returned invalid structured output.",
      502,
      "invalid_summary_provider_output",
      {
        error,
        rawObject,
      },
    );
  }
}
