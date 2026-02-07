import { NextResponse } from "next/server";
import { withAuth, withRole } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { createUserSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export const GET = withAuth(async () => {
  try {
    const users = await query<User>(
      `SELECT id, email, full_name, full_name_kana, role, department, title,
              phone, is_active, last_login_at, created_at, updated_at
       FROM users
       ORDER BY full_name ASC`
    );

    return NextResponse.json({ data: users });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withRole(["admin"], async (request, { user }) => {
  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if email already exists
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE email = ?",
      [data.email]
    );
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(data.password);

    const result = await execute(
      `INSERT INTO users (
        email, password_hash, full_name, full_name_kana, role,
        department, title, phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.email,
        passwordHash,
        data.full_name,
        data.full_name_kana ?? null,
        data.role,
        data.department ?? null,
        data.title ?? null,
        data.phone ?? null,
      ]
    );

    const newUserId = Number(result.lastInsertRowid);

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "CREATE",
      entityType: "user",
      entityId: newUserId,
      entityName: data.full_name,
      details: { email: data.email, role: data.role },
    });

    const created = await queryOne<User>(
      `SELECT id, email, full_name, full_name_kana, role, department, title,
              phone, is_active, last_login_at, created_at, updated_at
       FROM users WHERE id = ?`,
      [newUserId]
    );

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
