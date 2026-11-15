import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_SOURCE = fs.readFileSync(
  path.join(ROOT, "src", "lib", "api.js"),
  "utf8",
);

let moduleNumber = 0;

function createStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

async function withApi(
  run,
  { apiUrl = "https://api.filwork.test/api", production = false } = {},
) {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const eventTarget = new EventTarget();

  globalThis.window = {
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    setTimeout,
    clearTimeout,
    dispatchEvent: (event) => eventTarget.dispatchEvent(event),
  };

  const source = API_SOURCE
    .replace(
      "import.meta.env.VITE_API_URL?.trim()",
      JSON.stringify(apiUrl),
    )
    .replaceAll("import.meta.env.DEV", "false")
    .replaceAll("import.meta.env.PROD", String(production));
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${moduleNumber++}`;

  try {
    const apiModule = await import(moduleUrl);
    await run(apiModule);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
}

test("le client accepte une réponse sans contenu", async () => {
  await withApi(async ({ api }) => {
    globalThis.fetch = async () => new Response(null, { status: 204 });

    assert.equal(await api.delete("/resource/1"), null);
  });
});

test("le client renouvelle les jetons après un 401 et rejoue la requête", async () => {
  await withApi(async ({ api, setTokens, getToken, getRefreshToken }) => {
    setTokens("access-expired", "refresh-old");
    const calls = [];

    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });

      if (url.endsWith("/auth/refresh")) {
        return Response.json({
          success: true,
          token: "access-new",
          refreshToken: "refresh-new",
          user: { id: "user-1", role: "CREATOR" },
        });
      }

      if (
        calls.filter(({ url: requestUrl }) => requestUrl.endsWith("/resource"))
          .length === 1
      ) {
        return Response.json(
          { success: false, message: "Jeton expiré." },
          { status: 401 },
        );
      }

      return Response.json({ success: true, value: 7 });
    };

    assert.deepEqual(await api.get("/resource"), { success: true, value: 7 });
    assert.equal(calls.length, 3);
    assert.deepEqual(JSON.parse(calls[1].options.body), {
      refreshToken: "refresh-old",
    });
    assert.equal(calls[2].options.headers.Authorization, "Bearer access-new");
    assert.equal(getToken(), "access-new");
    assert.equal(getRefreshToken(), "refresh-new");
  });
});

test("un refus 403 ne déclenche pas de renouvellement", async () => {
  await withApi(async ({ api, setTokens, getToken }) => {
    setTokens("access-current", "refresh-current");
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json(
        { success: false, message: "Accès non autorisé." },
        { status: 403 },
      );
    };

    await assert.rejects(api.get("/admin/dashboard"), (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.message, "Accès non autorisé.");
      return true;
    });

    assert.equal(calls, 1);
    assert.equal(getToken(), "access-current");
  });
});

test("deux GET identiques simultanés partagent la même requête", async () => {
  await withApi(async ({ api }) => {
    let calls = 0;
    let resolveResponse;
    globalThis.fetch = () => {
      calls += 1;
      return new Promise((resolve) => {
        resolveResponse = resolve;
      });
    };

    const firstRequest = api.get("/resource", { page: 1 });
    const secondRequest = api.get("/resource", { page: 1 });

    assert.equal(calls, 1);
    resolveResponse(Response.json({ success: true }));
    assert.deepEqual(await Promise.all([firstRequest, secondRequest]), [
      { success: true },
      { success: true },
    ]);
  });
});

test("une URL de production en HTTP est refusée", async () => {
  await withApi(async ({ api }) => {
    globalThis.fetch = async () => {
      throw new Error("fetch ne doit pas être appelé");
    };

    await assert.rejects(api.get("/health"), (error) => {
      assert.equal(error.status, 0);
      assert.match(error.message, /HTTPS/);
      return true;
    });
  }, { apiUrl: "http://api.filwork.test/api", production: true });
});

test("le délai couvre aussi la lecture du corps de la réponse", async () => {
  await withApi(async ({ api }) => {
    window.setTimeout = (callback) => setTimeout(callback, 10);
    globalThis.fetch = async (_url, { signal }) => {
      const body = new ReadableStream({
        start(controller) {
          signal.addEventListener("abort", () => controller.error(signal.reason));
        },
      });
      return new Response(body, { headers: { "Content-Type": "application/json" } });
    };

    await assert.rejects(api.get("/slow"), (error) => {
      assert.equal(error.status, 0);
      assert.match(error.message, /trop de temps/);
      return true;
    });
  });
});

test("le délai du renouvellement couvre aussi son corps de réponse", async () => {
  await withApi(async ({ api, setTokens }) => {
    setTokens("access-expired", "refresh-current");
    const originalTimeout = AbortSignal.timeout;
    AbortSignal.timeout = () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10);
      return controller.signal;
    };

    globalThis.fetch = async (url, { signal }) => {
      if (!url.endsWith("/auth/refresh")) {
        return Response.json({ message: "Jeton expiré." }, { status: 401 });
      }

      const body = new ReadableStream({
        start(controller) {
          signal.addEventListener("abort", () => controller.error(signal.reason));
        },
      });
      return new Response(body, { headers: { "Content-Type": "application/json" } });
    };

    try {
      await assert.rejects(api.get("/protected"), (error) => {
        assert.equal(error.status, 0);
        assert.match(error.message, /trop de temps/);
        return true;
      });
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  });
});
