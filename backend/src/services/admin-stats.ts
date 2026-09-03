import wordFamilies from "../data/word-families.json";
import { getSearchAnalytics, type SearchAnalytics } from "../db/search-events";
import { transformWord } from "./transform-word";

type WordFamilyIndex = {
  metadata: {
    source: string;
    sourceUrl: string;
    familyCount: number;
    entryCount: number;
  };
};

const dictionary = wordFamilies as WordFamilyIndex;

const CHECK_WORDS = ["long", "length", "high", "height", "wide", "width"];

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
  checks: Array<{
    word: string;
    status: "ok" | "missing";
    formsFound: number;
    groupsFound: number;
  }>;
  analytics: SearchAnalytics;
  traffic: {
    collectedByApp: false;
    note: string;
  };
};

export function isAdminStatsAuthorized(token: string | null): boolean {
  const expectedToken = process.env.ADMIN_STATS_TOKEN;
  return Boolean(expectedToken && token && token === expectedToken);
}

export async function getAdminStats(): Promise<AdminStats> {
  const checks = await Promise.all(
    CHECK_WORDS.map(async (word) => {
      const result = await transformWord(word);
      const formsFound = result.groups.reduce((count, group) => count + group.words.length, 0);

      return {
        word,
        status: formsFound > 0 ? "ok" as const : "missing" as const,
        formsFound,
        groupsFound: result.groups.length,
      };
    }),
  );

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
    checks,
    analytics: await getSearchAnalytics(),
    traffic: {
      collectedByApp: false,
      note: "Search analytics are not connected yet. The planned Postgres layer will store hashed visitor identifiers, not raw IP addresses.",
    },
  };
}
