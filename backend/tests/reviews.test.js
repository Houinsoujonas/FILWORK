const crypto = require("node:crypto");
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTestEnv } = require("../scripts/testDatabaseGuard");

// Charger et valider l'environnement de test (jamais la production).
loadTestEnv();

// Prisma sera utilisé pour vérifier et nettoyer les données de test.
const prisma = require("../src/config/prisma");
const { cleanupCampaignCascade } = require("./helpers/cleanup");

const API_BASE_URL = (
  process.env.API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

// =====================================================
// TESTS AUTOMATISÉS   SPRINT 6 : AVIS ET RÉPONSES
// =====================================================

const reviewTestsEnabled = Boolean(
  process.env.TEST_CREATOR_EMAIL &&
  process.env.TEST_CREATOR_PASSWORD &&
  process.env.TEST_COMPANY_EMAIL &&
  process.env.TEST_COMPANY_PASSWORD,
);

const otherCompanyReviewTestsEnabled = Boolean(
  reviewTestsEnabled &&
  process.env.TEST_OTHER_COMPANY_EMAIL &&
  process.env.TEST_OTHER_COMPANY_PASSWORD,
);

const otherCreatorReviewTestsEnabled = Boolean(
  reviewTestsEnabled &&
  process.env.TEST_OTHER_CREATOR_EMAIL &&
  process.env.TEST_OTHER_CREATOR_PASSWORD,
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
    `Connexion du compte de test impossible : ${
      data.message || "erreur inconnue"
    }`,
  );

  assert.equal(data.success, true);
  assert.equal(typeof data.token, "string");

  return data.token;
}

async function getCompanyToken() {
  return getTestToken(
    process.env.TEST_COMPANY_EMAIL,
    process.env.TEST_COMPANY_PASSWORD,
  );
}

async function getCreatorToken() {
  return getTestToken(
    process.env.TEST_CREATOR_EMAIL,
    process.env.TEST_CREATOR_PASSWORD,
  );
}

async function createCampaign(companyToken, label) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${companyToken}`,
    },
    body: JSON.stringify({
      title: `AVIS ${label} ${crypto.randomUUID()}`,
      description:
        "Campagne temporaire créée pour tester le module Avis et réponses.",
      currency: "XOF",
    }),
  });

  const data = await response.json();

  assert.ok(
    [200, 201].includes(response.status),
    `La création de campagne a échoué : ${data.message || response.status}`,
  );

  const campaign = data.campaign || data.data?.campaign || data.data || data;

  assert.ok(campaign.id, "La campagne créée doit posséder un identifiant.");

  return campaign;
}

async function publishCampaign(companyToken, campaignId) {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignId}/publish`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${companyToken}`,
      },
    },
  );

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    `La publication de la campagne a échoué : ${
      data.message || response.status
    }`,
  );

  return data.campaign;
}

async function submitApplication(creatorToken, campaignId) {
  const response = await fetch(
    `${API_BASE_URL}/api/applications/${campaignId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creatorToken}`,
      },
      body: JSON.stringify({
        message: "Candidature temporaire pour les tests du module Avis.",
      }),
    },
  );

  const data = await response.json();

  assert.equal(
    response.status,
    201,
    `La candidature a échoué : ${data.message || response.status}`,
  );

  assert.ok(
    data.application?.id,
    "La candidature créée doit posséder un identifiant.",
  );

  return data.application;
}

async function acceptApplication(companyToken, applicationId, amount) {
  const response = await fetch(
    `${API_BASE_URL}/api/applications/${applicationId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${companyToken}`,
      },
      body: JSON.stringify({
        status: "ACCEPTED",
        amount,
      }),
    },
  );

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    `L'acceptation de la candidature a échoué : ${
      data.message || response.status
    }`,
  );

  const collaboration = data.application?.collaboration;

  assert.ok(
    collaboration?.id,
    "La collaboration doit être créée par l'acceptation.",
  );

  return collaboration;
}

async function completeCollaboration(companyToken, collaborationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/collaborations/${collaborationId}/complete`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${companyToken}`,
      },
    },
  );

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    `La clôture de la collaboration a échoué : ${
      data.message || response.status
    }`,
  );

  assert.equal(data.collaboration.status, "COMPLETED");

  return data.collaboration;
}

async function cancelCollaboration(companyToken, collaborationId, reason) {
  const response = await fetch(
    `${API_BASE_URL}/api/collaborations/${collaborationId}/cancel`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${companyToken}`,
      },
      body: JSON.stringify({ reason }),
    },
  );

  const data = await response.json();

  assert.equal(
    response.status,
    200,
    `L'annulation de la collaboration a échoué : ${
      data.message || response.status
    }`,
  );

  assert.equal(data.collaboration.status, "CANCELLED");

  return data.collaboration;
}

