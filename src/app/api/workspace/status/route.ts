import { NextResponse } from "next/server";
import { z } from "zod";

import { workspaceStatusSchema } from "@/lib/contracts/workspace";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { getWorkspaceStatus } from "@/server/services/workspace-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  workspaceRoot: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedRequest = requestSchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "invalid_workspace_request",
          message: "workspaceRoot is required.",
          details: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const status = await getWorkspaceStatus(parsedRequest.data.workspaceRoot);

    return NextResponse.json(workspaceStatusSchema.parse(status));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error(
      {
        error,
      },
      "Workspace status request failed.",
    );

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
