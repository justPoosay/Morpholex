import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
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
  checks: Array<{
    word: string;
    status: "ok" | "missing";
    formsFound: number;
    groupsFound: number;
  }>;
  analytics: {
    enabled: boolean;
    totals: {
      searches: number | null;
      visitors: number | null;
      visitorsToday: number | null;
      visitorsThisWeek: number | null;
      averageResponseMs: number | null;
      missingSearches: number | null;
    };
    recentSearches: Array<{
      id: number;
      query: string;
      found: boolean;
      resultCount: number;
      responseMs: number | null;
      createdAt: string;
    }>;
    topSearches: Array<{
      query: string;
      count: number;
    }>;
  };
  traffic: {
    collectedByApp: false;
    note: string;
  };
};

const ADMIN_TOKEN_STORAGE_KEY = "morpholex-admin-token";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function shortCommit(value: string | null): string {
  return value ? value.slice(0, 8) : "local";
}

function formatOptionalNumber(value: number | null, suffix = ""): string {
  return value === null ? "Pending" : `${formatNumber(value)}${suffix}`;
}

function formatSearchDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Admin() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checksPassed = useMemo(() => {
    if (!stats) return 0;
    return stats.checks.filter((check) => check.status === "ok").length;
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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to search"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 text-right">
            <p className="font-serif text-lg font-semibold text-primary">Morpholex Admin</p>
            <p className="text-xs text-muted-foreground">Private diagnostics</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        {!stats ? (
          <section className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-md flex-col justify-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-primary">
              <Lock size={22} />
            </div>
            <h1 className="font-serif text-3xl text-foreground">Admin stats</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter the admin token stored in your Netlify environment variables.
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
                <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Admin stats</h1>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Search size={16} />
                  Searches
                </div>
                <p className="font-mono text-2xl text-foreground">
                  {formatOptionalNumber(stats.analytics.totals.searches)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users size={16} />
                  Visitors
                </div>
                <p className="font-mono text-2xl text-foreground">
                  {formatOptionalNumber(stats.analytics.totals.visitors)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity size={16} />
                  Today
                </div>
                <p className="font-mono text-2xl text-foreground">
                  {formatOptionalNumber(stats.analytics.totals.visitorsToday)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp size={16} />
                  This Week
                </div>
                <p className="font-mono text-2xl text-foreground">
                  {formatOptionalNumber(stats.analytics.totals.visitorsThisWeek)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Database size={16} />
                  Entries
                </div>
                <p className="font-mono text-2xl text-foreground">{formatNumber(stats.dictionary.entryCount)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 size={16} />
                  Families
                </div>
                <p className="font-mono text-2xl text-foreground">{formatNumber(stats.dictionary.familyCount)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock size={16} />
                  Avg Response
                </div>
                <p className="font-mono text-2xl text-foreground">
                  {formatOptionalNumber(stats.analytics.totals.averageResponseMs, "ms")}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle size={16} />
                  Missing
                </div>
                <p className="font-mono text-2xl text-foreground">
                  {formatOptionalNumber(stats.analytics.totals.missingSearches)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 size={16} />
                  Checks
                </div>
                <p className="font-mono text-2xl text-foreground">{checksPassed}/{stats.checks.length}</p>
              </div>
            </div>

            {!stats.analytics.enabled && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                {stats.traffic.note}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
              <section className="min-w-0 space-y-3">
                <h2 className="font-serif text-2xl text-foreground">Recent Searches</h2>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  {stats.analytics.recentSearches.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      No search events yet. This table will populate after the Postgres tracking layer is connected.
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full min-w-[42rem] text-left text-sm">
                        <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 font-medium">Query</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Results</th>
                            <th className="px-4 py-3 font-medium">Response</th>
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

              <section className="min-w-0 space-y-3">
                <h2 className="font-serif text-2xl text-foreground">Top Searches</h2>
                <div className="rounded-lg border border-border bg-card p-4">
                  {stats.analytics.topSearches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Rankings will appear once search events are stored.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {stats.analytics.topSearches.map((search, index) => (
                        <li key={search.query} className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm text-foreground">
                              {index + 1}. {search.query}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {formatNumber(search.count)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="space-y-3">
                <h2 className="font-serif text-2xl text-foreground">Dictionary</h2>
                <div className="rounded-lg border border-border bg-card p-4">
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Source</dt>
                      <dd className="mt-1 break-words text-foreground">{stats.dictionary.source}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Source URL</dt>
                      <dd className="mt-1 break-words text-foreground">{stats.dictionary.sourceUrl}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Traffic</dt>
                      <dd className="mt-1 break-words text-foreground">{stats.traffic.note}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="font-serif text-2xl text-foreground">Deploy</h2>
                <div className="rounded-lg border border-border bg-card p-4">
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Context</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.deploy.context ?? "local"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Branch</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.deploy.branch ?? "local"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Commit</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.deploy.commit ?? "local"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Runtime</dt>
                      <dd className="mt-1 break-words font-mono text-foreground">{stats.app.nodeVersion}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>

            <section className="space-y-3">
              <h2 className="font-serif text-2xl text-foreground">Lookup Checks</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.checks.map((check) => (
                  <div key={check.word} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="break-words font-serif text-xl text-foreground">{check.word}</p>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-primary">
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {formatNumber(check.formsFound)} forms across {formatNumber(check.groupsFound)} groups
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
