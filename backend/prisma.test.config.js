const { loadTestEnv } = require("./scripts/testDatabaseGuard");

// Charge .env.test et refuse toute cible identique à la production.
loadTestEnv();

const { defineConfig, env } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    // Uniquement TEST_DATABASE_URL : jamais DATABASE_URL ni DATABASE_URL_UNPOOLED.
    url: env("TEST_DATABASE_URL"),
  },
});
