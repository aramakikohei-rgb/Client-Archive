import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async (request, { user, params }) => {
  const id = Number(params?.id);
  const card = queryOne(
    `SELECT bc.*, u.full_name as owner_name
     FROM business_cards bc
     LEFT JOIN users u ON bc.owner_user_id = u.id
     WHERE bc.id = ?`,
    [id]
  );
  if (!card) {
    return NextResponse.json({ error: "名刺が見つかりません" }, { status: 404 });
  }
  return NextResponse.json(card);
});

export const PUT = withAuth(async (request, { user, params }) => {
  const id = Number(params?.id);
  const existing = queryOne("SELECT * FROM business_cards WHERE id = ?", [id]);
  if (!existing) {
    return NextResponse.json({ error: "名刺が見つかりません" }, { status: 404 });
  }

  const body = await request.json();
  const fields = ["company_name", "person_name", "department", "title", "phone", "mobile", "email", "address", "website", "exchange_date", "client_id", "contact_id", "notes", "tags", "is_digitized"];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    if (field in body) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);
  execute(`UPDATE business_cards SET ${updates.join(", ")} WHERE id = ?`, values);

  logAudit({
    userId: user.id,
    userName: user.full_name,
    action: "UPDATE",
    entityType: "business_card",
    entityId: id,
    entityName: body.person_name || body.company_name,
  });

  const updated = queryOne("SELECT * FROM business_cards WHERE id = ?", [id]);
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { user, params }) => {
  const id = Number(params?.id);
  const existing = queryOne<{ person_name: string; company_name: string }>(
    "SELECT * FROM business_cards WHERE id = ?",
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: "名刺が見つかりません" }, { status: 404 });
  }

  execute("DELETE FROM business_cards WHERE id = ?", [id]);

  logAudit({
    userId: user.id,
    userName: user.full_name,
    action: "DELETE",
    entityType: "business_card",
    entityId: id,
    entityName: existing.person_name || existing.company_name,
  });

  return NextResponse.json({ success: true });
});
