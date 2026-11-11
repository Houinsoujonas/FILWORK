# Brevo — Configuration SMTP pour FILWORK

Brevo (ex-Sendinblue) est le fournisseur sortant prévu pour les e-mails transactionnels de FILWORK.

## Ce que fait le code

Le backend n'utilise **aucune API Brevo** directement. Il utilise `nodemailer` via `src/services/emailOutboxWorker.js` sur une configuration SMTP générique. Brevo expose un relais SMTP compatible : il suffit de renseigner les variables SMTP ci-dessous. Aucun code d'intégration Brevo n'est nécessaire tant que vous utilisez leur SMTP.

- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false` (STARTTLS)
- `SMTP_USER` / `SMTP_PASS` : identifiants SMTP fournis par Brevo (Dashboard Brevo → SMTP & API → onglet **SMTP**), distincts de la clé API.
- `MAIL_FROM` : une adresse expéditeur vérifiée dans Brevo (ex. `FILWORK <no-reply@votredomaine.com>`). Sur un plan gratuit, utilisez l'adresse de test Brevo autorisée.

## Mise en file persistante

Tous les e-mails passent par la table `EmailOutbox` (statuts `PENDING → PROCESSING → SENT/FAILED`, tentatives max 5, backoff exponentiel, récupération des `PROCESSING` bloqués après 10 min). Un échec SMTP ne fait jamais échouer une opération métier (inscription, clôture, paiement).

## Templates disponibles

- `welcome` (inscription), `collaboration_proposal`, `new_application`, `password_reset_code`, `announcement`, `campaign_closed`, `payment_received`, `payout_sent`.

Les templates sont dans `src/services/emailTemplates.js`. Toute modification du texte sans toucher aux points d'entrée `enqueue*` de `src/services/emailService.js` préserve les déclencheurs.

## Vérification

1. Configurez les variables SMTP (tableau de bord Brevo).
2. Envoyez un e-mail de test depuis un compte contrôlé (jamais depuis `filwork_test` vers des adresses réelles).
3. Vérifiez que l'e-mail sort de la file (`EmailOutbox.status = SENT`).
4. Sur erreur 535 : les identifiants SMTP sont refusés par Brevo (mot de passe SMTP obsolète ou mauvais). Régénérez le mot de passe SMTP Brevo.

## Sécurité

- Ne jamais commiter `SMTP_PASS` ni une clé Brevo.
- En environnement `NODE_ENV=test`, aucun e-mail n'est jamais envoyé (worker coupé, `processEmailOutboxBatch` inerte).
- Les destinataires de test (`@filwork.local`, `@example.com`) sont refusés par le worker même hors environnement de test.
- Aucun véritable e-mail ne doit être envoyé avant l'autorisation explicite de mise en production.
