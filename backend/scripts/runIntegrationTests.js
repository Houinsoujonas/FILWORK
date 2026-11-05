const { spawn } = require("node:child_process");
const path = require("node:path");

const { loadTestEnv } = require("./testDatabaseGuard");

const BACKEND_ROOT = path.resolve(__dirname, "..");
const HEALTH_TIMEOUT_MS = 20000;
const TEST_TIMEOUT_MS = 15 * 60 * 1000;

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function runProcess(command, args, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let timer = null;

    if (timeoutMs) {
      timer = setTimeout(() => {
        child.kill("SIGTERM");

        const forceKill = setTimeout(() => {
          if (child.exitCode === null) {
            child.kill("SIGKILL");
          }
        }, 2000);

        forceKill.unref();

        reject(
          new Error(
            `Les tests ont dépassé le délai maximal de ${timeoutMs / 1000} secondes.`,
          ),
        );
      }, timeoutMs);
    }

    child.once("error", (error) => {
      if (timer) {
        clearTimeout(timer);
      }

      reject(error);
    });

    child.once("exit", (code, signal) => {
      if (timer) {
        clearTimeout(timer);
      }

      resolve({ code, signal });
    });
  });
}

async function waitForHealth(apiBaseUrl, serverProcess) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(
        `Le serveur de test s'est arrêté avant d'être prêt (code ${serverProcess.exitCode}).`,
      );
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/health`);

      if (response.ok) {
        const data = await response.json();

        if (data.success === true && response.headers.get("x-request-id")) {
          return;
        }
      }
    } catch {
      // Le serveur n'écoute pas encore.
    }

    await wait(250);
  }

  throw new Error(
    `Le serveur de test n'a pas répondu sur ${apiBaseUrl}/api/health dans le délai imparti.`,
  );
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    wait(5000).then(() => false),
  ]);

  if (!exited && child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function main() {
  const { testTarget } = loadTestEnv();
  const apiBaseUrl = process.env.API_BASE_URL.replace(/\/$/, "");
  const testFiles = process.argv.slice(2);

  if (testFiles.length === 0) {
    throw new Error(
      "Aucun fichier de test fourni. Exemple : node scripts/runIntegrationTests.js tests/api.test.js",
    );
  }

  const allowRemote = process.env.TEST_ALLOW_REMOTE_API === "true";
  let serverProcess = null;

  try {
    if (!allowRemote) {
      const parsed = new URL(apiBaseUrl);
      const port = parsed.port || "80";

      console.log(
        `[test-runner] Démarrage du serveur de test sur ${apiBaseUrl} (base ${testTarget.database}).`,
      );

      serverProcess = spawn(process.execPath, ["src/server.js"], {
        cwd: BACKEND_ROOT,
        env: {
          ...process.env,
          NODE_ENV: "test",
          HOST: "127.0.0.1",
          PORT: port,
        },
        stdio: "inherit",
      });

      // Laisser au processus le temps de signaler un port déjà occupé.
      await wait(500);
      await waitForHealth(apiBaseUrl, serverProcess);
    } else {
      console.log(
        `[test-runner] API distante explicitement autorisée : ${apiBaseUrl}`,
      );
    }

    const result = await runProcess(
      process.execPath,
      ["--test", ...testFiles],
      {
        cwd: BACKEND_ROOT,
        env: process.env,
        stdio: "inherit",
      },
      TEST_TIMEOUT_MS,
    );

    if (result.code !== 0) {
      process.exitCode = result.code || 1;
    }
  } finally {
    await stopProcess(serverProcess);
  }
}

main().catch((error) => {
  console.error(`[test-runner] ÉCHEC : ${error.message}`);
  process.exitCode = 1;
});
