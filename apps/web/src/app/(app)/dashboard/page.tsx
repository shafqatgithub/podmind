"use client";

import { BarChart3, FolderKanban, Search, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@podmind/ui";
import { CountUp, Item, Reveal } from "@/components/motion/motion";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

const STATS = [
  { label: "Projects", value: 0, icon: FolderKanban, color: "text-primary-400" },
  { label: "Research sessions", value: 0, icon: Search, color: "text-purple-400" },
  { label: "AI credits used", value: 0, icon: Sparkles, color: "text-cyan-400" },
  { label: "Episodes analyzed", value: 0, icon: BarChart3, color: "text-primary-400" },
] as const;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your podcast production at a glance."
      />

      <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <Item key={label}>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    <CountUp value={value} />
                  </p>
                </div>
                <Icon className={`h-5 w-5 ${color}`} aria-hidden />
              </CardContent>
            </Card>
          </Item>
        ))}
      </Reveal>

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
