import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sha256 } from "@noble/hashes/sha256";
import { base64UrlEncode } from "@/lib/crypto";
import { nanoid } from "nanoid";
import { PermissionRequest, AccessPolicy } from "@glueco/shared";

// ============================================
// TYPES
// ============================================

/**
 * Permission with full access policy (used during approval)
 */
export interface PermissionWithPolicy {
  resourceId: string;
  actions: string[];
  policy?: AccessPolicy;
}

// ============================================
// PAIRING FLOW
// ============================================

const CODE_LENGTH = 32; // High entropy
const CODE_TTL_MINUTES = 10;
const SESSION_TTL_MINUTES = 30;

/**
 * Generate a new pairing string.
 * Format: pair::<proxy_url>::<connect_code>
 */
export async function generatePairingString(): Promise<{
  pairingString: string;
  codeId: string;
  expiresAt: Date;
}> {
  const gatewayUrl = process.env.GATEWAY_URL;
  if (!gatewayUrl) {
    throw new Error("GATEWAY_URL not configured");
  }

  // Generate high-entropy code
  const code = nanoid(CODE_LENGTH);

  // Hash the code for storage
  const codeHash = base64UrlEncode(sha256(new TextEncoder().encode(code)));

  // Calculate expiry
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  // Store hashed code
  const connectCode = await prisma.connectCode.create({
    data: {
      codeHash,
      expiresAt,
    },
  });

  // Build pairing string
  const pairingString = `pair::${gatewayUrl}::${code}`;

  return {
    pairingString,
    codeId: connectCode.id,
    expiresAt,
  };
}

/**
 * Verify a connect code.
 * Returns the code record if valid, null otherwise.
 * Marks the code as used.
 */
export async function verifyConnectCode(code: string): Promise<boolean> {
  const codeHash = base64UrlEncode(sha256(new TextEncoder().encode(code)));

  const connectCode = await prisma.connectCode.findUnique({
    where: { codeHash },
  });

  if (!connectCode) {
    return false;
  }

  // Check if expired
  if (connectCode.expiresAt < new Date()) {
    return false;
  }

  // Check if already used
  if (connectCode.usedAt) {
    return false;
  }

  // Mark as used
  await prisma.connectCode.update({
    where: { id: connectCode.id },
    data: { usedAt: new Date() },
  });

  return true;
}

// ============================================
// INSTALL SESSION
// ============================================

export interface PrepareRequest {
  name: string;
  description?: string;
  homepage?: string;
  publicKey: string;
  requestedPermissions: PermissionRequest[];
  redirectUri: string;
}

export interface PrepareResult {
  sessionToken: string;
  approvalUrl: string;
  expiresAt: Date;
}

/**
 * Prepare an install session.
 * Called by the target app after parsing the pairing string.
 */
export async function prepareInstallSession(
  connectCode: string,
  request: PrepareRequest,
): Promise<PrepareResult> {
  // Verify connect code first
  const codeValid = await verifyConnectCode(connectCode);
  if (!codeValid) {
    throw new Error("Invalid or expired connect code");
  }

  const gatewayUrl = process.env.GATEWAY_URL;
  if (!gatewayUrl) {
    throw new Error("GATEWAY_URL not configured");
  }

  // Create pending app
  const app = await prisma.app.create({
    data: {
      name: request.name,
      description: request.description,
      homepage: request.homepage,
      status: "PENDING",
      credentials: {
        create: {
          publicKey: request.publicKey,
          label: "primary",
        },
      },
    },
  });

  // Generate session token
  const sessionToken = nanoid(32);

  // Calculate expiry
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);

  // Create install session
  await prisma.installSession.create({
    data: {
      appId: app.id,
      sessionToken,
      requestedPermissions: request.requestedPermissions as unknown as object[],
      redirectUri: request.redirectUri,
      expiresAt,
    },
  });

  // Build approval URL
  const approvalUrl = `${gatewayUrl}/connect/approve?session=${sessionToken}`;

  return {
    sessionToken,
    approvalUrl,
    expiresAt,
  };
}

/**
 * Get install session for approval page.
 */
export async function getInstallSession(sessionToken: string) {
  const session = await prisma.installSession.findUnique({
    where: { sessionToken },
    include: {
      app: true,
    },
  });

  if (!session) {
    return null;
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    return null;
  }

  // Check if already processed
  if (session.status !== "PENDING") {
    return null;
  }

  return session;
}

/**
 * Approve an install session.
 * Grants permissions with full access policies.
 */
