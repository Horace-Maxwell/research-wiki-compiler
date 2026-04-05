import { NextResponse } from "next/server";

import {
  refreshWikiPageLinksRequestSchema,
  wikiPageDetailSchema,
} from "@/lib/contracts/wiki";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { refreshWikiPageLinks } from "@/server/services/wiki-page-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsedBody = refreshWikiPageLinksRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_wiki_request",
          message: "workspaceRoot is required.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const page = await refreshWikiPageLinks(parsedBody.data.workspaceRoot, id);

    return NextResponse.json(wikiPageDetailSchema.parse(page));
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Wiki page refresh-links request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}
