const Joi = require("joi");

const createWalletSchema = Joi.object({
  owner: Joi.string().trim().min(1).required(),
  balance: Joi.number().integer().min(0).default(0),
});

const updateWalletSchema = Joi.object({
  delta: Joi.number().integer().not(0).required(), // +ve or -ve, never 0
});

module.exports = { createWalletSchema, updateWalletSchema };