import { NextResponse } from "next/server";

import { askRequestSchema, askResponseSchema } from "@/lib/contracts/answer";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { answerQuestion } from "@/server/services/answer-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = askRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_ask_request",
          message: "workspaceRoot and question are required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const answer = await answerQuestion(
      parsedBody.data.workspaceRoot,
      parsedBody.data.question,
    );

    return NextResponse.json(askResponseSchema.parse({ answer }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Ask request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
