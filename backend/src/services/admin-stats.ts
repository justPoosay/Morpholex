import wordFamilies from "../data/word-families.json";
import { getSearchAnalytics, type SearchAnalytics } from "../db/search-events";

type WordFamilyIndex = {
  metadata: {
    source: string;
    sourceUrl: string;
    familyCount: number;
    entryCount: number;
  };
};

const dictionary = wordFamilies as WordFamilyIndex;

export type AdminStats = {
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
  analytics: SearchAnalytics;
  tracking: {
    databaseConfigured: boolean;
    visitorHashingEnabled: boolean;
    rawIpStored: false;
    note: string;
  };
};

export function isAdminStatsAuthorized(token: string | null): boolean {
  const expectedToken = process.env.ADMIN_STATS_TOKEN;
  return Boolean(expectedToken && token && token === expectedToken);
}

export async function getAdminStats(): Promise<AdminStats> {
  const analytics = await getSearchAnalytics();

  return {
    app: {
      name: "Morpholex",
      environment: process.env.NODE_ENV ?? "development",
      nodeVersion: process.version,
    },
    deploy: {
      context: process.env.CONTEXT ?? null,
      branch: process.env.BRANCH ?? null,
      commit: process.env.COMMIT_REF ?? null,
      deployId: process.env.DEPLOY_ID ?? null,
      siteUrl: process.env.URL ?? process.env.DEPLOY_URL ?? null,
    },
    dictionary: {
      source: dictionary.metadata.source,
      sourceUrl: dictionary.metadata.sourceUrl,
      familyCount: dictionary.metadata.familyCount,
      entryCount: dictionary.metadata.entryCount,
    },
    analytics,
    tracking: {
      databaseConfigured: analytics.enabled,
      visitorHashingEnabled: Boolean(process.env.ANALYTICS_SALT),
      rawIpStored: false,
      note: analytics.enabled
        ? "Search analytics are stored in Postgres with hashed visitor identifiers only."
        : "DATABASE_URL is not configured, so search analytics are not being stored.",
    },
  };
}
