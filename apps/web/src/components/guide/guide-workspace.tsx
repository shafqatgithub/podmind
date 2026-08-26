"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Card, CardContent, cn } from "@podmind/ui";
import { GUIDE, GUIDE_LANGS, type GuideLang } from "./guide-content";

const STORAGE_KEY = "podmind.guide.lang";

export function GuideWorkspace() {
  const [lang, setLang] = React.useState<GuideLang>("en");

  // Read the saved choice after mount to avoid a hydration mismatch.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as GuideLang | null;
      if (saved && GUIDE[saved]) setLang(saved);
    } catch {
      // storage unavailable — English is a fine default.
    }
  }, []);

  const choose = (l: GuideLang) => {
    setLang(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const c = GUIDE[lang];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Header + language switcher (switcher stays LTR for consistent placement) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{c.languageLabel}:</span>
          {GUIDE_LANGS.map((l) => (
            <button
              key={l}
              onClick={() => choose(l)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                l === lang
                  ? "border-primary-500 bg-primary-500/10 text-primary-200"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={l === lang}
            >
              {GUIDE[l].label}
            </button>
          ))}
        </div>

        <div dir={c.dir}>
          <h1 className="font-display text-2xl font-bold tracking-tight">{c.pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{c.pageSubtitle}</p>
        </div>
      </div>

      {/* Episode walkthrough */}
      <section dir={c.dir} className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">{c.episodeHeading}</h2>
        <div className="flex flex-col gap-3">
          {c.steps.map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h3 className="font-medium">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-primary-500/30 bg-primary-500/5 p-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary-300" />
          <p className="text-sm text-primary-100">{c.shortcut}</p>
        </div>
      </section>

      {/* Feature reference */}
      <section dir={c.dir} className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">{c.featuresHeading}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.features.map((f) => (
            <Card key={f.name}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{f.name}</h3>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={f.href} className="shrink-0">
                      {c.openLabel}
                      <ArrowRight className="ml-1 size-3.5" />
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section dir={c.dir} className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{c.tipsHeading}</h2>
        <ul className="flex flex-col gap-2">
          {c.tips.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-400" />
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
