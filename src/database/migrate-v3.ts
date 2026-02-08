/**
 * Migration v3: Add file_data column to interaction_attachments
 * Run: npx tsx src/database/migrate-v3.ts
 */

import { createClient } from "@libsql/client";
import path from "path";

const isRemote = !!process.env.TURSO_DATABASE_URL && !process.env.TURSO_DATABASE_URL.startsWith("file:");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), "data", "cimp.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log("Starting migration v3...");

  try {
    await db.execute("ALTER TABLE interaction_attachments ADD COLUMN file_data TEXT");
    console.log("  Added column: interaction_attachments.file_data");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate column")) {
      console.log("  Column file_data already exists, skipping");
    } else {
      throw e;
    }
  }

  db.close();
  console.log("Migration v3 complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
