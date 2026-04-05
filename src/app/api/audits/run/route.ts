import { NextResponse } from "next/server";

import { runAuditRequestSchema, runAuditResponseSchema } from "@/lib/contracts/audit";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { runAudit } from "@/server/services/audit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
