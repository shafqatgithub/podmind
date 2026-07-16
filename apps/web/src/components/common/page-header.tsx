export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
