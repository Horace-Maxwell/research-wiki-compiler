import fs from "node:fs";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "@/server/db/schema";
import { DRIZZLE_MIGRATIONS_DIRECTORY } from "@/server/lib/repo-paths";

type BetterSqliteDatabase = InstanceType<typeof Database>;

const connectionCache = new Map<
  string,
  {
    sqlite: BetterSqliteDatabase;
    db: ReturnType<typeof drizzle<typeof schema>>;
  }
>();

function createConnection(dbPath: string) {
  const sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  };
}

export function getWorkspaceDatabase(dbPath: string) {
  const cached = connectionCache.get(dbPath);

  if (cached) {
    return cached;
  }

  const created = createConnection(dbPath);
  connectionCache.set(dbPath, created);

  return created;
}

export function runWorkspaceMigrations(dbPath: string) {
  const { db } = getWorkspaceDatabase(dbPath);

  migrate(db, {
    migrationsFolder: DRIZZLE_MIGRATIONS_DIRECTORY,
  });

  return db;
}

export function inspectDatabase(dbPath: string) {
  if (!fs.existsSync(dbPath)) {
    return {
      exists: false,
      tables: [] as string[],
    };
  }

  const sqlite = new Database(dbPath, {
    fileMustExist: true,
    readonly: true,
  });

  try {
    const rows = sqlite
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
      )
      .all() as Array<{ name: string }>;

    return {
      exists: true,
      tables: rows.map((row) => row.name),
    };
  } finally {
    sqlite.close();
  }
}
