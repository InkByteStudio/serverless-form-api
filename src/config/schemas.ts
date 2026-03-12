import type { ValidationSchema } from "../types.js";

export const schemas: Record<string, ValidationSchema> = {
  contact: {
    requiredDataFields: ["name", "message"],
  },
  download: {
    requiredDataFields: ["resource"],
  },
};
