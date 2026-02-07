import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { createContactSchema } from "@/lib/validators";
import type { ClientContact } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);

    const client = await queryOne("SELECT id FROM clients WHERE id = ?", [clientId]);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const contacts = await query<ClientContact>(
      "SELECT * FROM client_contacts WHERE client_id = ? AND is_active = 1 ORDER BY is_primary_contact DESC, last_name ASC",
      [clientId]
    );

    return NextResponse.json({ data: contacts });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, { user, params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);

    const client = await queryOne<{ id: number; company_name: string }>(
      "SELECT id, company_name FROM clients WHERE id = ?",
      [clientId]
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createContactSchema.safeParse({ ...body, client_id: clientId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await execute(
      `INSERT INTO client_contacts (
        client_id, first_name, last_name, first_name_kana, last_name_kana,
        title, department, email, phone, mobile,
        is_primary_contact, is_decision_maker, preferred_language,
        preferred_contact_method, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        data.first_name,
        data.last_name,
        data.first_name_kana ?? null,
        data.last_name_kana ?? null,
        data.title ?? null,
        data.department ?? null,
        data.email ?? null,
        data.phone ?? null,
        data.mobile ?? null,
        data.is_primary_contact ?? 0,
        data.is_decision_maker ?? 0,
        data.preferred_language ?? "ja",
        data.preferred_contact_method ?? "email",
        data.notes ?? null,
        user.id,
      ]
    );

    const contactId = Number(result.lastInsertRowid);

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "CREATE",
      entityType: "client_contact",
      entityId: contactId,
      entityName: `${data.last_name} ${data.first_name}`,
      details: { client_id: clientId, client_name: client.company_name },
    });

    const contact = await queryOne("SELECT * FROM client_contacts WHERE id = ?", [contactId]);
    return NextResponse.json(contact, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
