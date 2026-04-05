import { NextResponse } from "next/server";

import {
  listAuditsQuerySchema,
  listAuditsResponseSchema,
  runAuditRequestSchema,
  runAuditResponseSchema,
} from "@/lib/contracts/audit";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { listAuditRuns, runAudit } from "@/server/services/audit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = listAuditsQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_audit_list_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const audits = await listAuditRuns(parsedQuery.data.workspaceRoot);

    return NextResponse.json(listAuditsResponseSchema.parse({ audits }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Audit list request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = runAuditRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_audit_run_request",
          message: "workspaceRoot and mode are required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const audit = await runAudit(parsedBody.data.workspaceRoot, parsedBody.data.mode);

    return NextResponse.json(runAuditResponseSchema.parse({ audit }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Audit run request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
