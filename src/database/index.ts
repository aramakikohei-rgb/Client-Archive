import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "cimp.db");
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();
  const schemaPath = path.join(process.cwd(), "src", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("PRAGMA"));

  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  for (const statement of statements) {
    database.exec(statement + ";");
  }
}

export function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return (params ? stmt.all(...params) : stmt.all()) as T[];
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): T | undefined {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return (params ? stmt.get(...params) : stmt.get()) as T | undefined;
}

export function execute(
  sql: string,
  params?: unknown[]
): Database.RunResult {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return params ? stmt.run(...params) : stmt.run();
}

export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}
