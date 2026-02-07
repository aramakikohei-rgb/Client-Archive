import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import type { ClientProduct } from "@/lib/types";

export const GET = withAuth(async (_request, { params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);

    const client = await queryOne("SELECT id FROM clients WHERE id = ?", [clientId]);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const products = await query<ClientProduct>(
      `SELECT cp.*, fp.product_name, fp.product_type, fp.product_name_en
       FROM client_products cp
       JOIN fund_products fp ON cp.product_id = fp.id
       WHERE cp.client_id = ?
       ORDER BY cp.status ASC, cp.maturity_date ASC`,
      [clientId]
    );

    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, { user, params }) => {
  try {
    const clientId = parseInt(params?.id || "0", 10);

    const client = await queryOne<{ id: number; company_name: string }>(
      "SELECT id, company_name FROM clients WHERE id = ?",
      [clientId]
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();
    const { product_id, facility_amount_jpy, spread_bps, start_date, maturity_date, status, notes } = body;

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    const product = await queryOne<{ id: number; product_name: string }>(
      "SELECT id, product_name FROM fund_products WHERE id = ?",
      [product_id]
    );
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const result = await execute(
      `INSERT INTO client_products (
        client_id, product_id, facility_amount_jpy, spread_bps,
        start_date, maturity_date, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        product_id,
        facility_amount_jpy ?? null,
        spread_bps ?? null,
        start_date ?? null,
        maturity_date ?? null,
        status ?? "prospecting",
        notes ?? null,
        user.id,
      ]
    );

    const associationId = Number(result.lastInsertRowid);

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "CREATE",
      entityType: "client_product",
      entityId: associationId,
      entityName: `${client.company_name} - ${product.product_name}`,
      details: { client_id: clientId, product_id },
    });

    const created = await queryOne(
      `SELECT cp.*, fp.product_name, fp.product_type
       FROM client_products cp
       JOIN fund_products fp ON cp.product_id = fp.id
       WHERE cp.id = ?`,
      [associationId]
    );

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
