-- Trace unified metrics schema
-- All AI CLI usage data is normalized into this single table

CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    session_id TEXT,
    timestamp DATETIME NOT NULL,
    model TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0.0,
    project TEXT,
    latency_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast aggregation queries
CREATE INDEX IF NOT EXISTS idx_requests_source ON requests(source);
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_requests_session ON requests(session_id);
CREATE INDEX IF NOT EXISTS idx_requests_project ON requests(project);

-- Track ingestion state per source + file to avoid re-parsing
CREATE TABLE IF NOT EXISTS ingestion_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT,
    file_size INTEGER,
    last_modified DATETIME,
    last_parsed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, file_path)
);

CREATE INDEX IF NOT EXISTS idx_ingestion_source ON ingestion_state(source);
