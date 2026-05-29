import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { clients } from "./schema/clients.js";
import { projects } from "./schema/projects.js";
import { timeEntries } from "./schema/time-entries.js";
import { invoices } from "./schema/invoices.js";

export const clientSelectSchema = createSelectSchema(clients);
export const clientInsertSchema = createInsertSchema(clients);
export const projectSelectSchema = createSelectSchema(projects);
export const projectInsertSchema = createInsertSchema(projects);
export const timeEntrySelectSchema = createSelectSchema(timeEntries);
export const timeEntryInsertSchema = createInsertSchema(timeEntries);
export const invoiceSelectSchema = createSelectSchema(invoices);
export const invoiceInsertSchema = createInsertSchema(invoices);
