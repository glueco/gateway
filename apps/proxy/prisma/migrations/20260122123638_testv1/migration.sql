-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "InstallSessionStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "LimitType" AS ENUM ('RATE_LIMIT', 'BUDGET');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "RequestDecision" AS ENUM ('ALLOWED', 'DENIED_AUTH', 'DENIED_PERMISSION', 'DENIED_RATE_LIMIT', 'DENIED_BUDGET', 'DENIED_CONSTRAINT', 'ERROR');

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "homepage" TEXT,
    "status" "AppStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppCredential" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AppCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallSession" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "requestedPermissions" JSONB NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "status" "InstallSessionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InstallSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceSecret" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyIv" TEXT NOT NULL,
    "config" JSONB,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePermission" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "constraints" JSONB,
    "status" "PermissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourcePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppLimit" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "limitType" "LimitType" NOT NULL,
    "resourceId" TEXT,
    "action" TEXT,
    "maxRequests" INTEGER NOT NULL,
    "windowSeconds" INTEGER NOT NULL,
    "periodType" "PeriodType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL,
    "appId" TEXT,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "decision" "RequestDecision" NOT NULL,
    "decisionReason" TEXT,
    "latencyMs" INTEGER,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "App_status_idx" ON "App"("status");

-- CreateIndex
CREATE INDEX "AppCredential_appId_status_idx" ON "AppCredential"("appId", "status");

-- CreateIndex
CREATE INDEX "AppCredential_publicKey_idx" ON "AppCredential"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectCode_codeHash_key" ON "ConnectCode"("codeHash");

-- CreateIndex
CREATE INDEX "ConnectCode_expiresAt_idx" ON "ConnectCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstallSession_appId_key" ON "InstallSession"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallSession_sessionToken_key" ON "InstallSession"("sessionToken");

-- CreateIndex
CREATE INDEX "InstallSession_sessionToken_idx" ON "InstallSession"("sessionToken");

-- CreateIndex
CREATE INDEX "InstallSession_status_expiresAt_idx" ON "InstallSession"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSecret_resourceId_key" ON "ResourceSecret"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceSecret_resourceType_idx" ON "ResourceSecret"("resourceType");

-- CreateIndex
CREATE INDEX "ResourceSecret_status_idx" ON "ResourceSecret"("status");

-- CreateIndex
CREATE INDEX "ResourcePermission_appId_status_idx" ON "ResourcePermission"("appId", "status");

-- CreateIndex
CREATE INDEX "ResourcePermission_resourceId_action_idx" ON "ResourcePermission"("resourceId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePermission_appId_resourceId_action_key" ON "ResourcePermission"("appId", "resourceId", "action");

-- CreateIndex
CREATE INDEX "AppLimit_appId_idx" ON "AppLimit"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppLimit_appId_limitType_resourceId_action_key" ON "AppLimit"("appId", "limitType", "resourceId", "action");

-- CreateIndex
CREATE INDEX "RequestLog_appId_timestamp_idx" ON "RequestLog"("appId", "timestamp");

-- CreateIndex
CREATE INDEX "RequestLog_resourceId_action_timestamp_idx" ON "RequestLog"("resourceId", "action", "timestamp");

-- CreateIndex
CREATE INDEX "RequestLog_decision_timestamp_idx" ON "RequestLog"("decision", "timestamp");

-- AddForeignKey
ALTER TABLE "AppCredential" ADD CONSTRAINT "AppCredential_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallSession" ADD CONSTRAINT "InstallSession_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePermission" ADD CONSTRAINT "ResourcePermission_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppLimit" ADD CONSTRAINT "AppLimit_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;
