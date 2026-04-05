import { NextResponse } from "next/server";

import {
  rejectReviewRequestSchema,
  reviewProposalDetailSchema,
} from "@/lib/contracts/review";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { rejectReviewProposal } from "@/server/services/review-action-service";

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
    const parsedBody = rejectReviewRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_review_reject_request",
          message: "workspaceRoot and note are required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const proposal = await rejectReviewProposal(
      parsedBody.data.workspaceRoot,
      id,
      parsedBody.data.note,
    );

    return NextResponse.json(reviewProposalDetailSchema.parse(proposal));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Review reject request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
