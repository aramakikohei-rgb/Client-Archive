import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:data/cimp.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initializeDatabase(): Promise<void> {
  const db = getClient();
  const fs = await import("fs");
  const path = await import("path");
  const schemaPath = path.join(process.cwd(), "src", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length === 0) return false;
      const withoutComments = s.replace(/--.*$/gm, "").trim();
      if (withoutComments.length === 0) return false;
      if (withoutComments.toUpperCase().startsWith("PRAGMA")) return false;
      return true;
    });

  const isRemote = (process.env.TURSO_DATABASE_URL || "").startsWith("libsql://");
  if (!isRemote) {
    await db.execute("PRAGMA journal_mode = WAL");
    await db.execute("PRAGMA foreign_keys = ON");
  }

  for (const statement of statements) {
    await db.execute(statement + ";");
  }
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const db = getClient();
  const result = await db.execute({
    sql,
    args: (params || []) as InValue[],
  });
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const db = getClient();
  const result = await db.execute({
    sql,
    args: (params || []) as InValue[],
  });
  return result.rows[0] as T | undefined;
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<{ lastInsertRowid: number; changes: number }> {
  const db = getClient();
  const result = await db.execute({
    sql,
    args: (params || []) as InValue[],
  });
  return {
    lastInsertRowid: Number(result.lastInsertRowid),
    changes: result.rowsAffected,
  };
}

export async function transaction<T>(
  fn: (tx: { execute: typeof execute; query: typeof query; queryOne: typeof queryOne }) => Promise<T>
): Promise<T> {
  const db = getClient();
  const tx = await db.transaction("write");
  try {
    const txExecute = async (sql: string, params?: unknown[]) => {
      const result = await tx.execute({ sql, args: (params || []) as InValue[] });
      return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.rowsAffected };
    };
    const txQuery = async <Q = Record<string, unknown>>(sql: string, params?: unknown[]) => {
      const result = await tx.execute({ sql, args: (params || []) as InValue[] });
      return result.rows as Q[];
    };
    const txQueryOne = async <Q = Record<string, unknown>>(sql: string, params?: unknown[]) => {
      const result = await tx.execute({ sql, args: (params || []) as InValue[] });
      return result.rows[0] as Q | undefined;
    };
    const result = await fn({ execute: txExecute as typeof execute, query: txQuery as typeof query, queryOne: txQueryOne as typeof queryOne });
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
