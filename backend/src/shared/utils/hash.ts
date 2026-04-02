import { createHash } from "crypto";

/**
 * Deterministic, one-way hash that ties a user to a session
 * without storing any identifiable information.
 *
 * Input:  SHA256( userOid + ":" + sessionId )
 * Output: hex string (64 chars)
 *
 * Used as `ownerHash` on cards and `voterHash` on votes.
 */
export function generateOwnerHash(
  userOid: string,
  sessionId: string,
): string {
  return createHash("sha256")
    .update(`${userOid}:${sessionId}`)
    .digest("hex");
}
