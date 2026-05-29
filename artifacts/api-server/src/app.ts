import express from "express";
import cors from "cors";
import { clientsRouter } from "./routes/clients.js";
import { projectsRouter } from "./routes/projects.js";
import { entriesRouter } from "./routes/entries.js";
import {
  invoicesRouter,
  projectInvoicesRouter,
} from "./routes/invoices.js";
import { getSummary } from "./services/metrics.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/api/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/summary", async (_req, res) => {
    const summary = await getSummary();
    res.json(summary);
  });

  app.use("/api/clients", clientsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:id/invoices", projectInvoicesRouter);
  app.use("/api/entries", entriesRouter);
  app.use("/api/invoices", invoicesRouter);

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

  return app;
}
