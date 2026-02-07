/**
 * Migration v2: Add financial fields to clients + business_cards table
 * Run: npx tsx src/database/migrate-v2.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "cimp.db");

function migrate() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  console.log("Starting migration v2...");

  // Add financial columns to clients (SQLite ALTER TABLE only supports ADD COLUMN)
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
      db.exec(`ALTER TABLE clients ADD COLUMN ${col}`);
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

  // Create business_cards table
  db.exec(`
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

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_business_cards_client ON business_cards(client_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_business_cards_owner ON business_cards(owner_user_id)`);
  console.log("  Created indexes for business_cards");

  // Note: We cannot ALTER CHECK constraints in SQLite, but the audit_log
  // entity_type check is only enforced on INSERT. For the prototype we
  // recreate the table if needed, but since it's additive and the old
  // constraint doesn't block new code, we skip this for now.

  db.close();
  console.log("Migration v2 complete!");
}

migrate();
