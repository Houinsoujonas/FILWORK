const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// Charger les variables du fichier .env pour le nettoyage des tests.
require("node:process").loadEnvFile(path.resolve(__dirname, "../.env"));

// Prisma sera utilisé pour supprimer les données de test à la fin.
const prisma = require("../src/config/prisma");

const API_BASE_URL = (
  process.env.API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

test("GET /api/health - le serveur fonctionne", async () => {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
});

test("GET /api/profile/me - refuse une requête sans jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/profile/me`);
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.equal(data.message, "Authentification requise.");
});

test("GET /api/profile/me - refuse un faux jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
    headers: {
      Authorization: "Bearer jeton-fictif-invalide",
    },
  });

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.equal(
    data.message,
    "Jeton invalide ou expiré. Veuillez vous reconnecter.",
  );
});

test("POST /api/auth/register - refuse le rôle ADMIN", async () => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `test-admin-${Date.now()}@filwork.local`,
      password: "TestPassword123!",
      role: "ADMIN",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.message, "Le type de compte doit être CREATOR ou COMPANY.");
});

test("GET /api/campaigns - la liste publique est accessible", async () => {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
});

test("POST /api/auth/register - refuse une adresse e-mail invalide", async () => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "adresse-invalide",
      password: "TestPassword123!",
      role: "CREATOR",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.message, "Veuillez fournir une adresse e-mail valide.");
});

test("POST /api/auth/register - refuse un mot de passe trop court", async () => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "test-mot-de-passe-invalide@filwork.local",
      password: "abc123",
      role: "CREATOR",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(
    data.message,
    "Le mot de passe doit contenir au moins 8 caractères.",
  );
});

test("POST /api/campaigns - refuse la création sans authentification", async () => {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Campagne de test automatisé",
      description: "Cette campagne ne doit pas être créée.",
    }),
  });

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.equal(data.message, "Authentification requise.");
});

const protectedEndpoints = [
  {
    method: "GET",
    path: "/api/applications/my-applications",
  },
  {
    method: "GET",
    path: "/api/notifications",
  },
  {
    method: "GET",
    path: "/api/collaborations",
  },
  {
    method: "GET",
    path: "/api/deliverables/collaborations/test-collaboration-id",
  },
  {
    method: "GET",
    path: "/api/payments/collaborations/test-collaboration-id",
  },
];

for (const endpoint of protectedEndpoints) {
  test(`${endpoint.method} ${endpoint.path} - refuse une requête sans jeton`, async () => {
    const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
    });

    assert.equal(response.status, 401);
  });
}

const roleTestsEnabled = Boolean(
  process.env.TEST_CREATOR_EMAIL &&
  process.env.TEST_CREATOR_PASSWORD &&
  process.env.TEST_COMPANY_EMAIL &&
  process.env.TEST_COMPANY_PASSWORD &&
  process.env.TEST_CAMPAIGN_ID,
);

async function getTestToken(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    `Connexion du compte de test impossible : ${data.message || "erreur inconnue"}`,
  );

  assert.equal(data.success, true);
  assert.equal(typeof data.token, "string");

  return data.token;
}

test(
  "POST /api/campaigns - un créateur ne peut pas créer une campagne",
  { skip: !roleTestsEnabled },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "Test automatisé de permissions",
        description: "Cette campagne ne doit pas être créée.",
      }),
    });

    assert.equal(response.status, 403);
  },
);

