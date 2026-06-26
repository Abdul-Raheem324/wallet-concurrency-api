const express = require("express");
const cors = require("cors");

const walletRoutes = require("./routes/wallet.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/wallets", walletRoutes);

module.exports = app;