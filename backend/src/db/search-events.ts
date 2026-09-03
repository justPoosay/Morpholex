import { isDatabaseConfigured, queryDatabase } from "./client";

export type SearchEventInput = {
  query: string;
  normalizedQuery: string;
  ipHash: string | null;
  userAgentHash: string | null;
  found: boolean;
  resultCount: number;
  responseMs: number | null;
};

export type RecentSearchEvent = {
  id: number;
  query: string;
  found: boolean;
  resultCount: number;
  responseMs: number | null;
  createdAt: string;
};

export type TopSearch = {
  query: string;
  count: number;
};

export type SearchAnalytics = {
  enabled: boolean;
  totals: {
    searches: number | null;
    visitors: number | null;
    visitorsToday: number | null;
    visitorsThisWeek: number | null;
    averageResponseMs: number | null;
    missingSearches: number | null;
  };
  recentSearches: RecentSearchEvent[];
  topSearches: TopSearch[];
};

type CountRow = {
  value: string | number | null;
};

type RecentSearchEventRow = {
  id: string;
  query: string;
  found: boolean;
  result_count: number;
  response_ms: number | null;
  created_at: Date;
};

type TopSearchRow = {
  query: string;
  count: string;
};

export const EMPTY_SEARCH_ANALYTICS: SearchAnalytics = {
  enabled: false,
  totals: {
    searches: null,
    visitors: null,
    visitorsToday: null,
    visitorsThisWeek: null,
    averageResponseMs: null,
    missingSearches: null,
  },
  recentSearches: [],
  topSearches: [],
};

function numberFromCount(value: string | number | null): number {
  if (value === null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export async function insertSearchEvent(event: SearchEventInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  await queryDatabase(
    `
      INSERT INTO search_events (
        query,
        normalized_query,
        ip_hash,
        user_agent_hash,
        found,
        result_count,
        response_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      event.query,
      event.normalizedQuery,
      event.ipHash,
      event.userAgentHash,
      event.found,
      event.resultCount,
      event.responseMs,
    ],
  );
}

export async function getSearchAnalytics(): Promise<SearchAnalytics> {
  if (!isDatabaseConfigured()) {
    return EMPTY_SEARCH_ANALYTICS;
  }

  const [
    totalSearches,
    totalVisitors,
    visitorsToday,
    visitorsThisWeek,
    averageResponseMs,
    missingSearches,
    recentSearches,
    topSearches,
  ] = await Promise.all([
    queryDatabase<CountRow>("SELECT COUNT(*) AS value FROM search_events"),
    queryDatabase<CountRow>(
      "SELECT COUNT(DISTINCT ip_hash) AS value FROM search_events WHERE ip_hash IS NOT NULL",
    ),
    queryDatabase<CountRow>(
      `
        SELECT COUNT(DISTINCT ip_hash) AS value
        FROM search_events
        WHERE ip_hash IS NOT NULL
          AND created_at >= date_trunc('day', NOW())
      `,
    ),
    queryDatabase<CountRow>(
      `
        SELECT COUNT(DISTINCT ip_hash) AS value
        FROM search_events
        WHERE ip_hash IS NOT NULL
          AND created_at >= date_trunc('week', NOW())
      `,
    ),
    queryDatabase<CountRow>(
      "SELECT ROUND(AVG(response_ms))::int AS value FROM search_events WHERE response_ms IS NOT NULL",
    ),
    queryDatabase<CountRow>("SELECT COUNT(*) AS value FROM search_events WHERE found = false"),
    queryDatabase<RecentSearchEventRow>(
      `
        SELECT id, query, found, result_count, response_ms, created_at
        FROM search_events
        ORDER BY created_at DESC
        LIMIT 50
      `,
    ),
    queryDatabase<TopSearchRow>(
      `
        SELECT normalized_query AS query, COUNT(*) AS count
        FROM search_events
        GROUP BY normalized_query
        ORDER BY COUNT(*) DESC, normalized_query ASC
        LIMIT 10
      `,
    ),
  ]);

  return {
    enabled: true,
    totals: {
      searches: numberFromCount(totalSearches.rows[0]?.value ?? null),
      visitors: numberFromCount(totalVisitors.rows[0]?.value ?? null),
      visitorsToday: numberFromCount(visitorsToday.rows[0]?.value ?? null),
      visitorsThisWeek: numberFromCount(visitorsThisWeek.rows[0]?.value ?? null),
      averageResponseMs:
        averageResponseMs.rows[0]?.value === null
          ? null
          : numberFromCount(averageResponseMs.rows[0]?.value ?? null),
      missingSearches: numberFromCount(missingSearches.rows[0]?.value ?? null),
    },
    recentSearches: recentSearches.rows.map((row) => ({
      id: Number(row.id),
      query: row.query,
      found: row.found,
      resultCount: row.result_count,
      responseMs: row.response_ms,
      createdAt: row.created_at.toISOString(),
    })),
    topSearches: topSearches.rows.map((row) => ({
      query: row.query,
      count: Number(row.count),
    })),
  };
}
