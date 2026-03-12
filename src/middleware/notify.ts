import { sites } from "../config/sites.js";
import { sendNotification } from "../services/ses.js";
import type { Submission } from "../types.js";

export async function notifySubmission(
  submission: Submission,
  requestId: string
): Promise<void> {
  const siteConfig = sites[submission.site];
  if (!siteConfig) return;

  await sendNotification(
    {
      siteName: siteConfig.name,
      type: submission.type,
      email: submission.email,
      data: submission.data,
      createdAt: submission.createdAt,
      ip: submission.ip,
      fromEmail: siteConfig.fromEmail,
      replyTo: siteConfig.replyTo,
      notifyEmail: siteConfig.notifyEmail,
    },
    requestId
  );
}
