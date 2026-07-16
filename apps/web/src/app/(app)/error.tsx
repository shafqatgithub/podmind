"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Card, CardContent } from "@podmind/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-error-500" aria-hidden />
        <h2 className="font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error.digest ? `Reference: ${error.digest}` : "An unexpected error occurred."}
        </p>
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
