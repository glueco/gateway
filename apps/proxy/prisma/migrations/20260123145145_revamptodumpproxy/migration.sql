-- CreateEnum
CREATE TYPE "UsagePeriodType" AS ENUM ('DAILY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "PermissionStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "ResourcePermission" ADD COLUMN     "burstLimit" INTEGER,
ADD COLUMN     "burstWindowSecs" INTEGER,
ADD COLUMN     "dailyQuota" INTEGER,
ADD COLUMN     "dailyTokenBudget" INTEGER,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "monthlyQuota" INTEGER,
ADD COLUMN     "monthlyTokenBudget" INTEGER,
ADD COLUMN     "rateLimitRequests" INTEGER,
ADD COLUMN     "rateLimitWindowSecs" INTEGER,
ADD COLUMN     "timeWindow" JSONB,
ADD COLUMN     "validFrom" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PermissionUsage" (
    "id" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "periodType" "UsagePeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PermissionUsage_permissionId_periodType_idx" ON "PermissionUsage"("permissionId", "periodType");

-- CreateIndex
CREATE INDEX "PermissionUsage_periodStart_idx" ON "PermissionUsage"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionUsage_permissionId_periodType_periodStart_key" ON "PermissionUsage"("permissionId", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "ResourcePermission_expiresAt_idx" ON "ResourcePermission"("expiresAt");

-- AddForeignKey
ALTER TABLE "PermissionUsage" ADD CONSTRAINT "PermissionUsage_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "ResourcePermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
