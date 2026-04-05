import { NextResponse } from "next/server";

import {
  getWikiPageQuerySchema,
  updateWikiPageRequestSchema,
  wikiPageDetailSchema,
} from "@/lib/contracts/wiki";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { getWikiPageDetail, updateWikiPage } from "@/server/services/wiki-page-service";

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
    const parsedQuery = getWikiPageQuerySchema.safeParse({
      workspaceRoot: url.searchParams.get("workspaceRoot"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "invalid_wiki_request",
          message: "workspaceRoot is required.",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const page = await getWikiPageDetail(parsedQuery.data.workspaceRoot, id);

    return NextResponse.json(wikiPageDetailSchema.parse(page));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Wiki page detail request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsedBody = updateWikiPageRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_wiki_request",
          message: "Invalid wiki page update request.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const page = await updateWikiPage({
      workspaceRoot: parsedBody.data.workspaceRoot,
      pageId: id,
      rawContent: parsedBody.data.rawContent,
    });

    return NextResponse.json(wikiPageDetailSchema.parse(page));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Wiki page update request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
