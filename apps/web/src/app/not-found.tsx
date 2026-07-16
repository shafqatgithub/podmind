import Link from "next/link";
import { Button } from "@podmind/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-primary-400">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Link href="/">
        <Button variant="secondary">Back to home</Button>
      </Link>
    </main>
  );
}
