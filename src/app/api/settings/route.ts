import { NextResponse } from "next/server";

import {
  workspaceSettingsQuerySchema,
  workspaceSettingsResponseSchema,
  workspaceSettingsUpdateRequestSchema,
} from "@/lib/contracts/workspace";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import {
  readWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/server/services/settings-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = workspaceSettingsQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_settings_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const settings = await readWorkspaceSettings(parsedQuery.data.workspaceRoot);

    if (!settings) {
      return NextResponse.json(
        {
          error: "workspace_settings_missing",
          message: "Workspace settings not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(workspaceSettingsResponseSchema.parse({ settings }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Workspace settings read failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = workspaceSettingsUpdateRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_settings_update_request",
          message: "Invalid settings update request.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const settings = await updateWorkspaceSettings(parsedBody.data.workspaceRoot, {
      llm: parsedBody.data.llm,
      review: parsedBody.data.review,
    });

    return NextResponse.json(workspaceSettingsResponseSchema.parse({ settings }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Workspace settings update failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
