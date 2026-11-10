-- Migration : 20261109000000_add_communication_system
-- Ajoute le système de communication FILWORK :
--   - Annonces administratives (Announcement)
--   - File d'envoi d'emails persistante (EmailOutbox)
--   - Préférences de communication (NotificationPreference)
--   - Types de notification ANNOUNCEMENT et COLLABORATION_PROPOSED
--   - Lien et announcementId sur Notification
--   - Code de réinitialisation par hash sur PasswordResetToken
--
-- Cette migration est volontairement rejouable : chaque objet est vérifié
-- dans le catalogue PostgreSQL avant d'être créé ou transformé. Elle couvre
-- aussi bien une base vierge qu'un état partiellement appliqué (tables,
-- colonnes, index et contraintes déjà présents).
--
-- Seules les trois audiences fonctionnelles sont retenues :
-- ALL, CREATORS, COMPANIES. Les administrateurs publient les annonces ;
-- ils ne constituent pas une audience.

-- ============================================================
-- 1. Enums
-- ============================================================

-- AnnouncementAudience : trois valeurs uniquement.
-- Si une exécution antérieure a créé la valeur ADMINS, les annonces
-- concernées sont rattachées à ALL avant de reconstruire l'enum.
DO $$
DECLARE
  legacy_base TEXT := 'AnnouncementAudience_legacy_20261109';
  legacy_name TEXT := legacy_base;
  counter INTEGER := 0;
BEGIN
  IF to_regtype('"AnnouncementAudience"') IS NULL THEN
    CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'CREATORS', 'COMPANIES');
  ELSIF EXISTS (
    SELECT 1
    FROM pg_enum e
    WHERE e.enumtypid = to_regtype('"AnnouncementAudience"')
      AND e.enumlabel = 'ADMINS'
  ) THEN
    -- Nom temporaire unique : une exécution interrompue peut avoir laissé
    -- un type de sauvegarde derrière elle.
    WHILE to_regtype(format('%I', legacy_name)) IS NOT NULL LOOP
      counter := counter + 1;
      legacy_name := legacy_base || '_' || counter;
    END LOOP;

    IF to_regclass('"Announcement"') IS NOT NULL THEN
      -- Préserver les données : ADMINS devient ALL.
      UPDATE "Announcement"
      SET "audience" = 'ALL'
      WHERE "audience" = 'ADMINS';

      -- Le default dépend de l'ancien type : il doit être retiré avant
      -- le remplacement de l'enum.
      ALTER TABLE "Announcement"
        ALTER COLUMN "audience" DROP DEFAULT;

      EXECUTE format(
        'ALTER TYPE "AnnouncementAudience" RENAME TO %I',
        legacy_name
      );

      CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'CREATORS', 'COMPANIES');

      ALTER TABLE "Announcement"
        ALTER COLUMN "audience" TYPE "AnnouncementAudience"
        USING ("audience"::text::"AnnouncementAudience");

      ALTER TABLE "Announcement"
        ALTER COLUMN "audience" SET DEFAULT 'ALL';

      EXECUTE format('DROP TYPE %I', legacy_name);
    ELSE
      DROP TYPE "AnnouncementAudience";
      CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'CREATORS', 'COMPANIES');
    END IF;
  END IF;
END $$;

-- Nettoyage des types de sauvegarde laissés par une exécution interrompue.
-- Seuls les types créés par cette migration sont concernés, et uniquement
-- s'ils ne sont plus référencés par aucune colonne.
DO $$
DECLARE
  legacy RECORD;
BEGIN
  FOR legacy IN
    SELECT t.oid, t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = current_schema()
      AND t.typname LIKE 'AnnouncementAudience_legacy_20261109%'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.atttypid = legacy.oid
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) THEN
      EXECUTE format('DROP TYPE %I.%I', current_schema(), legacy.typname);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regtype('"AnnouncementStatus"') IS NULL THEN
    CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regtype('"EmailOutboxStatus"') IS NULL THEN
    CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
  END IF;
END $$;

-- 2. Nouvelles valeurs de l'enum NotificationType existant.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COLLABORATION_PROPOSED';

-- ============================================================
-- 3. Table Announcement
-- ============================================================

DO $$
BEGIN
  IF to_regclass('"Announcement"') IS NULL THEN
    CREATE TABLE "Announcement" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
        "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
        "linkUrl" TEXT,
        "createdById" TEXT NOT NULL,
        "publishedAt" TIMESTAMP(3),
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

-- Aligner les defaults sur schema.prisma : updatedAt est géré par Prisma
-- (@updatedAt), sans valeur par défaut côté base.
ALTER TABLE "Announcement"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "Announcement"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;
ALTER TABLE "Announcement" ALTER COLUMN "audience" SET DEFAULT 'ALL';
ALTER TABLE "Announcement" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "Announcement" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Announcement" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Contrainte de clé étrangère vers User.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Announcement_createdById_fkey'
      AND conrelid = to_regclass('"Announcement"')
  ) THEN
    ALTER TABLE "Announcement"
      ADD CONSTRAINT "Announcement_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Announcement_status_publishedAt_idx"
  ON "Announcement"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "Announcement_audience_idx"
  ON "Announcement"("audience");

