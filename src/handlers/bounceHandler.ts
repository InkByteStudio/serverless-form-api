import type { SNSEvent } from "aws-lambda";
import { addSuppression } from "../services/suppression.js";

export async function handler(event: SNSEvent): Promise<void> {
  for (const record of event.Records) {
    const requestId = record.Sns.MessageId || "unknown";

    let message: Record<string, unknown>;
    try {
      message = JSON.parse(record.Sns.Message);
    } catch {
      console.error(JSON.stringify({
        level: "ERROR", event: "sns_parse_failed", requestId,
      }));
      continue;
    }

    try {
      if (message.notificationType === "Bounce") {
        const bounce = message.bounce as Record<string, unknown> | undefined;
        if (bounce?.bounceType === "Permanent") {
          const recipients = bounce.bouncedRecipients as
            | Array<{ emailAddress: string }>
            | undefined;
          for (const recipient of recipients ?? []) {
            await addSuppression(
              recipient.emailAddress,
              "bounce",
              `${bounce.bounceType}/${bounce.bounceSubType ?? "unknown"}`
            );
            console.log(JSON.stringify({
              event: "bounce_processed", requestId,
              email: recipient.emailAddress,
              bounceType: bounce.bounceType,
              bounceSubType: bounce.bounceSubType ?? "unknown",
            }));
          }
        }
      }

      if (message.notificationType === "Complaint") {
        const complaint = message.complaint as
          | Record<string, unknown>
          | undefined;
        const recipients = complaint?.complainedRecipients as
          | Array<{ emailAddress: string }>
          | undefined;
        for (const recipient of recipients ?? []) {
          await addSuppression(
            recipient.emailAddress,
            "complaint",
            (complaint?.complaintFeedbackType as string) || "unknown"
          );
          console.log(JSON.stringify({
            event: "complaint_processed", requestId,
            email: recipient.emailAddress,
            feedbackType: (complaint?.complaintFeedbackType as string) || "unknown",
          }));
        }
      }
    } catch (err) {
      console.error(JSON.stringify({
        level: "ERROR", event: "bounce_handler_failed", requestId,
        notificationType: message.notificationType,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }
}
