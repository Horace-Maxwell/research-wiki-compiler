import { NextResponse } from "next/server";

import {
  listReviewsQuerySchema,
  listReviewsResponseSchema,
} from "@/lib/contracts/review";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { listReviewProposals } from "@/server/services/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = listReviewsQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
      status: url.searchParams.get("status") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_review_list_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const proposals = await listReviewProposals(parsedQuery.data.workspaceRoot, {
      status: parsedQuery.data.status,
    });

    return NextResponse.json(listReviewsResponseSchema.parse({ proposals }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Review list request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