test(
  "POST /api/applications/:campaignId - une entreprise ne peut pas candidater",
  { skip: !roleTestsEnabled },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const campaignId = process.env.TEST_CAMPAIGN_ID;

    const response = await fetch(
      `${API_BASE_URL}/api/applications/${campaignId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "Test automatisé de permissions.",
        }),
      },
    );

    assert.equal(response.status, 403);
  },
);

const ownershipTestsEnabled = Boolean(
  process.env.TEST_OTHER_COMPANY_EMAIL &&
  process.env.TEST_OTHER_COMPANY_PASSWORD &&
  process.env.TEST_OWNERSHIP_CAMPAIGN_ID,
);

test(
  "GET /api/applications/campaigns/:campaignId - interdit l'accès aux candidatures d'une autre entreprise",
  { skip: !ownershipTestsEnabled },
  async () => {
    const token = await getTestToken(
      process.env.TEST_OTHER_COMPANY_EMAIL,
      process.env.TEST_OTHER_COMPANY_PASSWORD,
    );

    const campaignId = process.env.TEST_OWNERSHIP_CAMPAIGN_ID;

    const response = await fetch(
      `${API_BASE_URL}/api/applications/campaigns/${campaignId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(response.status, 404);
  },
);

test(
  "PATCH /api/campaigns/:id/close - interdit à une autre entreprise de fermer la campagne",
  { skip: !ownershipTestsEnabled },
  async () => {
    const token = await getTestToken(
      process.env.TEST_OTHER_COMPANY_EMAIL,
      process.env.TEST_OTHER_COMPANY_PASSWORD,
    );

    const campaignId = process.env.TEST_OWNERSHIP_CAMPAIGN_ID;

    const response = await fetch(
      `${API_BASE_URL}/api/campaigns/${campaignId}/close`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(response.status, 404);
  },
);

const workflowTestEnabled = Boolean(
  process.env.TEST_CREATOR_EMAIL &&
  process.env.TEST_CREATOR_PASSWORD &&
  process.env.TEST_COMPANY_EMAIL &&
  process.env.TEST_COMPANY_PASSWORD,
);

test(
  "Parcours complet : campagne, candidature, acceptation, collaboration et notification",
  { skip: !workflowTestEnabled },
  async () => {
    let campaignId = null;

    try {
      // 1. Authentifier le créateur et l'entreprise.
      const creatorToken = await getTestToken(
        process.env.TEST_CREATOR_EMAIL,
        process.env.TEST_CREATOR_PASSWORD,
      );

      const companyToken = await getTestToken(
        process.env.TEST_COMPANY_EMAIL,
        process.env.TEST_COMPANY_PASSWORD,
      );

      // Créer une campagne avec un titre unique.
      const campaignTitle = `Test automatisé FILWORK ${Date.now()}`;

      const createCampaignResponse = await fetch(
        `${API_BASE_URL}/api/campaigns`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            title: campaignTitle,
            description:
              "Campagne temporaire créée pour tester le cycle complet des candidatures FILWORK.",
          }),
        },
      );

      const createdCampaignData = await createCampaignResponse.json();

      assert.ok(
        [200, 201].includes(createCampaignResponse.status),
        `La création de campagne a échoué : ${
          createdCampaignData.message || createCampaignResponse.status
        }`,
      );

      const createdCampaign =
        createdCampaignData.campaign ||
        createdCampaignData.data?.campaign ||
        createdCampaignData.data ||
        createdCampaignData;

      campaignId = createdCampaign.id;

      assert.ok(
        campaignId,
        "La réponse de création ne contient pas l'identifiant de la campagne.",
      );

      // 2. Publier la campagne.
      const publishResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const publishData = await publishResponse.json();

      assert.ok(
        [200, 201].includes(publishResponse.status),
        `La publication a échoué : ${
          publishData.message || publishResponse.status
        }`,
      );

      assert.equal(publishData.success, true);

      // 3. Le créateur dépose sa candidature.
      const applicationResponse = await fetch(
        `${API_BASE_URL}/api/applications/${campaignId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            message:
              "Candidature créée dans le cadre du test automatisé FILWORK.",
          }),
        },
      );

      const applicationData = await applicationResponse.json();

      assert.equal(
        applicationResponse.status,
        201,
        `La candidature a échoué : ${
          applicationData.message || applicationResponse.status
        }`,
      );

      assert.equal(applicationData.success, true);

      const applicationId = applicationData.application?.id;

      assert.ok(
        applicationId,
        "La réponse ne contient pas l'identifiant de la candidature.",
      );

      assert.equal(applicationData.application.status, "PENDING");

      // 4. L'entreprise accepte la candidature.
      const acceptResponse = await fetch(
        `${API_BASE_URL}/api/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "ACCEPTED",
          }),
        },
      );

      const acceptedData = await acceptResponse.json();

      assert.equal(
        acceptResponse.status,
        200,
        `L'acceptation a échoué : ${
          acceptedData.message || acceptResponse.status
        }`,
      );

      assert.equal(acceptedData.success, true);
      assert.equal(acceptedData.application.status, "ACCEPTED");

      // 5. Vérifier la création de la collaboration.
      const collaboration = acceptedData.application.collaboration;

      assert.ok(collaboration, "La collaboration n'a pas été créée.");

      assert.ok(collaboration.id);

      assert.equal(collaboration.status, "ACTIVE");

      // 6. Vérifier la notification reçue par le créateur.
      const notificationResponse = await fetch(
        `${API_BASE_URL}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const notificationData = await notificationResponse.json();

      assert.equal(notificationResponse.status, 200);
      assert.equal(notificationData.success, true);

      const notifications =
        notificationData.notifications || notificationData.data?.notifications;

      assert.ok(
        Array.isArray(notifications),
        "La réponse des notifications ne contient pas de liste.",
      );

      const acceptedNotification = notifications.find(
        (notification) =>
          notification.type === "APPLICATION_ACCEPTED" &&
          notification.message?.includes(campaignTitle),
      );

      assert.ok(
        acceptedNotification,
        "La notification d'acceptation n'a pas été retrouvée.",
      );
      // 7. L'entreprise crée un livrable.
      const createDeliverableResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/collaborations/${collaboration.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            title: `Livrable de test ${Date.now()}`,
            description:
              "Livrable temporaire pour tester le cycle de validation.",
          }),
        },
      );

      const createDeliverableData = await createDeliverableResponse.json();

      assert.equal(
        createDeliverableResponse.status,
        201,
        `Création du livrable impossible : ${
          createDeliverableData.message || createDeliverableResponse.status
        }`,
      );

      assert.equal(createDeliverableData.success, true);

      const deliverableId = createDeliverableData.deliverable?.id;

      assert.ok(deliverableId, "L'identifiant du livrable est absent.");

      assert.equal(createDeliverableData.deliverable.status, "PENDING");

      // 8. Le créateur consulte les livrables de la collaboration.
      const listDeliverablesResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/collaborations/${collaboration.id}`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const listDeliverablesData = await listDeliverablesResponse.json();

      assert.equal(listDeliverablesResponse.status, 200);
      assert.equal(listDeliverablesData.success, true);
      assert.ok(
        listDeliverablesData.deliverables.some(
          (item) => item.id === deliverableId,
        ),
        "Le créateur ne retrouve pas le livrable.",
      );

      // 9. Le créateur soumet son travail.
      const submitDeliverableResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/submit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            assetUrl: "https://example.com/filwork-livrable-test-v1",
          }),
        },
      );

      const submitDeliverableData = await submitDeliverableResponse.json();

      assert.equal(
        submitDeliverableResponse.status,
        200,
        `Soumission impossible : ${
          submitDeliverableData.message || submitDeliverableResponse.status
        }`,
      );

      assert.equal(submitDeliverableData.deliverable.status, "SUBMITTED");

      // 10. L'entreprise demande une correction.
      const requestRevisionResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "REVISION_REQUESTED",
            feedback: "Veuillez améliorer la version proposée.",
          }),
        },
      );

      const requestRevisionData = await requestRevisionResponse.json();

      assert.equal(
        requestRevisionResponse.status,
        200,
        `Demande de correction impossible : ${
          requestRevisionData.message || requestRevisionResponse.status
        }`,
      );

      assert.equal(
        requestRevisionData.deliverable.status,
        "REVISION_REQUESTED",
      );

      // 11. Le créateur soumet une nouvelle version.
      const resubmitDeliverableResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/submit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            assetUrl: "https://example.com/filwork-livrable-test-v2",
          }),
        },
      );

      const resubmitDeliverableData = await resubmitDeliverableResponse.json();

      assert.equal(
        resubmitDeliverableResponse.status,
        200,
        `Nouvelle soumission impossible : ${
          resubmitDeliverableData.message || resubmitDeliverableResponse.status
        }`,
      );

      assert.equal(resubmitDeliverableData.deliverable.status, "SUBMITTED");

      // 12. L'entreprise approuve la nouvelle version.
      const approveDeliverableResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "APPROVED",
          }),
        },
      );

      const approveDeliverableData = await approveDeliverableResponse.json();

      assert.equal(
        approveDeliverableResponse.status,
        200,
        `Approbation impossible : ${
          approveDeliverableData.message || approveDeliverableResponse.status
        }`,
      );

      assert.equal(approveDeliverableData.deliverable.status, "APPROVED");

      // 13. Un livrable approuvé ne peut plus être soumis.
      const submitApprovedResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/submit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            assetUrl: "https://example.com/filwork-livrable-test-v3",
          }),
        },
      );

      assert.equal(
        submitApprovedResponse.status,
        409,
        "Un livrable approuvé ne devrait plus pouvoir être soumis.",
      );

      // 14. L'entreprise crée un paiement pour la collaboration.
      const createPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            amount: 25000,
            currency: "XOF",
            notes: "Paiement de test automatisé FILWORK.",
          }),
        },
      );

      const createPaymentData = await createPaymentResponse.json();

      assert.equal(
        createPaymentResponse.status,
        201,
        `Création du paiement impossible : ${
          createPaymentData.message || createPaymentResponse.status
        }`,
      );

      assert.equal(createPaymentData.success, true);

      const paymentId = createPaymentData.payment?.id;

      assert.ok(paymentId, "L'identifiant du paiement est absent.");

      assert.equal(createPaymentData.payment.status, "PLANNED");
      assert.equal(Number(createPaymentData.payment.amount), 25000);
      assert.equal(createPaymentData.payment.currency, "XOF");

      // 15. Le créateur peut consulter les paiements de la collaboration.
      const listPaymentsResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const listPaymentsData = await listPaymentsResponse.json();

      assert.equal(listPaymentsResponse.status, 200);
      assert.equal(listPaymentsData.success, true);

      assert.ok(
        listPaymentsData.payments.some((payment) => payment.id === paymentId),
        "Le créateur ne retrouve pas le paiement.",
      );

      // 16. L'entreprise fait passer le paiement à PENDING.
      const pendingPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/${paymentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "PENDING",
            reference: `TEST-FILWORK-${Date.now()}`,
          }),
        },
      );

      const pendingPaymentData = await pendingPaymentResponse.json();

      assert.equal(
        pendingPaymentResponse.status,
        200,
        `Passage à PENDING impossible : ${
          pendingPaymentData.message || pendingPaymentResponse.status
        }`,
      );

      assert.equal(pendingPaymentData.success, true);
      assert.equal(pendingPaymentData.payment.status, "PENDING");

      // 17. L'entreprise marque le paiement comme payé.
      const paidPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/${paymentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "PAID",
          }),
        },
      );

      const paidPaymentData = await paidPaymentResponse.json();

      assert.equal(
        paidPaymentResponse.status,
        200,
        `Passage à PAID impossible : ${
          paidPaymentData.message || paidPaymentResponse.status
        }`,
      );

      assert.equal(paidPaymentData.success, true);
      assert.equal(paidPaymentData.payment.status, "PAID");

      assert.ok(
        paidPaymentData.payment.paidAt,
        "La date du paiement n'a pas été enregistrée.",
      );

      // 18. Vérifier le montant total payé.
      const finalPaymentsResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const finalPaymentsData = await finalPaymentsResponse.json();

      assert.equal(finalPaymentsResponse.status, 200);
      assert.equal(finalPaymentsData.success, true);
      assert.equal(finalPaymentsData.totalPaid, 25000);

      // 19. Un paiement PAID ne peut plus être modifié.
      const modifyPaidPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/${paymentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "FAILED",
          }),
        },
      );

      assert.equal(
        modifyPaidPaymentResponse.status,
        409,
        "Un paiement déjà payé ne devrait plus changer de statut.",
      );
    } finally {
      // Nettoyer uniquement la campagne temporaire et ses données liées.
      if (campaignId) {
        const applications = await prisma.application.findMany({
          where: {
            campaignId,
          },
          select: {
            id: true,
          },
        });

        const applicationIds = applications.map(
          (application) => application.id,
        );

        if (applicationIds.length > 0) {
          await prisma.notification.deleteMany({
            where: {
              applicationId: {
                in: applicationIds,
              },
            },
          });
        }

        await prisma.campaign.deleteMany({
          where: {
            id: campaignId,
          },
        });
      }
    }
  },
);

// Fermer proprement le client Prisma du processus de test.
test.after(async () => {
  await prisma.$disconnect();
});

// =====================================================
// TESTS AUTOMATISÉS — MARKETPLACE ET RÉPERTOIRE
// =====================================================

// 19. Vérifier la pagination de la marketplace.
test("GET /api/campaigns - renvoie les métadonnées de pagination", async () => {
  const response = await fetch(`${API_BASE_URL}/api/campaigns?page=1&limit=2`);

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.page, 1);
  assert.equal(data.limit, 2);
  assert.ok(Array.isArray(data.campaigns));
  assert.ok(data.count <= 2);
  assert.equal(data.count, data.campaigns.length);
  assert.equal(data.totalPages, Math.ceil(data.total / 2));
});

