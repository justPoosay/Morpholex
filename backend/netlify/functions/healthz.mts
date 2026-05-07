import { HealthCheckResponse } from "../../src/api-zod";

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

export default async () => {
  return jsonResponse(200, HealthCheckResponse.parse({ status: "ok" }));
};
