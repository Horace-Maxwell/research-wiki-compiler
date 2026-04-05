import { NextResponse } from "next/server";

import {
  listSourcesQuerySchema,
  listSourcesResponseSchema,
} from "@/lib/contracts/source";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { listSources } from "@/server/services/source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = listSourcesQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
      status: url.searchParams.get("status") ?? undefined,
      sourceType: url.searchParams.get("sourceType") ?? undefined,
      importedAfter: url.searchParams.get("importedAfter") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_source_list_request",
          message: "Invalid source list request.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const sources = await listSources(parsedQuery.data);

    return NextResponse.json(listSourcesResponseSchema.parse({ sources }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Sources list request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

