import { countRecentByEmail } from "../services/dynamo.js";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_EMAIL = 5;

export async function isRateLimited(
  site: string,
  email: string,
  requestId: string
): Promise<boolean> {
  const count = await countRecentByEmail(site, email, WINDOW_MS, requestId);
  return count >= MAX_PER_EMAIL;
}
