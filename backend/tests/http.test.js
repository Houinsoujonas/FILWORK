const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { after, before, test } = require("node:test");

// Environnement minimal : aucune connexion PostgreSQL n'est ouverte par ces
// tests. L'URL est syntaxiquement valide mais ne sera jamais contactée.
process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:5432/filwork_http_test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(48).toString("hex");
process.env.CORS_ORIGINS = "http://localhost:5173";

const app = require("../src/app");
const { requireRole } = require("../src/middlewares/roleMiddleware");
const {
  mapPrismaError,
  sendPrismaError,
} = require("../src/utils/prismaErrors");
const { findUnknownFields } = require("../src/utils/validation");
const {
  assertLocalTestApi,
  assertNoDuplicateAssignments,
  assertTestJwtSecret,
} = require("../scripts/testDatabaseGuard");
const {
  assertApplicationDatabase,
  assertDatabaseUrl,
  assertPortConfiguration,
  assertTestDatabase,
  isExplicitlyTestTarget,
  maskTarget,
  normalizeTarget,
  sameTarget,
} = require("../src/config/databaseTarget");
const {
  CREATOR_DISCOVERY_CONDITIONS,
  PUBLIC_CAMPAIGN_CONDITIONS,
  isCreatorProfileVisible,
  isCompanyProfilePublic,
  isPublicCampaign,
  isReservedDocumentationEmail,
} = require("../src/services/profileVisibility");
const {
  updateApplicationStatus,
} = require("../src/controllers/applicationController");
const {
  createInvitation,
  respondToInvitation,
} = require("../src/controllers/invitationController");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

test("GET /api/health répond en JSON et expose un identifiant de requête", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.match(response.headers.get("x-request-id"), /^[A-Za-z0-9._-]+$/);
});

test("une route inconnue renvoie un 404 JSON", async () => {
  const response = await fetch(`${baseUrl}/api/route-inexistante`);
  const data = await response.json();

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type").includes("application/json"), true);
  assert.equal(data.success, false);
  assert.equal(data.message, "Route introuvable.");
  assert.equal(data.requestId, response.headers.get("x-request-id"));
});

test("l'identifiant de requête fourni par le client est conservé", async () => {
  const requestId = "client-request-123";
  const response = await fetch(`${baseUrl}/api/route-inconnue`, {
    headers: { "X-Request-Id": requestId },
  });
  const data = await response.json();

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-request-id"), requestId);
  assert.equal(data.requestId, requestId);
});

test("un JSON malformé renvoie une erreur 400 JSON", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(
    data.message,
    "Le corps de la requête n'est pas un JSON valide.",
  );
  assert.equal(data.requestId, response.headers.get("x-request-id"));
});

test("un corps trop volumineux renvoie une erreur 413 JSON", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ padding: "a".repeat(110 * 1024) }),
  });
  const data = await response.json();

  assert.equal(response.status, 413);
  assert.equal(data.success, false);
  assert.equal(data.message, "Le corps de la requête est trop volumineux.");
});

test("les routes privées refusent une requête sans jeton", async () => {
  const routes = [
    { method: "GET", path: "/api/profile/me" },
    { method: "POST", path: "/api/campaigns" },
    { method: "PATCH", path: "/api/applications/application-id/status" },
    { method: "GET", path: "/api/invitations/received" },
    { method: "GET", path: "/api/admin/users" },
    { method: "PATCH", path: "/api/deliverables/deliverable-id/submit" },
    { method: "POST", path: "/api/reviews/review-id/response" },
  ];

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
    });
    const data = await response.json();

    assert.equal(response.status, 401, `${route.method} ${route.path}`);
    assert.equal(data.success, false);
    assert.equal(data.message, "Authentification requise.");
  }
});

