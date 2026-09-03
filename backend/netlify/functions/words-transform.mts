import { TransformWordBody } from "../../src/api-zod";
import { getClientIpFromHeaders, trackSearchEvent } from "../../src/services/search-tracking";
import { transformWord, WordTransformError } from "../../src/services/transform-word";
import { validateWordQuery } from "../../src/services/word-query";

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

export default async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." });
  }

  const parsed = TransformWordBody.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, { error: parsed.error.message });
  }

  const validated = validateWordQuery(parsed.data.word);
  if (!validated.ok) {
    return jsonResponse(400, { error: validated.message });
  }

  try {
    const startedAt = performance.now();
    const response = await transformWord(validated.word);
    const resultCount = response.groups.reduce((count, group) => count + group.words.length, 0);

    await trackSearchEvent({
      query: validated.word,
      normalizedQuery: response.originalWord,
      found: resultCount > 0,
      resultCount,
      responseMs: Math.round(performance.now() - startedAt),
      ipAddress: getClientIpFromHeaders((name) => request.headers.get(name)),
      userAgent: request.headers.get("user-agent"),
    });

    return jsonResponse(200, response);
  } catch (err) {
    if (err instanceof WordTransformError) {
      return jsonResponse(err.statusCode, { error: err.publicMessage });
    }

    console.error(err);
    return jsonResponse(500, { error: "Failed to transform word." });
  }
};
