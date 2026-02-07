import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import type { Interaction } from "@/lib/types";

export const POST = withAuth(async (_request, { user, params }) => {
  try {
    const id = parseInt(params?.id || "0", 10);

    const interaction = queryOne<Interaction>(
      "SELECT * FROM interactions WHERE id = ?",
      [id]
    );
    if (!interaction) {
      return NextResponse.json({ error: "Interaction not found" }, { status: 404 });
    }

    if (interaction.is_locked) {
      return NextResponse.json(
        { error: "Interaction is already locked" },
        { status: 409 }
      );
    }

    execute(
      "UPDATE interactions SET is_locked = 1, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "LOCK_INTERACTION",
      entityType: "interaction",
      entityId: id,
      entityName: interaction.subject,
    });

    const updated = queryOne(
      `SELECT i.*, u.full_name as created_by_name
       FROM interactions i
       JOIN users u ON i.created_by = u.id
       WHERE i.id = ?`,
      [id]
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
