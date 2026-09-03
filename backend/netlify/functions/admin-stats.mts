import { getAdminStats, isAdminStatsAuthorized } from "../../src/services/admin-stats";

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function getBearerToken(value: string | null): string | null {
  if (!value) return null;

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export default async (request: Request) => {
  if (request.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const token = getBearerToken(request.headers.get("authorization"));
  if (!isAdminStatsAuthorized(token)) {
    return jsonResponse(404, { error: "Not found." });
  }

  try {
    return jsonResponse(200, await getAdminStats());
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: "Stats unavailable." });
  }
};
