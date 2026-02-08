import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import {
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS_PER_INTERACTION,
  ALLOWED_FILE_TYPES,
} from "@/lib/constants";
import type { Interaction, InteractionAttachment } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const interactionId = parseInt(params?.id || "0", 10);

    const interaction = await queryOne("SELECT id FROM interactions WHERE id = ?", [interactionId]);
    if (!interaction) {
      return NextResponse.json({ error: "対応履歴が見つかりません" }, { status: 404 });
    }

    const attachments = await query<InteractionAttachment>(
      `SELECT ia.id, ia.interaction_id, ia.file_name, ia.file_type, ia.file_size,
              ia.file_path, ia.uploaded_by, u.full_name as uploaded_by_name, ia.created_at
       FROM interaction_attachments ia
       JOIN users u ON ia.uploaded_by = u.id
       WHERE ia.interaction_id = ?
       ORDER BY ia.created_at DESC`,
      [interactionId]
    );

    return NextResponse.json(attachments);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, { user, params }) => {
  try {
    const interactionId = parseInt(params?.id || "0", 10);

    const interaction = await queryOne<Interaction>(
      "SELECT * FROM interactions WHERE id = ?",
      [interactionId]
    );
    if (!interaction) {
      return NextResponse.json({ error: "対応履歴が見つかりません" }, { status: 404 });
    }
    const countResult = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM interaction_attachments WHERE interaction_id = ?",
      [interactionId]
    );
    if ((countResult?.count || 0) >= MAX_ATTACHMENTS_PER_INTERACTION) {
      return NextResponse.json(
        { error: `添付ファイルは${MAX_ATTACHMENTS_PER_INTERACTION}件までです` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: "ファイルサイズが上限（10MB）を超えています" }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "非対応のファイル形式です" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const filePath = `db://attachments/${interactionId}/${Date.now()}`;
    const result = await execute(
      `INSERT INTO interaction_attachments
       (interaction_id, file_name, file_type, file_size, file_path, file_data, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [interactionId, file.name, file.type, file.size, filePath, base64Data, user.id]
    );

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "CREATE",
      entityType: "attachment",
      entityId: Number(result.lastInsertRowid),
      entityName: file.name,
      details: { interaction_id: interactionId, file_type: file.type, file_size: file.size },
    });

    return NextResponse.json(
      {
        id: Number(result.lastInsertRowid),
        interaction_id: interactionId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: filePath,
        uploaded_by: user.id,
        uploaded_by_name: user.full_name,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "ファイルのアップロードに失敗しました" }, { status: 500 });
  }
});
