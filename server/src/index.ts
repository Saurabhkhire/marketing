import "dotenv/config";
import cors from "cors";
import express from "express";
import { apifyRouter } from "./routes/apify.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { sponsorsRouter } from "./routes/sponsors.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "marketing-api", ts: new Date().toISOString() });
});

app.use("/api/sponsors", sponsorsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/apify", apifyRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API http://localhost:${port}`);
  });
}
