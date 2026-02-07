import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne } from "@/database";
import { BUSINESS_CARD_PAGE_SIZE } from "@/lib/constants";

export const GET = withAuth(async (request, { user, params }) => {
  const clientId = Number(params?.id);
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Number(searchParams.get("limit")) || BUSINESS_CARD_PAGE_SIZE);
  const offset = (page - 1) * limit;
  const search = searchParams.get("search") || "";

  let where = "WHERE bc.client_id = ?";
  const queryParams: unknown[] = [clientId];

  if (search) {
    where += " AND (bc.company_name LIKE ? OR bc.person_name LIKE ? OR bc.email LIKE ? OR bc.phone LIKE ?)";
    const like = `%${search}%`;
    queryParams.push(like, like, like, like);
  }

  const countResult = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM business_cards bc ${where}`,
    queryParams
  );
  const total = countResult?.count || 0;

  const data = query(
    `SELECT bc.*, u.full_name as owner_name
     FROM business_cards bc
     LEFT JOIN users u ON bc.owner_user_id = u.id
     ${where}
     ORDER BY bc.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset]
  );

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  });
});
