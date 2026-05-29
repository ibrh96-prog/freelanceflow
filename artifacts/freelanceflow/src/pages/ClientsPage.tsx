import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  getListClientsQueryKey,
  useListProjects,
} from "@workspace/api-client-react";
import type { ClientWithStats } from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ClientsPage() {
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useListClients();
  const { data: projects } = useListProjects();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<ClientWithStats | null>(null);
  const [editing, setEditing] = useState<ClientWithStats | null>(null);

  const createMutation = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setSheetOpen(false);
      },
    },
  });

  const updateMutation = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setSheetOpen(false);
        setEditing(null);
      },
    },
  });

  const deleteMutation = useDeleteClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setDetailClient(null);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      email: String(fd.get("email") || "") || undefined,
      company: String(fd.get("company") || "") || undefined,
      hourlyRate: Number(fd.get("hourlyRate") || 0),
      currency: String(fd.get("currency") || "USD"),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const clientProjects =
    detailClient && projects
      ? projects.filter((p) => p.clientId === detailClient.id)
      : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Sheet
          open={sheetOpen}
          onOpenChange={(o) => {
            setSheetOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <SheetTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editing ? "Edit Client" : "New Client"}</SheetTitle>
            </SheetHeader>
            <ClientForm
              key={editing?.id ?? "new"}
              defaultValues={editing}
              onSubmit={handleSubmit}
              isPending={createMutation.isPending || updateMutation.isPending}
            />
          </SheetContent>
        </Sheet>
      </div>

      {!clients?.length ? (
        <EmptyState
          title="No clients yet"
          description="Add your first client to start tracking projects and invoices."
          actionLabel="Add Client"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Active Projects</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => setDetailClient(client)}
              >
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.company ?? "—"}</TableCell>
                <TableCell>{client.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(client.hourlyRate, client.currency)}/hr
                </TableCell>
                <TableCell className="text-right">
                  {client.activeProjectCount}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(client);
                      setSheetOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this client and all related data?")) {
                        deleteMutation.mutate({ id: client.id });
                      }
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

      <Sheet open={!!detailClient} onOpenChange={(o) => !o && setDetailClient(null)}>
        <SheetContent>
          {detailClient && (
            <>
              <SheetHeader>
                <SheetTitle>{detailClient.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 p-6 pt-0">
                <p className="text-sm text-muted-foreground">
                  {detailClient.company} · {detailClient.email}
                </p>
                <p className="text-lg font-semibold">
                  Total billed: {formatCurrency(detailClient.totalBilled)}
                </p>
                <h3 className="font-medium">Projects</h3>
                {clientProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects</p>
                ) : (
                  <ul className="space-y-2">
                    {clientProjects.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-md border border-border p-3"
                      >
                        <span>{p.name}</span>
                        <Badge variant="secondary">{p.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ClientForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: ClientWithStats | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" name="company" defaultValue={defaultValues?.company ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hourlyRate">Hourly rate</Label>
        <Input
          id="hourlyRate"
          name="hourlyRate"
          type="number"
          min={0}
          step={0.01}
          defaultValue={defaultValues?.hourlyRate ?? 0}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Input id="currency" name="currency" defaultValue={defaultValues?.currency ?? "USD"} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
