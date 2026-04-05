import { NextResponse } from "next/server";

import {
  sourceDetailSchema,
  sourceImportRequestSchema,
} from "@/lib/contracts/source";
import { getErrorResponse } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { importSource } from "@/server/services/source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = sourceImportRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "invalid_source_import_request",
          message: "Invalid source import request.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const source = await importSource(parsedBody.data);

    return NextResponse.json(sourceDetailSchema.parse(source), { status: 201 });
  } catch (error) {
    const response = getErrorResponse(error);

    logger.error({ error }, "Source import request failed.");

    return NextResponse.json(response.body, { status: response.statusCode });
  }
}

