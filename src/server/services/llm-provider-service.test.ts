import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  generateStructuredObject,
  resolveProviderConfig,
} from "@/server/services/llm-provider-service";

describe("llm provider service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates provider configuration from workspace settings", () => {
    expect(() =>
      resolveProviderConfig({
        provider: null,
        model: null,
        openai: {
          apiKey: null,
          model: null,
        },
        anthropic: {
          apiKey: null,
          model: null,
        },
      }),
    ).toThrowError("Configure an active LLM provider");

    expect(
      resolveProviderConfig({
        provider: "openai",
        model: null,
        openai: {
          apiKey: "test-key",
          model: "gpt-test",
        },
        anthropic: {
          apiKey: null,
          model: null,
        },
      }),
    ).toEqual({
      provider: "openai",
      model: "gpt-test",
      apiKey: "test-key",
    });
  });

  it("parses structured output from the openai adapter", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    result: "ok",
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );

    const parsed = await generateStructuredObject({
      config: {
        provider: "openai",
        model: "gpt-test",
        apiKey: "sk-test",
      },
      systemPrompt: "Return structured data.",
      userPrompt: "Summarize this source.",
      schema: z.object({
        result: z.string(),
      }),
      schemaName: "emit_test_payload",
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["result"],
        properties: {
          result: {
            type: "string",
          },
        },
      },
    });

    expect(parsed).toEqual({
      result: "ok",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
