import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Submission } from "../types.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME || "form-submissions";

export async function putSubmission(
  item: Submission,
  requestId: string
): Promise<void> {
  await client.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function countRecentByEmail(
  site: string,
  email: string,
  windowMs: number,
  requestId: string
): Promise<number> {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND SK >= :cutoff",
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":pk": `SITE#${site}`,
        ":cutoff": `SUB#${cutoff}`,
        ":email": email,
      },
      Select: "COUNT",
    })
  );
  return result.Count || 0;
}
