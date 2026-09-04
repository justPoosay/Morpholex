import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  Database,
  Lock,
  RefreshCw,
  Search,
  Server,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "wouter";

type SearchEvent = {
  id: number;
  query: string;
  found: boolean;
  resultCount: number;
  responseMs: number | null;
  visitorId: string | null;
  createdAt: string;
};

type RankedSearch = {
  query: string;
  count: number;
};

type DailySearchMetric = {
  date: string;
  searches: number;
  visitors: number;
};

type AdminStats = {
  app: {
    name: string;
    environment: string;
    nodeVersion: string;
  };
  deploy: {
    context: string | null;
    branch: string | null;
    commit: string | null;
    deployId: string | null;
    siteUrl: string | null;
  };
  dictionary: {
    source: string;
    sourceUrl: string;
    familyCount: number;
    entryCount: number;
  };
  analytics: {
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
    recentSearches: SearchEvent[];
    topSearches: RankedSearch[];
    topMissingSearches: RankedSearch[];
    slowSearches: SearchEvent[];
    dailySearches: DailySearchMetric[];
  };
  tracking: {
    databaseConfigured: boolean;
    visitorHashingEnabled: boolean;
    rawIpStored: false;
    note: string;
  };
};

const ADMIN_TOKEN_STORAGE_KEY = "morpholex-admin-token";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function formatOptionalNumber(value: number | null, suffix = ""): string {
  return value === null ? "Pending" : `${formatNumber(value)}${suffix}`;
}

function formatPercent(value: number | null): string {
  return value === null ? "Pending" : `${formatNumber(value)}%`;
}

function formatSearchDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function shortCommit(value: string | null): string {
  return value ? value.slice(0, 8) : "local";
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-mono text-2xl text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="p-6 text-sm leading-6 text-muted-foreground">{children}</div>;
}

