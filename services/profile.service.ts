// services/profile.service.ts
// Pseudo-anonymous profiles: ENS name lookup or Cyber-Alias generation.
// Zero PII — identity is the wallet address only.

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { prisma } from "@/lib/prisma";

// ENS resolution uses Ethereum mainnet regardless of the app's default chain (Base)
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(
    `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  ),
});

// Cyber-Alias word lists — deterministic from wallet hash
const ADJECTIVES = [
  "Phantom", "Neon", "Cipher", "Ghost", "Obsidian", "Void", "Rogue",
  "Shadow", "Glitch", "Vector", "Binary", "Stealth", "Null", "Flux",
  "Apex", "Nexus", "Crypto", "Anon", "Dark", "Zero",
];
const NOUNS = [
  "Yield", "Vault", "Node", "Shard", "Protocol", "Signal", "Blade",
  "Runner", "Chain", "Stake", "Forge", "Drift", "Pulse", "Storm",
  "Byte", "Pixel", "Loop", "Core", "Edge", "Wave",
];

/**
 * Generate a deterministic Cyber-Alias from a wallet address.
 * Same address always produces the same alias — no randomness.
 * Example: "PhantomYield#A3F7"
 */
export function generateCyberAlias(walletAddress: string): string {
  const lower = walletAddress.toLowerCase();
  const adjIdx = parseInt(lower.slice(2, 6), 16) % ADJECTIVES.length;
  const nounIdx = parseInt(lower.slice(6, 10), 16) % NOUNS.length;
  const suffix = lower.slice(-4).toUpperCase();
  return `${ADJECTIVES[adjIdx]}${NOUNS[nounIdx]}#${suffix}`;
}

/**
 * Resolve ENS name for a wallet address (with cache in DB).
 * Returns null if no ENS name is registered.
 */
export async function resolveEnsName(walletAddress: string): Promise<string | null> {
  try {
    const name = await ensClient.getEnsName({
      address: walletAddress as `0x${string}`,
    });
    return name ?? null;
  } catch {
    return null;
  }
}

/**
 * Get or create a User record for a connecting wallet.
 * Populates ensName and cyberAlias on first creation.
 */
export async function getOrCreateUser(walletAddress: string) {
  const normalized = walletAddress.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { walletAddress: normalized },
  });
  if (existing) return existing;

  // First-time connection — resolve ENS + generate alias
  const [ensName] = await Promise.allSettled([resolveEnsName(walletAddress)]);
  const resolvedEns = ensName.status === "fulfilled" ? ensName.value : null;
  const cyberAlias = generateCyberAlias(walletAddress);

  return prisma.user.create({
    data: {
      walletAddress: normalized,
      ensName: resolvedEns,
      cyberAlias,
    },
  });
}

/**
 * Get the display name for a user: ENS > Cyber-Alias > truncated address.
 */
export function getDisplayName(user: {
  walletAddress: string;
  ensName: string | null;
  cyberAlias: string | null;
}): string {
  if (user.ensName) return user.ensName;
  if (user.cyberAlias) return user.cyberAlias;
  const addr = user.walletAddress;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
