import { NextResponse } from "next/server";

import {
  approveReviewRequestSchema,
  reviewProposalDetailSchema,
} from "@/lib/contracts/review";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { approveReviewProposal } from "@/server/services/review-action-service";

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
    const parsedBody = approveReviewRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_review_approve_request",
          message: "workspaceRoot is required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const proposal = await approveReviewProposal(
      parsedBody.data.workspaceRoot,
      id,
      parsedBody.data.note,
    );

    return NextResponse.json(reviewProposalDetailSchema.parse(proposal));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Review approve request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
