import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import type { Interaction } from "@/lib/types";

export const DELETE = withAuth(async (_request, { user, params }) => {
  try {
    const interactionId = parseInt(params?.id || "0", 10);
    const attachmentId = parseInt(params?.attachmentId || "0", 10);

    const interaction = await queryOne<Interaction>(
      "SELECT * FROM interactions WHERE id = ?",
      [interactionId]
    );
    if (!interaction) {
      return NextResponse.json({ error: "対応履歴が見つかりません" }, { status: 404 });
    }
    const attachment = await queryOne<{ id: number; file_name: string }>(
      "SELECT id, file_name FROM interaction_attachments WHERE id = ? AND interaction_id = ?",
      [attachmentId, interactionId]
    );
    if (!attachment) {
      return NextResponse.json({ error: "添付ファイルが見つかりません" }, { status: 404 });
    }

    await execute("DELETE FROM interaction_attachments WHERE id = ?", [attachmentId]);

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "DELETE",
      entityType: "attachment",
      entityId: attachmentId,
      entityName: attachment.file_name,
      details: { interaction_id: interactionId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
