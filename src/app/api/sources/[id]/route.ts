import { NextResponse } from "next/server";

import {
  sourceDetailQuerySchema,
  sourceDetailSchema,
} from "@/lib/contracts/source";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { getSourceDetail } from "@/server/services/source-service";

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
    const parsedQuery = sourceDetailQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_source_detail_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const source = await getSourceDetail(parsedQuery.data.workspaceRoot, id);

    return NextResponse.json(sourceDetailSchema.parse(source));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Source detail request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

