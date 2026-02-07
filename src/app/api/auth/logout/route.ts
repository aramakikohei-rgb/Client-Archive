import { NextResponse } from "next/server";
import { getCurrentUser, clearAuthCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      logAudit({
        userId: user.id,
        userName: user.full_name,
        action: "LOGOUT",
        entityType: "session",
        entityName: user.email,
      });
    }
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
