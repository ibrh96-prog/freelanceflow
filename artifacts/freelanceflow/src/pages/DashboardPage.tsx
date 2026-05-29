import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { TrendingUp, Clock, FolderOpen, AlertCircle } from "lucide-react";

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useGetSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description="Make sure the API server is running on port 8080."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        {data.topClientByRevenue && (
          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Top client: {data.topClientByRevenue.name} (
            {formatCurrency(data.topClientByRevenue.amount)})
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Earned This Month"
          value={formatCurrency(data.totalEarnedThisMonth)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Outstanding"
          value={formatCurrency(data.totalOutstanding)}
          icon={AlertCircle}
        />
        <MetricCard
          title="Active Projects"
          value={String(data.activeProjectCount)}
          icon={FolderOpen}
        />
        <MetricCard
          title="Hours This Month"
          value={`${data.totalHoursThisMonth}h`}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue (12 months)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {data.revenueByMonth.every((m) => m.amount === 0) ? (
            <EmptyState
              title="No revenue yet"
              description="Paid invoices will appear on this chart."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project profitability</CardTitle>
        </CardHeader>
        <CardContent>
          {data.projectProfitability.length === 0 ? (
            <EmptyState
              title="No projects"
              description="Add a project to track profitability."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projectProfitability.map((p) => {
                  const overBudget =
                    p.agreedAmount != null && p.earnedAmount > p.agreedAmount;
                  const underBudget =
                    p.agreedAmount != null && p.earnedAmount <= p.agreedAmount;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.client}</TableCell>
                      <TableCell className="capitalize">{p.billingType}</TableCell>
                      <TableCell className="text-right">{p.hoursLogged}h</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          overBudget && "text-red-500",
                          underBudget && p.agreedAmount != null && "text-emerald-500",
                        )}
                      >
                        {formatCurrency(p.earnedAmount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {p.agreedAmount != null
                          ? formatCurrency(p.agreedAmount)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
