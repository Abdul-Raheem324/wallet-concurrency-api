const express = require("express");
const cors = require("cors");
const walletRoutes = require("./routes/wallet.routes");
const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/wallet", walletRoutes);


app.use(errorMiddleware);

module.exports = app;