function errorMiddleware(err, req, res, next) {
  console.error(err.message);

  if (err.message === "WALLET_NOT_FOUND")
    return res.status(404).json({ error: "Wallet not found" });

  if (err.message === "INSUFFICIENT_BALANCE")
    return res.status(400).json({ error: "Insufficient balance" });

  if (err.message === "MAX_RETRIES_EXCEEDED")
    return res.status(409).json({ error: "Too much contention, try again" });

  return res.status(500).json({ error: "Internal server error" });
}

module.exports = errorMiddleware;