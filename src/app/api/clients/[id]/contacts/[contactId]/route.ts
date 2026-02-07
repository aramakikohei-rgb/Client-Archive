import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { createContactSchema } from "@/lib/validators";
import type { ClientContact } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);
    const contactId = parseInt(params?.contactId || "0", 10);

    const contact = queryOne<ClientContact>(
      "SELECT * FROM client_contacts WHERE id = ? AND client_id = ?",
      [contactId, clientId]
    );
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);
    const contactId = parseInt(params?.contactId || "0", 10);

    const existing = queryOne<ClientContact>(
      "SELECT * FROM client_contacts WHERE id = ? AND client_id = ?",
      [contactId, clientId]
    );
    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateSchema = createContactSchema.partial();
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
      "first_name", "last_name", "first_name_kana", "last_name_kana",
      "title", "department", "email", "phone", "mobile",
      "is_primary_contact", "is_decision_maker", "preferred_language",
      "preferred_contact_method", "notes",
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
    values.push(contactId, clientId);

    execute(
      `UPDATE client_contacts SET ${fields.join(", ")} WHERE id = ? AND client_id = ?`,
      values
    );

    logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "UPDATE",
      entityType: "client_contact",
      entityId: contactId,
      entityName: `${existing.last_name} ${existing.first_name}`,
      details: { client_id: clientId, changed_fields: changedFields },
    });

    const updated = queryOne("SELECT * FROM client_contacts WHERE id = ?", [contactId]);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (_request, { user, params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);
    const contactId = parseInt(params?.contactId || "0", 10);

    const existing = queryOne<ClientContact>(
      "SELECT * FROM client_contacts WHERE id = ? AND client_id = ?",
      [contactId, clientId]
    );
    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    execute(
      "UPDATE client_contacts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND client_id = ?",
      [contactId, clientId]
    );

    logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "DELETE",
      entityType: "client_contact",
      entityId: contactId,
      entityName: `${existing.last_name} ${existing.first_name}`,
      details: { client_id: clientId, soft_delete: true },
    });

    return NextResponse.json({ message: "Contact deactivated" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
