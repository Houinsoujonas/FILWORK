const { Client } = require("pg");

const { loadTestEnv, maskTarget } = require("./testDatabaseGuard");

async function main() {
  const { testTarget, productionTargets } = loadTestEnv();

  console.log(`[test-db] Cible configurée : ${maskTarget(testTarget)}`);
  console.log(
    `[test-db] Sources de production contrôlées : ${productionTargets
      .map((target) => target.origin)
      .join(", ")}`,
  );

  if (process.argv.includes("--connect")) {
    const client = new Client({
      connectionString: process.env.TEST_DATABASE_URL,
      application_name: "filwork-test-preflight",
    });

    await client.connect();

    try {
      const result = await client.query("SELECT current_database() AS db");
      const connectedDatabase = String(result.rows[0].db).toLowerCase();

      if (connectedDatabase !== testTarget.database) {
        throw new Error(
          `La base connectée (${connectedDatabase}) ne correspond pas à TEST_DATABASE_URL (${testTarget.database}).`,
        );
      }

      console.log(`[test-db] Connexion vérifiée : ${connectedDatabase}`);
    } finally {
      await client.end();
    }
  }

  console.log("[test-db] OK : la base de production n'est pas ciblée.");
}

main().catch((error) => {
  console.error(`[test-db] ÉCHEC : ${error.message}`);
  process.exit(1);
});