test("un jeton invalide est refusé sans accéder à la base", async () => {
  const response = await fetch(`${baseUrl}/api/profile/me`, {
    headers: { Authorization: "Bearer jeton-invalide" },
  });
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.success, false);
  assert.equal(
    data.message,
    "Jeton invalide ou expiré. Veuillez vous reconnecter.",
  );
});

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("requireRole autorise les rôles attendus et refuse les autres", () => {
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  const allowedResponse = createMockResponse();
  requireRole("COMPANY")(
    { user: { role: "COMPANY" } },
    allowedResponse,
    next,
  );

  assert.equal(nextCalled, true);
  assert.equal(allowedResponse.statusCode, null);

  const deniedResponse = createMockResponse();
  requireRole("COMPANY")(
    { user: { role: "CREATOR" } },
    deniedResponse,
    () => {},
  );

  assert.equal(deniedResponse.statusCode, 403);
  assert.equal(deniedResponse.body.success, false);
  assert.equal(deniedResponse.body.message, "Accès non autorisé pour ce rôle.");

  const anonymousResponse = createMockResponse();
  requireRole("ADMIN")({}, anonymousResponse, () => {});

  assert.equal(anonymousResponse.statusCode, 401);
  assert.equal(anonymousResponse.body.message, "Authentification requise.");
});

test("les erreurs Prisma connues sont traduites sans devenir des 500", () => {
  assert.deepEqual(mapPrismaError({ code: "P2025" }), {
    status: 404,
    message: "La ressource demandée est introuvable.",
  });

  assert.deepEqual(
    mapPrismaError({ code: "P2002" }, { P2002: "Conflit personnalisé." }),
    {
      status: 409,
      message: "Conflit personnalisé.",
    },
  );

  assert.deepEqual(mapPrismaError({ code: "P2003" }), {
    status: 409,
    message:
      "L'opération est impossible car la ressource est référencée par d'autres données.",
  });

  assert.equal(mapPrismaError({ code: "P9999" }), null);
  assert.equal(mapPrismaError(new Error("autre erreur")), null);

  const response = createMockResponse();
  const handled = sendPrismaError(response, { code: "P2025" });

  assert.equal(handled, true);
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.success, false);

  const ignoredResponse = createMockResponse();
  assert.equal(sendPrismaError(ignoredResponse, new Error("autre")), false);
  assert.equal(ignoredResponse.statusCode, null);
});

test("le validateur commun détecte les champs inconnus", () => {
  assert.deepEqual(
    findUnknownFields({ status: "ACCEPTED", amount: 10 }, [
      "status",
      "amount",
    ]),
    [],
  );

  assert.deepEqual(
    findUnknownFields({ status: "ACCEPTED", role: "ADMIN" }, ["status"]),
    ["role"],
  );

  assert.deepEqual(findUnknownFields(null, ["status"]), []);
});

test("les contrôleurs critiques rejettent les champs inconnus avant toute écriture", async () => {
  const applicationResponse = createMockResponse();

  await updateApplicationStatus(
    {
      user: { id: "company-user", role: "COMPANY" },
      params: { applicationId: "application-id" },
      body: { status: "ACCEPTED", amount: 100, role: "ADMIN" },
    },
    applicationResponse,
  );

  assert.equal(applicationResponse.statusCode, 400);
  assert.equal(applicationResponse.body.success, false);
  assert.match(applicationResponse.body.message, /Champs non autorisés/);

  const invitationResponse = createMockResponse();

  await createInvitation(
    {
      user: { id: "company-user", role: "COMPANY" },
      params: { campaignId: "campaign-id" },
      body: { creatorProfileId: "creator-id", role: "ADMIN" },
    },
    invitationResponse,
  );

  assert.equal(invitationResponse.statusCode, 400);
  assert.equal(invitationResponse.body.success, false);
  assert.match(invitationResponse.body.message, /Champs non autorisés/);

  const respondResponse = createMockResponse();

  await respondToInvitation(
    {
      user: { id: "creator-user", role: "CREATOR" },
      params: { invitationId: "invitation-id" },
      body: { status: "ACCEPTED", amount: 100 },
    },
    respondResponse,
  );

  assert.equal(respondResponse.statusCode, 400);
  assert.equal(respondResponse.body.success, false);
  assert.match(respondResponse.body.message, /Champs non autorisés/);
});