// 20. Vérifier la recherche par mot-clé avec une campagne existante.
test("GET /api/campaigns - recherche par mot-clé", async () => {
  const initialResponse = await fetch(`${API_BASE_URL}/api/campaigns`);

  const initialData = await initialResponse.json();

  assert.equal(initialResponse.status, 200);
  assert.equal(initialData.success, true);

  if (initialData.campaigns.length === 0) {
    return;
  }

  const campaign = initialData.campaigns[0];
  const searchTerm = campaign.title.split(/\s+/)[0];

  const params = new URLSearchParams({
    search: searchTerm,
  });

  const response = await fetch(`${API_BASE_URL}/api/campaigns?${params}`);

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.campaigns.length > 0);

  const normalizedTerm = searchTerm.toLowerCase();

  assert.ok(
    data.campaigns.some(
      (item) =>
        item.title.toLowerCase().includes(normalizedTerm) ||
        item.description.toLowerCase().includes(normalizedTerm),
    ),
    "Aucune campagne retournée ne correspond au mot recherché.",
  );
});

// 21. Vérifier le filtre par plateforme.
test("GET /api/campaigns - filtre par plateforme", async () => {
  const initialResponse = await fetch(`${API_BASE_URL}/api/campaigns`);

  const initialData = await initialResponse.json();

  assert.equal(initialResponse.status, 200);

  const campaign = initialData.campaigns.find(
    (item) => Array.isArray(item.platforms) && item.platforms.length > 0,
  );

  // Si la base ne contient aucune campagne avec plateforme,
  // vérifier au moins que le filtre ne provoque pas d'erreur.
  const platform = campaign ? campaign.platforms[0] : "INSTAGRAM";

  const params = new URLSearchParams({
    platform,
  });

  const response = await fetch(`${API_BASE_URL}/api/campaigns?${params}`);

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.campaigns));

  for (const item of data.campaigns) {
    assert.ok(
      item.platforms.includes(platform),
      "Une campagne retournée ne correspond pas à la plateforme demandée.",
    );
  }

  if (campaign) {
    assert.ok(
      data.campaigns.some((item) => item.id === campaign.id),
      "La campagne correspondant à la plateforme n'a pas été retrouvée.",
    );
  }
});

// 22. Vérifier le filtre par budget.
test("GET /api/campaigns - filtre par budget", async () => {
  const initialResponse = await fetch(`${API_BASE_URL}/api/campaigns`);

  const initialData = await initialResponse.json();

  assert.equal(initialResponse.status, 200);

  const campaign = initialData.campaigns.find(
    (item) => item.budget !== null && item.budget !== undefined,
  );

  if (!campaign) {
    const response = await fetch(
      `${API_BASE_URL}/api/campaigns?minBudget=25000&maxBudget=75000`,
    );

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);

    return;
  }

  const budget = Number(campaign.budget);

  assert.ok(
    Number.isFinite(budget),
    "Le budget de la campagne de référence est invalide.",
  );

  const params = new URLSearchParams({
    minBudget: String(budget),
    maxBudget: String(budget),
  });

  const response = await fetch(`${API_BASE_URL}/api/campaigns?${params}`);

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);

  assert.ok(
    data.campaigns.some((item) => item.id === campaign.id),
    "La campagne de référence n'a pas été retrouvée avec son budget.",
  );

  for (const item of data.campaigns) {
    const itemBudget = Number(item.budget);

    assert.ok(itemBudget >= budget);
    assert.ok(itemBudget <= budget);
  }
});

// 23. Vérifier le refus d'un budget minimal invalide.
test("GET /api/campaigns - refuse un budget minimal négatif", async () => {
  const response = await fetch(`${API_BASE_URL}/api/campaigns?minBudget=-100`);

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
});

// 24. Vérifier le refus d'une plage de budgets incohérente.
test("GET /api/campaigns - refuse un budget minimal supérieur au maximal", async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns?minBudget=100000&maxBudget=1000`,
  );

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
});

// 25. Vérifier que le répertoire exige une authentification.
test("GET /api/creators - refuse une requête sans jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/creators`);

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

// Activer les tests qui nécessitent les deux comptes existants.
const creatorDirectoryTestsEnabled = Boolean(
  process.env.TEST_CREATOR_EMAIL &&
  process.env.TEST_CREATOR_PASSWORD &&
  process.env.TEST_COMPANY_EMAIL &&
  process.env.TEST_COMPANY_PASSWORD,
);

