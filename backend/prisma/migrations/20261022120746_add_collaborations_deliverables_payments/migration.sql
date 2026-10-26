-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('PENDING', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PLANNED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Collaboration" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "collaborationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "assetUrl" TEXT,
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "collaborationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collaboration_applicationId_key" ON "Collaboration"("applicationId");

-- CreateIndex
CREATE INDEX "Collaboration_status_createdAt_idx" ON "Collaboration"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Deliverable_collaborationId_status_idx" ON "Deliverable"("collaborationId", "status");

-- CreateIndex
CREATE INDEX "Deliverable_dueDate_idx" ON "Deliverable"("dueDate");

-- CreateIndex
CREATE INDEX "Payment_collaborationId_status_idx" ON "Payment"("collaborationId", "status");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- AddForeignKey
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
