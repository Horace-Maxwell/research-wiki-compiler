import { NextResponse } from "next/server";

import {
  sourceDetailSchema,
  sourceSummarizeRequestSchema,
} from "@/lib/contracts/source";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { summarizeSource } from "@/server/services/source-summary-service";

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
    const parsedBody = sourceSummarizeRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_source_summarize_request",
          message: "workspaceRoot is required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const source = await summarizeSource(parsedBody.data.workspaceRoot, id);

    return NextResponse.json(sourceDetailSchema.parse(source));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Source summarize request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
