import { NextResponse } from "next/server";

import {
  planSourcePatchesRequestSchema,
  planSourcePatchesResponseSchema,
} from "@/lib/contracts/review";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { planPatchProposalsForSource } from "@/server/services/patch-planner-service";
import { getReviewProposalSummariesByIds } from "@/server/services/review-service";

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
    const parsedBody = planSourcePatchesRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_patch_planning_request",
          message: "workspaceRoot is required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await planPatchProposalsForSource(parsedBody.data.workspaceRoot, id);
    const proposals = await getReviewProposalSummariesByIds(
      parsedBody.data.workspaceRoot,
      result.proposalIds,
    );

    return NextResponse.json(planSourcePatchesResponseSchema.parse({ proposals }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Source patch planning request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
