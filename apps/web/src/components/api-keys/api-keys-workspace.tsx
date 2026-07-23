"use client";

/**
 * API keys workspace.
 *
 * The backend stores only a SHA-256 hash, so the plaintext secret exists for
 * exactly one response and can never be recovered. The whole design of this
 * screen follows from that: the new key is shown in a panel the user has to
 * dismiss deliberately, the warning sits above the secret rather than below
 * it, and the copy button is the most prominent control on the page.
 */

import * as React from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  Copy,
  KeyRound,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Skeleton,
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import {
  API_SCOPES,
  apiKeysApi,
  type ApiKey,
  type ApiScope,
  type CreatedApiKey,
} from "@/lib/api/api-keys";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item, Reveal } from "@/components/motion/motion";

const DEFAULT_SCOPES: ApiScope[] = ["projects:read", "research:read"];

const EXPIRY_OPTIONS = [
  { value: "", label: "Never expires" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
] as const;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the secret is selectable as a fallback.
    }
  };

  return (
    <Button type="button" onClick={() => void copy()}>
      {copied ? (
        <>
          <Check className="h-4 w-4" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" /> Copy key
        </>
      )}
    </Button>
  );
}

/** The one moment the secret is visible. */
function NewKeyPanel({ apiKey, onDismiss }: { apiKey: CreatedApiKey; onDismiss: () => void }) {
  return (
    <Appear>
      <Card className="border-warning-500/40">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-400" aria-hidden />
            <div>
              <p className="font-display font-semibold">Copy this key now</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the only time it will be shown. PodMind stores a hash, not the key
                itself, so it cannot be recovered — if you lose it you will need to create a
                new one.
              </p>
            </div>
          </div>

          <code className="block break-all rounded border border-border bg-background/60 p-4 font-mono text-sm">
            {apiKey.secret}
          </code>

          <div className="flex flex-wrap items-center gap-3">
            <CopyButton value={apiKey.secret} />
            <Button type="button" variant="secondary" onClick={onDismiss}>
              I have saved it
            </Button>
          </div>
        </CardContent>
      </Card>
    </Appear>
  );
}

