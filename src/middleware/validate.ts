import { schemas } from "../config/schemas.js";
import { sites } from "../config/sites.js";
import type { SubmissionInput } from "../types.js";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsed?: SubmissionInput;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSubmission(
  body: string | null | undefined
): ValidationResult {
  if (!body) return { valid: false, error: "Request body is required" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { valid: false, error: "Invalid JSON" };
  }

  const input = parsed as Record<string, unknown>;

  // Required top-level fields
  if (!input.site || typeof input.site !== "string") {
    return { valid: false, error: "Field 'site' is required" };
  }
  if (!input.type || typeof input.type !== "string") {
    return { valid: false, error: "Field 'type' is required" };
  }
  if (
    !input.email ||
    typeof input.email !== "string" ||
    !EMAIL_RE.test(input.email)
  ) {
    return { valid: false, error: "A valid 'email' is required" };
  }

  // Check site exists
  const siteConfig = sites[input.site];
  if (!siteConfig) {
    return { valid: false, error: "Invalid site" };
  }

  // Check type is allowed for this site
  if (!siteConfig.allowedTypes.includes(input.type)) {
    return { valid: false, error: "Invalid type for this site" };
  }

  // Validate data fields against schema
  const schema = schemas[input.type];
  const data = (
    input.data && typeof input.data === "object" ? input.data : {}
  ) as Record<string, unknown>;

  // Limit data payload size
  const dataKeys = Object.keys(data);
  if (dataKeys.length > 20) {
    return { valid: false, error: "Too many data fields (max 20)" };
  }
  for (const [key, val] of Object.entries(data)) {
    if (key.length > 100) {
      return { valid: false, error: `Data key too long (max 100 chars)` };
    }
    if (typeof val === "string" && val.length > 10_000) {
      return {
        valid: false,
        error: `Field 'data.${key}' exceeds max length (10000)`,
      };
    }
  }

  if (schema?.requiredDataFields) {
    for (const field of schema.requiredDataFields) {
      if (data[field] === undefined || data[field] === null) {
        return {
          valid: false,
          error: `Field 'data.${field}' is required for type '${input.type}'`,
        };
      }
    }
  }

  return {
    valid: true,
    parsed: { site: input.site, type: input.type, email: (input.email as string).toLowerCase(), data },
  };
}
