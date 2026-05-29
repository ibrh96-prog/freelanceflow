import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGetInvoiceQueryOptions } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { data: invoice, isLoading, isError } = useQuery({
    ...getGetInvoiceQueryOptions(invoiceId),
    enabled: Number.isFinite(invoiceId),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invoice not found
      </div>
    );
  }

  const isPaid = invoice.status === "paid";

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white print:text-black">
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="no-print fixed right-4 top-4 z-50">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Print invoice
        </button>
      </div>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10 flex justify-between border-b border-slate-200 pb-8">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">
              Your Business Name
            </h1>
            <p className="mt-1 text-sm text-slate-500">FreelanceFlow Invoice</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{invoice.invoiceNumber}</p>
            <p
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                isPaid
                  ? "bg-emerald-100 text-emerald-800"
                  : invoice.status === "sent"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {isPaid ? "Paid" : invoice.status === "sent" ? "Outstanding" : "Draft"}
            </p>
          </div>
        </header>

        <div className="mb-10 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Bill to</p>
            <p className="mt-1 text-lg font-semibold">{invoice.client.name}</p>
            {invoice.client.email && (
              <p className="text-slate-600">{invoice.client.email}</p>
            )}
            {invoice.client.company && (
              <p className="text-slate-600">{invoice.client.company}</p>
            )}
          </div>
          <div className="text-sm sm:text-right">
            <p>
              <span className="text-slate-500">Issued:</span>{" "}
              {formatDate(invoice.issuedAt)}
            </p>
            {invoice.dueAt && (
              <p>
                <span className="text-slate-500">Due:</span>{" "}
                {formatDate(invoice.dueAt)}
              </p>
            )}
            {invoice.paidAt && (
              <p>
                <span className="text-slate-500">Paid:</span>{" "}
                {formatDate(invoice.paidAt)}
              </p>
            )}
            <p className="mt-2">
              <span className="text-slate-500">Project:</span> {invoice.project.name}
            </p>
          </div>
        </div>

        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-left">
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Hours</th>
              <th className="py-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right">{item.hours}</td>
                <td className="py-3 text-right">
                  {formatCurrency(item.rate, invoice.client.currency)}
                </td>
                <td className="py-3 text-right">
                  {formatCurrency(item.subtotal, invoice.client.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <div className="text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-3xl font-bold">
              {formatCurrency(invoice.subtotal, invoice.client.currency)}
            </p>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-10 rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-700">Notes</p>
            <p className="mt-1 text-slate-600">{invoice.notes}</p>
          </div>
        )}
      </article>
    </div>
  );
}
