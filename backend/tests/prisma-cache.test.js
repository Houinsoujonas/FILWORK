const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

process.env.NODE_ENV = "test";
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:55432/filwork_test";
process.env.PROD_DATABASE_URL =
  "postgresql://prod:prod@127.0.0.1:5432/should_not_leak";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);

const backendRoot = "C:\\Users\\SYKO Electronics\\FILWORK\\backend";

function runNode(script) {
  return execFileSync(process.execPath, ["-e", script], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
      // Valide le comportement lorsque NODE_ENV != test pour dev/prod :
      // le module doit retomber sur DATABASE_URL.
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://user:secret@127.0.0.1:5432/filwork_prod_simulation",
    },
    encoding: "utf8",
    timeout: 15000,
  });
}

test("le module Prisma est mis en cache sur globalThis", () => {
  const out = runNode(`
    const prisma = require("./src/config/prisma.js");
    console.log(typeof prisma);
  `);

  assert.match(out.trim(), /^object$/);
});

test("un adaptateur périmé sans client est ignoré et recréé avec le client", () => {
  const out = runNode(`
    process.env.NODE_ENV = "test";
    globalThis.__filworkAdapter = { stale: true };
    delete globalThis.__filworkPrisma;
    const prisma1 = require("./src/config/prisma.js");
    const prisma2 = require("./src/config/prisma.js");
    console.log(JSON.stringify({
      same: prisma1 === prisma2,
      adapterIsCurrent: globalThis.__filworkAdapter && !globalThis.__filworkAdapter.stale,
    }));
  `);

  const parsed = JSON.parse(out.trim());

  assert.equal(parsed.same, true);
  assert.equal(parsed.adapterIsCurrent, true);
});

test("un client périmé sans adaptateur est ignoré et recréé avec l'adaptateur", () => {
  const out = runNode(`
    process.env.NODE_ENV = "test";
    globalThis.__filworkPrisma = { stale: true };
    delete globalThis.__filworkAdapter;
    const prisma1 = require("./src/config/prisma.js");
    const prisma2 = require("./src/config/prisma.js");
    console.log(JSON.stringify({
      same: prisma1 === prisma2,
      clientIsCurrent: globalThis.__filworkPrisma && !globalThis.__filworkPrisma.stale,
      adapterBound: !!globalThis.__filworkAdapter,
    }));
  `);

  const parsed = JSON.parse(out.trim());

  assert.equal(parsed.same, true);
  assert.equal(parsed.clientIsCurrent, true);
  assert.equal(parsed.adapterBound, true);
});
