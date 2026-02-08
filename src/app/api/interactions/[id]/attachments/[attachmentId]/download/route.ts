import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { queryOne } from "@/database";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const interactionId = parseInt(params?.id || "0", 10);
    const attachmentId = parseInt(params?.attachmentId || "0", 10);

    const attachment = await queryOne<{
      file_name: string;
      file_type: string;
      file_data: string;
    }>(
      "SELECT file_name, file_type, file_data FROM interaction_attachments WHERE id = ? AND interaction_id = ?",
      [attachmentId, interactionId]
    );

    if (!attachment || !attachment.file_data) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }

    const buffer = Buffer.from(attachment.file_data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": attachment.file_type,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.file_name)}"; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
