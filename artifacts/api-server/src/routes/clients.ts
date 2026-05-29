import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, clients, projects, invoices } from "@workspace/db";
import { z } from "zod";
import { validateBody, parseIdParam } from "../middleware/validate.js";
import { serializeClient, toNumber } from "../utils/serialize.js";

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  company: z.string().nullable().optional(),
  hourlyRate: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
});

export const clientsRouter = Router();

clientsRouter.get("/", async (_req, res) => {
  const allClients = await db.select().from(clients);

  const result = await Promise.all(
    allClients.map(async (client) => {
      const clientProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.clientId, client.id));

      const activeProjectCount = clientProjects.filter(
        (p) => p.status === "active",
      ).length;

      let totalBilled = 0;
      for (const project of clientProjects) {
        const projectInvoices = await db
          .select()
          .from(invoices)
          .where(eq(invoices.projectId, project.id));
        totalBilled += projectInvoices.reduce(
          (sum, inv) =>
            inv.status === "paid" ? sum + toNumber(inv.subtotal) : sum,
          0,
        );
      }

      return {
        ...serializeClient(client),
        activeProjectCount,
        totalBilled: Math.round(totalBilled * 100) / 100,
      };
    }),
  );

  res.json(result);
});

clientsRouter.post(
  "/",
  validateBody(createClientSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof createClientSchema>;
    const [created] = await db
      .insert(clients)
      .values({
        name: body.name,
        email: body.email ?? null,
        company: body.company ?? null,
        hourlyRate: String(body.hourlyRate ?? 0),
        currency: body.currency ?? "USD",
      })
      .returning();

    res.status(201).json(serializeClient(created));
  },
);

clientsRouter.patch(
  "/:id",
  validateBody(updateClientSchema),
  async (req, res) => {
    const id = parseIdParam(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const body = req.body as z.infer<typeof updateClientSchema>;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.company !== undefined) updates.company = body.company;
    if (body.hourlyRate !== undefined)
      updates.hourlyRate = String(body.hourlyRate);
    if (body.currency !== undefined) updates.currency = body.currency;

    const [updated] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.json(serializeClient(updated));
  },
);

clientsRouter.delete("/:id", async (req, res) => {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(clients)
    .where(eq(clients.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.status(204).send();
});
