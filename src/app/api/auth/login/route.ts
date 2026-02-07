import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/database";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { loginSchema } from "@/lib/validators";
import type { UserWithPassword } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = queryOne<UserWithPassword>(
      "SELECT * FROM users WHERE email = ? AND is_active = 1",
      [email]
    );

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createToken(user.id);
    await setAuthCookie(token);

    // Update last login
    execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

    // Audit log
    logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "LOGIN",
      entityType: "session",
      entityName: user.email,
    });

    const { password_hash: _, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
