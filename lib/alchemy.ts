// lib/alchemy.ts
// Alchemy SDK singleton for on-chain data on Base

import { Alchemy, Network } from "alchemy-sdk";

const globalForAlchemy = globalThis as unknown as { alchemy: Alchemy };

export const alchemy =
  globalForAlchemy.alchemy ??
  new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.BASE_MAINNET,
  });

if (process.env.NODE_ENV !== "production") globalForAlchemy.alchemy = alchemy;

/**
 * Verify an Alchemy webhook HMAC signature.
 * Called in the webhook route handler before processing any inbound deposit.
 */
export function verifyAlchemySignature(
  rawBody: string,
  signature: string
): boolean {
  const signingKey = process.env.ALCHEMY_SIGNING_KEY;
  if (!signingKey) return false;

  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", signingKey);
  hmac.update(rawBody, "utf8");
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(digest, "hex"),
    Buffer.from(signature, "hex")
  );
}
