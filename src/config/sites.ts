import type { SiteConfig } from "../types.js";

export const sites: Record<string, SiteConfig> = {
  myapp: {
    name: "My App",
    notifyEmail: process.env.NOTIFY_EMAIL || "admin@example.com",
    allowedTypes: ["contact", "download"],
    fromEmail: process.env.SES_FROM_EMAIL || "noreply@example.com",
    replyTo: "hello@example.com",
  },
  // Add more sites here — each gets its own config
  // secondsite: {
  //   name: "Second Site",
  //   notifyEmail: process.env.NOTIFY_EMAIL || "admin@example.com",
  //   allowedTypes: ["contact"],
  //   fromEmail: process.env.SES_FROM_EMAIL || "noreply@example.com",
  //   replyTo: "support@secondsite.com",
  // },
};
