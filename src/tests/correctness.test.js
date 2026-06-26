const axios = require("axios");

const BASE_URL = "http://localhost:5000/api/wallet";

async function runCorrectnessTest() {
  console.log("🧪 Running Correctness Test...\n");

  const INITIAL_BALANCE = 1000;
  const operations = [
    { delta: 200 },   // +200
    { delta: -150 },  // -150
    { delta: 500 },   // +500
    { delta: -300 },  // -300
    { delta: 100 },   // +100
  ];

  const expectedFinal =
    INITIAL_BALANCE + operations.reduce((sum, op) => sum + op.delta, 0);

  console.log(`   Initial balance:  ${INITIAL_BALANCE}`);
  console.log(`   Operations:       ${operations.map((o) => o.delta).join(", ")}`);
  console.log(`   Expected final:   ${expectedFinal}\n`);

  const createRes = await axios.post(BASE_URL, {
    owner: "CorrectnessTestUser",
    balance: INITIAL_BALANCE,
  });
  const walletId = createRes.data.id;

  for (const op of operations) {
    await axios.patch(`${BASE_URL}/${walletId}`, { delta: op.delta });
  }

  const finalRes = await axios.get(`${BASE_URL}/${walletId}`);
  const actualFinal = finalRes.data.balance;

  console.log(`   Actual final:     ${actualFinal}`);

  if (actualFinal === expectedFinal) {
    console.log("\n CORRECTNESS TEST PASSED");
  } else {
    console.log("\nCORRECTNESS TEST FAILED");
    console.log(`   Expected: ${expectedFinal}, Got: ${actualFinal}`);
    process.exit(1);
  }
}

runCorrectnessTest().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});