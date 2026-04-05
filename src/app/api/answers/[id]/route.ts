import { NextResponse } from "next/server";

import { answerArtifactSchema, getAnswerQuerySchema } from "@/lib/contracts/answer";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { getAnswerArtifact } from "@/server/services/answer-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const parsedQuery = getAnswerQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_answer_detail_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const answer = await getAnswerArtifact(parsedQuery.data.workspaceRoot, id);

    return NextResponse.json(answerArtifactSchema.parse(answer));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Answer detail request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
