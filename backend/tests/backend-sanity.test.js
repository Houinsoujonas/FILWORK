const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");

test("package.json expose les scripts start et build", () => {
  const packageJson = require("../package.json");

  assert.equal(packageJson.scripts.start, "node src/server.js");
  assert.equal(packageJson.scripts.build, "prisma generate");
  assert.match(String(packageJson.engines.node), /24/);
});

test("package.json n'inclut pas node_modules dans main", () => {
  const packageJson = require("../package.json");

  assert.equal(packageJson.main, "src/server.js");
  assert.equal(packageJson.type, "commonjs");
});

test("le fichier de déploiement Render existe", () => {
  assert.equal(
    fs.existsSync(path.join(backendRoot, "docs", "deploy-render.md")),
    true,
  );
});
