import { NextResponse } from "next/server";

import { workspaceStatusSchema } from "@/lib/contracts/workspace";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { initializeWorkspace } from "@/server/services/workspace-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const status = await initializeWorkspace(body);

    return NextResponse.json(workspaceStatusSchema.parse(status));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error(
      {
        error,
      },
      "Workspace initialization failed.",
    );

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

