-- Migration : 20261111220000_fix_refresh_token_fk_on_update_cascade
-- Le schéma Prisma prévoit un comportement ON UPDATE CASCADE pour la relation
-- RefreshToken -> User (toutes les autres relations du schéma font de même).
-- La migration précédente n'avait pas repris cette clause. Cette migration
-- recrée la contrainte à l'identique avec la clause attendue.
--
-- Sécurité :
--   - aucune donnée n'est supprimée ou modifiée ;
--   - la table RefreshToken est verrouillée pendant la transaction (elle est
--     petite, l'opération est quasi instantanée) ;
--   - la contrainte est recréée avec le même nom que l'original.

ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";

ALTER TABLE "RefreshToken"
  ADD CONSTRAINT "RefreshToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
