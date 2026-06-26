const walletService = require("../services/wallet.service");
const { createWalletSchema, updateWalletSchema } = require("../validators/wallet.validator");

async function createWallet(req, res, next) {
  try {
    const { error, value } = createWalletSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const wallet = await walletService.createWallet(value.owner, value.balance);
    return res.status(201).json(wallet);
  } catch (err) {
    next(err);
  }
}

async function getWallet(req, res, next) {
  try {
    const wallet = await walletService.getWallet(req.params.id);
    return res.status(200).json(wallet);
  } catch (err) {
    next(err);
  }
}

async function updateWallet(req, res, next) {
  try {
    const { error, value } = updateWalletSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const wallet = await walletService.applyDelta(req.params.id, value.delta);
    return res.status(200).json(wallet);
  } catch (err) {
    next(err);
  }
}

module.exports = { createWallet, getWallet, updateWallet };