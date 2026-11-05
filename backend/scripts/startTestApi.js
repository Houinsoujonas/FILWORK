const { loadTestEnv, maskTarget } = require("./testDatabaseGuard");

const { testTarget } = loadTestEnv();

console.log(`[test-api] Base de test : ${maskTarget(testTarget)}`);
console.log(`[test-api] API locale : ${process.env.API_BASE_URL}`);

require("../src/server");
