"use client";

/**
 * First-run setup.
 *
 * Deliberately one screen, not a wizard: every extra step loses people, and
 * there are only three things worth asking. They are not vanity questions —
 * podcast name, niche and audience are injected into every research, guest
 * and script prompt, so answering them measurably improves the first output
 * the user ever sees.
 *
 * It is skippable. Forcing a form on someone who wants to look around first
 * is a good way to lose them before they see anything work.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Select } from "@podmind/ui";
import { ApiError } from "@/lib/api/client";
import { LANGUAGES, projectsApi } from "@/lib/api/projects";
import { settingsApi } from "@/lib/api/settings";
import { LogoFull } from "@/components/brand/logo";

export function OnboardingWorkspace() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [skipping, setSkipping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** Marking setup done must not block the user if it fails. */
  const markDone = async () => {
    try {
      await settingsApi.updateProfile({ onboarding_completed: true });
    } catch {
      // Non-fatal: worst case they see this screen once more.
    }
  };

  const skip = async () => {
    setSkipping(true);
    await markDone();
    router.push("/dashboard");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const podcastName = String(form.get("podcast_name") ?? "").trim();
    const firstEpisode = String(form.get("title") ?? "").trim();

    if (!podcastName) {
      setError("What is your podcast called?");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await projectsApi.create({
        // The first project is the first episode, so the show name is context
        // and the episode is the title.
        title: firstEpisode || `${podcastName} — Episode 1`,
        podcast_name: podcastName,
        niche: String(form.get("niche") ?? "").trim() || undefined,
        audience: String(form.get("audience") ?? "").trim() || undefined,
        language: (String(form.get("language") ?? "en") ||
          "en") as (typeof LANGUAGES)[number]["code"],
        status: "draft",
      });
      await markDone();
      router.push("/agents");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not set up your workspace. Please try again.",
      );
      setPending(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary-500/12 blur-[120px] motion-safe:animate-aurora" />
        <div className="absolute bottom-0 -right-32 h-[320px] w-[320px] rounded-full bg-purple-500/10 blur-[110px] motion-safe:animate-aurora [animation-delay:3s]" />
      </div>

      <LogoFull width={200} />

      <div className="mt-8 w-full max-w-lg">
        <Card>
          <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
            <header className="flex flex-col gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Tell us about your show
              </h1>
              <p className="text-sm text-muted-foreground">
                PodMind uses this in every prompt, so your research, guests and scripts come
                back written for your audience rather than a generic one.
              </p>
            </header>

            <form onSubmit={submit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="podcast_name">Podcast name</Label>
                <Input
                  id="podcast_name"
                  name="podcast_name"
                  placeholder="Deep Work Radio"
                  maxLength={200}
                  autoFocus
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="niche">What is it about?</Label>
                  <Input
                    id="niche"
                    name="niche"
                    placeholder="Productivity and focus"
                    maxLength={120}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="language">Language</Label>
                  <Select id="language" name="language" defaultValue="en">
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="audience">Who listens?</Label>
                <Input
                  id="audience"
                  name="audience"
                  placeholder="Knowledge workers who feel busy but unproductive"
                  maxLength={500}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">First episode topic (optional)</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Why attention became the scarcest resource"
                  maxLength={200}
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" loading={pending}>
                  <Sparkles className="h-4 w-4" />
                  Create my workspace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void skip()}
                  loading={skipping}
                  disabled={pending}
                >
                  Skip for now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can change any of this later in Settings.
        </p>
      </div>
    </main>
  );
}
