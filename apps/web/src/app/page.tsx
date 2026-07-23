"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Bot,
  FileText,
  Check,
  ScanSearch,
  Workflow,
  Search,
  Share2,
  Users,
} from "lucide-react";
import { Badge, Button, Card, CardContent, cn } from "@podmind/ui";
import { Item, LiftCard, MotionProvider, Reveal } from "@/components/motion/motion";
import { LogoLockup } from "@/components/brand/logo";

/**
 * Mirrors subscription_plans. Enterprise is priced on application rather than
 * shown as a number, which is why it carries no figure here.
 */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    featured: false,
    cta: "Start free",
    href: "/signup",
    points: ["5,000 AI credits", "3 projects", "Every AI tool included"],
  },
  {
    name: "Starter",
    price: "$19",
    featured: false,
    cta: "Choose Starter",
    href: "/signup",
    points: ["50,000 AI credits", "25 projects", "Export to every format"],
  },
  {
    name: "Pro",
    price: "$49",
    featured: true,
    cta: "Choose Pro",
    href: "/signup",
    points: ["250,000 AI credits", "100 projects", "API access", "Priority support"],
  },
  {
    name: "Business",
    price: "$99",
    featured: false,
    cta: "Choose Business",
    href: "/signup",
    points: ["1,000,000 AI credits", "500 projects", "Everything in Pro"],
  },
] as const;

const FEATURES = [
  { icon: Workflow, title: "Episode Pipeline", description: "One topic in, a full episode package out — research, outline, script, SEO and social in a single run." },
  { icon: Search, title: "AI Research Engine", description: "Complete episode research in minutes — summaries, statistics, angles, sources." },
  { icon: Users, title: "Guest Intelligence", description: "Guest backgrounds, past interviews, smart questions and what to verify first." },
  { icon: ScanSearch, title: "Fact Checker", description: "Every claim in your script judged individually, with evidence and a line to say instead." },
  { icon: FileText, title: "Outlines & Scripts", description: "Structured outlines and full scripts, versioned and exportable." },
  { icon: Bot, title: "AI Chat with Memory", description: "Project-aware assistant that remembers your show, audience and style." },
  { icon: BookOpen, title: "Knowledge Hub", description: "Your documents become searchable, citable context for every AI agent." },
  { icon: Share2, title: "SEO & Social", description: "Titles, descriptions, chapters, hashtags and post variations per platform." },
  { icon: BarChart3, title: "Analytics", description: "Understand what works across episodes, topics and formats." },
] as const;

/** Signature element: live input-level waveform under the hero copy. */
function Waveform() {
  const heights = [14, 26, 40, 30, 48, 22, 38, 52, 28, 44, 18, 34, 46, 24, 12];
  return (
    <div aria-hidden className="flex h-14 items-end gap-1.5">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-cyan-400 via-primary-500 to-purple-500 motion-safe:animate-level origin-bottom"
          style={{ height: h, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <MotionProvider>
      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col overflow-x-clip px-6">
        {/* Aurora backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-40 -right-32 h-[320px] w-[320px] rounded-full bg-cyan-400/15 blur-[100px] motion-safe:animate-aurora [animation-delay:4s]" />
          <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary-500/25 blur-[120px] motion-safe:animate-aurora" />
          <div className="absolute top-64 -left-40 h-[360px] w-[360px] rounded-full bg-purple-500/20 blur-[100px] motion-safe:animate-aurora [animation-delay:2s]" />
        </div>

        {/* Header */}
        <Reveal className="flex items-center justify-between py-6">
          <Item className="flex items-center">
            <LogoLockup markSize={34} priority />
          </Item>
          <Item className="flex items-center gap-4">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Open App</Button>
            </Link>
          </Item>
        </Reveal>

        {/* Hero */}
        <Reveal as="section" className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <Item>
            <Badge className="mb-6">AI-powered podcast platform</Badge>
          </Item>
          <Item>
            <h1 className="max-w-3xl text-balance text-5xl font-bold tracking-tight sm:text-6xl">
              Research Less.{" "}
              <span className="bg-hero-glow bg-clip-text text-transparent">
                Create More.
              </span>
            </h1>
          </Item>
          <Item>
            <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              PodMind turns hours of episode prep into minutes — research, guests, outlines,
              scripts, SEO and social, all powered by a provider-agnostic AI Router.
            </p>
          </Item>
          <Item className="mt-10 flex items-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start researching</Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="secondary">
                Explore features
              </Button>
            </Link>
          </Item>
          <Item className="mt-14">
            <Waveform />
          </Item>
        </Reveal>

        {/* Features */}
        <div id="features" />
        <Reveal as="section" amount={0.1} className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <LiftCard key={title}>
              <Card className="h-full transition-colors hover:border-primary-500/50 hover:shadow-glow-blue/60 hover:bg-hover">
                <CardContent className="flex flex-col gap-3 p-6">
                  <Icon className="h-5 w-5 text-primary-400" aria-hidden />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            </LiftCard>
          ))}
        </Reveal>


        {/* Pricing */}
        <div id="pricing" />
        <Reveal as="section" amount={0.1} className="flex flex-col items-center gap-3 pb-10">
          <Item>
            <h2 className="text-center font-display text-3xl font-bold tracking-tight">
              Simple, credit-based pricing
            </h2>
          </Item>
          <Item>
            <p className="max-w-xl text-balance text-center text-muted-foreground">
              Every AI feature costs a fixed number of credits, shown before you run it. If a
              request fails, the credits come back.
            </p>
          </Item>
        </Reveal>

        <Reveal as="section" amount={0.1} className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <LiftCard key={plan.name}>
              <Card
                className={cn(
                  "h-full",
                  plan.featured && "border-primary-500/50 shadow-glow-blue/60",
                )}
              >
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">{plan.name}</h3>
                      {plan.featured ? (
                        <Badge className="bg-primary-500/20 text-[10px] text-primary-300">
                          POPULAR
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 font-display text-3xl font-bold">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                  </div>

                  <ul className="flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
                    {plan.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-400" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={plan.featured ? "primary" : "secondary"}
                    className="w-full"
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </LiftCard>
          ))}
        </Reveal>

        <footer className="flex flex-col items-center gap-4 border-t border-border py-8 text-sm text-muted-foreground">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} PodMind AI</p>
        </footer>
      </main>
    </MotionProvider>
  );
}
