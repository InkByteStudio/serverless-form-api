import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});

interface NotificationData {
  siteName: string;
  type: string;
  email: string;
  data: Record<string, unknown>;
  createdAt: string;
  ip: string;
  fromEmail: string;
  replyTo: string;
  notifyEmail: string;
}

export async function sendNotification(
  payload: NotificationData,
  requestId: string
): Promise<void> {
  const fromEmail = payload.fromEmail || process.env.SES_FROM_EMAIL || "noreply@example.com";
  const notifyEmail = payload.notifyEmail || process.env.NOTIFY_EMAIL || "admin@example.com";

  const subject = `New ${payload.type} submission from ${payload.siteName}`;

  const dataLines = Object.entries(payload.data)
    .map(([key, val]) => `${key}: ${String(val)}`)
    .join("\n");

  const body = [
    `New ${payload.type} submission received`,
    ``,
    `Site: ${payload.siteName}`,
    `Email: ${payload.email}`,
    `Time: ${payload.createdAt}`,
    `IP: ${payload.ip}`,
    ``,
    `Data:`,
    dataLines,
  ].join("\n");

  await ses.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [notifyEmail] },
      ReplyToAddresses: payload.replyTo ? [payload.replyTo] : undefined,
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    })
  );
}
