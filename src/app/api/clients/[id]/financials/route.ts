import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne } from "@/database";
import type { ClientFinancial, ClientSegment } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);

    const client = await queryOne("SELECT id FROM clients WHERE id = ?", [clientId]);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const financials = await query<ClientFinancial>(
      `SELECT * FROM client_financials
       WHERE client_id = ?
       ORDER BY fiscal_period DESC, period_type ASC`,
      [clientId]
    );

    const segments = await query<ClientSegment>(
      `SELECT * FROM client_segments
       WHERE client_id = ?
       ORDER BY fiscal_period DESC, segment_order ASC`,
      [clientId]
    );

    return NextResponse.json({ financials, segments });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
