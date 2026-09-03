CREATE TABLE IF NOT EXISTS search_events (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  ip_hash TEXT,
  user_agent_hash TEXT,
  found BOOLEAN NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  response_ms INTEGER CHECK (response_ms IS NULL OR response_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_events_created_at_idx
  ON search_events (created_at DESC);

CREATE INDEX IF NOT EXISTS search_events_normalized_query_idx
  ON search_events (normalized_query);

CREATE INDEX IF NOT EXISTS search_events_ip_hash_created_at_idx
  ON search_events (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;
