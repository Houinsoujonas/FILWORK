# Notifications de publication de campagne — FILWORK

> État au 2026-11-12. Un créateur reçoit automatiquement une notification lorsqu'une entreprise publie une campagne, selon ses préférences.

## Ce qui déclenche la notification

Seule la transition réelle vers `PUBLISHED` déclenche les alertes (endpoint `PATCH /api/campaigns/:id/publish` avec succès) :

- `DRAFT → PUBLISHED` ✓
- `PAUSED → PUBLISHED` ✓ (republication sans doublon grâce à la contrainte unique)

La transition ne déclenche rien lorsque :

- Un créateur poste une modification sans passer par `/publish` ;
- La publication est rejetée (campagne `CLOSED`, entreprise non propriétaire, etc.) ;
- La campagne était déjà au statut `PUBLISHED` (idempotence).

## Canaux

1. **Notification in-app** : créée dans la table `Notification` avec le type `CAMPAIGN_PUBLISHED`, liée à la campagne via `campaignId` (relation Prisma `Notification.campaign`).
2. **Email** : mis en file dans `EmailOutbox` (template `campaign_published`, payload inclut `companyName`, `campaignTitle`, `campaignDescription`, `link`). L'e-mail est envoyé par le worker ou le déclencheur externe si `campaignEmails=true` dans les préférences créateurs.

## Destinataires

- `role = CREATOR`
- `isActive = true`
- `CreatorProfile` existant
- Email non rattachée à un domaine RFC 2606 réservé (`example.com`, `.test`, etc.), réutilisation de `CREATOR_DISCOVERY_CONDITIONS` de `services/profileVisibility.js`.

**Non notifiés** : entreprises connectées (dont l'entreprise qui publie), administrateurs, comptes désactivés.

## Préférences

- Nouvelle préférence `campaignEmails` (défaut `true`) ajoutée au modèle `NotificationPreference`.
- API `GET/PATCH /api/preferences` l'expose désormais.
- Si un créateur choisit `campaignEmails: false`, aucune ligne `EmailOutbox` n'est attachée à son e-mail pour cette campagne.

## Déduplication

- Contrainte unique partielle : `(userId, CAMPAIGN_PUBLISHED, campaignId)` dans `Notification_campaign_published_unique`.
- Le `createMany(..., skipDuplicates: true)` évite les erreurs lors de la republication.
- Résultat : un créateur ne reçoit jamais deux notifications identiques pour une même campagne.

## Format

**Titre** : `Nouvelle opportunité : <companyName> publie une campagne`
**Message** : `<Company> vient de publier « <titre> ». Consultez les détails et postulez dès maintenant.`
**Lien** : `/campagnes/<campaignId>` (page publique consultable sans connexion).

Après clic, le créateur doit se connecter pour pouvoir postuler (la page publique affiche le bouton candidater).

**Email** : template `campaignPublishedEmail` dans `emailTemplates.js`, sujet `Nouvelle campagne sur FILWORK - <titre>`.

## Limites
- Email envoyé par Brevo après confirmation SMTP configurée. Tant que Brevo n'est pas opérationnel, les lignes restent en file (PENDING) sans erreur métier.
- Le worker doit être déclenché (cron/déclencheur externe) ; sur Vercel Hobby, prévoir un pinger 5 min si les e-mails sont critiques.
- Filtres de ciblage : les créateurs ne sont pas ciblés par niche / compétences / localisation — la notification est globale à tous les créateurs éligibles.

## Migration

Migration appliquée sur `filwork_test` : `20261112220000_add_campaign_published_notifications`.

Sur production (Neon), appliquer **avant** tout déploiement de cette fonctionnalité en production :

```sh
DATABASE_URL_UNPOOLED=<direct-prod> npx prisma migrate deploy --config prisma7.config.ts
```

**Ne jamais** appliquer en production sans autorisation et vérification préalable (voir `docs/production-migration-runbook.md`).
