"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Bot,
  FileText,
  Mic2,
  Search,
  Share2,
  Users,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@podmind/ui";
import { Item, LiftCard, MotionProvider, Reveal } from "@/components/motion/motion";

const FEATURES = [
  { icon: Search, title: "AI Research Engine", description: "Complete episode research in minutes — summaries, statistics, angles, sources." },
  { icon: Users, title: "Guest Finder", description: "Discover expert guests with bios, talking points and interview questions." },
  { icon: FileText, title: "Outlines & Scripts", description: "Structured outlines and full scripts, versioned and collaborative." },
  { icon: Bot, title: "AI Chat with Memory", description: "Project-aware assistant that remembers your show, audience and style." },
  { icon: BookOpen, title: "Knowledge Hub", description: "Your documents become searchable, citable context for every AI agent." },
  { icon: Share2, title: "SEO & Social", description: "Titles, descriptions, chapters, hashtags and post variations per platform." },
  { icon: BarChart3, title: "Analytics", description: "Understand what works across episodes, topics and formats." },
  { icon: Mic2, title: "Built for Teams", description: "Organizations, workspaces, roles and reviews — from solo shows to studios." },
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
          <Item className="flex items-center gap-2">
            <Mic2 className="h-6 w-6 text-primary-400" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">PodMind AI</span>
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

        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} PodMind AI
        </footer>
      </main>
    </MotionProvider>
  );
}
