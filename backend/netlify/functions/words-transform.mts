import { TransformWordBody } from "../../src/api-zod";
import { transformWord, WordTransformError } from "../../src/services/transform-word";

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

  try {
    return jsonResponse(200, await transformWord(parsed.data.word));
  } catch (err) {
    if (err instanceof WordTransformError) {
      return jsonResponse(err.statusCode, { error: err.publicMessage });
    }

    console.error(err);
    return jsonResponse(500, { error: "Failed to transform word." });
  }
};
