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

function readSources() {
  return listFiles(SRC)
    .filter((file) => /\.(?:js|jsx|ts|tsx|css)$/i.test(file))
    .map((file) => ({
      file: path.relative(ROOT, file),
      content: fs.readFileSync(file, "utf8"),
    }));
}

const indexCss = fs.readFileSync(path.join(SRC, "index.css"), "utf8");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

test("aucune image n'est importée avec une extension en majuscules", () => {
  for (const { file, content } of readSources()) {
    assert.equal(
      /\.JPG(?:["'])/.test(content),
      false,
      `${file} importe une image avec l'extension .JPG.`,
    );
  }
});

test("le débordement horizontal n'est pas masqué à la racine du document", () => {
  const rootRules = indexCss.match(/(?:^|\n)\s*(?:html\s*,\s*body|html|body)\s*\{[^}]*\}/g) ?? [];

  for (const rule of rootRules) {
    assert.equal(
      /overflow-x\s*:\s*(?:clip|hidden)/.test(rule),
      false,
      "Une règle html ou body masque le débordement horizontal.",
    );
  }
});

test("les polices distantes sont chargées depuis le document HTML", () => {
  assert.equal(
    indexCss.includes("fonts.googleapis.com"),
    false,
    "index.css ne doit pas importer les polices Google.",
  );
  assert.match(indexHtml, /rel="preconnect"[^>]*href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(indexHtml, /fonts\.googleapis\.com\/css2\?family=/);
});
