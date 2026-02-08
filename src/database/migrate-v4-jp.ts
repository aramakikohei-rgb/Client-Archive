import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const updates = [
  { id: 1, subject: "年次レビュー面談 - 2025年度実績", description: "NAVファシリティの運用実績とポートフォリオ戦略に関する包括的な年次レビュー。新規物流施設取得に伴うファシリティ増額の可能性を協議。", objective: "ファシリティ利用状況のレビュー及び増額機会の協議", outcome: "NAVファシリティ50億円の増額に関心あり。月末までに更新資産リストを提出予定。", next_steps: "更新条件を反映したファシリティ増額提案書を作成" },
  { id: 2, subject: "資産リスト提出に関するフォローアップ", description: "年次レビューで約束された更新資産リストについてフォローアップ。石川氏より来週中に送付予定との回答。", objective: null, outcome: null, next_steps: "資産リスト受領後、与信分析を開始" },
  { id: 3, subject: "RE: NAVファシリティ増額 - 更新資産一覧", description: "石川氏より更新資産一覧を受領。ポートフォリオ総額は1,350億円に増加。大阪・名古屋地域の新規物流施設を追加。", objective: null, outcome: null, next_steps: "新規資産の与信分析を開始" },
  { id: 4, subject: "NAVファシリティ増額提案 - 200億円", description: "NAVファシリティの150億円から200億円への増額に関する正式提案。新規資産ベース及び改善された与信指標を反映した条件を提示。", objective: "ファシリティ増額提案の提示", outcome: "提案は好感触。社内で検討し、2週間以内に回答予定。", next_steps: "増額ファシリティ条件に関するお客様の意思決定を待つ" },
  { id: 5, subject: "新ファンド立ち上げ協議 - JPEP Fund V", description: "Fund Vのキャピタルコールファシリティ要件に関する初回協議。ファンド規模目標500億円、ファーストクローズは2026年Q1の見通し。", objective: "Fund Vのストラクチャー及びファイナンスニーズの把握", outcome: "有望な案件。120億円のキャピタルコールファシリティ（テナー36ヶ月）の需要あり。", next_steps: "Fund Vキャピタルコールラインのタームシート案を作成" },
  { id: 6, subject: "Fund V LP コミットメント進捗報告", description: "谷口氏よりLPファンドレイジングの進捗報告。コミットメント額は350億円に到達、年末までに450億円を見込む。", objective: null, outcome: null, next_steps: "新コミットメント数値を与信モデルに反映" },
  { id: 7, subject: "GP/運用会社ファシリティ更改協議", description: "運用会社ファシリティの年次更改協議。現行20億円のファシリティは2025年12月満期。", objective: "GPファシリティの更改条件を協議", outcome: "同条件での更改に加え、人員増強費用のため25億円への増額を希望。", next_steps: "ファシリティ増額の社内与信承認を取得" },
  { id: 8, subject: "四半期レビュー - キャピタルコールファシリティ", description: "キャピタルコールファシリティ利用状況の定期四半期レビュー。現在65%実行済み。Q3に2件の新規投資を実行し、ポートフォリオは好調。", objective: "ファシリティ利用状況及びポートフォリオの確認", outcome: "ファシリティは適正範囲内で運用。今後の買収案件にブリッジファイナンスの需要が発生する可能性。", next_steps: "買収案件が確定次第、ブリッジローン提案を準備" },
  { id: 9, subject: "ブリッジローン照会 - テック企業買収案件", description: "清水氏よりテック企業買収に伴うブリッジファイナンスの相談。ディールサイズは約40億円。", objective: null, outcome: null, next_steps: "ディールチームとストラクチャー協議のための面談を設定" },
  { id: 10, subject: "ブリッジローン提案 - テック企業買収向け30億円", description: "テック企業買収支援のための6ヶ月ブリッジローン提案。条件：TORF + 250bps、テナー6ヶ月。", objective: "ブリッジローン条件の提示", outcome: "お客様にて提案を検討中。みずほからの競合提案あり。当行のスプレッドがやや高い状況。", next_steps: "与信委員会にてスプレッド引下げの余地を検討" },
  { id: 11, subject: "初回面談 - ファンドファイナンス機能のご紹介", description: "東京海上キャピタルへの初回訪問。MUTBファンドファイナンスの機能をご紹介。現在はみずほ及びSMBCとファンドファイナンス取引中。", objective: "MUTBファンドファイナンス機能の紹介及び取引機会の特定", outcome: "ハイブリッドファシリティの競争力ある見積りに関心。現在みずほでTORF + 180bpsの条件。", next_steps: "ハイブリッドファシリティの競争力ある提案を準備" },
  { id: 12, subject: "ファンドファイナンス概要資料の送付", description: "初回面談のフォローとしてMUTBファンドファイナンス商品一覧の包括的な資料を送付。類似PE先の事例を含む。", objective: null, outcome: null, next_steps: "資料に対するお客様のフィードバックを待つ" },
  { id: 13, subject: "ハイブリッドファシリティRFP協議", description: "小川氏よりハイブリッドファシリティのRFP実施について連絡。11月にMUTBを含む3行へRFPを発出予定。", objective: null, outcome: null, next_steps: "RFP対応チームの編成及び競争力のあるプライシング戦略を策定" },
  { id: 14, subject: "NAVファシリティ満期対応の協議", description: "現行NAVファシリティが2025年8月に満期到来。更改条件及び増額の可能性について協議。", objective: "ファシリティ更改オプションの協議", outcome: "増額での更改を希望。関西地域で新規物流施設を取得済み。", next_steps: "ファシリティ増額を含む更改提案を作成" },
  { id: 15, subject: "NAVファシリティ更改提案 - 250億円", description: "NAVファシリティの200億円から250億円への増額更改提案。好調なポートフォリオ実績を反映した改善条件。", objective: "更改提案の提示", outcome: "原則合意。ドキュメンテーション手続きへ移行。", next_steps: "法律事務所にドキュメンテーション作成を指示" },
  { id: 16, subject: "ウェアハウスファシリティ Q3利用状況報告", description: "ウェアハウスファシリティの四半期利用状況報告書を送付。現在72%稼働、パイプラインに3物件あり。", objective: null, outcome: null, next_steps: null },
  { id: 17, subject: "半期レビュー面談", description: "キャピタルコールファシリティの定期半期レビュー。Fund IIは80%投資完了で好リターン。Fund IIIは2026年に立ち上げ予定。", objective: "半期ファシリティレビュー及び今後の計画", outcome: "現行ファシリティは良好に運用。Fund IIIキャピタルコールファシリティに予備的関心あり。", next_steps: "Fund IIの運用実績をモニタリング、Fund IIIの予備的分析を開始" },
  { id: 18, subject: "リレーションシップ定期確認", description: "休眠先への定期確認。吉田氏より不動産投資顧問事業の再構築中との情報。2026年に新たなファイナンスニーズが発生する可能性。", objective: null, outcome: null, next_steps: "再構築完了見込みの2026年Q1にフォローアップ" },
  { id: 19, subject: "初回面談 - インフラファンドファイナンス", description: "PCGジャパンとの初回面談。インフラファンドのファイナンスニーズについて協議。日本インフラファンドを新規設立予定。", objective: "PCGインフラファンドのストラクチャー及びファイナンスニーズの把握", outcome: "ファンド規模目標200億円。約50億円のキャピタルコールファシリティが必要。ファーストクローズは2026年Q2。", next_steps: "インフラファンド向けキャピタルコールラインのインディカティブタームシートを作成" },
  { id: 20, subject: "年次戦略会議", description: "全ファシリティを対象とした包括的な年次会議。新ファンドの立ち上げ及びハイブリッドファシリティの可能性を協議。", objective: "年次リレーションシップ戦略のレビュー", outcome: "2026年に2本の新ファンド立ち上げを計画。追加ファイナンスニーズは合計約400億円と見積もり。極めて強固な関係。", next_steps: "2026年ファンド立ち上げに向けた戦略的提案を準備" },
  { id: 21, subject: "2026年ファンド立ち上げスケジュール（秘密情報）", description: "2本の新ファンド立ち上げに関する秘密スケジュールを受領。Fund A（不動産）：2026年3月立ち上げ。Fund B（インフラ）：2026年6月立ち上げ。", objective: null, outcome: null, next_steps: "両ファンドの予備的与信分析を開始" },
  { id: 22, subject: "Fund A ストラクチャー協議", description: "西村氏とFund Aのストラクチャーについて詳細協議。目標規模250億円、キャピタルコールファシリティ約80億円の需要。", objective: null, outcome: null, next_steps: "Fund Aキャピタルコールファシリティのタームシートを作成" },
  { id: 23, subject: "私募REITファイナンス・レビュー", description: "ケネディクス私募REITポートフォリオのNAV及びキャピタルコールファシリティのレビュー。全物件で堅調な運用実績。", objective: "定期ファシリティレビュー及びクロスセル機会の探索", outcome: "サービスに満足。新規物件取得に向けたウェアハウスファシリティの追加に関心。", next_steps: "ウェアハウスファシリティ提案を作成" },
  { id: 24, subject: "ウェアハウスファシリティ提案 - 50億円", description: "物件取得パイプライン向け新規ウェアハウスファシリティ提案。条件：TORF + 180bps、テナー18ヶ月。", objective: "ウェアハウスファシリティ条件の提示", outcome: "既存取引銀行との比較検討へ。9月中に意思決定予定。", next_steps: "お客様の意思決定を待つ" },
  { id: 25, subject: "ウェアハウスファシリティ - 採用決定のご連絡", description: "井上氏より当行のウェアハウスファシリティ提案を採用する旨の連絡。来月中にドキュメンテーション締結予定。", objective: null, outcome: null, next_steps: "法律事務所にドキュメンテーション作成を指示" },
];

async function migrate() {
  for (const u of updates) {
    await db.execute({
      sql: `UPDATE interactions SET subject = ?, description = ?, meeting_objective = ?, meeting_outcome = ?, next_steps = ? WHERE id = ?`,
      args: [u.subject, u.description, u.objective, u.outcome, u.next_steps, u.id],
    });
    console.log(`Updated interaction ${u.id}: ${u.subject}`);
  }
  db.close();
  console.log("\nAll interactions updated to Japanese!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
