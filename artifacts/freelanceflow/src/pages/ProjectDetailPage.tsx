import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListProjects,
  useCreateProjectEntry,
  useUpdateEntry,
  useDeleteEntry,
  useCreateProjectInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  getListProjectEntriesQueryOptions,
  getListProjectInvoicesQueryOptions,
  getGetNextInvoiceNumberQueryOptions,
  getListProjectEntriesQueryKey,
  getListProjectInvoicesQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const project = projects?.find((p) => p.id === projectId);

  const entriesQuery = useQuery({
    ...getListProjectEntriesQueryOptions(projectId),
    enabled: Number.isFinite(projectId),
  });
  const invoicesQuery = useQuery({
    ...getListProjectInvoicesQueryOptions(projectId),
    enabled: Number.isFinite(projectId),
  });
  const nextNumberQuery = useQuery({
    ...getGetNextInvoiceNumberQueryOptions(),
    enabled: invoiceOpen,
  });
  const entries = entriesQuery.data;
  const entriesLoading = entriesQuery.isLoading;
  const invoices = invoicesQuery.data;
  const invoicesLoading = invoicesQuery.isLoading;
  const nextNumber = nextNumberQuery.data;

  const createEntry = useCreateProjectEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListProjectEntriesQueryKey(projectId),
        });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setEntryFormOpen(false);
      },
    },
  });

  const updateEntry = useUpdateEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListProjectEntriesQueryKey(projectId),
        });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
    },
  });

  const deleteEntry = useDeleteEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListProjectEntriesQueryKey(projectId),
        });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
    },
  });

  const createInvoice = useCreateProjectInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListProjectInvoicesQueryKey(projectId),
        });
        setInvoiceOpen(false);
      },
    },
  });

  const updateInvoice = useUpdateInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListProjectInvoicesQueryKey(projectId),
        });
      },
    },
  });

  const deleteInvoice = useDeleteInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListProjectInvoicesQueryKey(projectId),
        });
      },
    },
  });

  if (projectsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="This project may have been deleted."
      />
    );
  }

  const earned = project.earnedAmount;
  const agreed = project.agreedAmount;
  const progress =
    agreed != null && agreed > 0
      ? Math.min(100, (earned / agreed) * 100)
      : 100;

  const unbilledSubtotal =
    entries?.reduce((sum, e) => sum + (e.calculatedValue ?? 0), 0) ?? 0;

  const statusVariant = (status: string) => {
    if (status === "paid") return "success";
    if (status === "sent") return "warning";
    return "secondary";
  };

  return (
    <div className="space-y-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.clientName}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{project.status}</Badge>
            <Badge variant="outline" className="capitalize">
              {project.billingType}
            </Badge>
            {agreed != null && (
              <Badge variant="secondary">
                Budget: {formatCurrency(agreed)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profitability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Earned: {formatCurrency(earned)}</span>
            {agreed != null && <span>Budget: {formatCurrency(agreed)}</span>}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                agreed != null && earned > agreed
                  ? "bg-red-500"
                  : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Time entries</h2>
          <Dialog open={entryFormOpen} onOpenChange={setEntryFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log time</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  createEntry.mutate({
                    id: projectId,
                    data: {
                      description: String(fd.get("description") || ""),
                      hours: Number(fd.get("hours")),
                      loggedAt: String(fd.get("loggedAt")),
                    },
                  });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="loggedAt">Date</Label>
                  <Input
                    id="loggedAt"
                    name="loggedAt"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    name="hours"
                    type="number"
                    min={0.25}
                    step={0.25}
                    required
                  />
                </div>
                <Button type="submit" disabled={createEntry.isPending}>
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {entriesLoading ? (
          <Skeleton className="h-48" />
        ) : !entries?.length ? (
          <EmptyState
            title="No time logged"
            description="Add your first time entry for this project."
            actionLabel="Add entry"
            onAction={() => setEntryFormOpen(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.loggedAt)}</TableCell>
                  <TableCell>{entry.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{entry.hours}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(entry.calculatedValue ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const hours = prompt("Hours", String(entry.hours));
                        if (hours)
                          updateEntry.mutate({
                            id: entry.id,
                            data: { hours: Number(hours) },
                          });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete entry?"))
                          deleteEntry.mutate({ id: entry.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invoices</h2>
          <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create invoice</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  createInvoice.mutate({
                    id: projectId,
                    data: {
                      invoiceNumber: String(fd.get("invoiceNumber")),
                      subtotal: Number(fd.get("subtotal")),
                      notes: String(fd.get("notes") || "") || undefined,
                      dueAt: String(fd.get("dueAt") || "") || undefined,
                    },
                  });
                }}
              >
                <div className="space-y-2">
                  <Label>Invoice number</Label>
                  <Input
                    name="invoiceNumber"
                    readOnly
                    defaultValue={nextNumber?.invoiceNumber ?? "FL-001"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtotal (from unbilled time)</Label>
                  <Input
                    name="subtotal"
                    type="number"
                    step={0.01}
                    defaultValue={unbilledSubtotal.toFixed(2)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueAt">Due date</Label>
                  <Input id="dueAt" name="dueAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" />
                </div>
                <Button type="submit" disabled={createInvoice.isPending}>
                  Create draft
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {invoicesLoading ? (
          <Skeleton className="h-32" />
        ) : !invoices?.length ? (
          <EmptyState
            title="No invoices"
            description="Create an invoice from your logged time."
            actionLabel="Add invoice"
            onAction={() => setInvoiceOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{inv.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Issued {formatDate(inv.issuedAt)}
                      {inv.dueAt && ` · Due ${formatDate(inv.dueAt)}`}
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {formatCurrency(inv.subtotal)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(inv.status)}>
                      {inv.status}
                    </Badge>
                    {inv.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateInvoice.mutate({
                            id: inv.id,
                            data: { status: "sent" },
                          })
                        }
                      >
                        Mark sent
                      </Button>
                    )}
                    {inv.status === "sent" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateInvoice.mutate({
                            id: inv.id,
                            data: { status: "paid" },
                          })
                        }
                      >
                        Mark paid
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/invoices/${inv.id}/print`} target="_blank">
                        <Printer className="h-4 w-4" />
                        Print
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete invoice?"))
                          deleteInvoice.mutate({ id: inv.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
