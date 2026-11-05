-- AlterTable
ALTER TABLE "Collaboration" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledByRole" "UserRole";
