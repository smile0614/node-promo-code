import express from "express";
import { env } from "./env";
import { promoCodesRouter } from "./routes/promoCodes";
import { activationsRouter } from "./routes/activations";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/promo-codes", promoCodesRouter);
app.use("/activations", activationsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(env.PORT, () => {
  console.log(`Server started on port ${env.PORT}`);
});
