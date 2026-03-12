export interface Submission {
  PK: string;
  SK: string;
  site: string;
  type: string;
  email: string;
  data: Record<string, unknown>;
  createdAt: string;
  ip: string;
  ttl: number;
}

export interface SubmissionInput {
  site: string;
  type: string;
  email: string;
  data: Record<string, unknown>;
}

export interface ValidationSchema {
  requiredDataFields: string[];
}

export interface SiteConfig {
  name: string;
  notifyEmail: string;
  allowedTypes: string[];
  fromEmail: string;
  replyTo: string;
}
