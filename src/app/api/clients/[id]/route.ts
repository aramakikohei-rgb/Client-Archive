import { NextResponse } from "next/server";
import { withAuth, withRole } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { updateClientSchema } from "@/lib/validators";
import type { Client } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);

    const client = await queryOne<Client>(
      "SELECT * FROM clients WHERE id = ?",
      [id]
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const contacts = await query(
      "SELECT * FROM client_contacts WHERE client_id = ? AND is_active = 1 ORDER BY is_primary_contact DESC, last_name ASC",
      [id]
    );

    const products = await query(
      `SELECT cp.*, fp.product_name, fp.product_type
       FROM client_products cp
       JOIN fund_products fp ON cp.product_id = fp.id
       WHERE cp.client_id = ?
       ORDER BY cp.status ASC, cp.maturity_date ASC`,
      [id]
    );

    const recentInteractionsCount = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM interactions WHERE client_id = ? AND interaction_date >= datetime('now', '-90 days')",
      [id]
    );

    const assignedRm = client.assigned_rm_id
      ? await queryOne<{ full_name: string }>(
          "SELECT full_name FROM users WHERE id = ?",
          [client.assigned_rm_id]
        )
      : null;

    return NextResponse.json({
      ...client,
      assigned_rm_name: assignedRm?.full_name || null,
      contacts,
      products,
      recent_interactions_count: recentInteractionsCount?.count || 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);
    const body = await request.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.message },
        { status: 400 }
      );
    }

    const existing = await queryOne<Client>(
      "SELECT * FROM clients WHERE id = ?",
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const data = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
        const existingValue = (existing as unknown as Record<string, unknown>)[key];
        if (existingValue !== value) {
          changedFields[key] = { from: existingValue, to: value };
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await execute(
      `UPDATE clients SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "UPDATE",
      entityType: "client",
      entityId: id,
      entityName: existing.company_name,
      details: { changed_fields: changedFields },
    });

    const updated = await queryOne("SELECT * FROM clients WHERE id = ?", [id]);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const DELETE = withRole(["admin"], async (_request, { user, params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);

    const existing = await queryOne<Client>(
      "SELECT * FROM clients WHERE id = ?",
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await execute(
      "UPDATE clients SET relationship_status = 'former', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "DELETE",
      entityType: "client",
      entityId: id,
      entityName: existing.company_name,
      details: { soft_delete: true, previous_status: existing.relationship_status },
    });

    return NextResponse.json({ message: "Client set to former status" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
