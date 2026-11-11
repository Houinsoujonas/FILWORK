-- Migration : 20261111230000_add_saspay_integration
-- Ajoute l'infrastructure SasPay côté base de données :
--   - champs fournisseur/commission sur Payment ;
--   - coordonnées de reversement sur CreatorProfile ;
--   - table des transactions SasPay (traçabilité, idempotence).
-- Aucune donnée métier existante n'est supprimée ni modifiée.

-- 1. Payment : champs fournisseur et commission
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "providerTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerReference" TEXT,
  ADD COLUMN IF NOT EXISTS "commissionBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "commissionAmount" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "creatorAmount" DECIMAL(12, 2);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerTransactionId_key"
  ON "Payment"("providerTransactionId");

CREATE INDEX IF NOT EXISTS "Payment_provider_status_idx"
  ON "Payment"("provider", "status");

-- 2. CreatorProfile : coordonnées de reversement
ALTER TABLE "CreatorProfile"
  ADD COLUMN IF NOT EXISTS "payoutMsisdn" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutNetwork" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutCountry" TEXT;

-- 3. Enum direction
DO $$
BEGIN
  IF to_regtype('"SasPayDirection"') IS NULL THEN
    CREATE TYPE "SasPayDirection" AS ENUM ('PAYIN', 'PAYOUT');
  END IF;
END $$;

-- 4. Enum statut
DO $$
BEGIN
  IF to_regtype('"SasPayStatus"') IS NULL THEN
    CREATE TYPE "SasPayStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');
  END IF;
END $$;

-- 5. Table SasPayTransaction
CREATE TABLE IF NOT EXISTS "SasPayTransaction" (
  id TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT,
  "direction" "SasPayDirection" NOT NULL,
  reference TEXT UNIQUE,
  "providerId" TEXT UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status "SasPayStatus" NOT NULL DEFAULT 'PENDING',
  network TEXT,
  msisdn TEXT,
  "customerEmail" TEXT,
  payload JSONB,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SasPayTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SasPayTransaction_direction_status_idx"
  ON "SasPayTransaction"("direction", "status");

CREATE INDEX IF NOT EXISTS "SasPayTransaction_paymentId_idx"
  ON "SasPayTransaction"("paymentId");
