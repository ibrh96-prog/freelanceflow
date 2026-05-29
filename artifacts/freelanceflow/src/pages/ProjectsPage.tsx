import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjects,
  useCreateProject,
  useListClients,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

const statusGroups = [
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
] as const;

export function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [billingType, setBillingType] = useState<"hourly" | "fixed">("hourly");
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListProjects();
  const { data: clients } = useListClients();

  const createMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setOpen(false);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        clientId: Number(fd.get("clientId")),
        name: String(fd.get("name")),
        description: String(fd.get("description") || "") || undefined,
        status: (fd.get("status") as "active" | "paused" | "completed") || "active",
        billingType,
        agreedAmount:
          billingType === "fixed" ? Number(fd.get("agreedAmount")) : null,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <select
                  name="clientId"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                >
                  <option value="">Select client</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" />
              </div>
              <div className="space-y-2">
                <Label>Billing type</Label>
                <Select
                  value={billingType}
                  onValueChange={(v) => setBillingType(v as "hourly" | "fixed")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="fixed">Fixed price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {billingType === "fixed" && (
                <div className="space-y-2">
                  <Label htmlFor="agreedAmount">Agreed amount</Label>
                  <Input
                    id="agreedAmount"
                    name="agreedAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  name="status"
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  defaultValue="active"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!projects?.length ? (
        <EmptyState
          title="No projects"
          description="Create a project to start logging time and invoicing clients."
          actionLabel="Add Project"
          onAction={() => setOpen(true)}
        />
      ) : (
        statusGroups.map(({ key, label }) => {
          const group = projects.filter((p) => p.status === key);
          if (group.length === 0) return null;
          return (
            <section key={key}>
              <h2 className="mb-4 text-lg font-semibold">{label}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <Link to={`/projects/${project.id}`}>
                      <Card className="transition-shadow hover:shadow-md">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{project.name}</CardTitle>
                            <Badge variant="secondary">{project.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {project.clientName}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                          <p className="capitalize text-muted-foreground">
                            {project.billingType}
                          </p>
                          <p>{project.totalHours}h logged</p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(project.earnedAmount)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
