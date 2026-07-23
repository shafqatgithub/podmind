import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@podmind/ui";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        {/* Gradient ring rather than a flat tint — an empty page is often the
            first thing a new user sees, so it should still feel like PodMind. */}
        <div className="rounded-full bg-brand-gradient p-[1.5px] shadow-glow-blue">
          <div className="rounded-full bg-card p-3">
            <Icon className="h-6 w-6 text-primary-300" aria-hidden />
          </div>
        </div>
        <h2 className="font-display font-semibold">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
