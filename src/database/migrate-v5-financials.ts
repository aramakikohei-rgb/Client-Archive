import { createClient } from "@libsql/client";
import path from "path";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), "data", "cimp.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  // Create client_financials table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS client_financials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      fiscal_period TEXT NOT NULL,
      period_type TEXT NOT NULL CHECK(period_type IN ('annual', 'q1', 'q2', 'q3', 'q4', 'h1', 'h2')),
      period_label TEXT,
      accounting_standard TEXT DEFAULT '日本基準',
      revenue_jpy REAL,
      operating_profit_jpy REAL,
      net_income_jpy REAL,
      revenue_prev_jpy REAL,
      operating_profit_prev_jpy REAL,
      net_income_prev_jpy REAL,
      forecast_revenue_jpy REAL,
      forecast_operating_profit_jpy REAL,
      forecast_revision TEXT CHECK(forecast_revision IN ('up', 'down', 'unchanged', 'new')),
      forecast_revision_label TEXT,
      progress_rate REAL,
      dividend_per_share REAL,
      dividend_prev_per_share REAL,
      dividend_note TEXT,
      announcement_date TEXT,
      report_date_range TEXT,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_client_financials_client ON client_financials(client_id);`);
  console.log("Created client_financials table");

  // Create client_segments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS client_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      fiscal_period TEXT NOT NULL,
      segment_name TEXT NOT NULL,
      segment_order INTEGER DEFAULT 0,
      revenue_jpy REAL,
      revenue_prev_jpy REAL,
      operating_profit_jpy REAL,
      operating_profit_prev_jpy REAL,
      revenue_share_pct REAL,
      highlight TEXT,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_client_segments_client ON client_segments(client_id);`);
  console.log("Created client_segments table");

  // Seed financial data
  const financials = [
    { client_id: 1, fiscal_period: "2026/2", period_type: "h1", period_label: "2025/8 (当期H1累積)", revenue_jpy: 32100, operating_profit_jpy: 15800, net_income_jpy: 9200, revenue_prev_jpy: 28900, operating_profit_prev_jpy: 14100, net_income_prev_jpy: 8100, forecast_revenue_jpy: 62000, forecast_operating_profit_jpy: 30500, forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正", progress_rate: 51.8, dividend_per_share: 3250, dividend_prev_per_share: 3100, dividend_note: "中間配当実績は1,620円、次回期末配当金予想は1,630円。", announcement_date: "2025/10/15 15:30", report_date_range: "25/3 - 25/8月", notes: "オフィス・住宅セグメントの賃料改定が寄与し増収増益。物流施設は新規取得効果。" },
    { client_id: 2, fiscal_period: "2026/3", period_type: "q2", period_label: "2025/9 (当期Q2累積)", revenue_jpy: 680, operating_profit_jpy: 310, net_income_jpy: 195, revenue_prev_jpy: 590, operating_profit_prev_jpy: 245, net_income_prev_jpy: 148, forecast_revenue_jpy: 1400, forecast_operating_profit_jpy: 620, forecast_revision: "unchanged", forecast_revision_label: "通期会社予想 据え置き", progress_rate: 50.0, dividend_per_share: null, dividend_prev_per_share: null, dividend_note: null, announcement_date: "2025/11/08 16:00", report_date_range: "25/4 - 25/9月", notes: "Fund IV運用報酬が安定推移。Fund V立ち上げに伴う組成手数料は下期計上見込み。" },
    { client_id: 3, fiscal_period: "2026/3", period_type: "q2", period_label: "2025/9 (当期Q2累積)", revenue_jpy: 1950, operating_profit_jpy: 520, net_income_jpy: 340, revenue_prev_jpy: 1680, operating_profit_prev_jpy: 410, net_income_prev_jpy: 265, forecast_revenue_jpy: 4000, forecast_operating_profit_jpy: 1100, forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正", progress_rate: 47.3, dividend_per_share: null, dividend_prev_per_share: null, dividend_note: null, announcement_date: "2025/11/12 15:30", report_date_range: "25/4 - 25/9月", notes: "VC投資先のIPO実績好調。テクノロジーセクター投資が寄与。" },
    { client_id: 5, fiscal_period: "2026/8", period_type: "h1", period_label: "2026/2 (当期H1累積)", revenue_jpy: 11800, operating_profit_jpy: 6900, net_income_jpy: 4100, revenue_prev_jpy: 10500, operating_profit_prev_jpy: 6100, net_income_prev_jpy: 3600, forecast_revenue_jpy: 24000, forecast_operating_profit_jpy: 14200, forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正", progress_rate: 48.6, dividend_per_share: 7200, dividend_prev_per_share: 6800, dividend_note: "中間配当実績は3,580円、次回期末配当金予想は3,620円。", announcement_date: "2026/04/18 15:30", report_date_range: "25/9 - 26/2月", notes: "新規取得した関西圏物流施設の収益寄与により増収増益。eコマース需要が底堅い。" },
    { client_id: 9, fiscal_period: "2026/3", period_type: "q2", period_label: "2025/9 (当期Q2累積)", revenue_jpy: 13800, operating_profit_jpy: 4200, net_income_jpy: 2800, revenue_prev_jpy: 12100, operating_profit_prev_jpy: 3500, net_income_prev_jpy: 2300, forecast_revenue_jpy: 28000, forecast_operating_profit_jpy: 8800, forecast_revision: "up", forecast_revision_label: "通期会社予想 上方修正", progress_rate: 47.7, dividend_per_share: null, dividend_prev_per_share: null, dividend_note: null, announcement_date: "2025/11/10 15:30", report_date_range: "25/4 - 25/9月", notes: "不動産ファンド及びインフラファンドの運用報酬が好調。クレジットファンドの組成が進捗。" },
    { client_id: 10, fiscal_period: "2026/1", period_type: "q3", period_label: "2025/10 (当期Q3累積)", revenue_jpy: 5900, operating_profit_jpy: 1850, net_income_jpy: 1120, revenue_prev_jpy: 5200, operating_profit_prev_jpy: 1520, net_income_prev_jpy: 890, forecast_revenue_jpy: 8200, forecast_operating_profit_jpy: 2600, forecast_revision: "unchanged", forecast_revision_label: "通期会社予想 据え置き", progress_rate: 71.2, dividend_per_share: null, dividend_prev_per_share: null, dividend_note: null, announcement_date: "2025/12/12 16:00", report_date_range: "25/2 - 25/10月", notes: "私募REITの運用資産拡大に伴い運用報酬が順調に増加。ヘルスケア施設の取得が進行中。" },
  ];

  for (const f of financials) {
    await db.execute({
      sql: `INSERT INTO client_financials (client_id, fiscal_period, period_type, period_label, accounting_standard, revenue_jpy, operating_profit_jpy, net_income_jpy, revenue_prev_jpy, operating_profit_prev_jpy, net_income_prev_jpy, forecast_revenue_jpy, forecast_operating_profit_jpy, forecast_revision, forecast_revision_label, progress_rate, dividend_per_share, dividend_prev_per_share, dividend_note, announcement_date, report_date_range, notes)
       VALUES (?, ?, ?, ?, '日本基準', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [f.client_id, f.fiscal_period, f.period_type, f.period_label, f.revenue_jpy, f.operating_profit_jpy, f.net_income_jpy, f.revenue_prev_jpy, f.operating_profit_prev_jpy, f.net_income_prev_jpy, f.forecast_revenue_jpy, f.forecast_operating_profit_jpy, f.forecast_revision, f.forecast_revision_label, f.progress_rate, f.dividend_per_share, f.dividend_prev_per_share, f.dividend_note, f.announcement_date, f.report_date_range, f.notes],
    });
  }
  console.log(`Seeded ${financials.length} client financials`);

  // Seed segment data
  const segments = [
    { client_id: 1, fiscal_period: "2026/2", segment_name: "オフィスビル事業", order: 1, revenue: 12500, revenue_prev: 11200, profit: 6800, profit_prev: 5900, share: 38.9, highlight: "増収増益", notes: "都心オフィスの賃料改定効果により堅調に推移。" },
    { client_id: 1, fiscal_period: "2026/2", segment_name: "住宅事業", order: 2, revenue: 8200, revenue_prev: 7600, profit: 4100, profit_prev: 3800, share: 25.5, highlight: "増収増益", notes: null },
    { client_id: 1, fiscal_period: "2026/2", segment_name: "物流施設事業", order: 3, revenue: 7800, revenue_prev: 6900, profit: 3500, profit_prev: 3000, share: 24.3, highlight: "大幅増益", notes: "新規取得物件の寄与により大幅増。" },
    { client_id: 1, fiscal_period: "2026/2", segment_name: "商業施設事業", order: 4, revenue: 3600, revenue_prev: 3200, profit: 1400, profit_prev: 1400, share: 11.2, highlight: "増収", notes: null },
    { client_id: 2, fiscal_period: "2026/3", segment_name: "ファンド運用報酬", order: 1, revenue: 480, revenue_prev: 420, profit: 240, profit_prev: 200, share: 70.6, highlight: "増収増益", notes: "Fund IV管理報酬が安定推移。" },
    { client_id: 2, fiscal_period: "2026/3", segment_name: "成功報酬・キャリー", order: 2, revenue: 120, revenue_prev: 100, profit: 45, profit_prev: 25, share: 17.6, highlight: "大幅増益", notes: "Fund III投資先2社のExit実績。" },
    { client_id: 2, fiscal_period: "2026/3", segment_name: "アドバイザリー", order: 3, revenue: 80, revenue_prev: 70, profit: 25, profit_prev: 20, share: 11.8, highlight: "増収", notes: null },
    { client_id: 3, fiscal_period: "2026/3", segment_name: "ベンチャー投資事業", order: 1, revenue: 1100, revenue_prev: 880, profit: 310, profit_prev: 230, share: 56.4, highlight: "大幅増益", notes: "IPO実績3社が寄与。" },
    { client_id: 3, fiscal_period: "2026/3", segment_name: "PE投資事業", order: 2, revenue: 550, revenue_prev: 520, profit: 140, profit_prev: 120, share: 28.2, highlight: "増益", notes: null },
    { client_id: 3, fiscal_period: "2026/3", segment_name: "ファンド管理事業", order: 3, revenue: 300, revenue_prev: 280, profit: 70, profit_prev: 60, share: 15.4, highlight: "増収", notes: null },
    { client_id: 5, fiscal_period: "2026/8", segment_name: "首都圏物流施設", order: 1, revenue: 6200, revenue_prev: 5600, profit: 3800, profit_prev: 3400, share: 52.5, highlight: "増収増益", notes: "大型施設の高稼働率維持。" },
    { client_id: 5, fiscal_period: "2026/8", segment_name: "関西圏物流施設", order: 2, revenue: 3600, revenue_prev: 2800, profit: 2100, profit_prev: 1600, share: 30.5, highlight: "大幅増益", notes: "新規取得3物件の寄与。" },
    { client_id: 5, fiscal_period: "2026/8", segment_name: "その他地域物流施設", order: 3, revenue: 2000, revenue_prev: 2100, profit: 1000, profit_prev: 1100, share: 16.9, highlight: "減収減益", notes: "中部地域の一部テナント退去。" },
    { client_id: 9, fiscal_period: "2026/3", segment_name: "不動産ファンド事業", order: 1, revenue: 5500, revenue_prev: 4800, profit: 1700, profit_prev: 1400, share: 39.9, highlight: "増収増益", notes: "私募REIT及び不動産ファンドのAUM拡大。" },
    { client_id: 9, fiscal_period: "2026/3", segment_name: "インフラファンド事業", order: 2, revenue: 3200, revenue_prev: 2600, profit: 1000, profit_prev: 780, share: 23.2, highlight: "大幅増益", notes: "再エネファンドの組成手数料が好調。" },
    { client_id: 9, fiscal_period: "2026/3", segment_name: "PE投資事業", order: 3, revenue: 3100, revenue_prev: 2900, profit: 950, profit_prev: 850, share: 22.5, highlight: "増益", notes: null },
    { client_id: 9, fiscal_period: "2026/3", segment_name: "クレジット事業", order: 4, revenue: 2000, revenue_prev: 1800, profit: 550, profit_prev: 470, share: 14.5, highlight: "増収増益", notes: "CLO運用が堅調に推移。" },
    { client_id: 10, fiscal_period: "2026/1", segment_name: "私募REIT運用", order: 1, revenue: 2800, revenue_prev: 2400, profit: 950, profit_prev: 780, share: 47.5, highlight: "増収増益", notes: "運用資産残高が4,200億円に拡大。" },
    { client_id: 10, fiscal_period: "2026/1", segment_name: "私募ファンド運用", order: 2, revenue: 1600, revenue_prev: 1500, profit: 480, profit_prev: 420, share: 27.1, highlight: "増収増益", notes: null },
    { client_id: 10, fiscal_period: "2026/1", segment_name: "ヘルスケア施設投資", order: 3, revenue: 900, revenue_prev: 800, profit: 280, profit_prev: 220, share: 15.3, highlight: "大幅増益", notes: "高齢化に伴う需要増加。" },
    { client_id: 10, fiscal_period: "2026/1", segment_name: "アドバイザリー", order: 4, revenue: 600, revenue_prev: 500, profit: 140, profit_prev: 100, share: 10.2, highlight: "増収増益", notes: null },
  ];

  for (const s of segments) {
    await db.execute({
      sql: `INSERT INTO client_segments (client_id, fiscal_period, segment_name, segment_order, revenue_jpy, revenue_prev_jpy, operating_profit_jpy, operating_profit_prev_jpy, revenue_share_pct, highlight, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.client_id, s.fiscal_period, s.segment_name, s.order, s.revenue, s.revenue_prev, s.profit, s.profit_prev, s.share, s.highlight, s.notes],
    });
  }
  console.log(`Seeded ${segments.length} client segments`);

  db.close();
  console.log("\nMigration v5 (financials) completed successfully!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
