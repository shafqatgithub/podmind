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

const FEATURES = [
  {
    icon: Search,
    title: "AI Research Engine",
    description: "Complete episode research in minutes — summaries, statistics, angles, sources.",
  },
  {
    icon: Users,
    title: "Guest Finder",
    description: "Discover expert guests with bios, talking points and interview questions.",
  },
  {
    icon: FileText,
    title: "Outlines & Scripts",
    description: "Structured outlines and full scripts, versioned and collaborative.",
  },
  {
    icon: Bot,
    title: "AI Chat with Memory",
    description: "Project-aware assistant that remembers your show, audience and style.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Hub",
    description: "Your documents become searchable, citable context for every AI agent.",
  },
  {
    icon: Share2,
    title: "SEO & Social",
    description: "Titles, descriptions, chapters, hashtags and post variations per platform.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Understand what works across episodes, topics and formats.",
  },
  {
    icon: Mic2,
    title: "Built for Teams",
    description: "Organizations, workspaces, roles and reviews — from solo shows to studios.",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      {/* Header */}
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <Mic2 className="h-6 w-6 text-primary-400" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">PodMind AI</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
            Features
          </Link>
          <Link href="/dashboard">
            <Button size="sm">Open App</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <Badge className="mb-6">AI-powered podcast platform</Badge>
        <h1 className="max-w-3xl text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Research Less. <span className="text-primary-400">Create More.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          PodMind turns hours of episode prep into minutes — research, guests, outlines,
          scripts, SEO and social, all powered by a provider-agnostic AI Router.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">Start researching</Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="secondary">
              Explore features
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="transition-colors hover:bg-hover">
            <CardContent className="flex flex-col gap-3 p-6">
              <Icon className="h-5 w-5 text-primary-400" aria-hidden />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} PodMind AI
      </footer>
    </main>
  );
}
