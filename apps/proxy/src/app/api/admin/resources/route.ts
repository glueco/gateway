import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { encryptSecret } from "@/lib/vault";

// ============================================
// Admin authentication helper
// ============================================

function checkAdminAuth(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  return authHeader.slice(7) === adminSecret;
}

// ============================================
// GET /api/admin/resources
// List all resources
// ============================================

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resources = await prisma.resourceSecret.findMany({
    select: {
      id: true,
      resourceId: true,
      name: true,
      resourceType: true,
      status: true,
      config: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ resources });
}

// ============================================
// POST /api/admin/resources
// Create/update a resource secret
// ============================================

const ResourceSchema = z.object({
  resourceId: z.string().min(1), // Format: resourceType:provider (e.g., llm:groq)
  name: z.string().min(1),
  resourceType: z.string().min(1),
  secret: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors },
      { status: 400 },
    );
  }

  // Validate resource ID format
  if (!parsed.data.resourceId.includes(":")) {
    return NextResponse.json(
      {
        error: `Invalid resourceId format: ${parsed.data.resourceId}. Expected format: resourceType:provider (e.g., llm:groq)`,
      },
      { status: 400 },
    );
  }

  // Encrypt the secret
  const encrypted = encryptSecret(parsed.data.secret);

  // Upsert resource
  const resource = await prisma.resourceSecret.upsert({
    where: { resourceId: parsed.data.resourceId },
    create: {
      resourceId: parsed.data.resourceId,
      name: parsed.data.name,
      resourceType: parsed.data.resourceType,
      encryptedKey: encrypted.encryptedKey,
      keyIv: encrypted.keyIv,
      config: parsed.data.config || {},
    },
    update: {
      name: parsed.data.name,
      resourceType: parsed.data.resourceType,
      encryptedKey: encrypted.encryptedKey,
      keyIv: encrypted.keyIv,
      config: parsed.data.config || {},
    },
    select: {
      id: true,
      resourceId: true,
      name: true,
      resourceType: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ resource });
}
