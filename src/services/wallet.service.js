const prisma = require("../config/prisma");

const MAX_RETRIES = 15;

// Create a new wallet
async function createWallet(owner, initialBalance = 0) {
  const wallet = await prisma.wallet.create({
    data: { owner, balance: initialBalance },
  });
  return wallet;
}

// Read a wallet by ID
async function getWallet(id) {
  const wallet = await prisma.wallet.findUnique({ where: { id } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  return wallet;
}

// applying delta (new rupess which will be added to current balance)
async function applyDelta(id, delta) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Read current state
    const wallet = await prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    const newBalance = wallet.balance + delta;
    if (newBalance < 0) throw new Error("INSUFFICIENT_BALANCE");
    const updated = await prisma.wallet.updateMany({
      where: {
        id,
        version: wallet.version, 
      },
      data: {
        balance: newBalance,
        version: wallet.version + 1,
      },
    });

    if (updated.count === 1) {
      return await prisma.wallet.findUnique({ where: { id } });
    }
    await new Promise((res) => setTimeout(res, Math.random() * 100 + 50));
  }

  throw new Error("MAX_RETRIES_EXCEEDED");
}

module.exports = { createWallet, getWallet, applyDelta };