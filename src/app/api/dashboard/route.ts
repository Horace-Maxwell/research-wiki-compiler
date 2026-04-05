import { NextResponse } from "next/server";

import { getDashboardQuerySchema, getDashboardResponseSchema } from "@/lib/contracts/dashboard";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { getDashboardOverview } from "@/server/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = getDashboardQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_dashboard_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const dashboard = await getDashboardOverview(parsedQuery.data.workspaceRoot);

    return NextResponse.json(getDashboardResponseSchema.parse({ dashboard }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Dashboard request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