/**
 * Crée une collaboration temporaire dont l'état est contrôlé par l'appelant.
 *
 * - complete : la collaboration est clôturée (COMPLETED) ;
 * - cancel : la collaboration est annulée (CANCELLED) ;
 * - par défaut : la collaboration reste ACTIVE.
 */
async function createReviewFixture(
  companyToken,
  creatorToken,
  { complete = false, cancel = false } = {},
) {
  const campaign = await createCampaign(companyToken, "FIXTURE");

  try {
    await publishCampaign(companyToken, campaign.id);

    const application = await submitApplication(creatorToken, campaign.id);

    const collaboration = await acceptApplication(
      companyToken,
      application.id,
      20000,
    );

    if (complete) {
      await completeCollaboration(companyToken, collaboration.id);
    }

    if (cancel) {
      await cancelCollaboration(
        companyToken,
        collaboration.id,
        "Motif temporaire pour les tests du module Avis.",
      );
    }

    return {
      campaignId: campaign.id,
      applicationId: application.id,
      collaboration,
    };
  } catch (error) {
    await cleanupReviewFixture(campaign.id);
    throw error;
  }
}

/**
 * Supprime uniquement les données créées par ce fichier de test.
 *
 * L'ordre respecte les contraintes ON DELETE RESTRICT du module Avis :
 * ReviewResponse puis Review, avant Collaboration.
 */
async function cleanupReviewFixture(campaignId) {
  return cleanupCampaignCascade(prisma, campaignId);
}

