import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne } from "@/database";
import { INTERACTION_TYPE_LABELS } from "@/lib/constants";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);

    const client = await queryOne("SELECT id FROM clients WHERE id = ?", [clientId]);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const stats = await queryOne<{
      total_count: number;
      last_interaction_date: string | null;
      first_interaction_date: string | null;
    }>(
      `SELECT COUNT(*) as total_count,
              MAX(interaction_date) as last_interaction_date,
              MIN(interaction_date) as first_interaction_date
       FROM interactions WHERE client_id = ?`,
      [clientId]
    );

    const typeBreakdown = await query<{ interaction_type: string; count: number }>(
      `SELECT interaction_type, COUNT(*) as count
       FROM interactions WHERE client_id = ?
       GROUP BY interaction_type
       ORDER BY count DESC`,
      [clientId]
    );

    const sentimentBreakdown = await query<{ sentiment: string; count: number }>(
      `SELECT sentiment, COUNT(*) as count
       FROM interactions WHERE client_id = ? AND sentiment IS NOT NULL
       GROUP BY sentiment`,
      [clientId]
    );

    const recentInteractions = await query(
      `SELECT i.id, i.subject, i.interaction_type, i.interaction_date,
              i.sentiment, u.full_name as created_by_name,
              (SELECT COUNT(*) FROM interaction_attachments ia WHERE ia.interaction_id = i.id) as attachment_count
       FROM interactions i
       JOIN users u ON i.created_by = u.id
       WHERE i.client_id = ?
       ORDER BY i.interaction_date DESC
       LIMIT 5`,
      [clientId]
    );

    const pendingFollowUps = await query(
      `SELECT i.id, i.subject, i.follow_up_date, i.next_steps,
              i.interaction_type, u.full_name as created_by_name
       FROM interactions i
       JOIN users u ON i.created_by = u.id
       WHERE i.client_id = ? AND i.follow_up_date >= date('now') AND i.next_steps IS NOT NULL
       ORDER BY i.follow_up_date ASC`,
      [clientId]
    );

    const recentAttachments = await query(
      `SELECT ia.id, ia.file_name, ia.file_type, ia.file_size,
              ia.interaction_id, i.subject as interaction_subject,
              u.full_name as uploaded_by_name, ia.created_at
       FROM interaction_attachments ia
       JOIN interactions i ON ia.interaction_id = i.id
       JOIN users u ON ia.uploaded_by = u.id
       WHERE i.client_id = ?
       ORDER BY ia.created_at DESC
       LIMIT 5`,
      [clientId]
    );

    return NextResponse.json({
      total_count: stats?.total_count || 0,
      last_interaction_date: stats?.last_interaction_date || null,
      first_interaction_date: stats?.first_interaction_date || null,
      type_breakdown: typeBreakdown.map((t) => ({
        type: t.interaction_type,
        label: INTERACTION_TYPE_LABELS[t.interaction_type] || t.interaction_type,
        count: t.count,
      })),
      sentiment_breakdown: sentimentBreakdown,
      recent_interactions: recentInteractions,
      pending_follow_ups: pendingFollowUps,
      recent_attachments: recentAttachments,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
