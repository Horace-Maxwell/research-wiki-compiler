import { NextResponse } from "next/server";

import { auditRunDetailSchema, getAuditQuerySchema } from "@/lib/contracts/audit";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { getAuditRunDetail } from "@/server/services/audit-service";

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
    const parsedQuery = getAuditQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_audit_detail_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const audit = await getAuditRunDetail(parsedQuery.data.workspaceRoot, id);

    return NextResponse.json(auditRunDetailSchema.parse(audit));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Audit detail request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
