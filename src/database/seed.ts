import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

const isRemote = !!process.env.TURSO_DATABASE_URL && !process.env.TURSO_DATABASE_URL.startsWith("file:");

if (!isRemote) {
  const dbPath = path.join(process.cwd(), "data", "cimp.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Remove existing database
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
    if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
    console.log("Removed existing database");
  }
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), "data", "cimp.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function seed() {
  if (!isRemote) {
    await db.execute("PRAGMA journal_mode = WAL");
    await db.execute("PRAGMA foreign_keys = ON");
  }

  // Read and execute schema
  const schemaPath = path.join(process.cwd(), "src", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length === 0) return false;
      // Remove comment lines to check the actual SQL statement
      const withoutComments = s.replace(/--.*$/gm, "").trim();
      if (withoutComments.length === 0) return false;
      if (withoutComments.toUpperCase().startsWith("PRAGMA")) return false;
      return true;
    });

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
    { client_id: 1, type: "meeting", subject: "年次レビュー面談 - 2025年度実績", description: "NAVファシリティの運用実績とポートフォリオ戦略に関する包括的な年次レビュー。新規物流施設取得に伴うファシリティ増額の可能性を協議。", interaction_date: "2025-08-15 10:00:00", duration: 90, location: "MUTB本店 12F-A会議室", objective: "ファシリティ利用状況のレビュー及び増額機会の協議", outcome: "NAVファシリティ50億円の増額に関心あり。月末までに更新資産リストを提出予定。", next_steps: "更新条件を反映したファシリティ増額提案書を作成", follow_up: "2025-09-01", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2]", participants_ext: "[1, 2]" },
    { client_id: 1, type: "call", subject: "資産リスト提出に関するフォローアップ", description: "年次レビューで約束された更新資産リストについてフォローアップ。石川氏より来週中に送付予定との回答。", interaction_date: "2025-08-28 14:30:00", duration: 15, location: null, objective: null, outcome: null, next_steps: "資産リスト受領後、与信分析を開始", follow_up: "2025-09-05", sentiment: "neutral", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[2]" },
    { client_id: 1, type: "email", subject: "RE: NAVファシリティ増額 - 更新資産一覧", description: "石川氏より更新資産一覧を受領。ポートフォリオ総額は1,350億円に増加。大阪・名古屋地域の新規物流施設を追加。", interaction_date: "2025-09-03 09:15:00", duration: null, location: null, objective: null, outcome: null, next_steps: "新規資産の与信分析を開始", follow_up: null, sentiment: "positive", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[2]" },
    { client_id: 1, type: "proposal", subject: "NAVファシリティ増額提案 - 200億円", description: "NAVファシリティの150億円から200億円への増額に関する正式提案。新規資産ベース及び改善された与信指標を反映した条件を提示。", interaction_date: "2025-09-20 11:00:00", duration: 60, location: "お客様オフィス（新宿）", objective: "ファシリティ増額提案の提示", outcome: "提案は好感触。社内で検討し、2週間以内に回答予定。", next_steps: "増額ファシリティ条件に関するお客様の意思決定を待つ", follow_up: "2025-10-04", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2]", participants_ext: "[1, 2, 3]" },
    { client_id: 2, type: "meeting", subject: "新ファンド立ち上げ協議 - JPEP Fund V", description: "Fund Vのキャピタルコールファシリティ要件に関する初回協議。ファンド規模目標500億円、ファーストクローズは2026年Q1の見通し。", interaction_date: "2025-10-05 14:00:00", duration: 75, location: "MUTB本店 10F-B会議室", objective: "Fund Vのストラクチャー及びファイナンスニーズの把握", outcome: "有望な案件。120億円のキャピタルコールファシリティ（テナー36ヶ月）の需要あり。", next_steps: "Fund Vキャピタルコールラインのタームシート案を作成", follow_up: "2025-10-20", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 5]", participants_ext: "[4, 5]" },
    { client_id: 2, type: "call", subject: "Fund V LP コミットメント進捗報告", description: "谷口氏よりLPファンドレイジングの進捗報告。コミットメント額は350億円に到達、年末までに450億円を見込む。", interaction_date: "2025-11-12 16:00:00", duration: 20, location: null, objective: null, outcome: null, next_steps: "新コミットメント数値を与信モデルに反映", follow_up: null, sentiment: "positive", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[4]" },
    { client_id: 2, type: "meeting", subject: "GP/運用会社ファシリティ更改協議", description: "運用会社ファシリティの年次更改協議。現行20億円のファシリティは2025年12月満期。", interaction_date: "2025-11-25 10:30:00", duration: 45, location: "ビデオ会議（Teams）", objective: "GPファシリティの更改条件を協議", outcome: "同条件での更改に加え、人員増強費用のため25億円への増額を希望。", next_steps: "ファシリティ増額の社内与信承認を取得", follow_up: "2025-12-10", sentiment: "neutral", priority: "medium", created_by: 3, participants_int: "[3, 2]", participants_ext: "[4, 5]" },
    { client_id: 3, type: "meeting", subject: "四半期レビュー - キャピタルコールファシリティ", description: "キャピタルコールファシリティ利用状況の定期四半期レビュー。現在65%実行済み。Q3に2件の新規投資を実行し、ポートフォリオは好調。", interaction_date: "2025-10-15 11:00:00", duration: 60, location: "SBIオフィス 六本木ヒルズ", objective: "ファシリティ利用状況及びポートフォリオの確認", outcome: "ファシリティは適正範囲内で運用。今後の買収案件にブリッジファイナンスの需要が発生する可能性。", next_steps: "買収案件が確定次第、ブリッジローン提案を準備", follow_up: "2025-11-01", sentiment: "positive", priority: "medium", created_by: 4, participants_int: "[4]", participants_ext: "[6, 7]" },
    { client_id: 3, type: "call", subject: "ブリッジローン照会 - テック企業買収案件", description: "清水氏よりテック企業買収に伴うブリッジファイナンスの相談。ディールサイズは約40億円。", interaction_date: "2025-11-05 15:00:00", duration: 25, location: null, objective: null, outcome: null, next_steps: "ディールチームとストラクチャー協議のための面談を設定", follow_up: "2025-11-10", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4]", participants_ext: "[7]" },
    { client_id: 3, type: "proposal", subject: "ブリッジローン提案 - テック企業買収向け30億円", description: "テック企業買収支援のための6ヶ月ブリッジローン提案。条件：TORF + 250bps、テナー6ヶ月。", interaction_date: "2025-11-18 14:00:00", duration: 45, location: "MUTB本店", objective: "ブリッジローン条件の提示", outcome: "お客様にて提案を検討中。みずほからの競合提案あり。当行のスプレッドがやや高い状況。", next_steps: "与信委員会にてスプレッド引下げの余地を検討", follow_up: "2025-11-25", sentiment: "neutral", priority: "urgent", created_by: 4, participants_int: "[4, 5]", participants_ext: "[6, 7]" },
    { client_id: 4, type: "meeting", subject: "初回面談 - ファンドファイナンス機能のご紹介", description: "東京海上キャピタルへの初回訪問。MUTBファンドファイナンスの機能をご紹介。現在はみずほ及びSMBCとファンドファイナンス取引中。", interaction_date: "2025-09-15 13:00:00", duration: 60, location: "東京海上オフィス（丸の内）", objective: "MUTBファンドファイナンス機能の紹介及び取引機会の特定", outcome: "ハイブリッドファシリティの競争力ある見積りに関心。現在みずほでTORF + 180bpsの条件。", next_steps: "ハイブリッドファシリティの競争力ある提案を準備", follow_up: "2025-10-01", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 1]", participants_ext: "[8, 9]" },
    { client_id: 4, type: "email", subject: "ファンドファイナンス概要資料の送付", description: "初回面談のフォローとしてMUTBファンドファイナンス商品一覧の包括的な資料を送付。類似PE先の事例を含む。", interaction_date: "2025-09-18 10:00:00", duration: null, location: null, objective: null, outcome: null, next_steps: "資料に対するお客様のフィードバックを待つ", follow_up: "2025-10-01", sentiment: "neutral", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[8]" },
    { client_id: 4, type: "call", subject: "ハイブリッドファシリティRFP協議", description: "小川氏よりハイブリッドファシリティのRFP実施について連絡。11月にMUTBを含む3行へRFPを発出予定。", interaction_date: "2025-10-22 11:30:00", duration: 20, location: null, objective: null, outcome: null, next_steps: "RFP対応チームの編成及び競争力のあるプライシング戦略を策定", follow_up: "2025-11-15", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3]", participants_ext: "[8]" },
    { client_id: 5, type: "meeting", subject: "NAVファシリティ満期対応の協議", description: "現行NAVファシリティが2025年8月に満期到来。更改条件及び増額の可能性について協議。", interaction_date: "2025-07-10 10:00:00", duration: 60, location: "MUTB本店", objective: "ファシリティ更改オプションの協議", outcome: "増額での更改を希望。関西地域で新規物流施設を取得済み。", next_steps: "ファシリティ増額を含む更改提案を作成", follow_up: "2025-07-25", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4, 2]", participants_ext: "[10, 11]" },
    { client_id: 5, type: "proposal", subject: "NAVファシリティ更改提案 - 250億円", description: "NAVファシリティの200億円から250億円への増額更改提案。好調なポートフォリオ実績を反映した改善条件。", interaction_date: "2025-07-28 14:00:00", duration: 45, location: "お客様オフィス（大手町）", objective: "更改提案の提示", outcome: "原則合意。ドキュメンテーション手続きへ移行。", next_steps: "法律事務所にドキュメンテーション作成を指示", follow_up: "2025-08-10", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4, 2]", participants_ext: "[10, 11]" },
    { client_id: 5, type: "email", subject: "ウェアハウスファシリティ Q3利用状況報告", description: "ウェアハウスファシリティの四半期利用状況報告書を送付。現在72%稼働、パイプラインに3物件あり。", interaction_date: "2025-10-05 09:00:00", duration: null, location: null, objective: null, outcome: null, next_steps: null, follow_up: null, sentiment: "neutral", priority: "low", created_by: 4, participants_int: "[4]", participants_ext: "[11]" },
    { client_id: 6, type: "meeting", subject: "半期レビュー面談", description: "キャピタルコールファシリティの定期半期レビュー。Fund IIは80%投資完了で好リターン。Fund IIIは2026年に立ち上げ予定。", interaction_date: "2025-09-25 15:00:00", duration: 60, location: "ビデオ会議（Zoom）", objective: "半期ファシリティレビュー及び今後の計画", outcome: "現行ファシリティは良好に運用。Fund IIIキャピタルコールファシリティに予備的関心あり。", next_steps: "Fund IIの運用実績をモニタリング、Fund IIIの予備的分析を開始", follow_up: "2026-01-15", sentiment: "positive", priority: "medium", created_by: 3, participants_int: "[3]", participants_ext: "[12, 13]" },
    { client_id: 7, type: "call", subject: "リレーションシップ定期確認", description: "休眠先への定期確認。吉田氏より不動産投資顧問事業の再構築中との情報。2026年に新たなファイナンスニーズが発生する可能性。", interaction_date: "2025-08-20 10:00:00", duration: 15, location: null, objective: null, outcome: null, next_steps: "再構築完了見込みの2026年Q1にフォローアップ", follow_up: "2026-01-20", sentiment: "neutral", priority: "low", created_by: 4, participants_int: "[4]", participants_ext: "[14]" },
    { client_id: 8, type: "meeting", subject: "初回面談 - インフラファンドファイナンス", description: "PCGジャパンとの初回面談。インフラファンドのファイナンスニーズについて協議。日本インフラファンドを新規設立予定。", interaction_date: "2025-11-01 11:00:00", duration: 60, location: "MUTB本店", objective: "PCGインフラファンドのストラクチャー及びファイナンスニーズの把握", outcome: "ファンド規模目標200億円。約50億円のキャピタルコールファシリティが必要。ファーストクローズは2026年Q2。", next_steps: "インフラファンド向けキャピタルコールラインのインディカティブタームシートを作成", follow_up: "2025-11-20", sentiment: "positive", priority: "medium", created_by: 4, participants_int: "[4, 5]", participants_ext: "[15, 16]" },
    { client_id: 9, type: "meeting", subject: "年次戦略会議", description: "全ファシリティを対象とした包括的な年次会議。新ファンドの立ち上げ及びハイブリッドファシリティの可能性を協議。", interaction_date: "2025-09-10 10:00:00", duration: 120, location: "MUTB エグゼクティブ会議室", objective: "年次リレーションシップ戦略のレビュー", outcome: "2026年に2本の新ファンド立ち上げを計画。追加ファイナンスニーズは合計約400億円と見積もり。極めて強固な関係。", next_steps: "2026年ファンド立ち上げに向けた戦略的提案を準備", follow_up: "2025-10-15", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2, 1]", participants_ext: "[17, 18]" },
    { client_id: 9, type: "email", subject: "2026年ファンド立ち上げスケジュール（秘密情報）", description: "2本の新ファンド立ち上げに関する秘密スケジュールを受領。Fund A（不動産）：2026年3月立ち上げ。Fund B（インフラ）：2026年6月立ち上げ。", interaction_date: "2025-10-01 08:30:00", duration: null, location: null, objective: null, outcome: null, next_steps: "両ファンドの予備的与信分析を開始", follow_up: "2025-10-20", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3]", participants_ext: "[17]" },
    { client_id: 9, type: "call", subject: "Fund A ストラクチャー協議", description: "西村氏とFund Aのストラクチャーについて詳細協議。目標規模250億円、キャピタルコールファシリティ約80億円の需要。", interaction_date: "2025-10-25 14:00:00", duration: 40, location: null, objective: null, outcome: null, next_steps: "Fund Aキャピタルコールファシリティのタームシートを作成", follow_up: "2025-11-10", sentiment: "positive", priority: "high", created_by: 3, participants_int: "[3, 2]", participants_ext: "[17]" },
    { client_id: 10, type: "meeting", subject: "私募REITファイナンス・レビュー", description: "ケネディクス私募REITポートフォリオのNAV及びキャピタルコールファシリティのレビュー。全物件で堅調な運用実績。", interaction_date: "2025-08-05 11:00:00", duration: 60, location: "ケネディクスオフィス（日本橋）", objective: "定期ファシリティレビュー及びクロスセル機会の探索", outcome: "サービスに満足。新規物件取得に向けたウェアハウスファシリティの追加に関心。", next_steps: "ウェアハウスファシリティ提案を作成", follow_up: "2025-08-20", sentiment: "positive", priority: "medium", created_by: 4, participants_int: "[4]", participants_ext: "[19, 20]" },
    { client_id: 10, type: "proposal", subject: "ウェアハウスファシリティ提案 - 50億円", description: "物件取得パイプライン向け新規ウェアハウスファシリティ提案。条件：TORF + 180bps、テナー18ヶ月。", interaction_date: "2025-08-22 14:00:00", duration: 30, location: "ビデオ会議", objective: "ウェアハウスファシリティ条件の提示", outcome: "既存取引銀行との比較検討へ。9月中に意思決定予定。", next_steps: "お客様の意思決定を待つ", follow_up: "2025-09-15", sentiment: "neutral", priority: "medium", created_by: 4, participants_int: "[4, 5]", participants_ext: "[19]" },
    { client_id: 10, type: "call", subject: "ウェアハウスファシリティ - 採用決定のご連絡", description: "井上氏より当行のウェアハウスファシリティ提案を採用する旨の連絡。来月中にドキュメンテーション締結予定。", interaction_date: "2025-09-12 16:30:00", duration: 10, location: null, objective: null, outcome: null, next_steps: "法律事務所にドキュメンテーション作成を指示", follow_up: "2025-10-01", sentiment: "positive", priority: "high", created_by: 4, participants_int: "[4]", participants_ext: "[19]" },
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
  // SEED CLIENT FINANCIALS
  // ============================================================
  const financials = [
    // Client 1: 野村不動産マスターファンド投資法人 (3462)
    {
      client_id: 1, fiscal_period: "2026/2", period_type: "h1",
      period_label: "2025/8 (当期H1累積)", accounting_standard: "日本基準",
      revenue_jpy: 32100, operating_profit_jpy: 15800, net_income_jpy: 9200,
      revenue_prev_jpy: 28900, operating_profit_prev_jpy: 14100, net_income_prev_jpy: 8100,
      forecast_revenue_jpy: 62000, forecast_operating_profit_jpy: 30500,
      forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正",
      progress_rate: 51.8, dividend_per_share: 3250, dividend_prev_per_share: 3100,
      dividend_note: "中間配当実績は1,620円、次回期末配当金予想は1,630円。",
      announcement_date: "2025/10/15 15:30", report_date_range: "25/3 - 25/8月",
      notes: "オフィス・住宅セグメントの賃料改定が寄与し増収増益。物流施設は新規取得効果。",
    },
    // Client 2: 日本プライベートエクイティパートナーズ
    {
      client_id: 2, fiscal_period: "2026/3", period_type: "q2",
      period_label: "2025/9 (当期Q2累積)", accounting_standard: "日本基準",
      revenue_jpy: 680, operating_profit_jpy: 310, net_income_jpy: 195,
      revenue_prev_jpy: 590, operating_profit_prev_jpy: 245, net_income_prev_jpy: 148,
      forecast_revenue_jpy: 1400, forecast_operating_profit_jpy: 620,
      forecast_revision: "unchanged", forecast_revision_label: "通期会社予想 据え置き",
      progress_rate: 50.0, dividend_per_share: null, dividend_prev_per_share: null,
      dividend_note: null,
      announcement_date: "2025/11/08 16:00", report_date_range: "25/4 - 25/9月",
      notes: "Fund IV運用報酬が安定推移。Fund V立ち上げに伴う組成手数料は下期計上見込み。",
    },
    // Client 3: SBIキャピタルマネジメント
    {
      client_id: 3, fiscal_period: "2026/3", period_type: "q2",
      period_label: "2025/9 (当期Q2累積)", accounting_standard: "日本基準",
      revenue_jpy: 1950, operating_profit_jpy: 520, net_income_jpy: 340,
      revenue_prev_jpy: 1680, operating_profit_prev_jpy: 410, net_income_prev_jpy: 265,
      forecast_revenue_jpy: 4000, forecast_operating_profit_jpy: 1100,
      forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正",
      progress_rate: 47.3, dividend_per_share: null, dividend_prev_per_share: null,
      dividend_note: null,
      announcement_date: "2025/11/12 15:30", report_date_range: "25/4 - 25/9月",
      notes: "VC投資先のIPO実績好調。テクノロジーセクター投資が寄与。",
    },
    // Client 5: 三菱地所物流リート投資法人 (3481)
    {
      client_id: 5, fiscal_period: "2026/8", period_type: "h1",
      period_label: "2026/2 (当期H1累積)", accounting_standard: "日本基準",
      revenue_jpy: 11800, operating_profit_jpy: 6900, net_income_jpy: 4100,
      revenue_prev_jpy: 10500, operating_profit_prev_jpy: 6100, net_income_prev_jpy: 3600,
      forecast_revenue_jpy: 24000, forecast_operating_profit_jpy: 14200,
      forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正",
      progress_rate: 48.6, dividend_per_share: 7200, dividend_prev_per_share: 6800,
      dividend_note: "中間配当実績は3,580円、次回期末配当金予想は3,620円。",
      announcement_date: "2026/04/18 15:30", report_date_range: "25/9 - 26/2月",
      notes: "新規取得した関西圏物流施設の収益寄与により増収増益。eコマース需要が底堅い。",
    },
    // Client 9: 三井住友トラスト・キャピタル
    {
      client_id: 9, fiscal_period: "2026/3", period_type: "q2",
      period_label: "2025/9 (当期Q2累積)", accounting_standard: "日本基準",
      revenue_jpy: 13800, operating_profit_jpy: 4200, net_income_jpy: 2800,
      revenue_prev_jpy: 12100, operating_profit_prev_jpy: 3500, net_income_prev_jpy: 2300,
      forecast_revenue_jpy: 28000, forecast_operating_profit_jpy: 8800,
      forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正",
      progress_rate: 47.7, dividend_per_share: null, dividend_prev_per_share: null,
      dividend_note: null,
      announcement_date: "2025/11/10 15:30", report_date_range: "25/4 - 25/9月",
      notes: "不動産ファンド及びインフラファンドの運用報酬が好調。クレジットファンドの組成が進捗。",
    },
    // Client 10: ケネディクス投資顧問
    {
      client_id: 10, fiscal_period: "2026/1", period_type: "q3",
      period_label: "2025/10 (当期Q3累積)", accounting_standard: "日本基準",
      revenue_jpy: 5900, operating_profit_jpy: 1850, net_income_jpy: 1120,
      revenue_prev_jpy: 5200, operating_profit_prev_jpy: 1520, net_income_prev_jpy: 890,
      forecast_revenue_jpy: 8200, forecast_operating_profit_jpy: 2600,
      forecast_revision: "unchanged", forecast_revision_label: "通期会社予想 据え置き",
      progress_rate: 71.2, dividend_per_share: null, dividend_prev_per_share: null,
      dividend_note: null,
      announcement_date: "2025/12/12 16:00", report_date_range: "25/2 - 25/10月",
      notes: "私募REITの運用資産拡大に伴い運用報酬が順調に増加。ヘルスケア施設の取得が進行中。",
    },
  ];

  for (const f of financials) {
    await db.execute({
      sql: `INSERT INTO client_financials (
        client_id, fiscal_period, period_type, period_label, accounting_standard,
        revenue_jpy, operating_profit_jpy, net_income_jpy,
        revenue_prev_jpy, operating_profit_prev_jpy, net_income_prev_jpy,
        forecast_revenue_jpy, forecast_operating_profit_jpy,
        forecast_revision, forecast_revision_label,
        progress_rate, dividend_per_share, dividend_prev_per_share, dividend_note,
        announcement_date, report_date_range, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        f.client_id, f.fiscal_period, f.period_type, f.period_label, f.accounting_standard,
        f.revenue_jpy, f.operating_profit_jpy, f.net_income_jpy,
        f.revenue_prev_jpy, f.operating_profit_prev_jpy, f.net_income_prev_jpy,
        f.forecast_revenue_jpy, f.forecast_operating_profit_jpy,
        f.forecast_revision, f.forecast_revision_label,
        f.progress_rate, f.dividend_per_share ?? null, f.dividend_prev_per_share ?? null, f.dividend_note ?? null,
        f.announcement_date, f.report_date_range, f.notes,
      ],
    });
  }
  console.log(`Seeded ${financials.length} client financials`);

  // ============================================================
  // SEED CLIENT SEGMENTS
  // ============================================================
  const segments = [
    // Client 1: 野村不動産マスターファンド投資法人
    { client_id: 1, fiscal_period: "2026/2", segment_name: "オフィスビル事業", order: 1, revenue: 12500, revenue_prev: 11200, profit: 6800, profit_prev: 5900, share: 38.9, highlight: "増収増益", notes: "都心オフィスの賃料改定効果により堅調に推移。" },
    { client_id: 1, fiscal_period: "2026/2", segment_name: "住宅事業", order: 2, revenue: 8200, revenue_prev: 7600, profit: 4100, profit_prev: 3800, share: 25.5, highlight: "増収増益", notes: null },
    { client_id: 1, fiscal_period: "2026/2", segment_name: "物流施設事業", order: 3, revenue: 7800, revenue_prev: 6900, profit: 3500, profit_prev: 3000, share: 24.3, highlight: "大幅増益", notes: "新規取得物件の寄与により大幅増。" },
    { client_id: 1, fiscal_period: "2026/2", segment_name: "商業施設事業", order: 4, revenue: 3600, revenue_prev: 3200, profit: 1400, profit_prev: 1400, share: 11.2, highlight: "増収", notes: null },

    // Client 2: 日本プライベートエクイティパートナーズ
    { client_id: 2, fiscal_period: "2026/3", segment_name: "ファンド運用報酬", order: 1, revenue: 480, revenue_prev: 420, profit: 240, profit_prev: 200, share: 70.6, highlight: "増収増益", notes: "Fund IV管理報酬が安定推移。" },
    { client_id: 2, fiscal_period: "2026/3", segment_name: "成功報酬・キャリー", order: 2, revenue: 120, revenue_prev: 100, profit: 45, profit_prev: 25, share: 17.6, highlight: "大幅増益", notes: "Fund III投資先2社のExit実績。" },
    { client_id: 2, fiscal_period: "2026/3", segment_name: "アドバイザリー", order: 3, revenue: 80, revenue_prev: 70, profit: 25, profit_prev: 20, share: 11.8, highlight: "増収", notes: null },

    // Client 3: SBIキャピタルマネジメント
    { client_id: 3, fiscal_period: "2026/3", segment_name: "ベンチャー投資事業", order: 1, revenue: 1100, revenue_prev: 880, profit: 310, profit_prev: 230, share: 56.4, highlight: "大幅増益", notes: "IPO実績3社（テック2社、ヘルスケア1社）が寄与。" },
    { client_id: 3, fiscal_period: "2026/3", segment_name: "PE投資事業", order: 2, revenue: 550, revenue_prev: 520, profit: 140, profit_prev: 120, share: 28.2, highlight: "増益", notes: null },
    { client_id: 3, fiscal_period: "2026/3", segment_name: "ファンド管理事業", order: 3, revenue: 300, revenue_prev: 280, profit: 70, profit_prev: 60, share: 15.4, highlight: "増収", notes: null },

    // Client 5: 三菱地所物流リート投資法人
    { client_id: 5, fiscal_period: "2026/8", segment_name: "首都圏物流施設", order: 1, revenue: 6200, revenue_prev: 5600, profit: 3800, profit_prev: 3400, share: 52.5, highlight: "増収増益", notes: "首都圏大型施設の高稼働率維持。" },
    { client_id: 5, fiscal_period: "2026/8", segment_name: "関西圏物流施設", order: 2, revenue: 3600, revenue_prev: 2800, profit: 2100, profit_prev: 1600, share: 30.5, highlight: "大幅増益", notes: "新規取得3物件の寄与。eコマース需要拡大。" },
    { client_id: 5, fiscal_period: "2026/8", segment_name: "その他地域物流施設", order: 3, revenue: 2000, revenue_prev: 2100, profit: 1000, profit_prev: 1100, share: 16.9, highlight: "減収減益", notes: "中部地域の一部テナント退去の影響。" },

    // Client 9: 三井住友トラスト・キャピタル
    { client_id: 9, fiscal_period: "2026/3", segment_name: "不動産ファンド事業", order: 1, revenue: 5500, revenue_prev: 4800, profit: 1700, profit_prev: 1400, share: 39.9, highlight: "増収増益", notes: "私募REIT及び不動産ファンドのAUM拡大。" },
    { client_id: 9, fiscal_period: "2026/3", segment_name: "インフラファンド事業", order: 2, revenue: 3200, revenue_prev: 2600, profit: 1000, profit_prev: 780, share: 23.2, highlight: "大幅増益", notes: "再エネファンドの組成手数料が好調。" },
    { client_id: 9, fiscal_period: "2026/3", segment_name: "PE投資事業", order: 3, revenue: 3100, revenue_prev: 2900, profit: 950, profit_prev: 850, share: 22.5, highlight: "増益", notes: null },
    { client_id: 9, fiscal_period: "2026/3", segment_name: "クレジット事業", order: 4, revenue: 2000, revenue_prev: 1800, profit: 550, profit_prev: 470, share: 14.5, highlight: "増収増益", notes: "CLO運用が堅調に推移。" },

    // Client 10: ケネディクス投資顧問
    { client_id: 10, fiscal_period: "2026/1", segment_name: "私募REIT運用", order: 1, revenue: 2800, revenue_prev: 2400, profit: 950, profit_prev: 780, share: 47.5, highlight: "増収増益", notes: "運用資産残高が4,200億円に拡大。" },
    { client_id: 10, fiscal_period: "2026/1", segment_name: "私募ファンド運用", order: 2, revenue: 1600, revenue_prev: 1500, profit: 480, profit_prev: 420, share: 27.1, highlight: "増収増益", notes: null },
    { client_id: 10, fiscal_period: "2026/1", segment_name: "ヘルスケア施設投資", order: 3, revenue: 900, revenue_prev: 800, profit: 280, profit_prev: 220, share: 15.3, highlight: "大幅増益", notes: "高齢化に伴う需要増加。施設取得が進捗。" },
    { client_id: 10, fiscal_period: "2026/1", segment_name: "アドバイザリー", order: 4, revenue: 600, revenue_prev: 500, profit: 140, profit_prev: 100, share: 10.2, highlight: "増収増益", notes: null },
  ];

  for (const s of segments) {
    await db.execute({
      sql: `INSERT INTO client_segments (
        client_id, fiscal_period, segment_name, segment_order,
        revenue_jpy, revenue_prev_jpy, operating_profit_jpy, operating_profit_prev_jpy,
        revenue_share_pct, highlight, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.client_id, s.fiscal_period, s.segment_name, s.order,
        s.revenue, s.revenue_prev, s.profit, s.profit_prev,
        s.share, s.highlight, s.notes,
      ],
    });
  }
  console.log(`Seeded ${segments.length} client segments`);

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
  console.log(`Database: ${process.env.TURSO_DATABASE_URL || "file:data/cimp.db"}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