// 26. Vérifier que les entreprises peuvent consulter le répertoire.
test(
  "GET /api/creators - autorise les entreprises",
  { skip: !creatorDirectoryTestsEnabled },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/creators`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.creators));
    assert.ok(Number.isInteger(data.total));
    assert.equal(data.count, data.creators.length);
  },
);

// 27. Vérifier que les créateurs ne peuvent pas consulter ce répertoire.
test(
  "GET /api/creators - refuse les créateurs",
  { skip: !creatorDirectoryTestsEnabled },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/creators`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 28. Vérifier la validation d'une plateforme invalide dans le répertoire.
test(
  "GET /api/creators - refuse une plateforme invalide",
  { skip: !creatorDirectoryTestsEnabled },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/creators?platform=INVALID`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
  },
);

// =====================================================
// TESTS AUTOMATISÉS — SUPPRESSION SÉCURISÉE DES CAMPAGNES
// =====================================================

const campaignDeletionTestsEnabled = Boolean(
  process.env.TEST_COMPANY_EMAIL &&
  process.env.TEST_COMPANY_PASSWORD &&
  process.env.TEST_OTHER_COMPANY_EMAIL &&
  process.env.TEST_OTHER_COMPANY_PASSWORD &&
  process.env.TEST_CREATOR_EMAIL &&
  process.env.TEST_CREATOR_PASSWORD,
);

/**
 * Connecte un compte de test et renvoie son jeton.
 */
async function loginForCampaignDeletionTest(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    "Le compte de test doit pouvoir se connecter.",
  );

  assert.equal(data.success, true);
  assert.ok(data.token, "Le serveur doit fournir un jeton.");

  return data.token;
}

/**
 * Crée un brouillon réservé aux tests automatisés.
 */
async function createCampaignForDeletionTest(companyToken) {
  const uniqueSuffix = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${companyToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `TEST-DELETE-FILWORK-${uniqueSuffix}`,
      description: "Campagne temporaire pour tester la suppression sécurisée.",
      platforms: [],
      currency: "XOF",
    }),
  });

  const data = await response.json();

  assert.equal(
    response.ok,
    true,
    "La création de la campagne de test doit réussir.",
  );

  assert.equal(data.success, true);
  assert.ok(data.campaign?.id, "La campagne doit posséder un identifiant.");
  assert.equal(data.campaign.status, "DRAFT");

  return data.campaign.id;
}

// Test 29 : les droits de suppression sont respectés.
test(
  "DELETE /api/campaigns/:id - vérifie les permissions et la suppression du brouillon",
  { skip: !campaignDeletionTestsEnabled },
  async () => {
    const companyToken = await loginForCampaignDeletionTest(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const otherCompanyToken = await loginForCampaignDeletionTest(
      process.env.TEST_OTHER_COMPANY_EMAIL,
      process.env.TEST_OTHER_COMPANY_PASSWORD,
    );

    const creatorToken = await loginForCampaignDeletionTest(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    let campaignId;

    try {
      // Créer un brouillon appartenant à la première entreprise.
      campaignId = await createCampaignForDeletionTest(companyToken);

      // Un utilisateur sans jeton ne peut pas supprimer la campagne.
      const unauthenticatedResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}`,
        {
          method: "DELETE",
        },
      );

      assert.equal(unauthenticatedResponse.status, 401);

      // Un créateur ne peut pas supprimer une campagne.
      const creatorResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      assert.equal(creatorResponse.status, 403);

      // Une autre entreprise ne peut pas supprimer ce brouillon.
      const otherCompanyResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${otherCompanyToken}`,
          },
        },
      );

      assert.equal(otherCompanyResponse.status, 404);

      // L'entreprise propriétaire peut supprimer son brouillon.
      const ownerResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const ownerData = await ownerResponse.json();

      assert.equal(ownerResponse.status, 200);
      assert.equal(ownerData.success, true);

      // Une nouvelle tentative doit échouer, car le brouillon n'existe plus.
      const repeatedResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      assert.equal(repeatedResponse.status, 404);
    } finally {
      // Nettoyage limité à la campagne créée par ce test.
      if (campaignId) {
        await prisma.campaign.deleteMany({
          where: {
            id: campaignId,
          },
        });
      }
    }
  },
);

// Test 30 : une campagne publiée ne peut pas être supprimée.
test(
  "DELETE /api/campaigns/:id - refuse la suppression d'une campagne publiée",
  { skip: !campaignDeletionTestsEnabled },
  async () => {
    const companyToken = await loginForCampaignDeletionTest(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    let campaignId;

    try {
      // Créer une campagne temporaire.
      campaignId = await createCampaignForDeletionTest(companyToken);

      // Publier cette campagne temporaire.
      const publishResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const publishData = await publishResponse.json();

      assert.equal(
        publishResponse.status,
        200,
        "La campagne temporaire doit pouvoir être publiée.",
      );

      assert.equal(publishData.success, true);

      // Vérifier que la suppression d'une campagne publiée est refusée.
      const deleteResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const deleteData = await deleteResponse.json();

      assert.equal(deleteResponse.status, 409);
      assert.equal(deleteData.success, false);
    } finally {
      // Nettoyer uniquement la campagne temporaire de ce test.
      if (campaignId) {
        await prisma.campaign.deleteMany({
          where: {
            id: campaignId,
          },
        });
      }
    }
  },
);

// =====================================================
// TESTS AUTOMATISÉS — SPRINT 5 : INVITATIONS
// =====================================================

const invitationWorkflowTestsEnabled = Boolean(
  process.env.TEST_COMPANY_EMAIL &&
  process.env.TEST_COMPANY_PASSWORD &&
  process.env.TEST_CREATOR_EMAIL &&
  process.env.TEST_CREATOR_PASSWORD,
);

test(
  "Sprint 5 - parcours complet des invitations et création d'une collaboration",
  { skip: !invitationWorkflowTestsEnabled },
  async () => {
    let campaignId = null;

    try {
      // 1. Authentifier l'entreprise et le créateur.
      const companyToken = await getTestToken(
        process.env.TEST_COMPANY_EMAIL,
        process.env.TEST_COMPANY_PASSWORD,
      );

      const creatorToken = await getTestToken(
        process.env.TEST_CREATOR_EMAIL,
        process.env.TEST_CREATOR_PASSWORD,
      );

      // 2. Récupérer le profil du créateur de test.
      const creatorUser = await prisma.user.findFirst({
        where: {
          email: process.env.TEST_CREATOR_EMAIL,
        },
        select: {
          id: true,
        },
      });

      assert.ok(creatorUser, "Le compte du créateur de test doit exister.");

      const creatorProfile = await prisma.creatorProfile.findFirst({
        where: {
          userId: creatorUser.id,
        },
        select: {
          id: true,
        },
      });

      assert.ok(creatorProfile, "Le profil du créateur de test doit exister.");

      // 3. Créer une campagne temporaire.
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const createCampaignResponse = await fetch(
        `${API_BASE_URL}/api/campaigns`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            title: `TEST-INVITATION-FILWORK-${uniqueSuffix}`,
            description:
              "Campagne temporaire pour les tests automatisés du Sprint 5.",
            platforms: [],
            currency: "XOF",
          }),
        },
      );

      const createCampaignData = await createCampaignResponse.json();

      assert.equal(
        createCampaignResponse.ok,
        true,
        `La création de la campagne a échoué : ${
          createCampaignData.message || createCampaignResponse.status
        }`,
      );

      campaignId = createCampaignData.campaign?.id;

      assert.ok(
        campaignId,
        "La campagne temporaire doit posséder un identifiant.",
      );

      // 4. Publier la campagne.
      const publishResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const publishData = await publishResponse.json();

      assert.equal(
        publishResponse.ok,
        true,
        `La publication a échoué : ${
          publishData.message || publishResponse.status
        }`,
      );

      // Fonction locale pour créer une invitation de test.
      async function createTestInvitation() {
        const response = await fetch(
          `${API_BASE_URL}/api/campaigns/${campaignId}/invitations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${companyToken}`,
            },
            body: JSON.stringify({
              creatorProfileId: creatorProfile.id,
              message: "Invitation créée par un test automatisé.",
              proposedAmount: 15000,
              currency: "XOF",
            }),
          },
        );

        const data = await response.json();

        assert.equal(
          response.ok,
          true,
          `La création de l'invitation a échoué : ${
            data.message || response.status
          }`,
        );

        assert.equal(data.success, true);

        // Lire l'invitation créée dans la base.
        const invitation = await prisma.invitation.findFirst({
          where: {
            campaignId,
            creatorProfileId: creatorProfile.id,
            status: "PENDING",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        assert.ok(invitation, "L'invitation doit être enregistrée en base.");

        return invitation;
      }

      // 5. Créer une première invitation.
      const withdrawnInvitation = await createTestInvitation();

      assert.equal(withdrawnInvitation.status, "PENDING");

      // 6. Vérifier la consultation des invitations reçues.
      const receivedResponse = await fetch(
        `${API_BASE_URL}/api/invitations/received`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const receivedData = await receivedResponse.json();

      assert.equal(receivedResponse.status, 200);
      assert.equal(receivedData.success, true);

      assert.ok(
        JSON.stringify(receivedData).includes(withdrawnInvitation.id),
        "Le créateur doit retrouver son invitation.",
      );

      // 7. Vérifier la consultation des invitations envoyées.
      const sentResponse = await fetch(`${API_BASE_URL}/api/invitations/sent`, {
        headers: {
          Authorization: `Bearer ${companyToken}`,
        },
      });

      const sentData = await sentResponse.json();

      assert.equal(sentResponse.status, 200);
      assert.equal(sentData.success, true);

      assert.ok(
        JSON.stringify(sentData).includes(withdrawnInvitation.id),
        "L'entreprise doit retrouver son invitation.",
      );

      // 8. Une deuxième invitation active identique doit être refusée.
      const duplicateResponse = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            creatorProfileId: creatorProfile.id,
            message: "Tentative de doublon.",
            proposedAmount: 15000,
            currency: "XOF",
          }),
        },
      );

      assert.equal(
        duplicateResponse.status,
        409,
        "Une invitation active en double doit être refusée.",
      );

      // 9. Vérifier que seul le créateur peut répondre.
      const forbiddenResponse = await fetch(
        `${API_BASE_URL}/api/invitations/${withdrawnInvitation.id}/respond`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "ACCEPTED",
          }),
        },
      );

      assert.equal(
        forbiddenResponse.status,
        403,
        "Une entreprise ne doit pas pouvoir répondre à la place du créateur.",
      );

      // 10. Vérifier que seul l'entreprise peut retirer son invitation.
      const forbiddenWithdrawResponse = await fetch(
        `${API_BASE_URL}/api/invitations/${withdrawnInvitation.id}/withdraw`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      assert.equal(
        forbiddenWithdrawResponse.status,
        403,
        "Le créateur ne doit pas pouvoir retirer l'invitation de l'entreprise.",
      );

      // 11. Retirer la première invitation.
      const withdrawResponse = await fetch(
        `${API_BASE_URL}/api/invitations/${withdrawnInvitation.id}/withdraw`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const withdrawData = await withdrawResponse.json();

      assert.equal(
        withdrawResponse.ok,
        true,
        `Le retrait a échoué : ${
          withdrawData.message || withdrawResponse.status
        }`,
      );

      const withdrawnRecord = await prisma.invitation.findUnique({
        where: {
          id: withdrawnInvitation.id,
        },
      });

      assert.equal(withdrawnRecord.status, "WITHDRAWN");

      // 12. Créer une nouvelle invitation et la refuser.
      // Le statut WITHDRAWN ne doit plus bloquer une nouvelle invitation.
      const rejectedInvitation = await createTestInvitation();

      const rejectResponse = await fetch(
        `${API_BASE_URL}/api/invitations/${rejectedInvitation.id}/respond`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            status: "REJECTED",
          }),
        },
      );

      const rejectData = await rejectResponse.json();

      assert.equal(
        rejectResponse.ok,
        true,
        `Le refus a échoué : ${rejectData.message || rejectResponse.status}`,
      );

      const rejectedRecord = await prisma.invitation.findUnique({
        where: {
          id: rejectedInvitation.id,
        },
      });

      assert.equal(rejectedRecord.status, "REJECTED");

      // Aucun contrat ne doit être créé après un refus.
      const collaborationAfterRejection = await prisma.collaboration.findUnique(
        {
          where: {
            invitationId: rejectedInvitation.id,
          },
        },
      );

      assert.equal(
        collaborationAfterRejection,
        null,
        "Un refus ne doit pas créer de collaboration.",
      );

      // 13. Créer une troisième invitation et l'accepter.
      const acceptedInvitation = await createTestInvitation();

      const acceptResponse = await fetch(
        `${API_BASE_URL}/api/invitations/${acceptedInvitation.id}/respond`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            status: "ACCEPTED",
          }),
        },
      );

      const acceptData = await acceptResponse.json();

      assert.equal(
        acceptResponse.ok,
        true,
        `L'acceptation a échoué : ${
          acceptData.message || acceptResponse.status
        }`,
      );

      const acceptedRecord = await prisma.invitation.findUnique({
        where: {
          id: acceptedInvitation.id,
        },
      });

      assert.equal(acceptedRecord.status, "ACCEPTED");

      // 14. Vérifier que l'acceptation crée une collaboration.
      const collaboration = await prisma.collaboration.findUnique({
        where: {
          invitationId: acceptedInvitation.id,
        },
      });

      assert.ok(collaboration, "L'acceptation doit créer une collaboration.");

      assert.equal(collaboration.currency, "XOF");
      assert.equal(Number(collaboration.agreedAmount), 15000);

      // 15. Vérifier les notifications liées aux trois invitations.
      const invitationIds = [
        withdrawnInvitation.id,
        rejectedInvitation.id,
        acceptedInvitation.id,
      ];

      const notifications = await prisma.notification.findMany({
        where: {
          invitationId: {
            in: invitationIds,
          },
        },
        select: {
          invitationId: true,
          type: true,
        },
      });

      const hasNotification = (invitationId, type) =>
        notifications.some(
          (notification) =>
            notification.invitationId === invitationId &&
            notification.type === type,
        );

      assert.ok(
        hasNotification(withdrawnInvitation.id, "INVITATION_RECEIVED"),
        "La réception de l'invitation doit générer une notification.",
      );

      assert.ok(
        hasNotification(withdrawnInvitation.id, "INVITATION_WITHDRAWN"),
        "Le retrait doit générer une notification.",
      );

      assert.ok(
        hasNotification(rejectedInvitation.id, "INVITATION_REJECTED"),
        "Le refus doit générer une notification.",
      );

      assert.ok(
        hasNotification(acceptedInvitation.id, "INVITATION_ACCEPTED"),
        "L'acceptation doit générer une notification.",
      );

      // 16. Vérifier que l'API renvoie les notifications liées aux invitations.
      const creatorNotificationsResponse = await fetch(
        `${API_BASE_URL}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const creatorNotificationsData =
        await creatorNotificationsResponse.json();

      assert.equal(creatorNotificationsResponse.status, 200);
      assert.equal(creatorNotificationsData.success, true);

      const creatorHasInvitationNotification =
        creatorNotificationsData.notifications.some(
          (notification) =>
            notification.invitation?.id === withdrawnInvitation.id &&
            notification.type === "INVITATION_WITHDRAWN",
        );

      assert.equal(
        creatorHasInvitationNotification,
        true,
        "L'API doit renvoyer la notification de retrait avec son invitation.",
      );

      // Vérifier également les notifications reçues par l'entreprise.
      const companyNotificationsResponse = await fetch(
        `${API_BASE_URL}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const companyNotificationsData =
        await companyNotificationsResponse.json();

      assert.equal(companyNotificationsResponse.status, 200);
      assert.equal(companyNotificationsData.success, true);

      const companyHasAcceptedInvitationNotification =
        companyNotificationsData.notifications.some(
          (notification) =>
            notification.invitation?.id === acceptedInvitation.id &&
            notification.type === "INVITATION_ACCEPTED",
        );

      assert.equal(
        companyHasAcceptedInvitationNotification,
        true,
        "L'API doit renvoyer la notification d'acceptation avec son invitation.",
      );

      // 17. Vérifier que le créateur retrouve la collaboration créée.
      const creatorCollaborationsResponse = await fetch(
        `${API_BASE_URL}/api/collaborations`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const creatorCollaborationsData =
        await creatorCollaborationsResponse.json();

      assert.equal(
        creatorCollaborationsResponse.status,
        200,
        "Le créateur doit pouvoir consulter ses collaborations.",
      );

      assert.equal(creatorCollaborationsData.success, true);

      assert.ok(
        JSON.stringify(creatorCollaborationsData).includes(collaboration.id),
        "Le créateur doit retrouver la collaboration issue de son invitation.",
      );

      // 18. Vérifier que l'entreprise retrouve la même collaboration.
      const companyCollaborationsResponse = await fetch(
        `${API_BASE_URL}/api/collaborations`,
        {
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const companyCollaborationsData =
        await companyCollaborationsResponse.json();

      assert.equal(
        companyCollaborationsResponse.status,
        200,
        "L'entreprise doit pouvoir consulter ses collaborations.",
      );

      assert.equal(companyCollaborationsData.success, true);

      assert.ok(
        JSON.stringify(companyCollaborationsData).includes(collaboration.id),
        "L'entreprise doit retrouver la collaboration issue de son invitation.",
      );

      // 19. Vérifier le cycle de vie d'un livrable
      // dans une collaboration issue d'une invitation.

      // A. Seul l'entreprise peut créer un livrable.
      const creatorCreateDeliverableResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/collaborations/${collaboration.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            title: "Livrable de test",
            description: "Test des permissions.",
          }),
        },
      );

      assert.equal(
        creatorCreateDeliverableResponse.status,
        403,
        "Le créateur ne doit pas pouvoir définir les livrables.",
      );

      // B. L'entreprise crée le livrable.
      const createDeliverableResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/collaborations/${collaboration.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            title: "TEST-LIVRABLE-SPRINT6",
            description: "Livrable temporaire pour test automatisé.",
          }),
        },
      );

      const createDeliverableData = await createDeliverableResponse.json();

      assert.equal(
        createDeliverableResponse.status,
        201,
        `La création du livrable a échoué : ${
          createDeliverableData.message || createDeliverableResponse.status
        }`,
      );

      assert.equal(createDeliverableData.success, true);

      const deliverableId = createDeliverableData.deliverable?.id;

      assert.ok(
        deliverableId,
        "Le livrable créé doit posséder un identifiant.",
      );

      // C. Le créateur consulte les livrables de la collaboration.
      const getDeliverablesResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/collaborations/${collaboration.id}`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const getDeliverablesData = await getDeliverablesResponse.json();

      assert.equal(getDeliverablesResponse.status, 200);
      assert.equal(getDeliverablesData.success, true);

      assert.ok(
        getDeliverablesData.deliverables.some(
          (item) => item.id === deliverableId,
        ),
        "Le créateur doit pouvoir consulter le livrable.",
      );

      // D. Le créateur soumet son travail.
      const submitDeliverableResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/submit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            assetUrl: `https://example.com/filwork-test-${Date.now()}`,
          }),
        },
      );

      const submitDeliverableData = await submitDeliverableResponse.json();

      assert.equal(
        submitDeliverableResponse.status,
        200,
        `La soumission a échoué : ${
          submitDeliverableData.message || submitDeliverableResponse.status
        }`,
      );

      assert.equal(submitDeliverableData.deliverable.status, "SUBMITTED");

      // E. L'entreprise demande une correction.
      const revisionResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "REVISION_REQUESTED",
            feedback: "Veuillez corriger le livrable pour ce test.",
          }),
        },
      );

      const revisionData = await revisionResponse.json();

      assert.equal(
        revisionResponse.status,
        200,
        `La demande de correction a échoué : ${
          revisionData.message || revisionResponse.status
        }`,
      );

      assert.equal(revisionData.deliverable.status, "REVISION_REQUESTED");

      // F. Le créateur soumet une nouvelle version.
      const resubmitResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/submit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            assetUrl: `https://example.com/filwork-test-revision-${Date.now()}`,
          }),
        },
      );

      const resubmitData = await resubmitResponse.json();

      assert.equal(
        resubmitResponse.status,
        200,
        `La nouvelle soumission a échoué : ${
          resubmitData.message || resubmitResponse.status
        }`,
      );

      assert.equal(resubmitData.deliverable.status, "SUBMITTED");

      // G. L'entreprise approuve la nouvelle version.
      const approveResponse = await fetch(
        `${API_BASE_URL}/api/deliverables/${deliverableId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "APPROVED",
            feedback: "Livrable validé pour le test.",
          }),
        },
      );

      const approveData = await approveResponse.json();

      assert.equal(
        approveResponse.status,
        200,
        `L'approbation a échoué : ${
          approveData.message || approveResponse.status
        }`,
      );

      assert.equal(
        approveData.deliverable.status,
        "APPROVED",
        "Le livrable doit être approuvé.",
      );

      // =====================================================
      // SPRINT 6 — TESTS DES PAIEMENTS
      // =====================================================

      // 20. Un créateur ne peut pas créer un paiement.
      const creatorCreatePaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creatorToken}`,
          },
          body: JSON.stringify({
            amount: 25000,
            currency: "XOF",
            notes: "Test de permissions.",
          }),
        },
      );

      assert.equal(
        creatorCreatePaymentResponse.status,
        403,
        "Le créateur ne doit pas pouvoir créer un paiement.",
      );

      // 21. L'entreprise crée un paiement prévu.
      const createPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            amount: 25000,
            currency: "XOF",
            notes: "Paiement temporaire pour les tests du Sprint 6.",
          }),
        },
      );

      const createPaymentData = await createPaymentResponse.json();

      assert.equal(
        createPaymentResponse.status,
        201,
        `La création du paiement a échoué : ${
          createPaymentData.message || createPaymentResponse.status
        }`,
      );

      assert.equal(createPaymentData.success, true);

      const paymentId = createPaymentData.payment?.id;

      assert.ok(paymentId, "Le paiement créé doit posséder un identifiant.");

      assert.equal(
        createPaymentData.payment.status,
        "PLANNED",
        "Le paiement doit initialement être planifié.",
      );

      // 22. Le créateur peut consulter les paiements de sa collaboration.
      const creatorPaymentsResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          headers: {
            Authorization: `Bearer ${creatorToken}`,
          },
        },
      );

      const creatorPaymentsData = await creatorPaymentsResponse.json();

      assert.equal(creatorPaymentsResponse.status, 200);
      assert.equal(creatorPaymentsData.success, true);

      assert.ok(
        creatorPaymentsData.payments.some(
          (payment) => payment.id === paymentId,
        ),
        "Le créateur doit pouvoir consulter le paiement.",
      );

      // 23. L'entreprise peut également consulter ce paiement.
      const companyPaymentsResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const companyPaymentsData = await companyPaymentsResponse.json();

      assert.equal(companyPaymentsResponse.status, 200);
      assert.equal(companyPaymentsData.success, true);

      assert.ok(
        companyPaymentsData.payments.some(
          (payment) => payment.id === paymentId,
        ),
        "L'entreprise doit retrouver le paiement qu'elle a créé.",
      );

      // 24. L'entreprise fait passer le paiement de PLANNED à PENDING.
      const pendingPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/${paymentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "PENDING",
          }),
        },
      );

      const pendingPaymentData = await pendingPaymentResponse.json();

      assert.equal(
        pendingPaymentResponse.status,
        200,
        `Le passage à PENDING a échoué : ${
          pendingPaymentData.message || pendingPaymentResponse.status
        }`,
      );

      assert.equal(pendingPaymentData.payment.status, "PENDING");

      // 25. L'entreprise marque ensuite le paiement comme payé.
      const paidPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/${paymentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "PAID",
            reference: `TEST-FILWORK-${Date.now()}`,
          }),
        },
      );

      const paidPaymentData = await paidPaymentResponse.json();

      assert.equal(
        paidPaymentResponse.status,
        200,
        `Le passage à PAID a échoué : ${
          paidPaymentData.message || paidPaymentResponse.status
        }`,
      );

      assert.equal(paidPaymentData.payment.status, "PAID");

      assert.ok(
        paidPaymentData.payment.paidAt,
        "Un paiement marqué PAID doit avoir une date de paiement.",
      );

      // 26. Un paiement déjà payé ne doit plus pouvoir changer de statut.
      const modifyPaidPaymentResponse = await fetch(
        `${API_BASE_URL}/api/payments/${paymentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${companyToken}`,
          },
          body: JSON.stringify({
            status: "FAILED",
          }),
        },
      );

      assert.equal(
        modifyPaidPaymentResponse.status,
        409,
        "Un paiement déjà payé ne doit plus pouvoir changer de statut.",
      );

      // 27. Vérifier le total des paiements effectivement payés.
      const paidPaymentsResponse = await fetch(
        `${API_BASE_URL}/api/payments/collaborations/${collaboration.id}`,
        {
          headers: {
            Authorization: `Bearer ${companyToken}`,
          },
        },
      );

      const paidPaymentsData = await paidPaymentsResponse.json();

      assert.equal(paidPaymentsResponse.status, 200);
      assert.equal(paidPaymentsData.success, true);

      assert.equal(
        paidPaymentsData.totalPaid,
        25000,
        "Le total payé doit correspondre au paiement marqué PAID.",
      );
      console.log("Sprint 5 : le parcours des invitations a été vérifié.");
    } finally {
      // Nettoyer uniquement la campagne créée par ce test.
      if (campaignId) {
        const invitations = await prisma.invitation.findMany({
          where: {
            campaignId,
          },
          select: {
            id: true,
          },
        });

        const invitationIds = invitations.map((invitation) => invitation.id);

        if (invitationIds.length > 0) {
          const relatedCollaborations = await prisma.collaboration.findMany({
            where: {
              invitationId: {
                in: invitationIds,
              },
            },
            select: {
              id: true,
            },
          });

          const relatedCollaborationIds = relatedCollaborations.map(
            (item) => item.id,
          );

          if (relatedCollaborationIds.length > 0) {
            await prisma.payment.deleteMany({
              where: {
                collaborationId: {
                  in: relatedCollaborationIds,
                },
              },
            });
            await prisma.deliverable.deleteMany({
              where: {
                collaborationId: {
                  in: relatedCollaborationIds,
                },
              },
            });
          }
          // Supprimer d'abord les collaborations liées aux invitations.
          await prisma.collaboration.deleteMany({
            where: {
              invitationId: {
                in: invitationIds,
              },
            },
          });

          // Supprimer les notifications liées à ces invitations.
          await prisma.notification.deleteMany({
            where: {
              invitationId: {
                in: invitationIds,
              },
            },
          });

          // Supprimer uniquement les invitations de cette campagne.
          await prisma.invitation.deleteMany({
            where: {
              id: {
                in: invitationIds,
              },
            },
          });
        }

        // La campagne créée pour le test peut maintenant être supprimée.
        await prisma.campaign.deleteMany({
          where: {
            id: campaignId,
          },
        });
      }
    }
  },
);

