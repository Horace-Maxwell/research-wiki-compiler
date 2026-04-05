import { NextResponse } from "next/server";

import {
  sourceDetailSchema,
  sourceReprocessRequestSchema,
} from "@/lib/contracts/source";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { reprocessSource } from "@/server/services/source-service";

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
    const parsedBody = sourceReprocessRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_source_reprocess_request",
          message: "workspaceRoot is required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const source = await reprocessSource(parsedBody.data.workspaceRoot, id);

    return NextResponse.json(sourceDetailSchema.parse(source));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Source reprocess request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
