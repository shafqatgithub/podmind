"use client";

/**
 * Analytics dashboard — 11-Feature-Specifications MODULE 15.
 *
 * Charts are hand-built SVG rather than a charting library: two simple
 * shapes do not justify the bundle weight, and this way the visuals inherit
 * the brand tokens directly.
 */

import * as React from "react";
import {
  AlertTriangle,
  BarChart3,
  Coins,
  Cpu,
  Gauge,
  MessageSquare,
  Search,
  Zap,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import {
  ANALYTICS_WINDOWS,
  analyticsApi,
  type AnalyticsOverview,
  type UsagePoint,
} from "@/lib/api/analytics";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item } from "@/components/motion/motion";

const PROVIDER_COLOURS: Record<string, string> = {
  openai: "hsl(var(--success-500))",
  anthropic: "hsl(var(--brand-purple))",
  google: "hsl(var(--brand-cyan))",
  unknown: "hsl(var(--muted-foreground))",
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

/* ----------------------------------------------------------- charts */

/** Daily bars. Zero-activity days stay visible as a baseline tick. */
function UsageChart({ data }: { data: UsagePoint[] }) {
  const width = 720;
  const height = 160;
  const max = Math.max(...data.map((d) => d.requests), 1);
  const barWidth = width / Math.max(data.length, 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-40 w-full"
      role="img"
      aria-label={`AI requests per day over ${data.length} days`}
    >
      {data.map((point, i) => {
        const barHeight = point.requests > 0 ? (point.requests / max) * (height - 24) : 2;
        return (
          <g key={point.day}>
            <rect
              x={i * barWidth + barWidth * 0.2}
              y={height - barHeight - 16}
              width={barWidth * 0.6}
              height={barHeight}
              rx={2}
              fill={point.requests > 0 ? "hsl(var(--primary-500))" : "hsl(var(--border))"}
              opacity={point.requests > 0 ? 0.85 : 1}
            >
              <title>{`${point.day}: ${point.requests} requests, ${formatNumber(point.tokens)} tokens`}</title>
            </rect>
          </g>
        );
      })}
      <line
        x1={0}
        y1={height - 14}
        x2={width}
        y2={height - 14}
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
    </svg>
  );
}

/** Provider share as a single stacked bar — a pie for 2-3 slices is worse. */
function ProviderBar({
  providers,
}: {
  providers: { provider: string; requests: number }[];
}) {
  const total = providers.reduce((sum, p) => sum + p.requests, 0);
  if (total === 0) return null;

  let offset = 0;
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 100 6" className="h-3 w-full" role="img" aria-label="Requests by provider">
        {providers.map((p) => {
          const share = (p.requests / total) * 100;
          const x = offset;
          offset += share;
          return (
            <rect
              key={p.provider}
              x={x}
              y={0}
              width={Math.max(share - 0.4, 0.4)}
              height={6}
              rx={1}
              fill={PROVIDER_COLOURS[p.provider] ?? PROVIDER_COLOURS.unknown}
            >
              <title>{`${p.provider}: ${p.requests} requests`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {providers.map((p) => (
          <span key={p.provider} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: PROVIDER_COLOURS[p.provider] ?? PROVIDER_COLOURS.unknown }}
            />
            <span className="capitalize">{p.provider}</span>
            <span className="text-muted-foreground">
              {Math.round((p.requests / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- tiles */

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-primary-400",
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-5">
        <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className={cn("h-3.5 w-3.5", accent)} aria-hidden />
          {label}
        </span>
        <span className="font-display text-2xl font-bold">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- page */

export function AnalyticsWorkspace() {
  const [days, setDays] = React.useState<number>(30);
  const [data, setData] = React.useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        setData(await analyticsApi.overview(days, controller.signal));
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load analytics.");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [days]);

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to see usage analytics."
      />
    );
  }

  const totals = data?.totals;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {ANALYTICS_WINDOWS.map((w) => (
          <Button
            key={w}
            variant={days === w ? "primary" : "secondary"}
            size="sm"
            onClick={() => setDays(w)}
            aria-pressed={days === w}
          >
            {w} days
          </Button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error-400">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : null}

      {totals ? (
        <Appear className="flex flex-col gap-6">
          <Item>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={Coins}
                label="Credits left"
                value={formatNumber(totals.credits_available)}
                hint={`${formatNumber(totals.credits_used)} used all time`}
                accent="text-warning-400"
              />
              <Stat
                icon={Zap}
                label="AI requests"
                value={formatNumber(totals.requests)}
                hint={
                  totals.success_rate !== null
                    ? `${Math.round(totals.success_rate * 100)}% succeeded`
                    : "No activity yet"
                }
              />
              <Stat
                icon={Cpu}
                label="Tokens"
                value={formatNumber(totals.tokens)}
                hint={totals.cost > 0 ? `$${totals.cost.toFixed(4)} estimated` : "Cost not priced"}
                accent="text-cyan-400"
              />
              <Stat
                icon={Gauge}
                label="Avg response"
                value={
                  totals.avg_latency_ms > 0
                    ? `${(totals.avg_latency_ms / 1000).toFixed(1)}s`
                    : "—"
                }
                hint="Successful calls only"
                accent="text-purple-400"
              />
            </div>
          </Item>

          <Item>
            <Card>
              <CardContent className="flex flex-col gap-4 p-5">
                <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Requests per day
                </h2>
                {data!.daily.length ? (
                  <UsageChart data={data!.daily} />
                ) : (
                  <p className="text-sm text-muted-foreground">No activity in this window.</p>
                )}
              </CardContent>
            </Card>
          </Item>

          <div className="grid gap-4 lg:grid-cols-2">
            <Item>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-4 p-5">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Provider mix
                  </h2>
                  {data!.providers.length ? (
                    <>
                      <ProviderBar providers={data!.providers} />
                      {/* Wrapped so a narrow screen scrolls the table rather
                          than stretching the page sideways. */}
                      <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[22rem] text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground">
                            <th className="pb-1 text-left font-normal">Provider</th>
                            <th className="pb-1 text-right font-normal">OK</th>
                            <th className="pb-1 text-right font-normal">Failed</th>
                            <th className="pb-1 text-right font-normal">Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data!.providers.map((p) => (
                            <tr key={p.provider} className="border-t border-border/40">
                              <td className="py-1.5 capitalize">{p.provider}</td>
                              <td className="py-1.5 text-right text-success-300">{p.successes}</td>
                              <td
                                className={cn(
                                  "py-1.5 text-right",
                                  p.failures > 0 ? "text-error-300" : "text-muted-foreground",
                                )}
                              >
                                {p.failures}
                              </td>
                              <td className="py-1.5 text-right text-muted-foreground">
                                {p.avg_latency_ms > 0
                                  ? `${(p.avg_latency_ms / 1000).toFixed(1)}s`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No requests yet.</p>
                  )}
                </CardContent>
              </Card>
            </Item>

            <Item>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-4 p-5">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    What you have built
                  </h2>
                  <dl className="grid grid-cols-2 gap-4">
                    {[
                      { icon: BarChart3, label: "Projects", value: totals.projects },
                      { icon: Search, label: "Research runs", value: totals.research_sessions },
                      { icon: MessageSquare, label: "Conversations", value: totals.conversations },
                      { icon: Cpu, label: "Documents", value: totals.knowledge_documents },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-primary-400" aria-hidden />
                        <div>
                          <dd className="font-display text-lg font-bold">{item.value}</dd>
                          <dt className="text-xs text-muted-foreground">{item.label}</dt>
                        </div>
                      </div>
                    ))}
                  </dl>

                  {data!.tasks.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data!.tasks.map((t) => (
                        <Badge key={t.task} className="capitalize">
                          {t.task} · {t.requests}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </Item>
          </div>

          {data!.recent_failures.length ? (
            <Item>
              <Card>
                <CardContent className="flex flex-col gap-3 p-5">
                  <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning-400" aria-hidden />
                    Recent failures
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {data!.recent_failures.map((failure, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-2 text-sm">
                        <span className="capitalize text-muted-foreground">
                          {failure.provider ?? "unknown"}
                        </span>
                        <Badge className="text-[10px] capitalize">{failure.task}</Badge>
                        <span className="min-w-0 flex-1 truncate text-error-300">
                          {failure.error_message ?? "Unknown error"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(failure.created_at).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Failed attempts are refunded automatically — these are shown so a rejected
                    key or exhausted quota is visible rather than silent.
                  </p>
                </CardContent>
              </Card>
            </Item>
          ) : null}
        </Appear>
      ) : null}

      {!loading && totals && totals.requests === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No AI activity yet in this window"
          description="Run some research or start a chat, and usage, cost and provider performance will appear here."
        />
      ) : null}
    </div>
  );
}
