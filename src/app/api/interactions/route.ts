import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { createInteractionSchema } from "@/lib/validators";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import type { Interaction, PaginatedResponse } from "@/lib/types";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const clientId = searchParams.get("client_id");
    const interactionType = searchParams.get("interaction_type");
    const createdBy = searchParams.get("created_by");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const sentiment = searchParams.get("sentiment");
    const priority = searchParams.get("priority");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
    );
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(subject LIKE ? OR description LIKE ? OR company_name LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    if (clientId) {
      conditions.push("client_id = ?");
      params.push(parseInt(clientId, 10));
    }
    if (interactionType) {
      conditions.push("interaction_type = ?");
      params.push(interactionType);
    }
    if (createdBy) {
      conditions.push("created_by = ?");
      params.push(parseInt(createdBy, 10));
    }
    if (dateFrom) {
      conditions.push("interaction_date >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push("interaction_date <= ?");
      params.push(dateTo);
    }
    if (sentiment) {
      conditions.push("sentiment = ?");
      params.push(sentiment);
    }
    if (priority) {
      conditions.push("priority = ?");
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM interaction_timeline ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    const data = await query<Interaction>(
      `SELECT * FROM interaction_timeline ${whereClause} ORDER BY interaction_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
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

export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json();
    const parsed = createInteractionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const client = await queryOne<{ id: number; company_name: string }>(
      "SELECT id, company_name FROM clients WHERE id = ?",
      [data.client_id]
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const result = await execute(
      `INSERT INTO interactions (
        client_id, interaction_type, subject, description, interaction_date,
        duration_minutes, location, meeting_objective, meeting_outcome,
        next_steps, follow_up_date, internal_participants, external_participants,
        proposal_amount_jpy, proposal_status, sentiment, priority, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.client_id,
        data.interaction_type,
        data.subject,
        data.description ?? null,
        data.interaction_date,
        data.duration_minutes ?? null,
        data.location ?? null,
        data.meeting_objective ?? null,
        data.meeting_outcome ?? null,
        data.next_steps ?? null,
        data.follow_up_date ?? null,
        data.internal_participants ?? null,
        data.external_participants ?? null,
        data.proposal_amount_jpy ?? null,
        data.proposal_status ?? null,
        data.sentiment ?? null,
        data.priority ?? "medium",
        user.id,
      ]
    );

    const interactionId = Number(result.lastInsertRowid);

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "CREATE",
      entityType: "interaction",
      entityId: interactionId,
      entityName: data.subject,
      details: { client_id: data.client_id, client_name: client.company_name, interaction_type: data.interaction_type },
    });

    const created = await queryOne(
      `SELECT i.*, u.full_name as created_by_name
       FROM interactions i
       JOIN users u ON i.created_by = u.id
       WHERE i.id = ?`,
      [interactionId]
    );

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