test("le garde-fou de test détecte les doublons de TEST_DATABASE_URL", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "filwork-env-"));
  const envFile = path.join(directory, ".env.test");

  fs.writeFileSync(
    envFile,
    "TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test\n" +
      "TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/other\n",
  );

  assert.throws(
    () => assertNoDuplicateAssignments(envFile, ["TEST_DATABASE_URL"]),
    /plusieurs déclarations/,
  );

  fs.writeFileSync(envFile, "TEST_DATABASE_URL=postgresql://localhost:5432/test\n");

  assert.doesNotThrow(() =>
    assertNoDuplicateAssignments(envFile, ["TEST_DATABASE_URL"]),
  );

  fs.rmSync(directory, { recursive: true, force: true });
});

test("le secret JWT de test doit être long et différent de la production", () => {
  assert.throws(
    () => assertTestJwtSecret("court", {}),
    /au moins 32 caractères/,
  );

  assert.throws(
    () =>
      assertTestJwtSecret("a".repeat(64), {
        JWT_SECRET: "a".repeat(64),
      }),
    /identique au secret de production/,
  );

  assert.doesNotThrow(() =>
    assertTestJwtSecret("b".repeat(64), {
      JWT_SECRET: "a".repeat(64),
    }),
  );
});

test("l'API de test doit rester locale par défaut", () => {
  assert.doesNotThrow(() => assertLocalTestApi("http://localhost:5051"));
  assert.doesNotThrow(() => assertLocalTestApi("http://127.0.0.1:5051"));

  assert.throws(
    () => assertLocalTestApi("https://api.filwork.example"),
    /hôte non local/,
  );

  const previous = process.env.TEST_ALLOW_REMOTE_API;
  process.env.TEST_ALLOW_REMOTE_API = "true";

  assert.doesNotThrow(() =>
    assertLocalTestApi("https://api.filwork.example"),
  );

  if (previous === undefined) {
    delete process.env.TEST_ALLOW_REMOTE_API;
  } else {
    process.env.TEST_ALLOW_REMOTE_API = previous;
  }
});

// =====================================================
// ISOLATION APPLICATIF / TEST
// =====================================================

test("les cibles PostgreSQL sont normalisées sans exposer les identifiants", () => {
  const target = normalizeTarget(
    "postgresql://user:secret@DB.Example.net:6543/FILWORK?sslmode=require",
  );

  assert.deepEqual(target, {
    protocol: "postgresql:",
    host: "db.example.net",
    port: "6543",
    database: "filwork",
  });

  // Le masque ne contient ni utilisateur ni mot de passe.
  assert.equal(maskTarget(target), "db.example.net:6543/filwork");
  assert.equal(maskTarget(target).includes("secret"), false);

  assert.equal(
    sameTarget(
      target,
      normalizeTarget("postgresql://autre:motdepasse@db.example.net:6543/filwork"),
    ),
    true,
  );

  assert.equal(normalizeTarget("mysql://localhost/filwork"), null);
  assert.equal(normalizeTarget("pas-une-url"), null);
  assert.throws(
    () => assertDatabaseUrl("pas-une-url", "DATABASE_URL"),
    /URL PostgreSQL valide/,
  );
});

