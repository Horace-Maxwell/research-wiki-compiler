import { NextResponse } from "next/server";

import {
  editAndApproveReviewRequestSchema,
  reviewProposalDetailSchema,
} from "@/lib/contracts/review";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { editAndApproveReviewProposal } from "@/server/services/review-action-service";

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
    const parsedBody = editAndApproveReviewRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_review_edit_approve_request",
          message: "workspaceRoot and edits are required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const proposal = await editAndApproveReviewProposal({
      workspaceRoot: parsedBody.data.workspaceRoot,
      proposalId: id,
      note: parsedBody.data.note,
      edits: parsedBody.data.edits,
    });

    return NextResponse.json(reviewProposalDetailSchema.parse(proposal));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Review edit-and-approve request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
