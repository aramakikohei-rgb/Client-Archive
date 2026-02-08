import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { createInteractionSchema } from "@/lib/validators";
import type { Interaction } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);

    const interaction = await queryOne<Interaction>(
      `SELECT i.*, u.full_name as created_by_name, c.company_name
       FROM interactions i
       JOIN users u ON i.created_by = u.id
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [id]
    );
    if (!interaction) {
      return NextResponse.json({ error: "Interaction not found" }, { status: 404 });
    }

    const attachments = await query(
      `SELECT ia.id, ia.interaction_id, ia.file_name, ia.file_type, ia.file_size,
              ia.file_path, ia.uploaded_by, u.full_name as uploaded_by_name, ia.created_at
       FROM interaction_attachments ia
       JOIN users u ON ia.uploaded_by = u.id
       WHERE ia.interaction_id = ?
       ORDER BY ia.created_at DESC`,
      [id]
    );

    return NextResponse.json({ ...interaction, attachments });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);

    const existing = await queryOne<Interaction>(
      "SELECT * FROM interactions WHERE id = ?",
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Interaction not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateSchema = createInteractionSchema.partial();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};

    const allowedFields = [
      "interaction_type", "subject", "description", "interaction_date",
      "duration_minutes", "location", "meeting_objective", "meeting_outcome",
      "next_steps", "follow_up_date", "internal_participants", "external_participants",
      "proposal_amount_jpy", "proposal_status", "sentiment", "priority",
    ];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && allowedFields.includes(key)) {
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
      `UPDATE interactions SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "UPDATE",
      entityType: "interaction",
      entityId: id,
      entityName: existing.subject,
      details: { changed_fields: changedFields },
    });

    const updated = await queryOne(
      `SELECT i.*, u.full_name as created_by_name, c.company_name
       FROM interactions i
       JOIN users u ON i.created_by = u.id
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [id]
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
