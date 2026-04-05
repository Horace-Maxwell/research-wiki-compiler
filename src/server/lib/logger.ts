import pino from "pino";

import { env } from "@/server/lib/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "research-wiki-compiler",
  },
});

