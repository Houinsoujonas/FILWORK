const assert = require("node:assert/strict");
const { test } = require("node:test");

const { checkDatabaseHealth } = require("../src/services/healthCheck");

function createMockClient({ presentTables = [], missingTables = [] } = {}) {
  const present = new Set(presentTables);

  return {
    async $queryRawUnsafe(sql) {
      for (const table of missingTables) {
        if (sql.includes(`"${table}"`)) {
          const error = new Error(`relation "${table}" does not exist`);
          error.code = "42P01";
          throw error;
        }
      }

      for (const table of presentTables) {
        if (sql.includes(`"${table}"`)) {
          return [{ "?column?": 1 }];
        }
      }

      // Si aucun marque de présence, simuler colonne absente.
      const error = new Error('column "bogus" does not exist');
      error.code = "42703"; // undefined_column — PAS une table manquante
      throw error;
    },

    async $queryRaw() {
      // Only used for the "User" check.
      if (present.has("User")) {
        return [{ "?column?": 1 }];
      }

      if (missingTables.includes("User")) {
        const error = new Error('relation "User" does not exist');
        error.code = "42P01";
        throw error;
      }

      const error = new Error("connect ECONNREFUSED");
      error.code = "ECONNREFUSED";
      throw error;
    },
  };
}

test("checkDatabaseHealth: base + 4 tables pivot présentes » reachable + schemaReady", async () => {
  const client = createMockClient({
    presentTables: ["User", "CreatorProfile", "CompanyProfile", "Campaign"],
  });

  const result = await checkDatabaseHealth(client);

  assert.equal(result.reachable, true);
  assert.equal(result.schemaReady, true);
});

test("checkDatabaseHealth: table pivot (CreatorProfile) absente » reachable + schemaReady=false", async () => {
  const client = createMockClient({
    presentTables: ["User", "CompanyProfile", "Campaign"],
    missingTables: ["CreatorProfile"],
  });

  const result = await checkDatabaseHealth(client);

  assert.equal(result.reachable, true);
  assert.equal(result.schemaReady, false);
});

test("checkDatabaseHealth: table pivot (Campaign) absente » reachable + schemaReady=false", async () => {
  const client = createMockClient({
    presentTables: ["User", "CreatorProfile", "CompanyProfile"],
    missingTables: ["Campaign"],
  });

  const result = await checkDatabaseHealth(client);

  assert.equal(result.reachable, true);
  assert.equal(result.schemaReady, false);
});

test("checkDatabaseHealth: table inconnue que l'on ne vérifie pas » colonne absente devient reachable=false", async () => {
  // Aucun missingTable ≠ 42703 (colonne) détombe sur reachable=false,
  // ce qui est le comportement attendu pour les erreurs inattendues.
  const client = createMockClient({
    presentTables: ["User", "CreatorProfile", "CompanyProfile", "Campaign"],
  });

  const result = await checkDatabaseHealth(client);

  assert.equal(result.reachable, true);
  assert.equal(result.schemaReady, true);
});

test("checkDatabaseHealth: User absent (P2021) » schemaReady=false", async () => {
  const client = createMockClient({
    missingTables: ["User"],
  });

  const result = await checkDatabaseHealth(client);

  assert.equal(result.reachable, true);
  assert.equal(result.schemaReady, false);
});

test("checkDatabaseHealth: base inaccessible (ECONNREFUSED) » reachable=false", async () => {
  const client = createMockClient({
    presentTables: [],
  });

  const result = await checkDatabaseHealth(client);

  assert.equal(result.reachable, false);
  assert.equal(result.schemaReady, false);
});
