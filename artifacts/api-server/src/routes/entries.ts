import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, timeEntries } from "@workspace/db";
import { z } from "zod";
import { validateBody, parseIdParam } from "../middleware/validate.js";
import { serializeTimeEntry, toNumber } from "../utils/serialize.js";

const updateEntrySchema = z.object({
  description: z.string().nullable().optional(),
  hours: z.number().positive().optional(),
  loggedAt: z.string().optional(),
});

export const entriesRouter = Router();

entriesRouter.patch(
  "/:id",
  validateBody(updateEntrySchema),
  async (req, res) => {
    const id = parseIdParam(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const existing = await db.query.timeEntries.findFirst({
      where: eq(timeEntries.id, id),
      with: { project: { with: { client: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: "Time entry not found" });
      return;
    }

    const body = req.body as z.infer<typeof updateEntrySchema>;
    const updates: Record<string, unknown> = {};
    if (body.description !== undefined) updates.description = body.description;
    if (body.hours !== undefined) updates.hours = String(body.hours);
    if (body.loggedAt !== undefined) updates.loggedAt = body.loggedAt;

    const [updated] = await db
      .update(timeEntries)
      .set(updates)
      .where(eq(timeEntries.id, id))
      .returning();

    const rate = toNumber(existing.project.client.hourlyRate);
    res.json(
      serializeTimeEntry(
        updated,
        Math.round(toNumber(updated.hours) * rate * 100) / 100,
      ),
    );
  },
);

entriesRouter.delete("/:id", async (req, res) => {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(timeEntries)
    .where(eq(timeEntries.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }

  res.status(204).send();
});
