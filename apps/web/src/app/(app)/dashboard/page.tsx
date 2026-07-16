import type { Metadata } from "next";
import { BarChart3, FolderKanban, Search, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@podmind/ui";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { label: "Projects", value: 0, icon: FolderKanban },
  { label: "Research sessions", value: 0, icon: Search },
  { label: "AI credits used", value: 0, icon: Sparkles },
  { label: "Episodes analyzed", value: 0, icon: BarChart3 },
] as const;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your podcast production at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
              </div>
              <Icon className="h-5 w-5 text-primary-400" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              No projects yet — project creation arrives with the core modules stage.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              Activity from research, scripts and AI chat will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
