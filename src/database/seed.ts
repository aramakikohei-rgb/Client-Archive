import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

const dbPath = path.join(process.cwd(), "data", "cimp.db");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Remove existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  // Also remove WAL/SHM files if they exist
  if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
  if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
  console.log("Removed existing database");
}

const db = createClient({
  url: `file:${dbPath}`,
});

async function seed() {
  await db.execute("PRAGMA journal_mode = WAL");
  await db.execute("PRAGMA foreign_keys = ON");

  // Read and execute schema
  const schemaPath = path.join(process.cwd(), "src", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("PRAGMA"));

  for (const statement of statements) {
    await db.execute(statement + ";");
  }
  console.log("Schema created successfully");

  // Password hashing (simple SHA-256 for prototype)
  function hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  // Audit hash helper
  let lastAuditHash: string | null = null;
  function createAuditHash(data: string): string {
    const input = data + (lastAuditHash || "genesis");
    const hash = createHash("sha256").update(input).digest("hex");
    lastAuditHash = hash;
    return hash;
  }

  async function insertAudit(
    userId: number,
    userName: string,
    action: string,
    entityType: string,
    entityId: number | null,
    entityName: string | null,
    details: string | null,
    timestamp?: string
  ) {
    const ts = timestamp || new Date().toISOString();
    const data = `${ts}|${userId}|${action}|${entityType}|${entityId}|${details}`;
    const hash = createAuditHash(data);
    await db.execute({
      sql: `INSERT INTO audit_log (timestamp, user_id, user_name, action, entity_type, entity_id, entity_name, details, previous_hash, entry_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [ts, userId, userName, action, entityType, entityId, entityName, details, lastAuditHash, hash],
    });
  }

  // ============================================================
  // SEED USERS
  // ============================================================
  const passwordHash = hashPassword("password123");

  const users = [
    {
      email: "tanaka.y@mutb.demo",
      full_name: "Tanaka Yusuke",
      full_name_kana: "タナカ ユウスケ",
      role: "admin",
      department: "Fund Finance Division",
      title: "Division Head",
      phone: "+81-3-3240-1001",
    },
    {
      email: "suzuki.a@mutb.demo",
      full_name: "Suzuki Akiko",
      full_name_kana: "スズキ アキコ",
      role: "manager",
      department: "Fund Finance Division",
      title: "Senior Manager",
      phone: "+81-3-3240-1002",
    },
    {
      email: "yamamoto.k@mutb.demo",
      full_name: "Yamamoto Kenji",
      full_name_kana: "ヤマモト ケンジ",
      role: "staff",
      department: "Fund Finance Division",
      title: "Relationship Manager",
      phone: "+81-3-3240-1003",
    },
    {
      email: "watanabe.m@mutb.demo",
      full_name: "Watanabe Miki",
      full_name_kana: "ワタナベ ミキ",
      role: "staff",
      department: "Fund Finance Division",
      title: "Relationship Manager",
      phone: "+81-3-3240-1004",
    },
    {
      email: "sato.t@mutb.demo",
      full_name: "Sato Takeshi",
      full_name_kana: "サトウ タケシ",
      role: "manager",
      department: "Fund Finance Division",
      title: "Manager",
      phone: "+81-3-3240-1005",
    },
  ];

  for (const u of users) {
    await db.execute({
      sql: `INSERT INTO users (email, password_hash, full_name, full_name_kana, role, department, title, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [u.email, passwordHash, u.full_name, u.full_name_kana, u.role, u.department, u.title, u.phone],
    });
  }
  console.log(`Seeded ${users.length} users`);

  // ============================================================
  // SEED CLIENTS
  // ============================================================
  const clients = [
    {
      company_name: "野村不動産マスターファンド投資法人",
      company_name_kana: "ノムラフドウサンマスターファンドトウシホウジン",
      company_name_en: "Nomura Real Estate Master Fund, Inc.",
      industry: "Real Estate",
      sub_industry: "J-REIT",
      company_type: "Fund",
      city: "Tokyo",
      address: "東京都新宿区西新宿1-26-2 新宿野村ビル22F",
      phone: "+81-3-3365-8767",
      website: "https://www.nre-mf.co.jp",
      fiscal_year_end: "February",
      aum_jpy: 1200000,
      employee_count: null,
      relationship_start_date: "2020-04-01",
      relationship_status: "active",
      risk_rating: "low",
      assigned_rm_id: 3,
      created_by: 1,
      capital_amount_jpy: 196244,
      revenue_jpy: 58200,
      stock_code: "3462",
      founding_date: "2015-06",
      representative_name: "中村 博",
      representative_title: "執行役員",
      notes: "国内最大級の総合型J-REIT。野村不動産グループがスポンサー。オフィス・住宅・物流・商業の4セクターに分散投資。NAVファシリティ及びキャピタルコールファシリティ双方で取引あり。格付はAA-(JCR)。安定的な分配金実績を維持。",
    },
    {
      company_name: "日本プライベートエクイティパートナーズ",
      company_name_kana: "ニホンプライベートエクイティパートナーズ",
      company_name_en: "Japan Private Equity Partners Co., Ltd.",
      industry: "Private Equity",
      sub_industry: "Buyout",
      company_type: "Fund",
      city: "Tokyo",
      address: "東京都千代田区丸の内2-6-1 丸の内パークビルディング10F",
      phone: "+81-3-6212-5880",
      website: "https://www.jpep.co.jp",
      fiscal_year_end: "March",
      aum_jpy: 350000,
      employee_count: 45,
      relationship_start_date: "2021-07-15",
      relationship_status: "active",
      risk_rating: "medium",
      assigned_rm_id: 3,
      created_by: 2,
      capital_amount_jpy: 500,
      revenue_jpy: 1200,
      stock_code: null,
      founding_date: "2000-04",
      representative_name: "谷口 恵子",
      representative_title: "代表取締役",
      notes: "日本の中堅企業を対象としたバイアウトファンドを運用。現在Fund IV(AUM 350億円)を運用中で、Fund V(目標500億円)の立ち上げを準備中。GP/運用会社ファシリティ及びキャピタルコールファシリティで取引あり。投資実績は過去20年で40社以上。",
    },
    {
      company_name: "SBIキャピタルマネジメント",
      company_name_kana: "エスビーアイキャピタルマネジメント",
      company_name_en: "SBI Capital Management Co., Ltd.",
      industry: "Private Equity",
      sub_industry: "Venture Capital",
      company_type: "Corporation",
      city: "Tokyo",
      address: "東京都港区六本木1-6-1 泉ガーデンタワー19F",
      phone: "+81-3-6229-0100",
      website: "https://www.sbicm.co.jp",
      fiscal_year_end: "March",
      aum_jpy: 280000,
      employee_count: 85,
      relationship_start_date: "2022-01-10",
      relationship_status: "active",
      risk_rating: "low",
      assigned_rm_id: 4,
      created_by: 2,
      capital_amount_jpy: 1000,
      revenue_jpy: 3500,
      stock_code: null,
      founding_date: "2005-09",
      representative_name: "北村 正人",
      representative_title: "代表取締役社長",
      notes: "SBIグループのPE・VC運用子会社。テクノロジー・ヘルスケアセクターに特化したベンチャー投資を展開。キャピタルコールファシリティで取引中。ブリッジローンの需要増加傾向。親会社SBIホールディングス(8473)の信用力が補完。",
    },
    {
      company_name: "東京海上キャピタル",
      company_name_kana: "トウキョウカイジョウキャピタル",
      company_name_en: "Tokio Marine Capital Co., Ltd.",
      industry: "Insurance / PE",
      sub_industry: "Multi-strategy",
      company_type: "Corporation",
      city: "Tokyo",
      address: "東京都千代田区丸の内1-2-1 東京海上日動ビル新館8F",
      phone: "+81-3-3285-1660",
      website: "https://www.tokiomarinecapital.com",
      fiscal_year_end: "March",
      aum_jpy: 450000,
      employee_count: 62,
      relationship_start_date: "2025-09-01",
      relationship_status: "prospect",
      risk_rating: "medium",
      assigned_rm_id: 3,
      created_by: 1,
      capital_amount_jpy: 5000,
      revenue_jpy: 8500,
      stock_code: null,
      founding_date: "2001-07",
      representative_name: "小川 大輔",
      representative_title: "代表取締役",
      notes: "東京海上グループの投資子会社。PE・VC・不動産の3本柱でマルチストラテジー運用を展開。現在みずほ・三井住友銀行とファンドファイナンス取引あり。ハイブリッドファシリティのRFPを2025年11月に予定。新規獲得の重要ターゲット。",
    },
    {
      company_name: "三菱地所物流リート投資法人",
      company_name_kana: "ミツビシジショブツリュウリートトウシホウジン",
      company_name_en: "Mitsubishi Estate Logistics REIT Investment Corporation",
      industry: "Real Estate",
      sub_industry: "Logistics REIT",
      company_type: "Fund",
      city: "Tokyo",
      address: "東京都千代田区大手町1-3-2 経団連会館12F",
      phone: "+81-3-3218-0011",
      website: "https://mel-reit.co.jp",
      fiscal_year_end: "August",
      aum_jpy: 550000,
      employee_count: null,
      relationship_start_date: "2019-11-20",
      relationship_status: "active",
      risk_rating: "low",
      assigned_rm_id: 4,
      created_by: 1,
      capital_amount_jpy: 128500,
      revenue_jpy: 21600,
      stock_code: "3481",
      founding_date: "2016-12",
      representative_name: "松田 慎吾",
      representative_title: "執行役員",
      notes: "三菱地所グループがスポンサーの物流特化型J-REIT。首都圏・関西圏の大型物流施設を中心にポートフォリオを構築。NAVファシリティ及びウェアハウスファシリティで取引中。eコマース需要拡大により物件取得パイプラインが豊富。格付はAA(JCR)。",
    },
    {
      company_name: "CLSAキャピタルパートナーズジャパン",
      company_name_kana: "シーエルエスエーキャピタルパートナーズジャパン",
      company_name_en: "CLSA Capital Partners Japan Co., Ltd.",
      industry: "Private Equity",
      sub_industry: "Growth Equity",
      company_type: "Fund",
      city: "Tokyo",
      address: "東京都千代田区大手町1-9-2 大手町フィナンシャルシティ グランキューブ15F",
      phone: "+81-3-4578-8600",
      website: "https://www.clsacapitalpartners.com",
      fiscal_year_end: "December",
      aum_jpy: 180000,
      employee_count: 28,
      relationship_start_date: "2023-03-01",
      relationship_status: "active",
      risk_rating: "medium",
      assigned_rm_id: 3,
      created_by: 2,
      capital_amount_jpy: 300,
      revenue_jpy: 900,
      stock_code: null,
      founding_date: "2010-03",
      representative_name: "青木 純",
      representative_title: "マネージングパートナー",
      notes: "CLSA（中信里昂証券）系のグロースエクイティファンド。アジア太平洋地域のミドルマーケット企業に投資。日本ではFund II(AUM 180億円)を運用中で80%投資済み。Fund IIIの2026年立ち上げを検討中。キャピタルコールファシリティで取引中。",
    },
    {
      company_name: "大和不動産投資顧問",
      company_name_kana: "ダイワフドウサントウシコモン",
      company_name_en: "Daiwa Real Estate Asset Management Co., Ltd.",
      industry: "Real Estate",
      sub_industry: "Advisory",
      company_type: "Corporation",
      city: "Osaka",
      address: "大阪府大阪市北区梅田3-3-10 梅田ダイビル15F",
      phone: "+81-6-6347-2500",
      website: "https://www.daiwa-re-am.co.jp",
      fiscal_year_end: "March",
      aum_jpy: 320000,
      employee_count: 120,
      relationship_start_date: "2018-06-15",
      relationship_status: "dormant",
      risk_rating: "high",
      assigned_rm_id: 4,
      created_by: 1,
      capital_amount_jpy: 2000,
      revenue_jpy: 4500,
      stock_code: null,
      founding_date: "1998-11",
      representative_name: "吉田 健太",
      representative_title: "代表取締役社長",
      notes: "大和証券グループの不動産投資顧問会社。関西圏中心に運用。2024年より事業再構築中のため取引休止。2025年Q4に組織再編完了予定。再開時にはNAVファシリティの需要見込み。過去のNAVファシリティ(120億円)は2024年6月に期限満了。",
    },
    {
      company_name: "パシフィックセンチュリーグループジャパン",
      company_name_kana: "パシフィックセンチュリーグループジャパン",
      company_name_en: "Pacific Century Group Japan K.K.",
      industry: "Infrastructure / PE",
      sub_industry: "Infrastructure",
      company_type: "Fund",
      city: "Tokyo",
      address: "東京都港区赤坂1-12-32 アーク森ビル30F",
      phone: "+81-3-4540-7700",
      website: "https://www.pacificcenturygroup.com",
      fiscal_year_end: "December",
      aum_jpy: 90000,
      employee_count: 15,
      relationship_start_date: "2025-11-01",
      relationship_status: "prospect",
      risk_rating: "medium",
      assigned_rm_id: 4,
      created_by: 5,
      capital_amount_jpy: 800,
      revenue_jpy: null,
      stock_code: null,
      founding_date: "2018-06",
      representative_name: "木村 太郎",
      representative_title: "カントリーヘッド",
      notes: "香港拠点のPCGグループの日本法人。日本のインフラ投資(再生エネルギー・通信インフラ)に特化。初のジャパンインフラファンド(目標200億円)を2026年Q2にファーストクローズ予定。キャピタルコールファシリティの需要見込み。",
    },
    {
      company_name: "三井住友トラスト・キャピタル",
      company_name_kana: "ミツイスミトモトラストキャピタル",
      company_name_en: "Sumitomo Mitsui Trust Capital Co., Ltd.",
      industry: "Multi-strategy",
      sub_industry: "Diversified Finance",
      company_type: "Corporation",
      city: "Tokyo",
      address: "東京都港区芝3-33-1 三井住友信託銀行本店ビル18F",
      phone: "+81-3-6718-3200",
      website: "https://www.smtcapital.co.jp",
      fiscal_year_end: "March",
      aum_jpy: 670000,
      employee_count: 180,
      relationship_start_date: "2020-09-01",
      relationship_status: "active",
      risk_rating: "low",
      assigned_rm_id: 3,
      created_by: 1,
      capital_amount_jpy: 10000,
      revenue_jpy: 25000,
      stock_code: null,
      founding_date: "2012-04",
      representative_name: "西村 巧",
      representative_title: "代表取締役",
      notes: "三井住友信託銀行グループの投資運用子会社。不動産・インフラ・PE・クレジットの4分野でマルチストラテジー運用。当行最大の取引先の一つ。キャピタルコールファシリティ(大型)及びハイブリッドファシリティで計450億円の取引残高。2026年に新規2ファンドの立ち上げを予定。",
    },
    {
      company_name: "ケネディクス投資顧問",
      company_name_kana: "ケネディクストウシコモン",
      company_name_en: "Kenedix Investment Partners, Inc.",
      industry: "Real Estate",
      sub_industry: "Private REIT",
      company_type: "Fund",
      city: "Tokyo",
      address: "東京都中央区日本橋兜町6-5 兜町第6平和ビル3F",
      phone: "+81-3-5643-3300",
      website: "https://www.kenedix.com",
      fiscal_year_end: "January",
      aum_jpy: 420000,
      employee_count: 95,
      relationship_start_date: "2021-04-01",
      relationship_status: "active",
      risk_rating: "low",
      assigned_rm_id: 4,
      created_by: 2,
      capital_amount_jpy: 3000,
      revenue_jpy: 7800,
      stock_code: null,
      founding_date: "2008-10",
      representative_name: "井上 俊介",
      representative_title: "代表取締役CEO",
      notes: "日本を代表する独立系不動産投資運用会社。私募REIT・ファンドを通じてオフィス・住宅・物流・ヘルスケア施設に投資。三井住友ファイナンス＆リースグループ。NAVファシリティ及びキャピタルコールファシリティで計240億円の取引残高。ウェアハウスファシリティの新規提案が承認された。",
    },
  ];

  for (const c of clients) {
    await db.execute({
      sql: `INSERT INTO clients (company_name, company_name_kana, company_name_en, industry, sub_industry, company_type, city, address, phone, website, fiscal_year_end, aum_jpy, employee_count, relationship_start_date, relationship_status, risk_rating, assigned_rm_id, created_by, capital_amount_jpy, revenue_jpy, stock_code, founding_date, representative_name, representative_title, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c.company_name, c.company_name_kana, c.company_name_en, c.industry,
        c.sub_industry, c.company_type, c.city, c.address, c.phone, c.website,
        c.fiscal_year_end, c.aum_jpy, c.employee_count, c.relationship_start_date,
        c.relationship_status, c.risk_rating, c.assigned_rm_id, c.created_by,
        c.capital_amount_jpy, c.revenue_jpy, c.stock_code, c.founding_date,
        c.representative_name, c.representative_title, c.notes,
      ],
    });
  }
  console.log(`Seeded ${clients.length} clients`);

  // ============================================================
  // SEED CLIENT CONTACTS
  // ============================================================
  const contacts = [
    { client_id: 1, first_name: "Hiroshi", last_name: "Nakamura", title: "CEO", department: "Executive Office", email: "nakamura@nomura-reit.demo", phone: "+81-3-3211-1101", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 1, first_name: "Yuki", last_name: "Ishikawa", title: "CFO", department: "Finance", email: "ishikawa@nomura-reit.demo", phone: "+81-3-3211-1102", is_primary_contact: 0, is_decision_maker: 1 },
    { client_id: 1, first_name: "Takuya", last_name: "Morita", title: "IR Director", department: "Investor Relations", email: "morita@nomura-reit.demo", phone: "+81-3-3211-1103", is_primary_contact: 0, is_decision_maker: 0 },
    { client_id: 2, first_name: "Keiko", last_name: "Taniguchi", title: "Managing Partner", department: "Investment", email: "taniguchi@jpep.demo", phone: "+81-3-3222-2201", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 2, first_name: "Ryota", last_name: "Fujita", title: "CFO", department: "Finance & Operations", email: "fujita@jpep.demo", phone: "+81-3-3222-2202", is_primary_contact: 0, is_decision_maker: 1 },
    { client_id: 3, first_name: "Masato", last_name: "Kitamura", title: "President", department: "Executive", email: "kitamura@sbi-cap.demo", phone: "+81-3-3233-3301", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 3, first_name: "Aya", last_name: "Shimizu", title: "Fund Controller", department: "Fund Administration", email: "shimizu@sbi-cap.demo", phone: "+81-3-3233-3302", is_primary_contact: 0, is_decision_maker: 0 },
    { client_id: 4, first_name: "Daisuke", last_name: "Ogawa", title: "Head of PE", department: "Private Equity", email: "ogawa@tokiomarine-cap.demo", phone: "+81-3-3244-4401", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 4, first_name: "Naomi", last_name: "Hayashi", title: "VP Finance", department: "Finance", email: "hayashi@tokiomarine-cap.demo", phone: "+81-3-3244-4402", is_primary_contact: 0, is_decision_maker: 0 },
    { client_id: 5, first_name: "Shingo", last_name: "Matsuda", title: "Executive Director", department: "Asset Management", email: "matsuda@mel-reit.demo", phone: "+81-3-3255-5501", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 5, first_name: "Emi", last_name: "Saito", title: "Finance Manager", department: "Finance", email: "saito@mel-reit.demo", phone: "+81-3-3255-5502", is_primary_contact: 0, is_decision_maker: 0 },
    { client_id: 6, first_name: "Jun", last_name: "Aoki", title: "Partner", department: "Investment", email: "aoki@clsa-japan.demo", phone: "+81-3-3266-6601", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 6, first_name: "Mai", last_name: "Ueda", title: "Associate Director", department: "Operations", email: "ueda@clsa-japan.demo", phone: "+81-3-3266-6602", is_primary_contact: 0, is_decision_maker: 0 },
    { client_id: 7, first_name: "Kenta", last_name: "Yoshida", title: "Managing Director", department: "Investment Advisory", email: "yoshida@daiwa-rei.demo", phone: "+81-6-6277-7701", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 8, first_name: "Taro", last_name: "Kimura", title: "Country Head", department: "Japan Office", email: "kimura@pcg-japan.demo", phone: "+81-3-3288-8801", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 8, first_name: "Sakura", last_name: "Ito", title: "VP Investments", department: "Investment", email: "ito@pcg-japan.demo", phone: "+81-3-3288-8802", is_primary_contact: 0, is_decision_maker: 0 },
    { client_id: 9, first_name: "Takumi", last_name: "Nishimura", title: "General Manager", department: "Fund Finance", email: "nishimura@smtc.demo", phone: "+81-3-3299-9901", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 9, first_name: "Haruka", last_name: "Kobayashi", title: "Deputy Manager", department: "Fund Finance", email: "kobayashi@smtc.demo", phone: "+81-3-3299-9902", is_primary_contact: 0, is_decision_maker: 0 },
    { client_id: 10, first_name: "Shunsuke", last_name: "Inoue", title: "CEO", department: "Executive", email: "inoue@kenedix.demo", phone: "+81-3-3200-0001", is_primary_contact: 1, is_decision_maker: 1 },
    { client_id: 10, first_name: "Mio", last_name: "Takahashi", title: "Head of Fund Operations", department: "Fund Operations", email: "takahashi@kenedix.demo", phone: "+81-3-3200-0002", is_primary_contact: 0, is_decision_maker: 0 },
  ];

  for (const c of contacts) {
    await db.execute({
      sql: `INSERT INTO client_contacts (client_id, first_name, last_name, title, department, email, phone, is_primary_contact, is_decision_maker, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [c.client_id, c.first_name, c.last_name, c.title, c.department, c.email, c.phone, c.is_primary_contact, c.is_decision_maker],
    });
  }
  console.log(`Seeded ${contacts.length} contacts`);

  // ============================================================
  // SEED FUND PRODUCTS
  // ============================================================
  const products = [
    { product_name: "キャピタルコールファシリティ（標準）", product_name_en: "Capital Call Facility (Standard)", product_type: "capital_call_facility", description: "Standard subscription line facility for PE funds", typical_tenor_months: 36, min_amount_jpy: 1000, max_amount_jpy: 10000, base_rate: "TORF", spread_bps_min: 80, spread_bps_max: 150 },
    { product_name: "キャピタルコールファシリティ（大型）", product_name_en: "Capital Call Facility (Large)", product_type: "capital_call_facility", description: "Large-scale subscription line for major funds", typical_tenor_months: 48, min_amount_jpy: 10000, max_amount_jpy: 50000, base_rate: "TORF", spread_bps_min: 50, spread_bps_max: 100 },
    { product_name: "NAVファシリティ", product_name_en: "NAV-Based Facility", product_type: "nav_facility", description: "Net asset value based lending facility", typical_tenor_months: 24, min_amount_jpy: 5000, max_amount_jpy: 30000, base_rate: "TORF", spread_bps_min: 120, spread_bps_max: 250 },
    { product_name: "ハイブリッドファシリティ", product_name_en: "Hybrid Facility", product_type: "hybrid_facility", description: "Combined capital call and NAV-based facility", typical_tenor_months: 36, min_amount_jpy: 5000, max_amount_jpy: 30000, base_rate: "TORF", spread_bps_min: 100, spread_bps_max: 200 },
    { product_name: "GP/運用会社ファシリティ", product_name_en: "GP/Management Company Facility", product_type: "management_company_facility", description: "Facility for GP/management company operations", typical_tenor_months: 12, min_amount_jpy: 500, max_amount_jpy: 5000, base_rate: "TIBOR", spread_bps_min: 150, spread_bps_max: 300 },
    { product_name: "ブリッジローン", product_name_en: "Bridge Loan Facility", product_type: "bridge_loan", description: "Short-term bridge financing for acquisitions", typical_tenor_months: 6, min_amount_jpy: 2000, max_amount_jpy: 20000, base_rate: "TORF", spread_bps_min: 200, spread_bps_max: 400 },
    { product_name: "ウェアハウスファシリティ", product_name_en: "Warehouse Facility", product_type: "warehouse_facility", description: "Warehouse line for asset aggregation", typical_tenor_months: 18, min_amount_jpy: 3000, max_amount_jpy: 15000, base_rate: "TORF", spread_bps_min: 150, spread_bps_max: 300 },
  ];

  for (const p of products) {
    await db.execute({
      sql: `INSERT INTO fund_products (product_name, product_name_en, product_type, description, typical_tenor_months, min_amount_jpy, max_amount_jpy, base_rate, spread_bps_min, spread_bps_max)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.product_name, p.product_name_en, p.product_type, p.description, p.typical_tenor_months, p.min_amount_jpy, p.max_amount_jpy, p.base_rate, p.spread_bps_min, p.spread_bps_max],
    });
  }
  console.log(`Seeded ${products.length} fund products`);

  // ============================================================
  // SEED CLIENT-PRODUCT ASSOCIATIONS
  // ============================================================
  const clientProducts = [
    { client_id: 1, product_id: 3, facility_amount_jpy: 15000, spread_bps: 130, start_date: "2024-04-01", maturity_date: "2026-03-31", status: "active" },
    { client_id: 1, product_id: 2, facility_amount_jpy: 25000, spread_bps: 70, start_date: "2023-10-01", maturity_date: "2027-09-30", status: "active" },
    { client_id: 2, product_id: 1, facility_amount_jpy: 8000, spread_bps: 100, start_date: "2024-07-15", maturity_date: "2027-07-14", status: "active" },
    { client_id: 2, product_id: 5, facility_amount_jpy: 2000, spread_bps: 200, start_date: "2025-01-01", maturity_date: "2025-12-31", status: "active" },
    { client_id: 3, product_id: 1, facility_amount_jpy: 5000, spread_bps: 120, start_date: "2024-01-10", maturity_date: "2027-01-09", status: "active" },
    { client_id: 3, product_id: 6, facility_amount_jpy: 3000, spread_bps: 250, start_date: "2025-06-01", maturity_date: "2025-11-30", status: "active" },
    { client_id: 4, product_id: 4, facility_amount_jpy: 10000, spread_bps: 150, start_date: null, maturity_date: null, status: "prospecting" },
    { client_id: 5, product_id: 3, facility_amount_jpy: 20000, spread_bps: 140, start_date: "2023-08-20", maturity_date: "2025-08-19", status: "active" },
    { client_id: 5, product_id: 7, facility_amount_jpy: 8000, spread_bps: 180, start_date: "2025-03-01", maturity_date: "2026-08-31", status: "active" },
    { client_id: 6, product_id: 1, facility_amount_jpy: 3500, spread_bps: 110, start_date: "2024-03-01", maturity_date: "2027-02-28", status: "active" },
    { client_id: 7, product_id: 3, facility_amount_jpy: 12000, spread_bps: 200, start_date: "2022-06-15", maturity_date: "2024-06-14", status: "expired" },
    { client_id: 8, product_id: 1, facility_amount_jpy: 2000, spread_bps: null, start_date: null, maturity_date: null, status: "prospecting" },
    { client_id: 9, product_id: 2, facility_amount_jpy: 30000, spread_bps: 60, start_date: "2024-09-01", maturity_date: "2028-08-31", status: "active" },
    { client_id: 9, product_id: 4, facility_amount_jpy: 15000, spread_bps: 110, start_date: "2025-01-01", maturity_date: "2028-01-01", status: "active" },
    { client_id: 10, product_id: 3, facility_amount_jpy: 18000, spread_bps: 135, start_date: "2024-04-01", maturity_date: "2026-03-31", status: "active" },
    { client_id: 10, product_id: 1, facility_amount_jpy: 6000, spread_bps: 95, start_date: "2024-06-01", maturity_date: "2027-05-31", status: "active" },
  ];

  for (const cp of clientProducts) {
    await db.execute({
      sql: `INSERT INTO client_products (client_id, product_id, facility_amount_jpy, spread_bps, start_date, maturity_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [cp.client_id, cp.product_id, cp.facility_amount_jpy, cp.spread_bps, cp.start_date, cp.maturity_date, cp.status],
    });
  }
  console.log(`Seeded ${clientProducts.length} client-product associations`);

  // ============================================================
  // SEED INTERACTIONS
  // ============================================================
  const interactions = [
    { client_id: 1, type: "meeting", subject: "Annual Review Meeting - FY2025 Performance", description: "Comprehensive annual review of NAV facility performance and portfolio strategy. Discussed potential facility expansion for new logistics acquisitions.", interaction_date: "2025-08-15 10:00:00", duration: 90, location: "MUTB Head Office, Meeting Room 12F-A", objective: "Review facility utilization and discuss expansion opportunities", outcome: "Client interested in increasing NAV facility by ¥5B. Will provide updated asset list by end of month.", next_steps: "Prepare facility expansion proposal with updated terms", follow_up: "2025-09-01", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2]", participants_ext: "[1, 2]" },
    { client_id: 1, type: "call", subject: "Follow-up on Asset List Submission", description: "Called to follow up on the updated asset list promised during the annual review. Ishikawa-san confirmed it will be sent by next week.", interaction_date: "2025-08-28 14:30:00", duration: 15, location: null, objective: null, outcome: null, next_steps: "Wait for asset list, then begin credit analysis", follow_up: "2025-09-05", sentiment: "neutral", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[2]" },
    { client_id: 1, type: "email", subject: "RE: NAV Facility Expansion - Updated Asset Schedule", description: "Received updated asset schedule from Ishikawa-san. Total portfolio value increased to ¥135B. New logistics assets in Osaka and Nagoya regions.", interaction_date: "2025-09-03 09:15:00", duration: null, location: null, objective: null, outcome: null, next_steps: "Begin credit analysis on new assets", follow_up: null, sentiment: "positive", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[2]" },
    { client_id: 1, type: "proposal", subject: "NAV Facility Expansion Proposal - ¥20B", description: "Formal proposal for NAV facility expansion from ¥15B to ¥20B. Updated terms reflecting new asset base and improved credit metrics.", interaction_date: "2025-09-20 11:00:00", duration: 60, location: "Client Office, Shinjuku", objective: "Present facility expansion proposal", outcome: "Proposal well received. Client to review internally and respond within 2 weeks.", next_steps: "Await client decision on expanded facility terms", follow_up: "2025-10-04", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2]", participants_ext: "[1, 2, 3]" },
    { client_id: 2, type: "meeting", subject: "New Fund Launch Discussion - JPEP Fund V", description: "Initial discussion about Fund V capital call facility requirements. Fund targeting ¥50B in commitments with first close expected Q1 2026.", interaction_date: "2025-10-05 14:00:00", duration: 75, location: "MUTB Head Office, Meeting Room 10F-B", objective: "Understand Fund V structure and financing needs", outcome: "Strong opportunity. Client needs ¥12B capital call facility with 36-month tenor.", next_steps: "Prepare term sheet draft for Fund V capital call line", follow_up: "2025-10-20", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 5]", participants_ext: "[4, 5]" },
    { client_id: 2, type: "call", subject: "Fund V LP Commitment Update", description: "Taniguchi-san provided update on LP fundraising progress. Commitments at ¥35B, expecting to reach ¥45B by year end.", interaction_date: "2025-11-12 16:00:00", duration: 20, location: null, objective: null, outcome: null, next_steps: "Update credit model with new commitment figures", follow_up: null, sentiment: "positive", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[4]" },
    { client_id: 2, type: "meeting", subject: "GP Facility Renewal Discussion", description: "Annual renewal discussion for management company facility. Current ¥2B facility expiring December 2025.", interaction_date: "2025-11-25 10:30:00", duration: 45, location: "Video Conference (Teams)", objective: "Discuss renewal terms for GP facility", outcome: "Client requesting same terms with slight increase to ¥2.5B. Needs to cover growing team costs.", next_steps: "Internal credit approval for facility increase", follow_up: "2025-12-10", sentiment: "neutral", priority: "medium", created_by: 3, participants_int: "[3, 2]", participants_ext: "[4, 5]" },
    { client_id: 3, type: "meeting", subject: "Quarterly Review - Capital Call Facility", description: "Regular quarterly review of capital call facility utilization. Currently 65% drawn. Portfolio performing well with 2 new investments in Q3.", interaction_date: "2025-10-15 11:00:00", duration: 60, location: "SBI Office, Roppongi Hills", objective: "Review facility usage and portfolio updates", outcome: "Facility performing within parameters. Client may need bridge financing for upcoming acquisition.", next_steps: "Prepare bridge loan proposal if client confirms acquisition", follow_up: "2025-11-01", sentiment: "positive", priority: "medium", created_by: 4, participants_int: "[4]", participants_ext: "[6, 7]" },
    { client_id: 3, type: "call", subject: "Bridge Loan Inquiry - Tech Acquisition", description: "Shimizu-san called to discuss bridge financing for potential tech company acquisition. Deal size approximately ¥4B.", interaction_date: "2025-11-05 15:00:00", duration: 25, location: null, objective: null, outcome: null, next_steps: "Schedule meeting with deal team to discuss structure", follow_up: "2025-11-10", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4]", participants_ext: "[7]" },
    { client_id: 3, type: "proposal", subject: "Bridge Loan Proposal - ¥3B for Tech Acquisition", description: "Proposal for 6-month bridge loan facility to support acquisition of target tech company. Terms: TORF + 250bps, 6-month tenor.", interaction_date: "2025-11-18 14:00:00", duration: 45, location: "MUTB Head Office", objective: "Present bridge loan terms", outcome: "Client reviewing proposal. Competing bid from Mizuho. Our spread is slightly higher.", next_steps: "Discuss potential for spread reduction with credit committee", follow_up: "2025-11-25", sentiment: "neutral", priority: "urgent", created_by: 4, participants_int: "[4, 5]", participants_ext: "[6, 7]" },
    { client_id: 4, type: "meeting", subject: "Introduction Meeting - Fund Finance Capabilities", description: "First meeting with Tokio Marine Capital to introduce MUTB Fund Finance capabilities. They are currently using Mizuho and SMBC for fund finance.", interaction_date: "2025-09-15 13:00:00", duration: 60, location: "Tokio Marine Office, Marunouchi", objective: "Introduce MUTB fund finance capabilities and identify opportunities", outcome: "Client interested in competitive quote for their hybrid facility. Currently paying TORF + 180bps at Mizuho.", next_steps: "Prepare competitive proposal for hybrid facility", follow_up: "2025-10-01", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 1]", participants_ext: "[8, 9]" },
    { client_id: 4, type: "email", subject: "Fund Finance Capabilities Overview - Follow Up Materials", description: "Sent comprehensive overview of MUTB fund finance product suite following the introduction meeting. Included case studies from similar PE firms.", interaction_date: "2025-09-18 10:00:00", duration: null, location: null, objective: null, outcome: null, next_steps: "Wait for client feedback on materials", follow_up: "2025-10-01", sentiment: "neutral", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[8]" },
    { client_id: 4, type: "call", subject: "Hybrid Facility RFP Discussion", description: "Ogawa-san called to discuss potential RFP for hybrid facility. They plan to issue RFP to 3 banks including MUTB in November.", interaction_date: "2025-10-22 11:30:00", duration: 20, location: null, objective: null, outcome: null, next_steps: "Prepare RFP response team and competitive pricing strategy", follow_up: "2025-11-15", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3]", participants_ext: "[8]" },
    { client_id: 5, type: "meeting", subject: "NAV Facility Maturity Discussion", description: "Current NAV facility approaching maturity in August 2025. Discussed renewal terms and potential expansion.", interaction_date: "2025-07-10 10:00:00", duration: 60, location: "MUTB Head Office", objective: "Discuss facility renewal options", outcome: "Client wants to renew with increased facility amount. New logistics assets acquired in Kansai region.", next_steps: "Prepare renewal proposal with expanded facility size", follow_up: "2025-07-25", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4, 2]", participants_ext: "[10, 11]" },
    { client_id: 5, type: "proposal", subject: "NAV Facility Renewal - ¥25B", description: "Renewal proposal for NAV facility: increased from ¥20B to ¥25B. Improved terms reflecting strong portfolio performance.", interaction_date: "2025-07-28 14:00:00", duration: 45, location: "Client Office, Otemachi", objective: "Present renewal proposal", outcome: "Accepted in principle. Documentation to proceed.", next_steps: "Instruct legal counsel to prepare documentation", follow_up: "2025-08-10", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4, 2]", participants_ext: "[10, 11]" },
    { client_id: 5, type: "email", subject: "Warehouse Facility Q3 Utilization Report", description: "Sent quarterly utilization report for warehouse facility. Currently 72% utilized with 3 assets in pipeline.", interaction_date: "2025-10-05 09:00:00", duration: null, location: null, objective: null, outcome: null, next_steps: null, follow_up: null, sentiment: "neutral", priority: "low", created_by: 4, participants_int: "[4]", participants_ext: "[11]" },
    { client_id: 6, type: "meeting", subject: "Semi-Annual Review", description: "Regular semi-annual review of capital call facility. Fund II is 80% invested with strong returns. Fund III launch planned for 2026.", interaction_date: "2025-09-25 15:00:00", duration: 60, location: "Video Conference (Zoom)", objective: "Semi-annual facility review and future planning", outcome: "Current facility performing well. Preliminary interest in Fund III capital call facility.", next_steps: "Monitor Fund II performance; begin preliminary analysis for Fund III", follow_up: "2026-01-15", sentiment: "positive", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[12, 13]" },
    { client_id: 7, type: "call", subject: "Relationship Check-in", description: "Periodic check-in with dormant client. Yoshida-san mentioned they are restructuring their real estate advisory business. May have new financing needs in 2026.", interaction_date: "2025-08-20 10:00:00", duration: 15, location: null, objective: null, outcome: null, next_steps: "Follow up in Q1 2026 when restructuring is expected to complete", follow_up: "2026-01-20", sentiment: "neutral", priority: "low", created_by: 4, participants_int: "[4]", participants_ext: "[14]" },
    { client_id: 8, type: "meeting", subject: "Introduction - Infrastructure Fund Financing", description: "Initial meeting with PCG Japan to discuss infrastructure fund financing needs. They are launching a Japan infrastructure fund.", interaction_date: "2025-11-01 11:00:00", duration: 60, location: "MUTB Head Office", objective: "Understand PCG infrastructure fund structure and financing needs", outcome: "Fund targeting ¥20B. Need capital call facility of approximately ¥5B. Timeline for first close: Q2 2026.", next_steps: "Prepare indicative term sheet for infrastructure fund capital call line", follow_up: "2025-11-20", sentiment: "positive", priority: "medium", created_by: 4, participants_int: "[4, 5]", participants_ext: "[15, 16]" },
    { client_id: 9, type: "meeting", subject: "Annual Strategy Meeting", description: "Comprehensive annual meeting covering all facilities. Discussed new fund launches and potential hybrid facility.", interaction_date: "2025-09-10 10:00:00", duration: 120, location: "MUTB Executive Conference Room", objective: "Annual relationship strategy review", outcome: "Client plans 2 new fund launches in 2026. Total additional financing need estimated at ¥40B. Very strong relationship.", next_steps: "Prepare strategic proposal for 2026 fund launches", follow_up: "2025-10-15", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2, 1]", participants_ext: "[17, 18]" },
    { client_id: 9, type: "email", subject: "2026 Fund Launch Timeline - Confidential", description: "Received confidential timeline for 2 new fund launches. Fund A (Real Estate): launch March 2026. Fund B (Infrastructure): launch June 2026.", interaction_date: "2025-10-01 08:30:00", duration: null, location: null, objective: null, outcome: null, next_steps: "Begin preliminary credit analysis for both funds", follow_up: "2025-10-20", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3]", participants_ext: "[17]" },
    { client_id: 9, type: "call", subject: "Fund A Structure Discussion", description: "Detailed call with Nishimura-san about Fund A structure. Target size ¥25B, capital call facility needed for approximately ¥8B.", interaction_date: "2025-10-25 14:00:00", duration: 40, location: null, objective: null, outcome: null, next_steps: "Prepare term sheet for Fund A capital call facility", follow_up: "2025-11-10", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2]", participants_ext: "[17]" },
    { client_id: 10, type: "meeting", subject: "Private REIT Financing Review", description: "Review of NAV and capital call facilities for Kenedix private REIT portfolio. Strong asset performance across all properties.", interaction_date: "2025-08-05 11:00:00", duration: 60, location: "Kenedix Office, Nihonbashi", objective: "Regular facility review and cross-sell opportunities", outcome: "Client happy with service. Interested in adding warehouse facility for new property acquisitions.", next_steps: "Prepare warehouse facility proposal", follow_up: "2025-08-20", sentiment: "positive", priority: "medium", created_by: 4, participants_int: "[4]", participants_ext: "[19, 20]" },
    { client_id: 10, type: "proposal", subject: "Warehouse Facility Proposal - ¥5B", description: "New warehouse facility proposal for property acquisition pipeline. Terms: TORF + 180bps, 18-month tenor.", interaction_date: "2025-08-22 14:00:00", duration: 30, location: "Video Conference", objective: "Present warehouse facility terms", outcome: "Client to compare with existing bank relationships. Decision expected by September.", next_steps: "Await client decision", follow_up: "2025-09-15", sentiment: "neutral", priority: "medium", created_by: 4, participants_int: "[4, 5]", participants_ext: "[19]" },
    { client_id: 10, type: "call", subject: "Warehouse Facility - Decision Update", description: "Inoue-san called to inform us they have decided to proceed with our warehouse facility proposal. Will sign documentation next month.", interaction_date: "2025-09-12 16:30:00", duration: 10, location: null, objective: null, outcome: null, next_steps: "Instruct legal counsel for documentation", follow_up: "2025-10-01", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4]", participants_ext: "[19]" },
  ];

  for (const i of interactions) {
    let proposalAmount = null;
    let proposalStatus = null;
    if (i.type === "proposal") {
      if (i.subject.includes("¥20B")) { proposalAmount = 20000; proposalStatus = "under_review"; }
      else if (i.subject.includes("¥25B")) { proposalAmount = 25000; proposalStatus = "accepted"; }
      else if (i.subject.includes("¥3B")) { proposalAmount = 3000; proposalStatus = "under_review"; }
      else if (i.subject.includes("¥5B")) { proposalAmount = 5000; proposalStatus = "accepted"; }
    }
    await db.execute({
      sql: `INSERT INTO interactions (client_id, interaction_type, subject, description, interaction_date, duration_minutes, location, meeting_objective, meeting_outcome, next_steps, follow_up_date, sentiment, priority, created_by, internal_participants, external_participants, proposal_amount_jpy, proposal_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        i.client_id, i.type, i.subject, i.description, i.interaction_date,
        i.duration, i.location, i.objective, i.outcome, i.next_steps,
        i.follow_up, i.sentiment, i.priority, i.created_by,
        i.participants_int, i.participants_ext, proposalAmount, proposalStatus,
      ],
    });
  }
  console.log(`Seeded ${interactions.length} interactions`);

  // ============================================================
  // SEED BUSINESS CARDS
  // ============================================================
  const businessCards = [
    { contact_id: 1, client_id: 1, image_path: "/uploads/cards/card-1.png", company_name: "野村不動産マスターファンド投資法人", person_name: "中村 博", department: "Executive Office", title: "CEO", phone: "+81-3-3211-1101", mobile: "+81-90-1111-1001", email: "nakamura@nomura-reit.demo", address: "東京都新宿区西新宿1-26-2", exchange_date: "2024-04-15", owner_user_id: 3, notes: "年次レビュー時に交換", tags: '["REIT","経営層"]' },
    { contact_id: 2, client_id: 1, image_path: "/uploads/cards/card-2.png", company_name: "野村不動産マスターファンド投資法人", person_name: "石川 有紀", department: "Finance", title: "CFO", phone: "+81-3-3211-1102", mobile: null, email: "ishikawa@nomura-reit.demo", address: "東京都新宿区西新宿1-26-2", exchange_date: "2024-04-15", owner_user_id: 3, notes: null, tags: '["REIT","財務"]' },
    { contact_id: 4, client_id: 2, image_path: "/uploads/cards/card-3.png", company_name: "日本プライベートエクイティパートナーズ", person_name: "谷口 恵子", department: "Investment", title: "Managing Partner", phone: "+81-3-3222-2201", mobile: "+81-90-2222-2001", email: "taniguchi@jpep.demo", address: "東京都千代田区丸の内2-6-1", exchange_date: "2024-07-20", owner_user_id: 3, notes: "ファンドV立ち上げ相談時", tags: '["PE","意思決定者"]' },
    { contact_id: 6, client_id: 3, image_path: "/uploads/cards/card-4.png", company_name: "SBIキャピタルマネジメント", person_name: "北村 正人", department: "Executive", title: "President", phone: "+81-3-3233-3301", mobile: "+81-90-3333-3001", email: "kitamura@sbi-cap.demo", address: "東京都港区六本木1-6-1", exchange_date: "2024-01-15", owner_user_id: 4, notes: null, tags: '["VC","経営層"]' },
    { contact_id: 7, client_id: 3, image_path: "/uploads/cards/card-5.png", company_name: "SBIキャピタルマネジメント", person_name: "清水 彩", department: "Fund Administration", title: "Fund Controller", phone: "+81-3-3233-3302", mobile: null, email: "shimizu@sbi-cap.demo", address: "東京都港区六本木1-6-1", exchange_date: "2024-10-20", owner_user_id: 4, notes: "四半期レビュー時に交換", tags: '["VC","ファンド管理"]' },
    { contact_id: 8, client_id: 4, image_path: "/uploads/cards/card-6.png", company_name: "東京海上キャピタル", person_name: "小川 大輔", department: "Private Equity", title: "Head of PE", phone: "+81-3-3244-4401", mobile: "+81-90-4444-4001", email: "ogawa@tokiomarine-cap.demo", address: "東京都千代田区丸の内1-2-1", exchange_date: "2025-09-15", owner_user_id: 3, notes: "初回面談時に交換", tags: '["PE","新規"]' },
    { contact_id: 10, client_id: 5, image_path: "/uploads/cards/card-7.png", company_name: "三菱地所物流リート投資法人", person_name: "松田 慎吾", department: "Asset Management", title: "Executive Director", phone: "+81-3-3255-5501", mobile: "+81-90-5555-5001", email: "matsuda@mel-reit.demo", address: "東京都千代田区大手町1-3-2", exchange_date: "2023-11-25", owner_user_id: 4, notes: null, tags: '["REIT","物流"]' },
    { contact_id: 12, client_id: 6, image_path: "/uploads/cards/card-8.png", company_name: "CLSAキャピタルパートナーズジャパン", person_name: "青木 純", department: "Investment", title: "Partner", phone: "+81-3-3266-6601", mobile: "+81-90-6666-6001", email: "aoki@clsa-japan.demo", address: "東京都千代田区大手町1-9-2", exchange_date: "2024-03-10", owner_user_id: 3, notes: null, tags: '["PE","グロース"]' },
    { contact_id: 17, client_id: 9, image_path: "/uploads/cards/card-9.png", company_name: "三井住友トラスト・キャピタル", person_name: "西村 巧", department: "Fund Finance", title: "General Manager", phone: "+81-3-3299-9901", mobile: "+81-90-9999-9001", email: "nishimura@smtc.demo", address: "東京都港区芝3-33-1", exchange_date: "2024-09-10", owner_user_id: 3, notes: "年次戦略会議で交換", tags: '["多戦略","重要顧客"]' },
    { contact_id: 19, client_id: 10, image_path: "/uploads/cards/card-10.png", company_name: "ケネディクス投資顧問", person_name: "井上 俊介", department: "Executive", title: "CEO", phone: "+81-3-3200-0001", mobile: "+81-90-0000-0001", email: "inoue@kenedix.demo", address: "東京都中央区日本橋兜町6-5", exchange_date: "2024-08-05", owner_user_id: 4, notes: "プライベートREITレビュー時", tags: '["REIT","経営層"]' },
  ];

  for (const bc of businessCards) {
    await db.execute({
      sql: `INSERT INTO business_cards (contact_id, client_id, image_path, company_name, person_name, department, title, phone, mobile, email, address, exchange_date, owner_user_id, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        bc.contact_id, bc.client_id, bc.image_path, bc.company_name, bc.person_name,
        bc.department, bc.title, bc.phone, bc.mobile, bc.email, bc.address,
        bc.exchange_date, bc.owner_user_id, bc.notes, bc.tags,
      ],
    });
  }
  console.log(`Seeded ${businessCards.length} business cards`);

  // ============================================================
  // SEED AUDIT LOG
  // ============================================================
  const auditEntries = [
    { userId: 1, userName: "Tanaka Yusuke", action: "LOGIN", entityType: "session", entityId: null, entityName: null, details: null, ts: "2025-07-01 08:30:00" },
    { userId: 1, userName: "Tanaka Yusuke", action: "CREATE", entityType: "user", entityId: 2, entityName: "Suzuki Akiko", details: '{"role":"manager"}', ts: "2025-07-01 09:00:00" },
    { userId: 1, userName: "Tanaka Yusuke", action: "CREATE", entityType: "user", entityId: 3, entityName: "Yamamoto Kenji", details: '{"role":"staff"}', ts: "2025-07-01 09:05:00" },
    { userId: 1, userName: "Tanaka Yusuke", action: "CREATE", entityType: "user", entityId: 4, entityName: "Watanabe Miki", details: '{"role":"staff"}', ts: "2025-07-01 09:10:00" },
    { userId: 1, userName: "Tanaka Yusuke", action: "CREATE", entityType: "user", entityId: 5, entityName: "Sato Takeshi", details: '{"role":"manager"}', ts: "2025-07-01 09:15:00" },
    { userId: 1, userName: "Tanaka Yusuke", action: "CREATE", entityType: "client", entityId: 1, entityName: "Nomura Real Estate Master Fund", details: null, ts: "2025-07-01 10:00:00" },
    { userId: 2, userName: "Suzuki Akiko", action: "CREATE", entityType: "client", entityId: 2, entityName: "Japan Private Equity Partners", details: null, ts: "2025-07-02 09:00:00" },
    { userId: 2, userName: "Suzuki Akiko", action: "CREATE", entityType: "client", entityId: 3, entityName: "SBI Capital Management", details: null, ts: "2025-07-02 09:30:00" },
    { userId: 3, userName: "Yamamoto Kenji", action: "LOGIN", entityType: "session", entityId: null, entityName: null, details: null, ts: "2025-07-03 08:45:00" },
    { userId: 3, userName: "Yamamoto Kenji", action: "CREATE", entityType: "interaction", entityId: 1, entityName: "Annual Review Meeting - Nomura RE", details: '{"type":"meeting"}', ts: "2025-08-15 10:00:00" },
    { userId: 4, userName: "Watanabe Miki", action: "LOGIN", entityType: "session", entityId: null, entityName: null, details: null, ts: "2025-08-05 08:30:00" },
    { userId: 4, userName: "Watanabe Miki", action: "CREATE", entityType: "interaction", entityId: 8, entityName: "Quarterly Review - SBI Capital", details: '{"type":"meeting"}', ts: "2025-10-15 11:00:00" },
    { userId: 3, userName: "Yamamoto Kenji", action: "CREATE", entityType: "interaction", entityId: 5, entityName: "New Fund Launch Discussion - JPEP", details: '{"type":"meeting"}', ts: "2025-10-05 14:00:00" },
    { userId: 3, userName: "Yamamoto Kenji", action: "LOCK_INTERACTION", entityType: "interaction", entityId: 1, entityName: "Annual Review Meeting - Nomura RE", details: null, ts: "2025-08-16 09:00:00" },
    { userId: 1, userName: "Tanaka Yusuke", action: "UPDATE", entityType: "client", entityId: 4, entityName: "Tokio Marine Capital", details: '{"status":"prospect","assigned_rm":3}', ts: "2025-09-01 10:00:00" },
  ];

  for (const a of auditEntries) {
    await insertAudit(a.userId, a.userName, a.action, a.entityType, a.entityId, a.entityName, a.details, a.ts);
  }
  console.log(`Seeded ${auditEntries.length} audit entries`);

  db.close();
  console.log("\nDatabase seeded successfully!");
  console.log(`Database location: ${dbPath}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
