import { createHash } from "crypto";
import { execute, queryOne } from "@/database";
import type { AuditAction, AuditEntityType } from "./types";

interface AuditParams {
  userId: number;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number | null;
  entityName?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export function logAudit(params: AuditParams): void {
  const timestamp = new Date().toISOString();
  const detailsJson = params.details ? JSON.stringify(params.details) : null;

  // Get the last audit entry's hash for chain
  const lastEntry = queryOne<{ entry_hash: string }>(
    "SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1"
  );
  const previousHash = lastEntry?.entry_hash || null;

  // Create hash of this entry
  const data = `${timestamp}|${params.userId}|${params.action}|${params.entityType}|${params.entityId ?? ""}|${detailsJson ?? ""}|${previousHash ?? "genesis"}`;
  const entryHash = createHash("sha256").update(data).digest("hex");

  execute(
    `INSERT INTO audit_log (timestamp, user_id, user_name, action, entity_type, entity_id, entity_name, details, ip_address, previous_hash, entry_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      timestamp,
      params.userId,
      params.userName,
      params.action,
      params.entityType,
      params.entityId ?? null,
      params.entityName ?? null,
      detailsJson,
      params.ipAddress ?? null,
      previousHash,
      entryHash,
    ]
  );
}
