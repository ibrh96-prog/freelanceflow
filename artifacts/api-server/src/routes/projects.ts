import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, projects, timeEntries } from "@workspace/db";
import { z } from "zod";
import { validateBody, parseIdParam } from "../middleware/validate.js";
import {
  serializeProject,
  serializeTimeEntry,
  toNumber,
} from "../utils/serialize.js";

const createProjectSchema = z.object({
  clientId: z.coerce.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "completed"]).optional(),
  billingType: z.enum(["hourly", "fixed"]).optional(),
  agreedAmount: z.coerce.number().positive().nullable().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "paused", "completed"]).optional(),
  billingType: z.enum(["hourly", "fixed"]).optional(),
  agreedAmount: z.number().positive().nullable().optional(),
});

export const projectsRouter = Router();

projectsRouter.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const clientId = req.query.clientId
    ? Number(req.query.clientId)
    : undefined;

  const allProjects = await db.query.projects.findMany({
    with: { client: true, timeEntries: true },
  });

  let filtered = allProjects;
  if (status) filtered = filtered.filter((p) => p.status === status);
  if (clientId)
    filtered = filtered.filter((p) => p.clientId === clientId);

  const result = filtered.map((project) => {
    const rate = toNumber(project.client.hourlyRate);
    const totalHours = project.timeEntries.reduce(
      (sum, e) => sum + toNumber(e.hours),
      0,
    );
    const earnedAmount = project.timeEntries.reduce(
      (sum, e) => sum + toNumber(e.hours) * rate,
      0,
    );

    return {
      ...serializeProject(project),
      clientName: project.client.name,
      totalHours: Math.round(totalHours * 100) / 100,
      earnedAmount: Math.round(earnedAmount * 100) / 100,
    };
  });

  res.json(result);
});

projectsRouter.post(
  "/",
  validateBody(createProjectSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof createProjectSchema>;

    const [created] = await db
      .insert(projects)
      .values({
        clientId: body.clientId,
        name: body.name,
        description: body.description ?? null,
        status: body.status ?? "active",
        billingType: body.billingType ?? "hourly",
        agreedAmount:
          body.agreedAmount != null ? String(body.agreedAmount) : null,
      })
      .returning();

    res.status(201).json(serializeProject(created));
  },
);

projectsRouter.get("/:id", async (req, res) => {
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

  const rate = toNumber(project.client.hourlyRate);
  const totalHours = project.timeEntries.reduce(
    (sum, e) => sum + toNumber(e.hours),
    0,
  );
  const earnedAmount = project.timeEntries.reduce(
    (sum, e) => sum + toNumber(e.hours) * rate,
    0,
  );

  res.json({
    ...serializeProject(project),
    clientName: project.client.name,
    totalHours: Math.round(totalHours * 100) / 100,
    earnedAmount: Math.round(earnedAmount * 100) / 100,
  });
});

projectsRouter.patch(
  "/:id",
  validateBody(updateProjectSchema),
  async (req, res) => {
    const id = parseIdParam(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const body = req.body as z.infer<typeof updateProjectSchema>;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.billingType !== undefined) updates.billingType = body.billingType;
    if (body.agreedAmount !== undefined)
      updates.agreedAmount =
        body.agreedAmount !== null ? String(body.agreedAmount) : null;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(serializeProject(updated));
  },
);

projectsRouter.delete("/:id", async (req, res) => {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.status(204).send();
});

// Time entries nested under projects
projectsRouter.get("/:id/entries", async (req, res) => {
  const id = parseIdParam(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { client: true },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const entries = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.projectId, id));

  const rate = toNumber(project.client.hourlyRate);
  res.json(
    entries.map((e) =>
      serializeTimeEntry(e, Math.round(toNumber(e.hours) * rate * 100) / 100),
    ),
  );
});

const createEntrySchema = z.object({
  description: z.string().optional(),
  hours: z.number().positive(),
  loggedAt: z.string().optional(),
});

projectsRouter.post(
  "/:id/entries",
  validateBody(createEntrySchema),
  async (req, res) => {
    const id = parseIdParam(req);
    if (id === null) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: { client: true },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const body = req.body as z.infer<typeof createEntrySchema>;
    const [created] = await db
      .insert(timeEntries)
      .values({
        projectId: id,
        description: body.description ?? null,
        hours: String(body.hours),
        loggedAt: body.loggedAt ?? new Date().toISOString().slice(0, 10),
      })
      .returning();

    const rate = toNumber(project.client.hourlyRate);
    res
      .status(201)
      .json(
        serializeTimeEntry(
          created,
          Math.round(toNumber(created.hours) * rate * 100) / 100,
        ),
      );
  },
);
