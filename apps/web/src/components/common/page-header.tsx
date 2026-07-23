/**
 * Page header.
 *
 * Space Grotesk is the documented heading face, so titles use font-display
 * rather than the body sans. The gradient sits on a short accent rule above
 * the title rather than on the text itself: a gradient-filled heading looks
 * striking in a screenshot but costs real contrast on long titles, and these
 * are read every day rather than admired once.
 */
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <span aria-hidden className="mb-3 block h-1 w-12 rounded-full bg-hero-glow" />
      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
