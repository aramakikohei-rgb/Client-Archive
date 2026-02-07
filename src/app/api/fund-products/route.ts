import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiAuth";
import { query } from "@/database";
import type { FundProduct } from "@/lib/types";

export const GET = withAuth(async () => {
  try {
    const products = query<FundProduct>(
      "SELECT * FROM fund_products WHERE is_active = 1 ORDER BY product_name ASC"
    );

    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