test("le client applicatif refuse une base identifiée comme base de test", () => {
  assert.doesNotThrow(() =>
    assertApplicationDatabase({
      applicationUrl: "postgresql://user:secret@db.neon.tech/neondb",
    }),
  );

  assert.throws(
    () =>
      assertApplicationDatabase({
        applicationUrl: "postgresql://user:secret@127.0.0.1:55432/filwork_test",
      }),
    /explicitement identifiée comme base de test/,
  );

  assert.throws(
    () =>
      assertApplicationDatabase({
        applicationUrl: "postgresql://user:secret@127.0.0.1:55432/neondb",
        testUrl: "postgresql://user:secret@127.0.0.1:55432/neondb",
      }),
    /même base que TEST_DATABASE_URL/,
  );

  // Un nom légitime proche de "test" n'est pas rejeté.
  assert.equal(
    isExplicitlyTestTarget(normalizeTarget("postgresql://h/filwork_latest")),
    false,
  );
  assert.equal(
    isExplicitlyTestTarget(normalizeTarget("postgresql://h/filwork_contest")),
    false,
  );
  assert.equal(
    isExplicitlyTestTarget(normalizeTarget("postgresql://h/filwork_test")),
    true,
  );
  assert.equal(
    isExplicitlyTestTarget(normalizeTarget("postgresql://h/test_filwork")),
    true,
  );
});

test("les scripts de test ne peuvent pas cibler la base applicative", () => {
  assert.doesNotThrow(() =>
    assertTestDatabase({
      testUrl: "postgresql://user:secret@127.0.0.1:55432/filwork_test",
      productionUrls: ["postgresql://user:secret@db.neon.tech/neondb"],
    }),
  );

  assert.throws(
    () =>
      assertTestDatabase({
        testUrl: "postgresql://user:secret@db.neon.tech/neondb",
        productionUrls: ["postgresql://user:secret@db.neon.tech/neondb"],
      }),
    /ne désigne pas explicitement une base de test|même base que la production/,
  );

  assert.throws(
    () =>
      assertTestDatabase({
        testUrl: "postgresql://user:secret@127.0.0.1:55432/filwork_test",
        productionUrls: [
          "postgresql://other:other@127.0.0.1:55432/filwork_test",
        ],
      }),
    /même base que la production/,
  );

  // Une base non explicitement nommée "test" est refusée par défaut.
  assert.throws(
    () =>
      assertTestDatabase({
        testUrl: "postgresql://user:secret@127.0.0.1:55432/filwork",
      }),
    /ne désigne pas explicitement une base de test/,
  );
});

test("les ports de l'API applicative et de l'API de test sont cloisonnés", () => {
  assert.doesNotThrow(() =>
    assertPortConfiguration({
      nodeEnv: "development",
      port: 5000,
      host: "0.0.0.0",
    }),
  );

  assert.throws(
    () =>
      assertPortConfiguration({
        nodeEnv: "production",
        port: 5051,
        host: "0.0.0.0",
      }),
    /port 5051 est réservé/,
  );

  assert.doesNotThrow(() =>
    assertPortConfiguration({
      nodeEnv: "test",
      port: 5051,
      host: "127.0.0.1",
    }),
  );

  assert.throws(
    () =>
      assertPortConfiguration({
        nodeEnv: "test",
        port: 5000,
        host: "127.0.0.1",
      }),
    /doit écouter sur le port 5051/,
  );

  assert.throws(
    () =>
      assertPortConfiguration({
        nodeEnv: "test",
        port: 5051,
        host: "0.0.0.0",
      }),
    /interface locale/,
  );

  assert.doesNotThrow(() =>
    assertPortConfiguration({
      nodeEnv: "test",
      port: 5051,
      host: "0.0.0.0",
      allowRemoteTestHost: true,
    }),
  );
});

test("les domaines e-mail de documentation sont identifiés sans regex sur les noms", () => {
  assert.equal(isReservedDocumentationEmail("compte@example.com"), true);
  assert.equal(isReservedDocumentationEmail("compte@sub.example.com"), true);
  assert.equal(isReservedDocumentationEmail("compte@mail.example.org"), true);
  assert.equal(isReservedDocumentationEmail("compte@service.test"), true);
  assert.equal(isReservedDocumentationEmail("compte@filwork.local"), false);
  assert.equal(isReservedDocumentationEmail("compte@gmail.com"), false);
  assert.equal(isReservedDocumentationEmail(""), false);
  assert.equal(isReservedDocumentationEmail(null), false);
});

