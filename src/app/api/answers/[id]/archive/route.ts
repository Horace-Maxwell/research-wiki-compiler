import { NextResponse } from "next/server";

import {
  archiveAnswerRequestSchema,
  archiveAnswerResponseSchema,
} from "@/lib/contracts/answer";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { archiveAnswerArtifact } from "@/server/services/answer-archive-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsedBody = archiveAnswerRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_answer_archive_request",
          message: "workspaceRoot and archiveType are required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const answer = await archiveAnswerArtifact(
      parsedBody.data.workspaceRoot,
      id,
      parsedBody.data.archiveType,
    );

    return NextResponse.json(archiveAnswerResponseSchema.parse({ answer }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Answer archive request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
