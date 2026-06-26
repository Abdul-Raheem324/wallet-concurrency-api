const axios = require("axios");

const BASE_URL = "http://localhost:5000/api/wallet";
const WORKERS = parseInt(process.argv[2]) || 50;
const DELTA = 10;
const INITIAL_BALANCE = 0;

async function runLoadTest() {
  console.log("Starting load test...\n");

  // Step 1: Creating a fresh waller
  const createRes = await axios.post(BASE_URL, {
    owner: "LoadTestUser",
    balance: INITIAL_BALANCE,
  });
  const walletId = createRes.data.id;
  console.log(`Wallet created: ${walletId}`);
  console.log(`Starting balance: ${INITIAL_BALANCE}`);
  console.log(`Workers: ${WORKERS}`);
  console.log(`Delta per worker: +${DELTA}`);
  console.log(`Expected final balance: ${INITIAL_BALANCE + WORKERS * DELTA}\n`);

  // Step 2: Fire 50 concurrent PATCH requests
  const start = Date.now();

  const workers = Array.from({ length: WORKERS }, (_, i) =>
    axios
      .patch(`${BASE_URL}/${walletId}`, { delta: DELTA })
      .then((res) => ({ success: true, balance: res.data.balance, worker: i + 1 }))
      .catch((err) => ({ success: false, error: err.response?.data?.error, worker: i + 1 }))
  );

  const results = await Promise.all(workers);
  const duration = Date.now() - start;

  // Step 3: Analyse results
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`⏱  Completed in ${duration}ms`);
  console.log(` Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);

  // Step 4: Read final balance
  const finalRes = await axios.get(`${BASE_URL}/${walletId}`);
  const finalBalance = finalRes.data.balance;
  const expectedBalance = INITIAL_BALANCE + succeeded * DELTA;

  console.log(`\nFinal balance:    ${finalBalance}`);
  console.log(`Expected balance: ${expectedBalance}`);

  // Step 5: Correctness assertion
  if (finalBalance === expectedBalance) {
    console.log("\nCORRECTNESS TEST PASSED — No data loss or corruption");
  } else {
    console.log("\nCORRECTNESS TEST FAILED — Data corruption detected!");
    console.log(`   Lost: ${expectedBalance - finalBalance}`);
    process.exit(1);
  }
}

runLoadTest().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});