-- ============================================================
-- 4. Table EmailOutbox
-- ============================================================

DO $$
BEGIN
  IF to_regclass('"EmailOutbox"') IS NULL THEN
    CREATE TABLE "EmailOutbox" (
        "id" TEXT NOT NULL,
        "to" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "template" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "maxAttempts" INTEGER NOT NULL DEFAULT 5,
        "lastError" TEXT,
        "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "sentAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

-- payload : JSON -> JSONB (le default dépend de l'ancien type, on le retire
-- d'abord). schema.prisma ne déclare pas de default sur payload.
ALTER TABLE "EmailOutbox" ALTER COLUMN "payload" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'EmailOutbox'
      AND column_name = 'payload'
      AND data_type = 'json'
  ) THEN
    ALTER TABLE "EmailOutbox"
      ALTER COLUMN "payload" TYPE JSONB
      USING ("payload"::jsonb);
  END IF;
END $$;

-- updatedAt : absent des états partiels, aligné sur @updatedAt (sans default).
ALTER TABLE "EmailOutbox" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "EmailOutbox"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;
ALTER TABLE "EmailOutbox" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "EmailOutbox" ALTER COLUMN "updatedAt" SET NOT NULL;

-- attempts : colonne ajoutée avec default et NOT NULL, quel que soit l'état
-- partiel laissé par une exécution précédente.
ALTER TABLE "EmailOutbox"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
UPDATE "EmailOutbox" SET "attempts" = 0 WHERE "attempts" IS NULL;
ALTER TABLE "EmailOutbox" ALTER COLUMN "attempts" SET DEFAULT 0;
ALTER TABLE "EmailOutbox" ALTER COLUMN "attempts" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "EmailOutbox_status_nextAttemptAt_idx"
  ON "EmailOutbox"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "EmailOutbox_to_createdAt_idx"
  ON "EmailOutbox"("to", "createdAt");

-- ============================================================
-- 5. Table NotificationPreference
-- ============================================================

DO $$
BEGIN
  IF to_regclass('"NotificationPreference"') IS NULL THEN
    CREATE TABLE "NotificationPreference" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "collaborationEmails" BOOLEAN NOT NULL DEFAULT true,
        "announcementEmails" BOOLEAN NOT NULL DEFAULT true,
        "notificationEmails" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

ALTER TABLE "NotificationPreference"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "NotificationPreference"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;
ALTER TABLE "NotificationPreference" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "NotificationPreference" ALTER COLUMN "updatedAt" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'NotificationPreference_userId_fkey'
      AND conrelid = to_regclass('"NotificationPreference"')
  ) THEN
    ALTER TABLE "NotificationPreference"
      ADD CONSTRAINT "NotificationPreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key"
  ON "NotificationPreference"("userId");

-- ============================================================
-- 6. Notification : announcementId et link
-- ============================================================

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "announcementId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "link" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Notification_announcementId_fkey'
      AND conrelid = to_regclass('"Notification"')
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_announcementId_fkey"
      FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_announcementId_idx"
  ON "Notification"("announcementId");

-- ============================================================
-- 7. PasswordResetToken : tokenHash -> codeHash + attempts
-- ============================================================
-- La migration 20261022175407 a créé un INDEX UNIQUE nommé
-- "PasswordResetToken_tokenHash_key" (et non une contrainte de table).
-- L'ancienne migration tentait un DROP CONSTRAINT, d'où l'erreur P3018.

-- a. Renommer la colonne si l'ancien nom est encore présent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'PasswordResetToken'
      AND column_name = 'tokenHash'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'PasswordResetToken'
      AND column_name = 'codeHash'
  ) THEN
    ALTER TABLE "PasswordResetToken"
      RENAME COLUMN "tokenHash" TO "codeHash";
  END IF;
END $$;

-- b. Renommer l'objet unique existant, qu'il soit un index ou une contrainte.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PasswordResetToken_tokenHash_key'
      AND conrelid = to_regclass('"PasswordResetToken"')
  ) THEN
    ALTER TABLE "PasswordResetToken"
      RENAME CONSTRAINT "PasswordResetToken_tokenHash_key"
      TO "PasswordResetToken_codeHash_key";
  ELSIF to_regclass('"PasswordResetToken_tokenHash_key"') IS NOT NULL THEN
    ALTER INDEX "PasswordResetToken_tokenHash_key"
      RENAME TO "PasswordResetToken_codeHash_key";
  END IF;
END $$;

-- c. Garantir l'unicité de codeHash sous le nom attendu par Prisma.
DO $$
BEGIN
  IF to_regclass('"PasswordResetToken_codeHash_key"') IS NULL THEN
    CREATE UNIQUE INDEX "PasswordResetToken_codeHash_key"
      ON "PasswordResetToken"("codeHash");
  END IF;
END $$;

-- d. Compteur de tentatives de saisie du code.
ALTER TABLE "PasswordResetToken"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 8. Relation User -> NotificationPreference
-- ============================================================
-- Aucune modification nécessaire sur la table User : la relation est portée
-- par la clé étrangère NotificationPreference.userId créée ci-dessus.