test("un profil créateur incomplet ou de démonstration n'est pas découvrable", () => {
  // Profil résiduel observé dans la base applicative : nom seul, bio/niche nulles.
  assert.equal(
    isCreatorProfileVisible({
      displayName: "Créateur Test 20261027230119",
      bio: null,
      niche: null,
      user: {
        role: "CREATOR",
        email: "filwork.creator.20261027230119@example.com",
      },
    }),
    false,
  );

  // Profil complet mais sur un domaine de documentation : non découvrable.
  assert.equal(
    isCreatorProfileVisible({
      displayName: "Créatrice complète",
      bio: "Bio renseignée.",
      niche: "Lifestyle",
      user: { role: "CREATOR", email: "demo@example.com" },
    }),
    false,
  );

  // Profil complet et légitime : découvrable.
  assert.equal(
    isCreatorProfileVisible({
      displayName: "Awa Koné",
      bio: "Créatrice lifestyle basée à Abidjan.",
      niche: "Lifestyle",
      user: { role: "CREATOR", email: "awa.kone@filwork.local" },
    }),
    true,
  );

  // Un nom contenant "Test" n'est pas un motif d'exclusion.
  assert.equal(
    isCreatorProfileVisible({
      displayName: "Testimony Agency",
      bio: "Studio de création de contenu.",
      niche: "Business",
      user: { role: "CREATOR", email: "contact@testimony-agency.com" },
    }),
    true,
  );

  assert.equal(
    isCreatorProfileVisible({
      displayName: "  ",
      bio: "Bio",
      niche: "Mode",
      user: { role: "CREATOR", email: "ok@filwork.local" },
    }),
    false,
  );
});

test("un profil entreprise incomplet ou de démonstration n'est pas publiable", () => {
  assert.equal(
    isCompanyProfilePublic({
      companyName: "Entreprise Test 20261027230119",
      description: null,
      user: {
        role: "COMPANY",
        email: "filwork.company.20261027230119@example.com",
      },
    }),
    false,
  );

  assert.equal(
    isCompanyProfilePublic({
      companyName: "Entreprise complète",
      description: "Description de l'entreprise.",
      user: { role: "COMPANY", email: "contact@entreprise.com" },
    }),
    true,
  );

  assert.equal(
    isCompanyProfilePublic({
      companyName: "Entreprise démo",
      description: "Description.",
      user: { role: "COMPANY", email: "contact@example.net" },
    }),
    false,
  );
});

test("seules les campagnes publiées d'entreprises complètes sont publiques", () => {
  const completeCompany = {
    companyName: "Entreprise complète",
    description: "Description.",
    user: { email: "contact@entreprise.com" },
  };

  assert.equal(
    isPublicCampaign({
      status: "PUBLISHED",
      companyProfile: completeCompany,
    }),
    true,
  );

  assert.equal(
    isPublicCampaign({
      status: "DRAFT",
      companyProfile: completeCompany,
    }),
    false,
  );

  assert.equal(
    isPublicCampaign({
      status: "PUBLISHED",
      companyProfile: {
        companyName: "Entreprise Test",
        description: null,
        user: { email: "test@example.com" },
      },
    }),
    false,
  );

  // Les conditions Prisma ne contiennent aucun filtre sur le nom.
  const serialized = JSON.stringify(CREATOR_DISCOVERY_CONDITIONS);

  assert.equal(serialized.includes("displayName\":{\"contains"), false);
  assert.equal(
    JSON.stringify(PUBLIC_CAMPAIGN_CONDITIONS).includes('"status":"PUBLISHED"'),
    true,
  );
});