// =====================================================
// TESTS AUTOMATISÉS — ADMINISTRATION
// =====================================================

// Une requête sans jeton doit être refusée.
test("GET /api/admin/dashboard - refuse une requête sans jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`);

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

// Seule une entreprise authentifiée ne doit pas pouvoir
// accéder aux statistiques administratives.
test(
  "GET /api/admin/dashboard - refuse une entreprise",
  {
    skip: !(
      process.env.TEST_COMPANY_EMAIL && process.env.TEST_COMPANY_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// Un créateur authentifié ne doit pas non plus y accéder.
test(
  "GET /api/admin/dashboard - refuse un créateur",
  {
    skip: !(
      process.env.TEST_CREATOR_EMAIL && process.env.TEST_CREATOR_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// Un administrateur authentifié peut consulter les statistiques.
test(
  "GET /api/admin/dashboard - retourne les statistiques à un ADMIN",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(
      response.status,
      200,
      `Le tableau de bord doit être accessible : ${
        data.message || response.status
      }`,
    );

    assert.equal(data.success, true);
    assert.ok(data.stats);

    // Vérifier la présence des principales statistiques.
    for (const section of [
      "users",
      "campaigns",
      "applications",
      "invitations",
      "collaborations",
      "deliverables",
      "payments",
      "notifications",
    ]) {
      assert.ok(
        data.stats[section],
        `La section ${section} doit être présente.`,
      );
    }

    assert.ok(
      data.stats.users.admins >= 1,
      "Le tableau de bord doit compter au moins un administrateur.",
    );

    assert.ok(
      typeof data.stats.users.total === "number",
      "Le nombre total d'utilisateurs doit être numérique.",
    );
  },
);

// =====================================================
// TESTS AUTOMATISÉS — LISTE DES UTILISATEURS ADMIN
// =====================================================

// 1. Une requête sans jeton doit être refusée.
test("GET /api/admin/users - refuse une requête sans jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`);

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

// 2. Une entreprise ne doit pas pouvoir consulter les utilisateurs.
test(
  "GET /api/admin/users - refuse une entreprise",
  {
    skip: !(
      process.env.TEST_COMPANY_EMAIL && process.env.TEST_COMPANY_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 3. Un créateur ne doit pas pouvoir consulter les utilisateurs.
test(
  "GET /api/admin/users - refuse un créateur",
  {
    skip: !(
      process.env.TEST_CREATOR_EMAIL && process.env.TEST_CREATOR_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 4. Un administrateur peut consulter la liste des utilisateurs.
test(
  "GET /api/admin/users - retourne les utilisateurs avec pagination",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/users?role=CREATOR&page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(
      response.status,
      200,
      `La requête a échoué : ${data.message || response.status}`,
    );

    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.users));
    assert.ok(data.pagination);

    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 5);

    assert.equal(
      data.pagination.total,
      data.users.length,
      "Le total doit correspondre aux résultats si tous tiennent sur une page.",
    );

    for (const user of data.users) {
      assert.equal(user.role, "CREATOR");

      assert.equal(
        Object.hasOwn(user, "passwordHash"),
        false,
        "Le mot de passe haché ne doit jamais être exposé.",
      );
    }
  },
);

// =====================================================
// TESTS AUTOMATISÉS — CAMPAGNES ADMINISTRATIVES
// =====================================================

// 1. Une requête sans authentification doit être refusée.
test("GET /api/admin/campaigns - refuse une requête sans jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`);

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

// 2. Une entreprise ne peut pas consulter toutes les campagnes
// depuis le back-office administratif.
test(
  "GET /api/admin/campaigns - refuse une entreprise",
  {
    skip: !(
      process.env.TEST_COMPANY_EMAIL && process.env.TEST_COMPANY_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 3. Un créateur ne peut pas consulter toutes les campagnes
// depuis le back-office administratif.
test(
  "GET /api/admin/campaigns - refuse un créateur",
  {
    skip: !(
      process.env.TEST_CREATOR_EMAIL && process.env.TEST_CREATOR_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 4. L'administrateur peut consulter les campagnes publiées
// avec leurs informations associées et les métadonnées de pagination.
test(
  "GET /api/admin/campaigns - retourne les campagnes publiées à un ADMIN",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/campaigns?status=PUBLISHED&page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(
      response.status,
      200,
      `La requête a échoué : ${data.message || response.status}`,
    );

    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.campaigns));
    assert.ok(data.pagination);

    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 5);

    assert.equal(
      data.count,
      data.campaigns.length,
      "Le nombre de résultats doit correspondre aux campagnes renvoyées.",
    );

    assert.ok(
      data.campaigns.length <= 5,
      "La limite de résultats doit être respectée.",
    );

    assert.ok(
      Number.isInteger(data.pagination.total),
      "Le nombre total de campagnes doit être numérique.",
    );

    for (const campaign of data.campaigns) {
      assert.equal(campaign.status, "PUBLISHED");

      assert.ok(
        campaign.companyProfile,
        "La campagne doit inclure son entreprise propriétaire.",
      );

      assert.ok(
        campaign._count,
        "La campagne doit inclure les compteurs de relations.",
      );

      assert.equal(
        Object.hasOwn(campaign, "passwordHash"),
        false,
        "La réponse ne doit pas exposer de mot de passe haché.",
      );
    }
  },
);

// 5. Un statut de campagne invalide doit être refusé.
test(
  "GET /api/admin/campaigns - refuse un statut invalide",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/campaigns?status=INVALID`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
  },
);

// =====================================================
// TESTS AUTOMATISÉS — COLLABORATIONS ADMINISTRATIVES
// =====================================================

// 1. Une requête sans jeton doit être refusée.
test("GET /api/admin/collaborations - refuse une requête sans jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/admin/collaborations`);

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

// 2. Une entreprise ne peut pas consulter toutes les collaborations.
test(
  "GET /api/admin/collaborations - refuse une entreprise",
  {
    skip: !(
      process.env.TEST_COMPANY_EMAIL && process.env.TEST_COMPANY_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/collaborations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 3. Un créateur ne peut pas consulter toutes les collaborations.
test(
  "GET /api/admin/collaborations - refuse un créateur",
  {
    skip: !(
      process.env.TEST_CREATOR_EMAIL && process.env.TEST_CREATOR_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/collaborations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 4. Un administrateur peut consulter et filtrer les collaborations.
test(
  "GET /api/admin/collaborations - retourne les collaborations à un ADMIN",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/collaborations?status=ACTIVE&page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(
      response.status,
      200,
      `La requête a échoué : ${data.message || response.status}`,
    );

    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.collaborations));
    assert.ok(data.pagination);

    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 5);
    assert.equal(data.count, data.collaborations.length);

    assert.ok(
      Number.isInteger(data.pagination.total),
      "Le total des collaborations doit être un nombre entier.",
    );

    for (const collaboration of data.collaborations) {
      assert.equal(collaboration.status, "ACTIVE");

      const hasApplication = collaboration.applicationId !== null;
      const hasInvitation = collaboration.invitationId !== null;

      assert.notEqual(
        hasApplication,
        hasInvitation,
        "Une collaboration doit avoir exactement une origine.",
      );

      assert.ok(collaboration._count, "Les compteurs doivent être présents.");

      assert.equal(typeof collaboration._count.deliverables, "number");

      assert.equal(typeof collaboration._count.payments, "number");

      assert.equal(
        Object.hasOwn(collaboration, "passwordHash"),
        false,
        "Aucun mot de passe haché ne doit être exposé.",
      );
    }

    // Vérifier également le filtre par origine.
    const invitationResponse = await fetch(
      `${API_BASE_URL}/api/admin/collaborations?origin=INVITATION`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const invitationData = await invitationResponse.json();

    assert.equal(invitationResponse.status, 200);
    assert.equal(invitationData.success, true);
    assert.ok(Array.isArray(invitationData.collaborations));

    for (const collaboration of invitationData.collaborations) {
      assert.ok(
        collaboration.invitationId,
        "Une collaboration filtrée par invitation doit avoir une invitation.",
      );

      assert.equal(collaboration.applicationId, null);

      assert.ok(
        collaboration.invitation,
        "Les informations de l'invitation doivent être présentes.",
      );
    }
  },
);

// 5. Un statut invalide doit être refusé.
test(
  "GET /api/admin/collaborations - refuse un statut invalide",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/collaborations?status=INVALID`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
  },
);

// =====================================================
// TESTS AUTOMATISÉS — LIVRABLES ADMINISTRATIFS
// =====================================================

// 1. Une requête sans jeton doit être refusée.
test("GET /api/admin/deliverables - refuse une requête sans jeton", async () => {
  const response = await fetch(`${API_BASE_URL}/api/admin/deliverables`);

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
});

// 2. Une entreprise ne peut pas consulter tous les livrables.
test(
  "GET /api/admin/deliverables - refuse une entreprise",
  {
    skip: !(
      process.env.TEST_COMPANY_EMAIL && process.env.TEST_COMPANY_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/deliverables`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 3. Un créateur ne peut pas consulter tous les livrables.
test(
  "GET /api/admin/deliverables - refuse un créateur",
  {
    skip: !(
      process.env.TEST_CREATOR_EMAIL && process.env.TEST_CREATOR_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD,
    );

    const response = await fetch(`${API_BASE_URL}/api/admin/deliverables`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  },
);

// 4. Un administrateur peut consulter les livrables.
test(
  "GET /api/admin/deliverables - retourne les livrables à un ADMIN",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/deliverables?page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(
      response.status,
      200,
      `La requête a échoué : ${data.message || response.status}`,
    );

    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.deliverables));
    assert.ok(data.pagination);

    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 5);
    assert.equal(data.count, data.deliverables.length);

    assert.ok(
      Number.isInteger(data.pagination.total),
      "Le nombre total de livrables doit être un entier.",
    );

    assert.ok(
      data.deliverables.length <= 5,
      "La limite de résultats doit être respectée.",
    );

    for (const deliverable of data.deliverables) {
      assert.ok(
        deliverable.collaboration,
        "La collaboration associée doit être présente.",
      );

      const application = deliverable.collaboration.application;
      const invitation = deliverable.collaboration.invitation;

      assert.notEqual(
        Boolean(application),
        Boolean(invitation),
        "La collaboration doit avoir exactement une origine.",
      );

      const origin = application || invitation;

      assert.ok(origin.creatorProfile);
      assert.ok(origin.campaign);
      assert.ok(origin.campaign.companyProfile);

      assert.equal(
        Object.hasOwn(deliverable, "passwordHash"),
        false,
        "Le livrable ne doit pas exposer de mot de passe haché.",
      );
    }
  },
);

// 5. Un statut invalide doit être refusé.
test(
  "GET /api/admin/deliverables - refuse un statut invalide",
  {
    skip: !(process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/deliverables?status=INVALID`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
  },
);

// =====================================================
// TESTS AUTOMATISÉS — PAIEMENTS ADMINISTRATIFS
// =====================================================

// 1. Une requête sans jeton doit être refusée.
test(
  "GET /api/admin/payments - refuse une requête sans jeton",
  async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/payments`
    );

    const data = await response.json();

    assert.equal(response.status, 401);
    assert.equal(data.success, false);
  }
);

// 2. Une entreprise ne peut pas consulter tous les paiements.
test(
  "GET /api/admin/payments - refuse une entreprise",
  {
    skip: !(
      process.env.TEST_COMPANY_EMAIL &&
      process.env.TEST_COMPANY_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_COMPANY_EMAIL,
      process.env.TEST_COMPANY_PASSWORD
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/payments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  }
);

// 3. Un créateur ne peut pas consulter tous les paiements.
test(
  "GET /api/admin/payments - refuse un créateur",
  {
    skip: !(
      process.env.TEST_CREATOR_EMAIL &&
      process.env.TEST_CREATOR_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_CREATOR_EMAIL,
      process.env.TEST_CREATOR_PASSWORD
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/payments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.success, false);
  }
);

// 4. Un administrateur peut consulter et filtrer les paiements.
test(
  "GET /api/admin/payments - retourne les paiements à un ADMIN",
  {
    skip: !(
      process.env.TEST_ADMIN_EMAIL &&
      process.env.TEST_ADMIN_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD
    );

    // Consulter les paiements avec pagination.
    const response = await fetch(
      `${API_BASE_URL}/api/admin/payments?page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    assert.equal(
      response.status,
      200,
      `La requête a échoué : ${
        data.message || response.status
      }`
    );

    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.payments));
    assert.ok(data.pagination);

    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 5);
    assert.equal(data.count, data.payments.length);

    assert.ok(
      Number.isInteger(data.pagination.total),
      "Le nombre total de paiements doit être un entier."
    );

    assert.ok(
      data.payments.length <= 5,
      "La limite de résultats doit être respectée."
    );

    // Chaque collaboration doit provenir d'une candidature
    // ou d'une invitation, mais pas des deux.
    for (const payment of data.payments) {
      assert.ok(payment.collaboration);

      const hasApplication =
        payment.collaboration.applicationId !== null;

      const hasInvitation =
        payment.collaboration.invitationId !== null;

      assert.notEqual(
        hasApplication,
        hasInvitation,
        "La collaboration doit avoir exactement une origine."
      );

      const origin =
        payment.collaboration.application ||
        payment.collaboration.invitation;

      assert.ok(origin);
      assert.ok(origin.creatorProfile);
      assert.ok(origin.campaign);
      assert.ok(origin.campaign.companyProfile);

      assert.equal(
        Object.hasOwn(payment, "passwordHash"),
        false,
        "Le paiement ne doit pas exposer de mot de passe haché."
      );
    }

    // Vérifier le filtre par statut PAID.
    const paidResponse = await fetch(
      `${API_BASE_URL}/api/admin/payments?status=PAID`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const paidData = await paidResponse.json();

    assert.equal(paidResponse.status, 200);
    assert.equal(paidData.success, true);
    assert.ok(Array.isArray(paidData.payments));

    for (const payment of paidData.payments) {
      assert.equal(payment.status, "PAID");
    }

    // Vérifier le filtre par origine INVITATION.
    const invitationResponse = await fetch(
      `${API_BASE_URL}/api/admin/payments?origin=INVITATION`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const invitationData = await invitationResponse.json();

    assert.equal(invitationResponse.status, 200);
    assert.equal(invitationData.success, true);
    assert.ok(Array.isArray(invitationData.payments));

    for (const payment of invitationData.payments) {
      assert.ok(payment.collaboration.invitation);
      assert.equal(payment.collaboration.applicationId, null);
    }
  }
);

// 5. Un statut de paiement invalide doit être refusé.
test(
  "GET /api/admin/payments - refuse un statut invalide",
  {
    skip: !(
      process.env.TEST_ADMIN_EMAIL &&
      process.env.TEST_ADMIN_PASSWORD
    ),
  },
  async () => {
    const token = await getTestToken(
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD
    );

    const response = await fetch(
      `${API_BASE_URL}/api/admin/payments?status=INVALID`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
  }
);

test(
  "POST /api/auth/reset-password - invalide les anciennes sessions",
  async () => {
    let userId;

    try {
      // 1. Créer un utilisateur temporaire.
      const email = `test-session-${crypto.randomUUID()}@filwork.local`;
      const initialPassword = "InitialPassword123!";
      const newPassword = "NewPassword456!";

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(initialPassword, 12),
          role: "CREATOR",
        },
        select: {
          id: true,
          tokenVersion: true,
        },
      });

      userId = user.id;

      // 2. Obtenir un JWT avant la réinitialisation.
      const oldToken = await getTestToken(email, initialPassword);

      // 3. Créer un jeton temporaire de réinitialisation.
      const resetToken = crypto.randomBytes(32).toString("hex");

      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // 4. Réinitialiser le mot de passe via l'API.
      const resetResponse = await fetch(
        `${API_BASE_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: resetToken,
            password: newPassword,
          }),
        },
      );

      const resetData = await resetResponse.json();

      assert.equal(
        resetResponse.status,
        200,
        `La réinitialisation a échoué : ${resetData.message}`,
      );

      assert.equal(resetData.success, true);

      // Vérifier que le même jeton ne peut pas être réutilisé.
const reusedTokenResponse = await fetch(
  `${API_BASE_URL}/api/auth/reset-password`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: resetToken,
      password: "AnotherPassword789!",
    }),
  },
);

assert.equal(
  reusedTokenResponse.status,
  400,
  "Un jeton de réinitialisation déjà utilisé doit être refusé.",
);

      // 5. Vérifier que l'ancien JWT est désormais refusé.
      const oldSessionResponse = await fetch(
        `${API_BASE_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${oldToken}`,
          },
        },
      );

      assert.equal(
        oldSessionResponse.status,
        401,
        "L'ancien JWT devrait être refusé après la réinitialisation.",
      );

      // 6. Vérifier que la version de session a augmenté.
      const updatedUser = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          tokenVersion: true,
        },
      });

      assert.equal(updatedUser.tokenVersion, 1);

      // 7. Se reconnecter avec le nouveau mot de passe.
      const newToken = await getTestToken(email, newPassword);

      const newSessionResponse = await fetch(
        `${API_BASE_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        },
      );

      assert.equal(
        newSessionResponse.status,
        200,
        "Le nouveau JWT devrait être accepté.",
      );
    } finally {
      // Supprimer uniquement le compte temporaire créé par ce test.
      if (userId) {
        await prisma.user.deleteMany({
          where: {
            id: userId,
          },
        });
      }
    }
  },
);

test(
  "POST /api/auth/logout - révoque le JWT après la déconnexion",
  async () => {
    let userId = null;
    let tokenHash = null;

    try {
      // 1. Créer un utilisateur temporaire pour ce test.
      const email = `test-logout-${crypto.randomUUID()}@filwork.local`;
      const password = "LogoutTestPassword123!";

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: "CREATOR",
        },
        select: {
          id: true,
        },
      });

      userId = user.id;

      // 2. Se connecter pour obtenir un JWT.
      const token = await getTestToken(email, password);

      // Préparer le nettoyage du jeton révoqué après le test.
      tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // 3. Se déconnecter.
      const logoutResponse = await fetch(
        `${API_BASE_URL}/api/auth/logout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const logoutData = await logoutResponse.json();

      assert.equal(
        logoutResponse.status,
        200,
        `La déconnexion a échoué : ${logoutData.message}`,
      );

      assert.equal(logoutData.success, true);

      // 4. Réutiliser l'ancien JWT pour vérifier qu'il est refusé.
      const sessionResponse = await fetch(
        `${API_BASE_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const sessionData = await sessionResponse.json();

      assert.equal(
        sessionResponse.status,
        401,
        "Le JWT doit être refusé après la déconnexion.",
      );

      assert.equal(sessionData.success, false);
    } finally {
      // Nettoyer uniquement les données temporaires de ce test.
      if (tokenHash) {
        await prisma.revokedToken.deleteMany({
          where: {
            tokenHash,
          },
        });
      }

      if (userId) {
        await prisma.user.deleteMany({
          where: {
            id: userId,
          },
        });
      }
    }
  },
);