export async function approveInstallSession(
  sessionToken: string,
  grantedPermissions: PermissionWithPolicy[],
): Promise<{ appId: string; redirectUri: string }> {
  const session = await getInstallSession(sessionToken);

  if (!session) {
    throw new Error("Invalid or expired session");
  }

  // Create permissions with full policy data
  const permissionData = grantedPermissions.flatMap((perm) =>
    perm.actions.map((action) => {
      const policy = perm.policy || {};

      return {
        appId: session.appId,
        resourceId: perm.resourceId,
        action,

        // Time controls
        validFrom: policy.validFrom ? new Date(policy.validFrom) : null,
        expiresAt: policy.expiresAt ? new Date(policy.expiresAt) : null,
        timeWindow: policy.timeWindow
          ? (policy.timeWindow as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,

        // Rate limiting (inline)
        rateLimitRequests: policy.rateLimit?.maxRequests || null,
        rateLimitWindowSecs: policy.rateLimit?.windowSeconds || null,

        // Quotas
        dailyQuota: policy.quota?.daily || null,
        monthlyQuota: policy.quota?.monthly || null,
        dailyTokenBudget: policy.tokenBudget?.daily || null,
        monthlyTokenBudget: policy.tokenBudget?.monthly || null,

        // Constraints (LLM-specific, etc.)
        constraints: policy.constraints
          ? (policy.constraints as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      };
    }),
  );

  // Use transaction for atomicity
  await prisma.$transaction([
    // Create permissions with full policy
    prisma.resourcePermission.createMany({
      data: permissionData,
    }),

    // Activate app
    prisma.app.update({
      where: { id: session.appId },
      data: { status: "ACTIVE" },
    }),

    // Complete session
    prisma.installSession.update({
      where: { id: session.id },
      data: {
        status: "APPROVED",
        completedAt: new Date(),
      },
    }),
  ]);

  // Find the earliest expiry from all permissions (for client-side timer)
  const expiryDates = permissionData
    .map((p) => p.expiresAt)
    .filter((d): d is Date => d !== null);
  const earliestExpiry =
    expiryDates.length > 0
      ? new Date(Math.min(...expiryDates.map((d) => d.getTime())))
      : null;

  // Build redirect URL
  const redirectUrl = new URL(session.redirectUri);
  redirectUrl.searchParams.set("app_id", session.appId);
  redirectUrl.searchParams.set("status", "approved");
  if (earliestExpiry) {
    redirectUrl.searchParams.set("expires_at", earliestExpiry.toISOString());
  }

  return {
    appId: session.appId,
    redirectUri: redirectUrl.toString(),
  };
}

/**
 * Deny an install session.
 */
export async function denyInstallSession(
  sessionToken: string,
): Promise<{ redirectUri: string }> {
  const session = await getInstallSession(sessionToken);

  if (!session) {
    throw new Error("Invalid or expired session");
  }

  // Update session and delete app
  await prisma.$transaction([
    prisma.installSession.update({
      where: { id: session.id },
      data: {
        status: "DENIED",
        completedAt: new Date(),
      },
    }),
    prisma.app.delete({
      where: { id: session.appId },
    }),
  ]);

  // Build redirect URL
  const redirectUrl = new URL(session.redirectUri);
  redirectUrl.searchParams.set("status", "denied");

  return {
    redirectUri: redirectUrl.toString(),
  };
}

/**
 * Clean up expired codes and sessions.
 * Should be run periodically.
 */
export async function cleanupExpired(): Promise<{
  codesDeleted: number;
  sessionsDeleted: number;
}> {
  const now = new Date();

  // Delete expired codes
  const codesResult = await prisma.connectCode.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  // Delete expired sessions and their pending apps
  const expiredSessions = await prisma.installSession.findMany({
    where: {
      expiresAt: { lt: now },
      status: "PENDING",
    },
    select: { id: true, appId: true },
  });

  if (expiredSessions.length > 0) {
    await prisma.$transaction([
      prisma.installSession.updateMany({
        where: {
          id: { in: expiredSessions.map((s) => s.id) },
        },
        data: { status: "EXPIRED" },
      }),
      prisma.app.deleteMany({
        where: {
          id: { in: expiredSessions.map((s) => s.appId) },
          status: "PENDING",
        },
      }),
    ]);
  }

  return {
    codesDeleted: codesResult.count,
    sessionsDeleted: expiredSessions.length,
  };
}

// ============================================
// RESOURCE AVAILABILITY
// ============================================

/**
 * Check which resources are configured (have secrets set up).
 * Returns a map of resourceId -> availability info.
 */
export async function getResourceAvailability(
  resourceIds: string[],
): Promise<Record<string, { available: boolean; name?: string }>> {
  const result: Record<string, { available: boolean; name?: string }> = {};

  // Initialize all as unavailable
  resourceIds.forEach((id) => {
    result[id] = { available: false };
  });

  if (resourceIds.length === 0) {
    return result;
  }

  // Query configured resources
  const configuredResources = await prisma.resourceSecret.findMany({
    where: {
      resourceId: { in: resourceIds },
      status: "ACTIVE",
    },
    select: {
      resourceId: true,
      name: true,
    },
  });

  // Mark available resources
  configuredResources.forEach((resource) => {
    result[resource.resourceId] = {
      available: true,
      name: resource.name,
    };
  });

  return result;
}
