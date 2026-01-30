// ============================================
// TEMPORARY DEBUG ROUTE - REMOVE AFTER TESTING
// GET /api/debug/decrypt-test
// Tests if vault decryption is working
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const resourceId = request.nextUrl.searchParams.get("resourceId") || "llm:groq";
  
  try {
    // Step 1: Check if resource exists
    const resource = await prisma.resourceSecret.findUnique({
      where: { resourceId },
    });

    if (!resource) {
      return NextResponse.json({
        error: "Resource not found",
        resourceId,
        availableResources: await prisma.resourceSecret.findMany({
          select: { resourceId: true, name: true, status: true },
        }),
      }, { status: 404 });
    }

    // Step 2: Try to decrypt
    const { decryptSecret } = await import("@/lib/vault");
    
    let decryptedPreview: string;
    try {
      const decrypted = decryptSecret({
        encryptedKey: resource.encryptedKey,
        keyIv: resource.keyIv,
      });
      // Only show first 4 and last 4 chars of the decrypted secret
      decryptedPreview = decrypted.length > 10 
        ? `${decrypted.slice(0, 4)}...${decrypted.slice(-4)} (${decrypted.length} chars)`
        : "***hidden***";
    } catch (decryptError) {
      return NextResponse.json({
        error: "Decryption failed",
        decryptError: decryptError instanceof Error ? decryptError.message : String(decryptError),
        resourceId,
        resource: {
          id: resource.id,
          name: resource.name,
          status: resource.status,
          encryptedKeyLength: resource.encryptedKey.length,
          keyIvLength: resource.keyIv.length,
        },
        masterKeyPreview: process.env.MASTER_KEY 
          ? `${process.env.MASTER_KEY.slice(0, 10)}...${process.env.MASTER_KEY.slice(-5)} (${process.env.MASTER_KEY.length} chars)`
          : "NOT SET",
        hint: "This usually means MASTER_KEY changed after secrets were encrypted. Re-run seed or re-add secrets.",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resourceId,
      resource: {
        id: resource.id,
        name: resource.name,
        status: resource.status,
      },
      decryptedPreview,
      masterKeyPreview: process.env.MASTER_KEY 
        ? `${process.env.MASTER_KEY.slice(0, 10)}...${process.env.MASTER_KEY.slice(-5)} (${process.env.MASTER_KEY.length} chars)`
        : "NOT SET",
    });
  } catch (error) {
    return NextResponse.json({
      error: "Unexpected error",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
