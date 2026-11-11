-- Migration : 20261111233000_fix_saspaytransaction_updatedat_default
-- Aligner la colonne updatedAt sur @updatedAt de Prisma (aucune valeur par défaut côté base).
ALTER TABLE "SasPayTransaction" ALTER COLUMN "updatedAt" DROP DEFAULT;
