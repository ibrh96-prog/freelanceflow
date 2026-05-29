import type {
  Client,
  Invoice,
  Project,
  TimeEntry,
} from "@workspace/db";

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : parseFloat(value);
}

export function serializeClient(client: Client) {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    company: client.company,
    hourlyRate: toNumber(client.hourlyRate),
    currency: client.currency,
    createdAt: client.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function serializeProject(project: Project) {
  return {
    id: project.id,
    clientId: project.clientId,
    name: project.name,
    description: project.description,
    status: project.status as "active" | "paused" | "completed",
    billingType: project.billingType as "hourly" | "fixed",
    agreedAmount:
      project.agreedAmount !== null ? toNumber(project.agreedAmount) : null,
    createdAt: project.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function serializeTimeEntry(
  entry: TimeEntry,
  calculatedValue?: number,
) {
  return {
    id: entry.id,
    projectId: entry.projectId,
    description: entry.description,
    hours: toNumber(entry.hours),
    loggedAt:
      typeof entry.loggedAt === "string"
        ? entry.loggedAt
        : (entry.loggedAt as Date).toISOString().slice(0, 10),
    createdAt: entry.createdAt?.toISOString() ?? new Date().toISOString(),
    ...(calculatedValue !== undefined ? { calculatedValue } : {}),
  };
}

export function serializeInvoice(invoice: Invoice) {
  return {
    id: invoice.id,
    projectId: invoice.projectId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status as "draft" | "sent" | "paid",
    subtotal: toNumber(invoice.subtotal),
    notes: invoice.notes,
    issuedAt:
      typeof invoice.issuedAt === "string"
        ? invoice.issuedAt
        : (invoice.issuedAt as Date).toISOString().slice(0, 10),
    dueAt: invoice.dueAt
      ? typeof invoice.dueAt === "string"
        ? invoice.dueAt
        : (invoice.dueAt as Date).toISOString().slice(0, 10)
      : null,
    paidAt: invoice.paidAt
      ? typeof invoice.paidAt === "string"
        ? invoice.paidAt
        : (invoice.paidAt as Date).toISOString().slice(0, 10)
      : null,
    createdAt: invoice.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}
