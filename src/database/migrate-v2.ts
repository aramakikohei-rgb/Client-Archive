/**
 * Migration v2: Add financial fields to clients + business_cards table
 * Run: npx tsx src/database/migrate-v2.ts
 *
 * NOTE: This migration has already been applied. The schema.sql now includes
 * all v2 columns and tables. This file is kept for reference only.
 */

import { createClient } from "@libsql/client";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "cimp.db");

async function migrate() {
  const db = createClient({ url: `file:${DB_PATH}` });

  console.log("Starting migration v2...");

  const newColumns = [
    "capital_amount_jpy REAL",
    "revenue_jpy REAL",
    "stock_code TEXT",
    "founding_date TEXT",
    "representative_name TEXT",
    "representative_title TEXT",
  ];

  for (const col of newColumns) {
    const colName = col.split(" ")[0];
    try {
      await db.execute(`ALTER TABLE clients ADD COLUMN ${col}`);
      console.log(`  Added column: clients.${colName}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column")) {
        console.log(`  Column clients.${colName} already exists, skipping`);
      } else {
        throw e;
      }
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS business_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES client_contacts(id) ON DELETE SET NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      image_path TEXT NOT NULL,
      company_name TEXT,
      person_name TEXT,
      department TEXT,
      title TEXT,
      phone TEXT,
      mobile TEXT,
      email TEXT,
      address TEXT,
      website TEXT,
      exchange_date DATE,
      owner_user_id INTEGER REFERENCES users(id),
      notes TEXT,
      tags TEXT,
      is_digitized INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("  Created table: business_cards");

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_business_cards_client ON business_cards(client_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_business_cards_owner ON business_cards(owner_user_id)`);
  console.log("  Created indexes for business_cards");

  console.log("Migration v2 complete!");
}

migrate().catch(console.error);
