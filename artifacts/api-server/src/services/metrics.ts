import { db, invoices } from "@workspace/db";
import { sql } from "drizzle-orm";
import { toNumber } from "../utils/serialize.js";

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatMonth(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export async function getSummary() {
  const now = new Date();
  const thisMonthStart = monthStart(now);
  const nextMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  );

  const allProjects = await db.query.projects.findMany({
    with: {
      client: true,
      timeEntries: true,
      invoices: true,
    },
  });

  const activeProjectCount = allProjects.filter(
    (p) => p.status === "active",
  ).length;

  let totalHoursThisMonth = 0;
  let totalEarnedThisMonth = 0;
  let totalOutstanding = 0;

  const clientRevenue = new Map<number, { name: string; amount: number }>();

  const projectProfitability = allProjects.map((project) => {
    const rate = toNumber(project.client.hourlyRate);
    const hoursLogged = project.timeEntries.reduce(
      (sum, e) => sum + toNumber(e.hours),
      0,
    );

    const timeValue = project.timeEntries.reduce(
      (sum, e) => sum + toNumber(e.hours) * rate,
      0,
    );

    const invoicedPaid = project.invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + toNumber(i.subtotal), 0);

    const earnedAmount =
      project.billingType === "fixed"
        ? Math.max(invoicedPaid, timeValue)
        : timeValue;

    for (const entry of project.timeEntries) {
      const logged = new Date(entry.loggedAt as string);
      if (logged >= thisMonthStart && logged < nextMonthStart) {
        totalHoursThisMonth += toNumber(entry.hours);
      }
    }

    for (const invoice of project.invoices) {
      const issued = new Date(invoice.issuedAt as string);
      if (invoice.status === "paid" && invoice.paidAt) {
        const paid = new Date(invoice.paidAt as string);
        if (paid >= thisMonthStart && paid < nextMonthStart) {
          totalEarnedThisMonth += toNumber(invoice.subtotal);
        }
        const existing = clientRevenue.get(project.clientId) ?? {
          name: project.client.name,
          amount: 0,
        };
        existing.amount += toNumber(invoice.subtotal);
        clientRevenue.set(project.clientId, existing);
      } else if (invoice.status === "sent" && issued >= thisMonthStart) {
        totalEarnedThisMonth += toNumber(invoice.subtotal);
      }

      if (invoice.status === "sent") {
        totalOutstanding += toNumber(invoice.subtotal);
      }
    }

    return {
      id: project.id,
      name: project.name,
      client: project.client.name,
      billingType: project.billingType,
      earnedAmount: Math.round(earnedAmount * 100) / 100,
      agreedAmount:
        project.agreedAmount !== null
          ? toNumber(project.agreedAmount)
          : null,
      hoursLogged: Math.round(hoursLogged * 100) / 100,
    };
  });

  let topClientByRevenue: { name: string; amount: number } | null = null;
  for (const [, data] of clientRevenue) {
    if (!topClientByRevenue || data.amount > topClientByRevenue.amount) {
      topClientByRevenue = {
        name: data.name,
        amount: Math.round(data.amount * 100) / 100,
      };
    }
  }

  const revenueByMonth: { month: string; amount: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = monthStart(d);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    let amount = 0;

    for (const project of allProjects) {
      for (const invoice of project.invoices) {
        if (invoice.status !== "paid" || !invoice.paidAt) continue;
        const paid = new Date(invoice.paidAt as string);
        if (paid >= start && paid < end) {
          amount += toNumber(invoice.subtotal);
        }
      }
    }

    revenueByMonth.push({
      month: formatMonth(d),
      amount: Math.round(amount * 100) / 100,
    });
  }

  return {
    totalEarnedThisMonth: Math.round(totalEarnedThisMonth * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    activeProjectCount,
    totalHoursThisMonth: Math.round(totalHoursThisMonth * 100) / 100,
    topClientByRevenue,
    revenueByMonth,
    projectProfitability,
  };
}

export async function getNextInvoiceNumber(): Promise<string> {
  const result = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .orderBy(sql`${invoices.id} DESC`)
    .limit(1);

  if (result.length === 0) return "FL-001";

  const last = result[0].invoiceNumber;
  const match = last.match(/FL-(\d+)/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;
  return `FL-${String(num).padStart(3, "0")}`;
}