function RankingList({
  items,
  empty,
}: {
  items: RankedSearch[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.query} className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate font-mono text-sm text-foreground">
            {index + 1}. {item.query}
          </p>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {formatNumber(item.count)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function Admin() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDailySearches = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...stats.analytics.dailySearches.map((day) => day.searches));
  }, [stats]);

  async function loadStats(nextToken: string) {
    const cleanToken = nextToken.trim();
    if (!cleanToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/stats", {
        headers: {
          authorization: `Bearer ${cleanToken}`,
        },
      });

      if (response.status === 404) {
        setStats(null);
        setError("Not found.");
        sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        return;
      }

      if (!response.ok) {
        throw new Error("Stats unavailable.");
      }

      const data = await response.json() as AdminStats;
      setStats(data);
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, cleanToken);
    } catch {
      setStats(null);
      setError("Stats unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadStats(token);
  }

  useEffect(() => {
    const savedToken = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      void loadStats(savedToken);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to search"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 text-right">
            <p className="font-serif text-lg font-semibold text-primary">Morpholex Admin</p>
            <p className="text-xs text-muted-foreground">Search diagnostics</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        {!stats ? (
          <section className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-md flex-col justify-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-primary">
              <Lock size={22} />
            </div>
            <h1 className="font-serif text-3xl text-foreground">Admin stats</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter the admin token stored in your server environment variables.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Admin token"
                className="w-full rounded-lg border-2 border-border/50 bg-card px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                autoComplete="current-password"
              />
              <button
                type="submit"
                disabled={!token.trim() || loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
                Unlock Stats
              </button>
            </form>

            {error && (
              <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </section>
        ) : (
          <section className="space-y-8">
            <div className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Analytics</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {stats.deploy.branch ?? "local"} / {shortCommit(stats.deploy.commit)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadStats(token)}
                disabled={loading}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {!stats.analytics.enabled && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                {stats.tracking.note}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<Search size={16} />}
                label="Total Searches"
                value={formatOptionalNumber(stats.analytics.totals.searches)}
                hint={`${formatOptionalNumber(stats.analytics.totals.searchesToday)} today`}
              />
              <StatCard
                icon={<TrendingUp size={16} />}
                label="This Week"
                value={formatOptionalNumber(stats.analytics.totals.searchesThisWeek)}
                hint="search volume"
              />
              <StatCard
                icon={<Users size={16} />}
                label="Visitors"
                value={formatOptionalNumber(stats.analytics.totals.visitors)}
                hint={`${formatOptionalNumber(stats.analytics.totals.visitorsToday)} today`}
              />
              <StatCard
                icon={<Activity size={16} />}
                label="Weekly Visitors"
                value={formatOptionalNumber(stats.analytics.totals.visitorsThisWeek)}
                hint="unique hashed IPs"
              />
              <StatCard
                icon={<BarChart3 size={16} />}
                label="Unique Queries"
                value={formatOptionalNumber(stats.analytics.totals.uniqueQueries)}
              />
              <StatCard
                icon={<AlertCircle size={16} />}
                label="Missing Searches"
                value={formatOptionalNumber(stats.analytics.totals.missingSearches)}
                hint={`${formatPercent(stats.analytics.totals.foundRate)} found`}
              />
              <StatCard
                icon={<Clock size={16} />}
                label="Avg Response"
                value={formatOptionalNumber(stats.analytics.totals.averageResponseMs, "ms")}
              />
              <StatCard
                icon={<Server size={16} />}
                label="P95 Response"
                value={formatOptionalNumber(stats.analytics.totals.p95ResponseMs, "ms")}
                hint="slow-request signal"
              />
            </div>

            <section className="space-y-3">
              <h2 className="font-serif text-2xl text-foreground">Last 14 Days</h2>
              <div className="rounded-lg border border-border bg-card p-4">
                {stats.analytics.dailySearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Daily search volume will appear once analytics are stored.</p>
                ) : (
                  <div className="flex h-36 items-end gap-2 overflow-x-auto pb-1">
                    {stats.analytics.dailySearches.map((day) => (
                      <div key={day.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                        <div className="flex h-24 w-full items-end justify-center rounded bg-muted/40 px-2">
                          <div
                            className="w-full rounded-t bg-primary/80"
                            style={{ height: `${Math.max(6, (day.searches / maxDailySearches) * 100)}%` }}
                            title={`${formatNumber(day.searches)} searches, ${formatNumber(day.visitors)} visitors`}
                          />
                        </div>
                        <div className="text-center">
                          <p className="font-mono text-xs text-foreground">{formatNumber(day.searches)}</p>
                          <p className="text-[0.7rem] text-muted-foreground">{formatDay(day.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
              <section className="min-w-0 space-y-3">
                <h2 className="font-serif text-2xl text-foreground">Recent Searches</h2>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  {stats.analytics.recentSearches.length === 0 ? (
                    <EmptyState>No search events yet.</EmptyState>
                  ) : (
                    <div className="max-h-[28rem] overflow-auto">
                      <table className="w-full min-w-[52rem] text-left text-sm">
                        <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 font-medium">Query</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Results</th>
                            <th className="px-4 py-3 font-medium">Response</th>
                            <th className="px-4 py-3 font-medium">Visitor</th>
                            <th className="px-4 py-3 font-medium">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.analytics.recentSearches.map((searchEvent) => (
                            <tr key={searchEvent.id} className="border-b border-border/60 last:border-0">
                              <td className="px-4 py-3 font-mono text-foreground">{searchEvent.query}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {searchEvent.found ? "found" : "missing"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatNumber(searchEvent.resultCount)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {searchEvent.responseMs === null ? "n/a" : `${formatNumber(searchEvent.responseMs)}ms`}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {searchEvent.visitorId ?? "unknown"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatSearchDate(searchEvent.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              <section className="grid min-w-0 grid-cols-1 gap-6">
                <div className="space-y-3">
                  <h2 className="font-serif text-2xl text-foreground">Top Searches</h2>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <RankingList
                      items={stats.analytics.topSearches}
                      empty="Rankings will appear once searches are stored."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="font-serif text-2xl text-foreground">No Results</h2>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <RankingList
                      items={stats.analytics.topMissingSearches}
                      empty="No missing searches recorded."
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="space-y-3">
                <h2 className="font-serif text-2xl text-foreground">Slowest Searches</h2>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  {stats.analytics.slowSearches.length === 0 ? (
                    <EmptyState>Slow request samples will appear once searches are stored.</EmptyState>
                  ) : (
                    <div className="max-h-80 overflow-auto">
                      <table className="w-full min-w-[34rem] text-left text-sm">
                        <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 font-medium">Query</th>
                            <th className="px-4 py-3 font-medium">Response</th>
                            <th className="px-4 py-3 font-medium">Results</th>
                            <th className="px-4 py-3 font-medium">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.analytics.slowSearches.map((searchEvent) => (
                            <tr key={searchEvent.id} className="border-b border-border/60 last:border-0">
                              <td className="px-4 py-3 font-mono text-foreground">{searchEvent.query}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {searchEvent.responseMs === null ? "n/a" : `${formatNumber(searchEvent.responseMs)}ms`}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatNumber(searchEvent.resultCount)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatSearchDate(searchEvent.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="font-serif text-2xl text-foreground">System</h2>
                <div className="rounded-lg border border-border bg-card p-4">
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Environment</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.app.environment}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Runtime</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.app.nodeVersion}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Deploy Context</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.deploy.context ?? "local"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Deploy ID</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.deploy.deployId ?? "local"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Database</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">
                        {stats.tracking.databaseConfigured ? "connected" : "not configured"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Visitor Hashing</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">
                        {stats.tracking.visitorHashingEnabled ? "enabled" : "disabled"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Raw IP Storage</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">
                        {stats.tracking.rawIpStored ? "enabled" : "disabled"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Dictionary Entries</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{formatNumber(stats.dictionary.entryCount)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Dictionary Families</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{formatNumber(stats.dictionary.familyCount)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
