-- CIMP Phase 1 Database Schema
-- MUTB Fund Finance Client Interaction Management Platform

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    full_name_kana TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'staff')) DEFAULT 'staff',
    department TEXT,
    title TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Clients (Company Profiles)
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    company_name_kana TEXT,
    company_name_en TEXT,
    industry TEXT,
    sub_industry TEXT,
    company_type TEXT CHECK(company_type IN ('Corporation', 'Fund', 'SPC', 'Trust', 'Partnership', 'Other')),
    registration_number TEXT,
    address TEXT,
    address_en TEXT,
    city TEXT,
    country TEXT DEFAULT 'Japan',
    phone TEXT,
    website TEXT,
    fiscal_year_end TEXT,
    aum_jpy REAL,
    employee_count INTEGER,
    relationship_start_date DATE,
    relationship_status TEXT NOT NULL CHECK(relationship_status IN ('prospect', 'active', 'dormant', 'former')) DEFAULT 'prospect',
    risk_rating TEXT CHECK(risk_rating IN ('low', 'medium', 'high')),
    assigned_rm_id INTEGER REFERENCES users(id),
    capital_amount_jpy REAL,
    revenue_jpy REAL,
    stock_code TEXT,
    founding_date TEXT,
    representative_name TEXT,
    representative_title TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(relationship_status);
CREATE INDEX IF NOT EXISTS idx_clients_rm ON clients(assigned_rm_id);

-- Business Cards (名刺)
CREATE TABLE IF NOT EXISTS business_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES client_contacts(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    image_path TEXT NOT NULL,
    company_name TEXT,
    person_name TEXT,
    department TEXT,
    title TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    exchange_date DATE,
    owner_user_id INTEGER REFERENCES users(id),
    notes TEXT,
    tags TEXT,
    is_digitized INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_cards_client ON business_cards(client_id);
CREATE INDEX IF NOT EXISTS idx_business_cards_owner ON business_cards(owner_user_id);

-- Client Contacts
CREATE TABLE IF NOT EXISTS client_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    first_name_kana TEXT,
    last_name_kana TEXT,
    title TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    is_primary_contact INTEGER NOT NULL DEFAULT 0,
    is_decision_maker INTEGER NOT NULL DEFAULT 0,
    preferred_language TEXT CHECK(preferred_language IN ('ja', 'en')) DEFAULT 'ja',
    preferred_contact_method TEXT CHECK(preferred_contact_method IN ('email', 'phone', 'in_person')) DEFAULT 'email',
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_client ON client_contacts(client_id);

-- Fund Finance Products (Catalog)
CREATE TABLE IF NOT EXISTS fund_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    product_name_en TEXT,
    product_type TEXT NOT NULL CHECK(product_type IN (
        'capital_call_facility', 'nav_facility', 'hybrid_facility',
        'management_company_facility', 'bridge_loan', 'warehouse_facility', 'other'
    )),
    description TEXT,
    typical_tenor_months INTEGER,
    min_amount_jpy REAL,
    max_amount_jpy REAL,
    base_rate TEXT,
    spread_bps_min INTEGER,
    spread_bps_max INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Client-Product Associations
CREATE TABLE IF NOT EXISTS client_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES fund_products(id) ON DELETE CASCADE,
    facility_amount_jpy REAL,
    spread_bps INTEGER,
    start_date DATE,
    maturity_date DATE,
    status TEXT NOT NULL CHECK(status IN (
        'prospecting', 'negotiating', 'documentation', 'active', 'expired', 'terminated'
    )) DEFAULT 'prospecting',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_products_client ON client_products(client_id);

-- Interactions
CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK(interaction_type IN (
        'meeting', 'call', 'email', 'proposal', 'site_visit', 'conference', 'other'
    )),
    subject TEXT NOT NULL,
    description TEXT,
    interaction_date DATETIME NOT NULL,
    duration_minutes INTEGER,
    location TEXT,
    meeting_objective TEXT,
    meeting_outcome TEXT,
    next_steps TEXT,
    follow_up_date DATE,
    internal_participants TEXT,
    external_participants TEXT,
    proposal_amount_jpy REAL,
    proposal_status TEXT CHECK(proposal_status IN (
        'draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'
    )),
    sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    is_locked INTEGER NOT NULL DEFAULT 0,
    locked_at DATETIME,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_client ON interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(interaction_date);

-- Interaction Attachments
CREATE TABLE IF NOT EXISTS interaction_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id INTEGER NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_data TEXT,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Handover Packages
CREATE TABLE IF NOT EXISTS handover_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    client_ids TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'finalized', 'acknowledged')) DEFAULT 'draft',
    finalized_at DATETIME,
    acknowledged_at DATETIME,
    acknowledged_by INTEGER REFERENCES users(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log (Immutable, Hash-Chained)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    user_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN (
        'CREATE', 'READ', 'UPDATE', 'DELETE',
        'LOGIN', 'LOGOUT', 'EXPORT',
        'HANDOVER_GENERATE', 'HANDOVER_FINALIZE', 'HANDOVER_ACKNOWLEDGE',
        'LOCK_INTERACTION', 'ROLE_CHANGE'
    )),
    entity_type TEXT NOT NULL CHECK(entity_type IN (
        'client', 'client_contact', 'interaction', 'attachment',
        'fund_product', 'client_product', 'handover_package',
        'user', 'session', 'business_card'
    )),
    entity_id INTEGER,
    entity_name TEXT,
    details TEXT,
    ip_address TEXT,
    previous_hash TEXT,
    entry_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- Client Financial Periods (P/L data per fiscal period)
