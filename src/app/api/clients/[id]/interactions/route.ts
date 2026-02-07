import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne } from "@/database";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import type { Interaction, PaginatedResponse } from "@/lib/types";

export const GET = withAuth(async (request, { params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);

    const client = queryOne("SELECT id FROM clients WHERE id = ?", [clientId]);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
    );
    const offset = (page - 1) * limit;

    const countResult = queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM interactions WHERE client_id = ?",
      [clientId]
    );
    const total = countResult?.count || 0;

    const data = query<Interaction>(
      `SELECT i.*, u.full_name as created_by_name,
        (SELECT COUNT(*) FROM interaction_attachments ia WHERE ia.interaction_id = i.id) as attachment_count
       FROM interactions i
       JOIN users u ON i.created_by = u.id
       WHERE i.client_id = ?
       ORDER BY i.interaction_date DESC
       LIMIT ? OFFSET ?`,
      [clientId, limit, offset]
    );

    const response: PaginatedResponse<Interaction> = {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
