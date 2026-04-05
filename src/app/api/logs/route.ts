import { NextResponse } from "next/server";

import { listLogsQuerySchema, listLogsResponseSchema } from "@/lib/contracts/log";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { listRecentActivityLogs } from "@/server/services/logs-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = listLogsQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_logs_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const logs = await listRecentActivityLogs(
      parsedQuery.data.workspaceRoot,
      parsedQuery.data.limit,
    );

    return NextResponse.json(listLogsResponseSchema.parse({ logs }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Logs request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
