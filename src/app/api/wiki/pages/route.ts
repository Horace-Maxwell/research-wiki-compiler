import { NextResponse } from "next/server";

import {
  createWikiPageRequestSchema,
  listWikiPagesQuerySchema,
  listWikiPagesResponseSchema,
  wikiPageDetailSchema,
} from "@/lib/contracts/wiki";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { createWikiPage, listWikiPages } from "@/server/services/wiki-page-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = listWikiPagesQuerySchema.safeParse({
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

    const pages = await listWikiPages(parsedQuery.data.workspaceRoot);

    return NextResponse.json(listWikiPagesResponseSchema.parse({ pages }));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Wiki page list request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = createWikiPageRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_wiki_request",
          message: "Invalid wiki page creation request.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const page = await createWikiPage(parsedBody.data);

    return NextResponse.json(wikiPageDetailSchema.parse(page), { status: 201 });
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Wiki page create request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
