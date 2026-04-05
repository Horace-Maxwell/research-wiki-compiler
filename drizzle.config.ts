import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./demo-workspace/.research-wiki/app.db",
  },
  strict: true,
  verbose: true,
});

