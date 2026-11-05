import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function readAllSources() {
  return listFiles(SRC)
    .filter((file) => /\.(?:js|jsx|ts|tsx|css|json)$/i.test(file))
    .map((file) => ({
      file: path.relative(ROOT, file),
      content: fs.readFileSync(file, "utf8"),
    }));
}

test("le frontend ne contient aucun appel involontaire vers l'API de test", () => {
  const sources = readAllSources();

  for (const { file, content } of sources) {
    assert.equal(
      content.includes("5051"),
      false,
      `${file} référence le port 5051 réservé à l'API de test.`,
    );

    assert.equal(
      /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(content),
      false,
      `${file} contient une URL locale codée en dur.`,
    );
  }
});

test("le frontend ne contient aucune configuration de base de données", () => {
  const sources = readAllSources();

  for (const { file, content } of sources) {
    for (const secret of [
      "DATABASE_URL",
      "TEST_DATABASE_URL",
      "JWT_SECRET",
      "filwork_test",
    ]) {
      assert.equal(
        content.includes(secret),
        false,
        `${file} expose ou référence ${secret}.`,
      );
    }
  }
});

test("le client HTTP utilise l'API applicative par défaut", () => {
  const apiClient = fs.readFileSync(path.join(SRC, "lib", "api.js"), "utf8");

  assert.match(apiClient, /import\.meta\.env\.VITE_API_BASE_URL\s*\|\|\s*["']\/api["']/);

  for (const { file, content } of readAllSources()) {
    assert.equal(
      /from\s+["'][^"']*(?:fixture|mock|fake|demo|seed)[^"']*["']/i.test(content),
      false,
      `${file} importe un fichier de données de démonstration.`,
    );
  }
});

test("le proxy Vite cible l'API applicative (5000) par défaut", () => {
  const viteConfig = fs.readFileSync(path.join(ROOT, "vite.config.js"), "utf8");

  assert.match(
    viteConfig,
    /VITE_API_PROXY_TARGET\s*\|\|\s*["']http:\/\/localhost:5000["']/,
  );
});
