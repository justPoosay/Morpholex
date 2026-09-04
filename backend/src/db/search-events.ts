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
  visitorId: string | null;
  createdAt: string;
};

export type TopSearch = {
  query: string;
  count: number;
};

export type DailySearchMetric = {
  date: string;
  searches: number;
  visitors: number;
};

export type SearchAnalytics = {
  enabled: boolean;
  totals: {
    searches: number | null;
    searchesToday: number | null;
    searchesThisWeek: number | null;
    visitors: number | null;
    visitorsToday: number | null;
    visitorsThisWeek: number | null;
    uniqueQueries: number | null;
    averageResponseMs: number | null;
    p95ResponseMs: number | null;
    missingSearches: number | null;
    foundRate: number | null;
  };
  recentSearches: RecentSearchEvent[];
  topSearches: TopSearch[];
  topMissingSearches: TopSearch[];
  slowSearches: RecentSearchEvent[];
  dailySearches: DailySearchMetric[];
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
  visitor_id: string | null;
  created_at: Date;
};

type TopSearchRow = {
  query: string;
  count: string;
};

type DailySearchMetricRow = {
  date: Date;
  searches: string;
  visitors: string;
};

export const EMPTY_SEARCH_ANALYTICS: SearchAnalytics = {
  enabled: false,
  totals: {
    searches: null,
    searchesToday: null,
    searchesThisWeek: null,
    visitors: null,
    visitorsToday: null,
    visitorsThisWeek: null,
    uniqueQueries: null,
    averageResponseMs: null,
    p95ResponseMs: null,
    missingSearches: null,
    foundRate: null,
  },
  recentSearches: [],
  topSearches: [],
  topMissingSearches: [],
  slowSearches: [],
  dailySearches: [],
};

function numberFromCount(value: string | number | null): number {
  if (value === null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function nullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : Number(value);
}

function mapSearchEventRow(row: RecentSearchEventRow): RecentSearchEvent {
  return {
    id: Number(row.id),
    query: row.query,
    found: row.found,
    resultCount: row.result_count,
    responseMs: row.response_ms,
    visitorId: row.visitor_id,
    createdAt: row.created_at.toISOString(),
  };
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
    searchesToday,
    searchesThisWeek,
    totalVisitors,
    visitorsToday,
    visitorsThisWeek,
    uniqueQueries,
    averageResponseMs,
    p95ResponseMs,
    missingSearches,
    recentSearches,
    topSearches,
    topMissingSearches,
    slowSearches,
    dailySearches,
  ] = await Promise.all([
    queryDatabase<CountRow>("SELECT COUNT(*) AS value FROM search_events"),
    queryDatabase<CountRow>(
      "SELECT COUNT(*) AS value FROM search_events WHERE created_at >= date_trunc('day', NOW())",
    ),
    queryDatabase<CountRow>(
      "SELECT COUNT(*) AS value FROM search_events WHERE created_at >= date_trunc('week', NOW())",
    ),
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
    queryDatabase<CountRow>("SELECT COUNT(DISTINCT normalized_query) AS value FROM search_events"),
    queryDatabase<CountRow>(
      "SELECT ROUND(AVG(response_ms))::int AS value FROM search_events WHERE response_ms IS NOT NULL",
    ),
    queryDatabase<CountRow>(
      `
        SELECT ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY response_ms))::int AS value
        FROM search_events
        WHERE response_ms IS NOT NULL
      `,
    ),
    queryDatabase<CountRow>("SELECT COUNT(*) AS value FROM search_events WHERE found = false"),
    queryDatabase<RecentSearchEventRow>(
      `
        SELECT
          id,
          query,
          found,
          result_count,
          response_ms,
          SUBSTRING(ip_hash, 1, 10) AS visitor_id,
          created_at
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
    queryDatabase<TopSearchRow>(
      `
        SELECT normalized_query AS query, COUNT(*) AS count
        FROM search_events
        WHERE found = false
        GROUP BY normalized_query
        ORDER BY COUNT(*) DESC, normalized_query ASC
        LIMIT 10
      `,
    ),
    queryDatabase<RecentSearchEventRow>(
      `
        SELECT
          id,
          query,
          found,
          result_count,
          response_ms,
          SUBSTRING(ip_hash, 1, 10) AS visitor_id,
          created_at
        FROM search_events
        WHERE response_ms IS NOT NULL
        ORDER BY response_ms DESC, created_at DESC
        LIMIT 10
      `,
    ),
    queryDatabase<DailySearchMetricRow>(
      `
        SELECT
          day::date AS date,
          COUNT(search_events.id) AS searches,
          COUNT(DISTINCT search_events.ip_hash) FILTER (WHERE search_events.ip_hash IS NOT NULL) AS visitors
        FROM generate_series(
          date_trunc('day', NOW()) - INTERVAL '13 days',
          date_trunc('day', NOW()),
          INTERVAL '1 day'
        ) AS day
        LEFT JOIN search_events
          ON search_events.created_at >= day
          AND search_events.created_at < day + INTERVAL '1 day'
        GROUP BY day
        ORDER BY day ASC
      `,
    ),
  ]);

  const searchCount = numberFromCount(totalSearches.rows[0]?.value ?? null);
  const missingCount = numberFromCount(missingSearches.rows[0]?.value ?? null);

  return {
    enabled: true,
    totals: {
      searches: searchCount,
      searchesToday: numberFromCount(searchesToday.rows[0]?.value ?? null),
      searchesThisWeek: numberFromCount(searchesThisWeek.rows[0]?.value ?? null),
      visitors: numberFromCount(totalVisitors.rows[0]?.value ?? null),
      visitorsToday: numberFromCount(visitorsToday.rows[0]?.value ?? null),
      visitorsThisWeek: numberFromCount(visitorsThisWeek.rows[0]?.value ?? null),
      uniqueQueries: numberFromCount(uniqueQueries.rows[0]?.value ?? null),
      averageResponseMs: nullableNumber(averageResponseMs.rows[0]?.value),
      p95ResponseMs: nullableNumber(p95ResponseMs.rows[0]?.value),
      missingSearches: missingCount,
      foundRate: searchCount === 0 ? null : Math.round(((searchCount - missingCount) / searchCount) * 100),
    },
    recentSearches: recentSearches.rows.map(mapSearchEventRow),
    topSearches: topSearches.rows.map((row) => ({
      query: row.query,
      count: Number(row.count),
    })),
    topMissingSearches: topMissingSearches.rows.map((row) => ({
      query: row.query,
      count: Number(row.count),
    })),
    slowSearches: slowSearches.rows.map(mapSearchEventRow),
    dailySearches: dailySearches.rows.map((row) => ({
      date: row.date.toISOString(),
      searches: Number(row.searches),
      visitors: Number(row.visitors),
    })),
  };
}
