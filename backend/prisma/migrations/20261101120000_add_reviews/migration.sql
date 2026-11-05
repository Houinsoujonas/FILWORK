-- Migration additive : module Avis et réponses.
--
-- Cette migration n'est pas appliquée automatiquement. Elle doit être
-- exécutée uniquement sur une base de test validée, puis sur la production
-- lors d'une opération de déploiement contrôlée.
--
-- L'historique des avis et des réponses est protégé : toutes les clés
-- étrangères utilisent ON DELETE RESTRICT.

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "collaborationId" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewResponse" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_collaborationId_key" ON "Review"("collaborationId");

-- CreateIndex
CREATE INDEX "Review_companyProfileId_createdAt_idx" ON "Review"("companyProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_creatorProfileId_createdAt_idx" ON "Review"("creatorProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewResponse_reviewId_key" ON "ReviewResponse"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewResponse_authorId_idx" ON "ReviewResponse"("authorId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Une note est un entier compris entre 1 et 5.
ALTER TABLE "Review"
ADD CONSTRAINT "Review_rating_check"
CHECK ("rating" BETWEEN 1 AND 5);

-- Un avis doit contenir un commentaire non vide.
ALTER TABLE "Review"
ADD CONSTRAINT "Review_comment_not_blank_check"
CHECK (btrim("comment") <> '');

-- Une réponse doit contenir un contenu non vide.
ALTER TABLE "ReviewResponse"
ADD CONSTRAINT "ReviewResponse_content_not_blank_check"
CHECK (btrim("content") <> '');
