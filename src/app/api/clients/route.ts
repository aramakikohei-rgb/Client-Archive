import { NextResponse } from "next/server";
import { withAuth, withRole } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { createClientSchema } from "@/lib/validators";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import type { ClientSummary, PaginatedResponse } from "@/lib/types";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const relationshipStatus = searchParams.get("relationship_status");
    const riskRating = searchParams.get("risk_rating");
    const assignedRmId = searchParams.get("assigned_rm_id");
    const sortBy = searchParams.get("sort_by") || "company_name";
    const sortOrder = searchParams.get("sort_order") === "desc" ? "DESC" : "ASC";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
    );
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push(
        "(company_name LIKE ? OR company_name_en LIKE ? OR industry LIKE ?)"
      );
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    if (relationshipStatus) {
      conditions.push("relationship_status = ?");
      params.push(relationshipStatus);
    }
    if (riskRating) {
      conditions.push("risk_rating = ?");
      params.push(riskRating);
    }
    if (assignedRmId) {
      conditions.push("assigned_rm_id = ?");
      params.push(parseInt(assignedRmId, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const allowedSortColumns = [
      "company_name",
      "industry",
      "relationship_status",
      "risk_rating",
      "interaction_count",
      "last_interaction_date",
      "active_product_count",
      "created_at",
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "company_name";

    const countResult = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM client_summary ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    const data = query<ClientSummary>(
      `SELECT * FROM client_summary ${whereClause} ORDER BY ${safeSortBy} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const response: PaginatedResponse<ClientSummary> = {
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

export const POST = withRole(["admin", "manager"], async (request, { user }) => {
  try {
    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = execute(
      `INSERT INTO clients (
        company_name, company_name_kana, company_name_en, industry, sub_industry,
        company_type, registration_number, address, address_en, city, country,
        phone, website, fiscal_year_end, aum_jpy, employee_count,
        relationship_start_date, relationship_status, risk_rating,
        assigned_rm_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.company_name,
        data.company_name_kana ?? null,
        data.company_name_en ?? null,
        data.industry ?? null,
        data.sub_industry ?? null,
        data.company_type ?? null,
        data.registration_number ?? null,
        data.address ?? null,
        data.address_en ?? null,
        data.city ?? null,
        data.country ?? "Japan",
        data.phone ?? null,
        data.website ?? null,
        data.fiscal_year_end ?? null,
        data.aum_jpy ?? null,
        data.employee_count ?? null,
        data.relationship_start_date ?? null,
        data.relationship_status ?? "prospect",
        data.risk_rating ?? null,
        data.assigned_rm_id ?? null,
        data.notes ?? null,
        user.id,
      ]
    );

    const clientId = Number(result.lastInsertRowid);

    logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "CREATE",
      entityType: "client",
      entityId: clientId,
      entityName: data.company_name,
    });

    const client = queryOne("SELECT * FROM clients WHERE id = ?", [clientId]);
    return NextResponse.json(client, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
