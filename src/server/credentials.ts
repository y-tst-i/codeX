import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export interface PlainCredentials {
  adminToken: string;
  teamCodes: { A: string; B: string };
}

export function createCredentials(): PlainCredentials {
  const firstCode = randomInt(1000, 10000).toString();
  let secondCode = randomInt(1000, 10000).toString();
  while (secondCode === firstCode) secondCode = randomInt(1000, 10000).toString();
  return {
    adminToken: randomBytes(24).toString("base64url"),
    teamCodes: { A: firstCode, B: secondCode }
  };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function secretMatches(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
