-- Migration additive : protection de l'historique des collaborations.
--
-- La relation Collaboration.application utilisait ON DELETE CASCADE, alors
-- que Collaboration.invitation utilise ON DELETE RESTRICT. Une collaboration
-- issue d'une candidature pouvait donc être supprimée en cascade, avec ses
-- livrables et paiements, sans protection équivalente à celle de la branche
-- invitation.
--
-- Cette migration aligne les deux branches sur ON DELETE RESTRICT.
-- Elle ne supprime aucune donnée : seule la contrainte de clé étrangère est
-- redéfinie. Elle n'est pas appliquée automatiquement et doit être exécutée
-- uniquement sur une base de test validée, puis en production lors d'une
-- opération de déploiement contrôlée.

-- DropForeignKey
ALTER TABLE "Collaboration" DROP CONSTRAINT "Collaboration_applicationId_fkey";

-- AddForeignKey
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
