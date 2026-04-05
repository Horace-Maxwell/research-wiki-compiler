import { NextResponse } from "next/server";

import {
  getReviewQuerySchema,
  reviewProposalDetailSchema,
} from "@/lib/contracts/review";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { getReviewProposalDetail } from "@/server/services/review-service";

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
    const parsedQuery = getReviewQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_review_detail_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const proposal = await getReviewProposalDetail(parsedQuery.data.workspaceRoot, id);

    return NextResponse.json(reviewProposalDetailSchema.parse(proposal));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Review detail request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