CREATE TABLE IF NOT EXISTS client_financials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    fiscal_period TEXT NOT NULL,          -- e.g. '2026/3' (fiscal year ending)
    period_type TEXT NOT NULL CHECK(period_type IN ('annual', 'q1', 'q2', 'q3', 'q4', 'h1', 'h2')),
    period_label TEXT,                    -- e.g. '2025/9 (当期Q2累積)'
    accounting_standard TEXT DEFAULT '日本基準',
    revenue_jpy REAL,                     -- 売上高 (百万円)
    operating_profit_jpy REAL,            -- 営業利益 (百万円)
    net_income_jpy REAL,                  -- 最終利益 (百万円)
    revenue_prev_jpy REAL,               -- 前期売上高
    operating_profit_prev_jpy REAL,      -- 前期営業利益
    net_income_prev_jpy REAL,            -- 前期最終利益
    forecast_revenue_jpy REAL,           -- 通期予想売上高
    forecast_operating_profit_jpy REAL,  -- 通期予想営業利益
    forecast_revision TEXT CHECK(forecast_revision IN ('up', 'down', 'unchanged', 'new')),
    forecast_revision_label TEXT,         -- e.g. '通期会社予想 上方修正'
    progress_rate REAL,                  -- 進捗率 (%)
    dividend_per_share REAL,             -- 配当金 (円)
    dividend_prev_per_share REAL,        -- 前期配当金 (円)
    dividend_note TEXT,                  -- 配当備考
    announcement_date TEXT,              -- 決算発表時刻
    report_date_range TEXT,              -- e.g. '25/4 - 25/9月'
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_financials_client ON client_financials(client_id);

-- Client Business Segments
CREATE TABLE IF NOT EXISTS client_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    fiscal_period TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    segment_order INTEGER DEFAULT 0,
    revenue_jpy REAL,                    -- セグメント売上高 (百万円)
    revenue_prev_jpy REAL,              -- 前期セグメント売上高
    operating_profit_jpy REAL,           -- セグメント利益 (百万円)
    operating_profit_prev_jpy REAL,     -- 前期セグメント利益
    revenue_share_pct REAL,             -- 売上構成比 (%)
    highlight TEXT,                      -- e.g. '大幅増益', '減益'
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_segments_client ON client_segments(client_id);

-- Views
CREATE VIEW IF NOT EXISTS client_summary AS
SELECT
    c.id,
    c.company_name,
    c.company_name_en,
    c.industry,
    c.company_type,
    c.relationship_status,
    c.risk_rating,
    c.assigned_rm_id,
    u.full_name as assigned_rm_name,
    (SELECT COUNT(*) FROM interactions i WHERE i.client_id = c.id) as interaction_count,
    (SELECT MAX(interaction_date) FROM interactions i WHERE i.client_id = c.id) as last_interaction_date,
    (SELECT COUNT(*) FROM client_products cp WHERE cp.client_id = c.id AND cp.status = 'active') as active_product_count,
    (SELECT SUM(cp.facility_amount_jpy) FROM client_products cp WHERE cp.client_id = c.id AND cp.status = 'active') as total_active_facility_jpy,
    c.created_at
FROM clients c
LEFT JOIN users u ON c.assigned_rm_id = u.id;

CREATE VIEW IF NOT EXISTS interaction_timeline AS
SELECT
    i.id,
    i.client_id,
    c.company_name,
    i.interaction_type,
    i.subject,
    i.description,
    i.interaction_date,
    i.duration_minutes,
    i.sentiment,
    i.priority,
    i.follow_up_date,
    i.next_steps,
    i.is_locked,
    i.created_by,
    u.full_name as created_by_name,
    (SELECT COUNT(*) FROM interaction_attachments ia WHERE ia.interaction_id = i.id) as attachment_count
FROM interactions i
JOIN clients c ON i.client_id = c.id
JOIN users u ON i.created_by = u.id
ORDER BY i.interaction_date DESC;
