import type { APIGatewayProxyResultV2 } from "aws-lambda";

const corsHeaders = (origin?: string) => {
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim());
  const matchedOrigin = origin && allowed.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  };
};

export function created(
  body: unknown,
  origin?: string
): APIGatewayProxyResultV2 {
  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

export function badRequest(
  message: string,
  origin?: string
): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify({ error: message }),
  };
}

export function tooManyRequests(origin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": "3600",
      ...corsHeaders(origin),
    },
    body: JSON.stringify({
      error: "Too many requests. Please try again later.",
    }),
  };
}

export function serverError(origin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 500,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify({ error: "Internal server error" }),
  };
}
