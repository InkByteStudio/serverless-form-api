import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { validateSubmission } from "../middleware/validate.js";
import { isRateLimited } from "../middleware/rateLimit.js";
import { notifySubmission } from "../middleware/notify.js";
import { putSubmission } from "../services/dynamo.js";
import { isSuppressed } from "../services/suppression.js";
import { created, badRequest, tooManyRequests, serverError } from "../utils/response.js";
import type { Submission } from "../types.js";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext?.requestId || "unknown";
  const origin = event.headers?.origin;

  // Validate input
  const result = validateSubmission(event.body);
  if (!result.valid || !result.parsed) {
    return badRequest(result.error || "Invalid input", origin);
  }

  const { site, type, email, data } = result.parsed;

  // Suppression check — fail open (don't block if check fails)
  try {
    if (await isSuppressed(email)) {
      console.log(JSON.stringify({ event: "suppressed_submission", requestId, site, email }));
      return created({ id: randomUUID(), createdAt: new Date().toISOString() }, origin);
    }
  } catch (err) {
    console.error(JSON.stringify({
      level: "ERROR", event: "suppression_check_failed", requestId, site, email,
      error: err instanceof Error ? err.message : String(err),
    }));
  }

  // Rate limit check — fail closed
  try {
    if (await isRateLimited(site, email, requestId)) {
      console.log(JSON.stringify({ event: "rate_limit_hit", requestId, site, email }));
      return tooManyRequests(origin);
    }
  } catch (err) {
    console.error(JSON.stringify({
      level: "ERROR", event: "rate_limit_check_failed", requestId, site, email,
      error: err instanceof Error ? err.message : String(err),
    }));
    return serverError(origin);
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const ip = event.requestContext?.http?.sourceIp || "unknown";

  const TTL_DAYS = 90;
  const ttl = Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;

  const submission: Submission = {
    PK: `SITE#${site}`,
    SK: `SUB#${now}#${id}`,
    site,
    type,
    email,
    data: data || {},
    createdAt: now,
    ip,
    ttl,
  };

  try {
    await putSubmission(submission, requestId);
  } catch (err) {
    console.error(JSON.stringify({
      level: "ERROR", event: "submission_store_failed", requestId, site, email,
      error: err instanceof Error ? err.message : String(err),
    }));
    return serverError(origin);
  }

  console.log(JSON.stringify({ event: "submission_created", requestId, site, type, email, id }));

  // Await notification to prevent Lambda freeze from cutting it off
  try {
    await notifySubmission(submission, requestId);
  } catch (err) {
    console.error(JSON.stringify({
      level: "ERROR", event: "notification_failed", requestId, site, email,
      error: err instanceof Error ? err.message : String(err),
    }));
  }

  return created({ id, createdAt: now }, origin);
}
