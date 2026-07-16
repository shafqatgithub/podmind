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
        <div className="rounded-full bg-primary-600/10 p-3">
          <Icon className="h-6 w-6 text-primary-400" aria-hidden />
        </div>
        <h2 className="font-semibold">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
