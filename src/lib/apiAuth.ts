import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { queryOne } from "@/database";
import { JWT_SECRET, COOKIE_NAME } from "./constants";
import type { User, UserRole, UserWithPassword } from "./types";

const secret = new TextEncoder().encode(JWT_SECRET);

export interface AuthContext {
  user: User;
}

type AuthHandler = (
  request: NextRequest,
  context: AuthContext & { params?: Record<string, string> }
) => Promise<NextResponse>;

export function withAuth(handler: AuthHandler) {
  return async (
    request: NextRequest,
    segmentData?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, secret);
      const userId = payload.userId as number;

      const user = queryOne<UserWithPassword>(
        "SELECT * FROM users WHERE id = ? AND is_active = 1",
        [userId]
      );
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { password_hash: _, ...userWithoutPassword } = user;
      const params = segmentData?.params ? await segmentData.params : undefined;
      return handler(request, { user: userWithoutPassword, params });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  };
}

export function withRole(roles: UserRole[], handler: AuthHandler) {
  return withAuth(async (request, context) => {
    if (!roles.includes(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, context);
  });
}
