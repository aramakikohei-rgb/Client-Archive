import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import type { User } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);

    const user = await queryOne<User>(
      `SELECT id, email, full_name, full_name_kana, role, department, title,
              phone, is_active, last_login_at, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);

    const existing = await queryOne<User>(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admin can update other users, or user can update themselves
    if (user.role !== "admin" && user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};

    const allowedFields = [
      "full_name", "full_name_kana", "department", "title", "phone",
    ];

    // Admin-only fields
    const adminFields = ["role", "is_active"];
    const allAllowed = user.role === "admin"
      ? [...allowedFields, ...adminFields]
      : allowedFields;

    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && allAllowed.includes(key)) {
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

    // Check if role is being changed for audit purposes
    const roleChanged = changedFields["role"] !== undefined;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: roleChanged ? "ROLE_CHANGE" : "UPDATE",
      entityType: "user",
      entityId: id,
      entityName: existing.full_name,
      details: { changed_fields: changedFields },
    });

    const updated = await queryOne<User>(
      `SELECT id, email, full_name, full_name_kana, role, department, title,
              phone, is_active, last_login_at, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
