import { createHmac } from "node:crypto";

import { insertSearchEvent } from "../db/search-events";

type TrackSearchEventInput = {
  query: string;
  normalizedQuery: string;
  found: boolean;
  resultCount: number;
  responseMs: number | null;
  ipAddress: string | null;
  userAgent: string | null;
};

type TrackSearchLogger = {
  error: (data: object | string, message?: string) => void;
};

function hashPrivateValue(value: string | null): string | null {
  const salt = process.env.ANALYTICS_SALT;
  if (!salt || !value) return null;

  return createHmac("sha256", salt).update(value).digest("hex");
}

export function getClientIpFromHeaders(
  getHeader: (name: string) => string | string[] | undefined | null,
  fallbackIp: string | null = null,
): string | null {
  const forwardedFor = getHeader("x-forwarded-for");
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const forwardedIp = forwardedValue?.split(",")[0]?.trim();

  if (forwardedIp) return forwardedIp;

  const realIp = getHeader("x-real-ip");
  if (Array.isArray(realIp)) return realIp[0] ?? fallbackIp;
  if (realIp) return realIp;

  const netlifyIp = getHeader("x-nf-client-connection-ip");
  if (Array.isArray(netlifyIp)) return netlifyIp[0] ?? fallbackIp;
  if (netlifyIp) return netlifyIp;

  return fallbackIp;
}

export async function trackSearchEvent(
  event: TrackSearchEventInput,
  logger?: TrackSearchLogger,
): Promise<void> {
  try {
    await insertSearchEvent({
      query: event.query,
      normalizedQuery: event.normalizedQuery,
      ipHash: hashPrivateValue(event.ipAddress),
      userAgentHash: hashPrivateValue(event.userAgent),
      found: event.found,
      resultCount: event.resultCount,
      responseMs: event.responseMs,
    });
  } catch (err) {
    logger?.error({ err }, "Failed to record search event");
  }
}
