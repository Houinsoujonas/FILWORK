-- Migration : ajout des refresh tokens et du champ isActive sur User
-- Ce fichier est préparé mais NE DOIT PAS ÊTRE APPLIQUÉ sans autorisation explicite.
-- Appliquer avec : prisma migrate deploy

-- 1. Ajout de la colonne isActive sur la table User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 2. Création de la table RefreshToken
CREATE TABLE IF NOT EXISTS "RefreshToken" (
    id TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenHash" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- 3. Index sur RefreshToken
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