function KeyRow({
  apiKey,
  onRevoke,
  onDelete,
}: {
  apiKey: ApiKey;
  onRevoke: (k: ApiKey) => void;
  onDelete: (k: ApiKey) => void;
}) {
  const expired =
    apiKey.expires_at !== null && new Date(apiKey.expires_at).getTime() < Date.now();
  const live = apiKey.is_active && !expired;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded border border-border/60 p-4",
        !live && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary-400" aria-hidden />
        <span className="font-medium">{apiKey.name}</span>
        {live ? (
          <Badge className="bg-success-500/15 text-success-300">Active</Badge>
        ) : (
          <Badge className="bg-neutral-500/15 text-neutral-300">
            {expired ? "Expired" : "Revoked"}
          </Badge>
        )}
        <code className="ml-auto font-mono text-xs text-muted-foreground">
          {apiKey.key_prefix}…
        </code>
      </div>

      {apiKey.permissions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {apiKey.permissions.map((p) => (
            <Badge key={p} className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{apiKey.rate_limit_per_minute}/min</span>
        <span>
          Created {new Date(apiKey.created_at).toLocaleDateString()}
        </span>
        <span>
          {apiKey.last_used_at
            ? `Last used ${new Date(apiKey.last_used_at).toLocaleDateString()}`
            : "Never used"}
        </span>
        {apiKey.expires_at ? (
          <span>
            {expired ? "Expired" : "Expires"}{" "}
            {new Date(apiKey.expires_at).toLocaleDateString()}
          </span>
        ) : null}

        <span className="ml-auto flex items-center gap-1">
          {live ? (
            <button
              type="button"
              onClick={() => onRevoke(apiKey)}
              className="rounded px-2 py-1 text-warning-300 transition-colors hover:bg-warning-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Ban className="mr-1 inline h-3.5 w-3.5" />
              Revoke
            </button>
          ) : null}
          <button
            type="button"
            aria-label={`Delete key ${apiKey.name}`}
            onClick={() => onDelete(apiKey)}
            className="rounded p-1.5 transition-colors hover:text-error-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}

export function ApiKeysWorkspace() {
  const [keys, setKeys] = React.useState<ApiKey[]>([]);
  const [created, setCreated] = React.useState<CreatedApiKey | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [scopes, setScopes] = React.useState<ApiScope[]>(DEFAULT_SCOPES);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const page = await apiKeysApi.list(signal);
      setKeys(page.items);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof ApiError && err.isUnreachable
          ? "The PodMind API is not reachable right now."
          : "Could not load your API keys.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError("Give the key a name so you can recognise it later.");
      return;
    }
    if (scopes.length === 0) {
      setError("Select at least one scope.");
      return;
    }

    const expiry = String(form.get("expires_in_days") ?? "");
    const rate = Number(form.get("rate_limit_per_minute") ?? 60);

    setCreating(true);
    setError(null);
    try {
      const key = await apiKeysApi.create({
        name,
        permissions: scopes,
        rate_limit_per_minute: Number.isFinite(rate) ? rate : 60,
        ...(expiry ? { expires_in_days: Number(expiry) } : {}),
      });
      setCreated(key);
      setShowForm(false);
      setScopes(DEFAULT_SCOPES);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the key.");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (key: ApiKey) => {
    if (
      !window.confirm(
        `Revoke "${key.name}"? Any integration using it will stop working immediately.`,
      )
    )
      return;
    try {
      await apiKeysApi.revoke(key.id);
      await load();
    } catch {
      setError("Could not revoke the key.");
    }
  };

  const remove = async (key: ApiKey) => {
    if (!window.confirm(`Delete "${key.name}" permanently?`)) return;
    const snapshot = keys;
    setKeys((all) => all.filter((k) => k.id !== key.id));
    try {
      await apiKeysApi.remove(key.id);
    } catch {
      setKeys(snapshot);
      setError("Could not delete the key.");
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={KeyRound}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to manage API keys."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {created ? (
        <NewKeyPanel apiKey={created} onDismiss={() => setCreated(null)} />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Keys authenticate requests to the PodMind API on behalf of your organization.
        </p>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          New key
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={submit} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5 sm:col-span-3">
                  <Label htmlFor="name">Key name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Zapier integration"
                    maxLength={100}
                    autoFocus
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Only for your reference — you cannot see the key again, so the name is how
                    you will recognise it.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expires_in_days">Expiry</Label>
                  <Select id="expires_in_days" name="expires_in_days" defaultValue="90">
                    {EXPIRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rate_limit_per_minute">Rate limit</Label>
                  <Input
                    id="rate_limit_per_minute"
                    name="rate_limit_per_minute"
                    type="number"
                    min={1}
                    max={1000}
                    defaultValue={60}
                  />
                  <p className="text-xs text-muted-foreground">Requests per minute</p>
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">
                  Scopes
                  <span className="ml-2 font-normal text-muted-foreground">
                    grant only what the integration needs
                  </span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {API_SCOPES.map((scope) => (
                    <label key={scope} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scopes.includes(scope)}
                        onChange={(e) =>
                          setScopes((all) =>
                            e.target.checked
                              ? [...all, scope]
                              : all.filter((s) => s !== scope),
                          )
                        }
                        className="h-4 w-4 rounded border-border bg-input accent-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      />
                      <code className="font-mono text-xs">{scope}</code>
                    </label>
                  ))}
                </div>
              </fieldset>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={creating}>
                  Create key
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {error && !showForm ? (
        <p role="alert" className="text-sm text-error-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create a key to call the PodMind API from your own scripts, automations or integrations."
        />
      ) : (
        <Reveal className="flex flex-col gap-3">
          {keys.map((key) => (
            <Item key={key.id}>
              <KeyRow apiKey={key} onRevoke={revoke} onDelete={remove} />
            </Item>
          ))}
        </Reveal>
      )}
    </div>
  );
}
