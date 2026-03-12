import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SUPPRESSION_TABLE || "email-suppressions";

export async function addSuppression(
  email: string,
  reason: string,
  detail: string
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EMAIL#${email.toLowerCase()}`,
        email: email.toLowerCase(),
        reason,
        detail,
        suppressedAt: new Date().toISOString(),
      },
    })
  );
}

export async function isSuppressed(email: string): Promise<boolean> {
  const result = await client.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `EMAIL#${email.toLowerCase()}` },
    })
  );
  return !!result.Item;
}
