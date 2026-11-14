/**
 * Tests du fournisseur de stockage Vercel Blob avec un SDK simulé.
 *
 * Stratégie : injection d'un faux module `@vercel/blob` via require.cache
 * (aucune requête réseau). Vérifie :
 *   - uploadImage réussit et retourne url + pathname ;
 *   - un échec du SDK est traduit en 502 / STORAGE_UPSTREAM_ERROR ;
 *   - la suppression est routée vers sdk.del ;
 *   - une URL non-HTTPS est rejetée avec 400 / STORAGE_INVALID_URL ;
 *   - STORAGE_PROVIDER=none ou sans authentification : 503 / STORAGE_NOT_CONFIGURED ;
 *   - OIDC (store lié) : aucun token requis, le SDK est appelé sans token.
 *
 * Aucun fichier n'est écrit ; aucun blob réel n'est créé.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(64);
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.STORAGE_PROVIDER = "vercel-blob";

// Environnement d'auth Vercel simulé : retourné par les tests selon le cas.
function setAuthEnv({ token, oidc } = {}) {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.STORAGE_TOKEN;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL_ENV;

  if (token) {
    process.env.BLOB_READ_WRITE_TOKEN = token;
  }

  if (oidc) {
    process.env.VERCEL_OIDC_TOKEN = "oidc-token-simulé";
    process.env.BLOB_STORE_ID = "store_simulé";
    process.env.VERCEL_ENV = "production";
  }
}

// PNG minimal valide (signature + données) : passe la validation.
const tinyPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
]);

function withFakeBlobSdk(fake, fn) {
  const blobPath = require.resolve("@vercel/blob");
  const original = require.cache[blobPath];

  require.cache[blobPath] = {
    id: blobPath,
    filename: blobPath,
    loaded: true,
    exports: fake,
  };

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (original) {
        require.cache[blobPath] = original;
      } else {
        delete require.cache[blobPath];
      }
    });
}

const {
  uploadImage,
  deleteImage,
  isConfigured,
  getStorageProvider,
} = require("../src/services/storage");

test.afterEach(() => {
  setAuthEnv({});
});

test("uploadImage réussit avec un store lié par OIDC (aucun token)", async () => {
  setAuthEnv({ oidc: true });

  const calls = [];

  await withFakeBlobSdk(
    {
      put: async (pathname, body, options) => {
        calls.push({ pathname, size: body.length, options });
        return {
          url: "https://store.public.blob.vercel-storage.com/uploads/photo-abc123.png",
          pathname: "uploads/photo-abc123.png",
        };
      },
      del: async () => {},
    },
    async () => {
      const result = await uploadImage({
        buffer: tinyPng,
        contentType: "image/png",
        filename: "photo.png",
      });

      assert.equal(
        result.url,
        "https://store.public.blob.vercel-storage.com/uploads/photo-abc123.png",
      );
      assert.equal(result.pathname, "uploads/photo-abc123.png");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].pathname, "uploads/photo.png");
      assert.equal(calls[0].options.access, "public");
      assert.equal(calls[0].options.addRandomSuffix, true);
      assert.equal(calls[0].options.token, undefined); // pas de token statique en mode OIDC
    },
  );
});

test("uploadImage réussit avec un token statique BLOB_READ_WRITE_TOKEN", async () => {
  setAuthEnv({ token: "vercel_blob_rw_simulated_token_do_not_use" });

  const calls = [];

  await withFakeBlobSdk(
    {
      put: async (pathname, body, options) => {
        calls.push({ pathname, options });
        return {
          url: "https://store.public.blob.vercel-storage.com/uploads/logo-xyz.png",
          pathname: "uploads/logo-xyz.png",
        };
      },
      del: async () => {},
    },
    async () => {
      const result = await uploadImage({
        buffer: tinyPng,
        contentType: "image/png",
        filename: "logo.png",
      });

      assert.equal(calls.length, 1);
      assert.equal(
        calls[0].options.token,
        "vercel_blob_rw_simulated_token_do_not_use",
      );
      assert.ok(result.url.startsWith("https://"));
    },
  );
});

test("uploadImage traduit une erreur du SDK en 502 STORAGE_UPSTREAM_ERROR", async () => {
  setAuthEnv({ token: "vercel_blob_rw_simulated_token_do_not_use" });

  await withFakeBlobSdk(
    {
      put: async () => {
        throw new Error("store suspend 503");
      },
      del: async () => {},
    },
    async () => {
      await assert.rejects(
        () =>
          uploadImage({
            buffer: tinyPng,
            contentType: "image/png",
            filename: "photo.png",
          }),
        (error) => {
          assert.equal(error.statusCode, 502);
          assert.equal(error.code, "STORAGE_UPSTREAM_ERROR");
          assert.match(error.message, /fournisseur de stockage/i);
          return true;
        },
      );
    },
  );
});

test("deleteImage route vers sdk.del et refuse les URL non-HTTPS", async () => {
  setAuthEnv({ token: "vercel_blob_rw_simulated_token_do_not_use" });

  const deleted = [];

  await withFakeBlobSdk(
    {
      put: async () => ({ url: "", pathname: "" }),
      del: async (urls, options) => {
        deleted.push({ urls, options });
      },
    },
    async () => {
      const result = await deleteImage(
        "https://store.public.blob.vercel-storage.com/uploads/photo.png",
      );

      assert.deepEqual(result, { deleted: true });
      assert.equal(deleted.length, 1);
      assert.deepEqual(deleted[0].urls, [
        "https://store.public.blob.vercel-storage.com/uploads/photo.png",
      ]);

      await assert.rejects(
        () => deleteImage("http://store.public.blob.vercel-storage.com/uploads/photo.png"),
        (error) => {
          assert.equal(error.statusCode, 400);
          assert.equal(error.code, "STORAGE_INVALID_URL");
          return true;
        },
      );

      await assert.rejects(
        () => deleteImage("javascript:alert(1)"),
        (error) => {
          assert.equal(error.statusCode, 400);
          assert.equal(error.code, "STORAGE_INVALID_URL");
          return true;
        },
      );
    },
  );
});

test("STORAGE_PROVIDER=vercel-blob sans authentification : 503 STORAGE_NOT_CONFIGURED", async () => {
  setAuthEnv({});

  assert.throws(
    () => getStorageProvider(),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.code, "STORAGE_NOT_CONFIGURED");
      return true;
    },
  );

  assert.equal(isConfigured(), false);
});

test("STORAGE_PROVIDER=none : non configuré, getStorageProvider 503", async () => {
  setAuthEnv({ token: "vercel_blob_rw_simulated_token_do_not_use" });
  process.env.STORAGE_PROVIDER = "none";

  assert.equal(isConfigured(), false);
  assert.throws(
    () => getStorageProvider(),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.code, "STORAGE_NOT_CONFIGURED");
      return true;
    },
  );

  process.env.STORAGE_PROVIDER = "vercel-blob";
});