async function postReview(token, body) {
  const response = await fetch(`${API_BASE_URL}/api/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return {
    response,
    data: await response.json(),
  };
}

async function postReviewResponse(token, reviewId, body) {
  const response = await fetch(
    `${API_BASE_URL}/api/reviews/${reviewId}/response`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );

  return {
    response,
    data: await response.json(),
  };
}

async function patchReviewResponse(token, reviewId, body) {
  const response = await fetch(
    `${API_BASE_URL}/api/reviews/${reviewId}/response`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );

  return {
    response,
    data: await response.json(),
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

test(
  "Avis - un avis ne peut pas être publié sur une collaboration active",
  { skip: !reviewTestsEnabled },
  async () => {
    const companyToken = await getCompanyToken();
    const creatorToken = await getCreatorToken();

    let campaignId = null;

    try {
      const fixture = await createReviewFixture(companyToken, creatorToken);

      campaignId = fixture.campaignId;

      const { response, data } = await postReview(companyToken, {
        collaborationId: fixture.collaboration.id,
        rating: 5,
        comment: "Collaboration encore en cours.",
      });

      assert.equal(response.status, 409);
      assert.equal(data.success, false);
      assert.equal(data.currentStatus, "ACTIVE");

      const stored = await prisma.review.findUnique({
        where: {
          collaborationId: fixture.collaboration.id,
        },
      });

      assert.equal(stored, null);
    } finally {
      await cleanupReviewFixture(campaignId);
    }
  },
);

test(
  "Avis - un avis ne peut pas être publié sur une collaboration annulée",
  { skip: !reviewTestsEnabled },
  async () => {
    const companyToken = await getCompanyToken();
    const creatorToken = await getCreatorToken();

    let campaignId = null;

    try {
      const fixture = await createReviewFixture(companyToken, creatorToken, {
        cancel: true,
      });

      campaignId = fixture.campaignId;

      const { response, data } = await postReview(companyToken, {
        collaborationId: fixture.collaboration.id,
        rating: 4,
        comment: "Collaboration annulée.",
      });

      assert.equal(response.status, 409);
      assert.equal(data.success, false);
      assert.equal(data.currentStatus, "CANCELLED");

      const stored = await prisma.review.findUnique({
        where: {
          collaborationId: fixture.collaboration.id,
        },
      });

      assert.equal(stored, null);
    } finally {
      await cleanupReviewFixture(campaignId);
    }
  },
);

test(
  "Avis - validation des champs, des droits et de l'existence de la collaboration",
  { skip: !reviewTestsEnabled },
  async () => {
    const companyToken = await getCompanyToken();
    const creatorToken = await getCreatorToken();

    let campaignId = null;

    try {
      const fixture = await createReviewFixture(companyToken, creatorToken, {
        complete: true,
      });

      campaignId = fixture.campaignId;

      const collaborationId = fixture.collaboration.id;

      // Un créateur ne peut pas publier d'avis.
      const creatorReview = await postReview(creatorToken, {
        collaborationId,
        rating: 5,
        comment: "Tentative d'avis par le créateur.",
      });

      assert.equal(creatorReview.response.status, 403);

      // L'identifiant de collaboration est obligatoire.
      const missingCollaboration = await postReview(companyToken, {
        rating: 5,
        comment: "Avis sans collaboration.",
      });

      assert.equal(missingCollaboration.response.status, 400);

      // La note doit être un entier compris entre 1 et 5.
      for (const rating of [undefined, 0, 6, 2.5, "5"]) {
        const invalidRating = await postReview(companyToken, {
          collaborationId,
          rating,
          comment: "Note invalide.",
        });

        assert.equal(
          invalidRating.response.status,
          400,
          `La note ${String(rating)} aurait dû être refusée.`,
        );
      }

      // Le commentaire est obligatoire et ne peut pas être vide.
      for (const comment of [undefined, "", "   "]) {
        const invalidComment = await postReview(companyToken, {
          collaborationId,
          rating: 5,
          comment,
        });

        assert.equal(
          invalidComment.response.status,
          400,
          "Un commentaire vide aurait dû être refusé.",
        );
      }

      // Aucun champ non autorisé n'est accepté.
      const unknownField = await postReview(companyToken, {
        collaborationId,
        rating: 5,
        comment: "Avis avec champ interdit.",
        creatorProfileId: "interdit",
      });

      assert.equal(unknownField.response.status, 400);

      // Une collaboration inexistante renvoie 404.
      const missingCollaborationEntity = await postReview(companyToken, {
        collaborationId: `inexistante-${crypto.randomUUID()}`,
        rating: 5,
        comment: "Avis sur une collaboration inexistante.",
      });

      assert.equal(missingCollaborationEntity.response.status, 404);

      // Aucun avis n'a été créé par les requêtes invalides.
      const storedCount = await prisma.review.count({
        where: {
          collaborationId,
        },
      });

      assert.equal(storedCount, 0);
    } finally {
      await cleanupReviewFixture(campaignId);
    }
  },
);

test(
  "Avis - une autre entreprise ne peut pas publier d'avis",
  { skip: !otherCompanyReviewTestsEnabled },
  async () => {
    const companyToken = await getCompanyToken();
    const creatorToken = await getCreatorToken();

    const otherCompanyToken = await getTestToken(
      process.env.TEST_OTHER_COMPANY_EMAIL,
      process.env.TEST_OTHER_COMPANY_PASSWORD,
    );

    let campaignId = null;

    try {
      const fixture = await createReviewFixture(companyToken, creatorToken, {
        complete: true,
      });

      campaignId = fixture.campaignId;

      const { response, data } = await postReview(otherCompanyToken, {
        collaborationId: fixture.collaboration.id,
        rating: 5,
        comment: "Tentative d'avis par une autre entreprise.",
      });

      assert.equal(response.status, 403);
      assert.equal(data.success, false);
    } finally {
      await cleanupReviewFixture(campaignId);
    }
  },
);

test(
  "Avis - parcours complet : publication, doublon, lecture publique, réponse et modification",
  { skip: !reviewTestsEnabled },
  async () => {
    const companyToken = await getCompanyToken();
    const creatorToken = await getCreatorToken();

    let campaignId = null;

    try {
      const fixture = await createReviewFixture(companyToken, creatorToken, {
        complete: true,
      });

      campaignId = fixture.campaignId;

      const collaborationId = fixture.collaboration.id;

      // 1. L'entreprise publie un avis sur la collaboration terminée.
      const created = await postReview(companyToken, {
        collaborationId,
        rating: 5,
        comment: "Prestation conforme, communication excellente.",
      });

      assert.equal(
        created.response.status,
        201,
        `La publication de l'avis a échoué : ${
          created.data.message || created.response.status
        }`,
      );

      assert.equal(created.data.success, true);

      const review = created.data.review;

      assert.ok(review?.id, "L'avis créé doit posséder un identifiant.");
      assert.equal(review.rating, 5);
      assert.equal(
        review.comment,
        "Prestation conforme, communication excellente.",
      );
      assert.equal(review.collaborationId, collaborationId);
      assert.equal(review.response, null);

      // L'avis est lié aux deux participants de la collaboration.
      const stored = await prisma.review.findUnique({
        where: {
          id: review.id,
        },
        select: {
          collaborationId: true,
          companyProfileId: true,
          creatorProfileId: true,
        },
      });

      assert.ok(stored);
      assert.equal(stored.collaborationId, collaborationId);
      assert.ok(stored.companyProfileId);
      assert.ok(stored.creatorProfileId);

      // 2. Un second avis sur la même collaboration est refusé.
      const duplicate = await postReview(companyToken, {
        collaborationId,
        rating: 3,
        comment: "Second avis interdit.",
      });

      assert.equal(duplicate.response.status, 409);
      assert.equal(duplicate.data.success, false);

      const reviewCount = await prisma.review.count({
        where: {
          collaborationId,
        },
      });

      assert.equal(reviewCount, 1);

      // 3. Lecture publique sans authentification.
      const publicListResponse = await fetch(
        `${API_BASE_URL}/api/reviews?creatorProfileId=${encodeURIComponent(
          stored.creatorProfileId,
        )}`,
      );

      const publicList = await publicListResponse.json();

      assert.equal(publicListResponse.status, 200);
      assert.equal(publicList.success, true);
      assert.ok(Array.isArray(publicList.reviews));

      const listedReview = publicList.reviews.find(
        (item) => item.id === review.id,
      );

      assert.ok(listedReview, "L'avis doit apparaître dans la liste publique.");
      assert.equal(listedReview.rating, 5);

      const publicDetailResponse = await fetch(
        `${API_BASE_URL}/api/reviews/${review.id}`,
      );

      const publicDetail = await publicDetailResponse.json();

      assert.equal(publicDetailResponse.status, 200);
      assert.equal(publicDetail.success, true);
      assert.equal(publicDetail.review.id, review.id);

      const missingDetailResponse = await fetch(
        `${API_BASE_URL}/api/reviews/inexistant-${crypto.randomUUID()}`,
      );

      assert.equal(missingDetailResponse.status, 404);

      // 4. Validation des paramètres de liste publique.
      for (const query of ["limit=0", "limit=1000", "page=abc", "limit=abc"]) {
        const invalidListResponse = await fetch(
          `${API_BASE_URL}/api/reviews?${query}`,
        );

        assert.equal(
          invalidListResponse.status,
          400,
          `Le paramètre "${query}" aurait dû être refusé.`,
        );
      }

      // 5. Une entreprise ne peut pas répondre à un avis.
      const companyResponse = await postReviewResponse(
        companyToken,
        review.id,
        { content: "Réponse interdite pour une entreprise." },
      );

      assert.equal(companyResponse.response.status, 403);

      // 6. Validation du contenu de la réponse.
      for (const content of [undefined, "", "   "]) {
        const invalidContent = await postReviewResponse(
          creatorToken,
          review.id,
          { content },
        );

        assert.equal(
          invalidContent.response.status,
          400,
          "Une réponse vide aurait dû être refusée.",
        );
      }

      const unknownResponseField = await postReviewResponse(
        creatorToken,
        review.id,
        {
          content: "Réponse avec champ interdit.",
          authorId: "interdit",
        },
      );

      assert.equal(unknownResponseField.response.status, 400);

      const missingReviewResponse = await postReviewResponse(
        creatorToken,
        `inexistant-${crypto.randomUUID()}`,
        { content: "Réponse sur un avis inexistant." },
      );

      assert.equal(missingReviewResponse.response.status, 404);

      // 7. Le créateur destinataire publie sa réponse.
      const createdResponse = await postReviewResponse(
        creatorToken,
        review.id,
        { content: "Merci pour ce retour, au plaisir de collaborer à nouveau." },
      );

      assert.equal(
        createdResponse.response.status,
        201,
        `La publication de la réponse a échoué : ${
          createdResponse.data.message || createdResponse.response.status
        }`,
      );

      assert.equal(createdResponse.data.success, true);

      const responseEntity = createdResponse.data.response;

      assert.ok(responseEntity?.id);
      assert.equal(
        responseEntity.content,
        "Merci pour ce retour, au plaisir de collaborer à nouveau.",
      );
      assert.equal(responseEntity.reviewId, review.id);
      assert.ok(responseEntity.createdAt);

      // 8. Une seconde réponse sur le même avis est refusée.
      const duplicateResponse = await postReviewResponse(
        creatorToken,
        review.id,
        { content: "Seconde réponse interdite." },
      );

      assert.equal(duplicateResponse.response.status, 409);

      // 9. La réponse apparaît dans la lecture publique de l'avis.
      const detailWithResponseResponse = await fetch(
        `${API_BASE_URL}/api/reviews/${review.id}`,
      );

      const detailWithResponse = await detailWithResponseResponse.json();

      assert.equal(detailWithResponseResponse.status, 200);
      assert.equal(detailWithResponse.review.response.id, responseEntity.id);
      assert.equal(
        detailWithResponse.review.response.content,
        "Merci pour ce retour, au plaisir de collaborer à nouveau.",
      );

      // 10. Seul l'auteur peut modifier la réponse.
      const forbiddenPatch = await patchReviewResponse(
        companyToken,
        review.id,
        { content: "Modification interdite." },
      );

      assert.equal(forbiddenPatch.response.status, 403);

      // 11. L'auteur modifie sa réponse : createdAt est préservé,
      //     seul updatedAt évolue.
      await delay(20);

      const patched = await patchReviewResponse(creatorToken, review.id, {
        content: "Merci pour ce retour, à très bientôt.",
      });

      assert.equal(
        patched.response.status,
        200,
        `La modification de la réponse a échoué : ${
          patched.data.message || patched.response.status
        }`,
      );

      assert.equal(patched.data.success, true);
      assert.equal(patched.data.response.content, "Merci pour ce retour, à très bientôt.");

      assert.equal(
        patched.data.response.createdAt,
        responseEntity.createdAt,
        "createdAt de la réponse doit être préservé.",
      );

      assert.ok(
        new Date(patched.data.response.updatedAt).getTime() >
          new Date(responseEntity.updatedAt).getTime(),
        "updatedAt de la réponse doit être actualisé.",
      );

      // 12. Une modification invalide est refusée sans altérer la réponse.
      const invalidPatch = await patchReviewResponse(creatorToken, review.id, {
        content: "   ",
      });

      assert.equal(invalidPatch.response.status, 400);

      const patchUnknownField = await patchReviewResponse(
        creatorToken,
        review.id,
        { content: "Contenu valide.", authorId: "interdit" },
      );

      assert.equal(patchUnknownField.response.status, 400);

      // 13. La modification d'un avis sans réponse renvoie 404.
      const fixtureWithoutResponse = await createReviewFixture(
        companyToken,
        creatorToken,
        { complete: true },
      );

      try {
        const secondReview = await postReview(companyToken, {
          collaborationId: fixtureWithoutResponse.collaboration.id,
          rating: 4,
          comment: "Avis temporaire sans réponse.",
        });

        assert.equal(secondReview.response.status, 201);

        const missingResponsePatch = await patchReviewResponse(
          creatorToken,
          secondReview.data.review.id,
          { content: "Aucune réponse à modifier." },
        );

        assert.equal(missingResponsePatch.response.status, 404);
      } finally {
        await cleanupReviewFixture(fixtureWithoutResponse.campaignId);
      }

      // 14. La réponse est bien conservée en base avec son auteur.
      const storedResponse = await prisma.reviewResponse.findUnique({
        where: {
          reviewId: review.id,
        },
        select: {
          id: true,
          content: true,
          authorId: true,
        },
      });

      assert.ok(storedResponse);
      assert.equal(storedResponse.id, responseEntity.id);
      assert.equal(storedResponse.content, "Merci pour ce retour, à très bientôt.");
    } finally {
      await cleanupReviewFixture(campaignId);
    }
  },
);

test(
  "Avis - un autre créateur ne peut pas répondre à l'avis",
  { skip: !otherCreatorReviewTestsEnabled },
  async () => {
    const companyToken = await getCompanyToken();
    const creatorToken = await getCreatorToken();

    const otherCreatorToken = await getTestToken(
      process.env.TEST_OTHER_CREATOR_EMAIL,
      process.env.TEST_OTHER_CREATOR_PASSWORD,
    );

    let campaignId = null;

    try {
      const fixture = await createReviewFixture(companyToken, creatorToken, {
        complete: true,
      });

      campaignId = fixture.campaignId;

      const created = await postReview(companyToken, {
        collaborationId: fixture.collaboration.id,
        rating: 4,
        comment: "Avis destiné au créateur de test.",
      });

      assert.equal(created.response.status, 201);

      const { response, data } = await postReviewResponse(
        otherCreatorToken,
        created.data.review.id,
        { content: "Tentative de réponse par un autre créateur." },
      );

      assert.equal(response.status, 403);
      assert.equal(data.success, false);

      const storedResponse = await prisma.reviewResponse.findUnique({
        where: {
          reviewId: created.data.review.id,
        },
      });

      assert.equal(storedResponse, null);
    } finally {
      await cleanupReviewFixture(campaignId);
    }
  },
);

test(
  "Avis - un autre créateur ne peut pas modifier la réponse de l'avis",
  { skip: !otherCreatorReviewTestsEnabled },
  async () => {
    const companyToken = await getCompanyToken();
    const creatorToken = await getCreatorToken();

    const otherCreatorToken = await getTestToken(
      process.env.TEST_OTHER_CREATOR_EMAIL,
      process.env.TEST_OTHER_CREATOR_PASSWORD,
    );

    let campaignId = null;

    try {
      const fixture = await createReviewFixture(companyToken, creatorToken, {
        complete: true,
      });

      campaignId = fixture.campaignId;

      const created = await postReview(companyToken, {
        collaborationId: fixture.collaboration.id,
        rating: 5,
        comment: "Avis avec réponse réservée au créateur destinataire.",
      });

      assert.equal(created.response.status, 201);

      const published = await postReviewResponse(
        creatorToken,
        created.data.review.id,
        { content: "Réponse initiale du créateur destinataire." },
      );

      assert.equal(published.response.status, 201);

      const { response, data } = await patchReviewResponse(
        otherCreatorToken,
        created.data.review.id,
        { content: "Tentative de modification par un autre créateur." },
      );

      assert.equal(response.status, 403);
      assert.equal(data.success, false);

      const storedResponse = await prisma.reviewResponse.findUnique({
        where: {
          reviewId: created.data.review.id,
        },
      });

      assert.ok(storedResponse);
      assert.equal(
        storedResponse.content,
        "Réponse initiale du créateur destinataire.",
      );
    } finally {
      await cleanupReviewFixture(campaignId);
    }
  },
);

// Fermer proprement le client Prisma du processus de test.
test.after(async () => {
  await prisma.$disconnect();
});
