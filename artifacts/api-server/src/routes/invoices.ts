import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, invoices, projects } from "@workspace/db";
import { z } from "zod";
import { validateBody, parseIdParam } from "../middleware/validate.js";
import {
  serializeInvoice,
  serializeClient,
  serializeProject,
  toNumber,
} from "../utils/serialize.js";
import { getNextInvoiceNumber } from "../services/metrics.js";

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  notes: z.string().optional(),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  entryIds: z.array(z.number()).optional(),
});

const updateInvoiceSchema = z.object({
  status: z.enum(["draft", "sent", "paid"]).optional(),
  notes: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
});

export const invoicesRouter = Router();

invoicesRouter.get("/next-number", async (_req, res) => {
  const invoiceNumber = await getNextInvoiceNumber();
  res.json({ invoiceNumber });
});

invoicesRouter.get("/:id", async (req, res) => {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: {
      project: { with: { client: true, timeEntries: true } },
    },
  });

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const rate = toNumber(invoice.project.client.hourlyRate);
  const lineItems = invoice.project.timeEntries.map((entry) => {
    const hours = toNumber(entry.hours);
    return {
      description: entry.description ?? "Professional services",
      hours,
      rate,
      subtotal: Math.round(hours * rate * 100) / 100,
    };
  });

  res.json({
    ...serializeInvoice(invoice),
    client: serializeClient(invoice.project.client),
    project: serializeProject(invoice.project),
    lineItems,
  });
});

invoicesRouter.patch(
  "/:id",
  validateBody(updateInvoiceSchema),
  async (req, res) => {
    const id = parseIdParam(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const body = req.body as z.infer<typeof updateInvoiceSchema>;
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "paid" && body.paidAt === undefined) {
        updates.paidAt = new Date().toISOString().slice(0, 10);
      }
    }
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.dueAt !== undefined) updates.dueAt = body.dueAt;
    if (body.paidAt !== undefined) updates.paidAt = body.paidAt;

    const [updated] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    res.json(serializeInvoice(updated));
  },
);

invoicesRouter.delete("/:id", async (req, res) => {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(invoices)
    .where(eq(invoices.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.status(204).send();
});

// Project nested invoices - mounted separately
export const projectInvoicesRouter = Router({ mergeParams: true });

projectInvoicesRouter.get("/", async (req, res) => {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const projectInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, id));

  res.json(projectInvoices.map(serializeInvoice));
});

projectInvoicesRouter.post(
  "/",
  validateBody(createInvoiceSchema),
  async (req, res) => {
    const id = parseIdParam(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: { client: true, timeEntries: true },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const body = req.body as z.infer<typeof createInvoiceSchema>;
    const rate = toNumber(project.client.hourlyRate);

    let subtotal = body.subtotal;
    if (subtotal === undefined) {
      const entries = body.entryIds?.length
        ? project.timeEntries.filter((e) => body.entryIds!.includes(e.id))
        : project.timeEntries;
      subtotal = entries.reduce(
        (sum, e) => sum + toNumber(e.hours) * rate,
        0,
      );
      subtotal = Math.round(subtotal * 100) / 100;
    }

    const invoiceNumber =
      body.invoiceNumber ?? (await getNextInvoiceNumber());

    const [created] = await db
      .insert(invoices)
      .values({
        projectId: id,
        invoiceNumber,
        status: "draft",
        subtotal: String(subtotal),
        notes: body.notes ?? null,
        issuedAt: body.issuedAt ?? new Date().toISOString().slice(0, 10),
        dueAt: body.dueAt ?? null,
      })
      .returning();

    res.status(201).json(serializeInvoice(created));
  },
);
