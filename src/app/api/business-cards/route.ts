import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withAuth } from "@/lib/apiAuth";
import { query, queryOne, execute } from "@/database";
import { logAudit } from "@/lib/audit";
import { BUSINESS_CARD_PAGE_SIZE } from "@/lib/constants";

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Number(searchParams.get("limit")) || BUSINESS_CARD_PAGE_SIZE);
  const offset = (page - 1) * limit;
  const search = searchParams.get("search") || "";
  const isDigitized = searchParams.get("is_digitized");

  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (search) {
    where += " AND (bc.company_name LIKE ? OR bc.person_name LIKE ? OR bc.email LIKE ? OR bc.phone LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (isDigitized !== null && isDigitized !== undefined && isDigitized !== "") {
    where += " AND bc.is_digitized = ?";
    params.push(Number(isDigitized));
  }

  const countResult = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM business_cards bc ${where}`,
    params
  );
  const total = countResult?.count || 0;

  const data = query(
    `SELECT bc.*, u.full_name as owner_name
     FROM business_cards bc
     LEFT JOIN users u ON bc.owner_user_id = u.id
     ${where}
     ORDER BY bc.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  });
});

export const POST = withAuth(async (request, { user }) => {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "cards");
    await mkdir(uploadDir, { recursive: true });
    const ext = imageFile.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await writeFile(filepath, buffer);

    const imagePath = `/uploads/cards/${filename}`;
    const companyName = (formData.get("company_name") as string) || null;
    const personName = (formData.get("person_name") as string) || null;
    const department = (formData.get("department") as string) || null;
    const title = (formData.get("title") as string) || null;
    const phone = (formData.get("phone") as string) || null;
    const mobile = (formData.get("mobile") as string) || null;
    const email = (formData.get("email") as string) || null;
    const address = (formData.get("address") as string) || null;
    const website = (formData.get("website") as string) || null;
    const exchangeDate = (formData.get("exchange_date") as string) || null;
    const clientId = formData.get("client_id") ? Number(formData.get("client_id")) : null;
    const notes = (formData.get("notes") as string) || null;
    const tags = (formData.get("tags") as string) || null;

    const result = execute(
      `INSERT INTO business_cards (image_path, company_name, person_name, department, title, phone, mobile, email, address, website, exchange_date, client_id, owner_user_id, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [imagePath, companyName, personName, department, title, phone, mobile, email, address, website, exchangeDate, clientId, user.id, notes, tags]
    );

    logAudit({
      userId: user.id,
      userName: user.full_name,
      action: "CREATE",
      entityType: "business_card",
      entityId: Number(result.lastInsertRowid),
      entityName: personName || companyName,
    });

    return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "名刺の登録に失敗しました" }, { status: 500 });
  }
});
