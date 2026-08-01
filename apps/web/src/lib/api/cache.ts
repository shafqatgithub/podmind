"use client";

/**
 * A small stale-while-revalidate cache for GET requests.
 *
 * Every workspace screen fetched from scratch on mount, so leaving Research
 * for the dashboard and coming straight back meant watching the same spinner
 * for the same data — the API was reachable and fast, but the UI behaved as
 * though it had never seen any of it before.
 *
 * The rule here: show what we already have immediately, then refresh behind
 * it. A revisit renders at once and quietly corrects itself a moment later,
 * which is what "it should just be there" actually requires. Only the first
 * visit of a session can show a loading state, because only then is there
 * genuinely nothing to show.
 *
 * Deliberately in-memory: this is a session-lifetime cache, not storage.
 * Sensitive workspace data has no business outliving the tab, and a stale
 * entry from yesterday would be worse than a fresh fetch today.
 */

interface Entry<T> {
  data: T;
  at: number;
  /** In-flight refresh, shared so concurrent callers do not stampede. */
  inflight?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

/** Entries older than this are refreshed before being handed out again. */
const DEFAULT_TTL_MS = 30_000;

/** Cached value if present, regardless of age. */
export function peek<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

export function isFresh(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const entry = store.get(key);
  return entry !== undefined && Date.now() - entry.at < ttlMs;
}

export function put<T>(key: string, data: T): void {
  const existing = store.get(key);
  store.set(key, { data, at: Date.now(), inflight: existing?.inflight });
}

/**
 * Drop cached entries. Call after a mutation so the next read is truthful:
 * `invalidate("projects")` clears every key beginning with "projects".
 */
export function invalidate(prefix?: string): void {
  if (prefix === undefined) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Fetch through the cache.
 *
 * `onData` may be called twice: once synchronously-ish with cached data, and
 * again with fresh data if the cached copy was stale and the refresh returned
 * something different. It is not called again when the refresh matches what
 * was already shown, so screens do not re-render for nothing.
 *
 * A failing background refresh is swallowed when cached data was already
 * delivered — the user is looking at a working screen, and replacing it with
 * an error because a silent revalidation failed would be a downgrade. With no
 * cached data the error propagates as normal.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  onData: (data: T, source: "cache" | "network") => void,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<void> {
  const entry = store.get(key) as Entry<T> | undefined;
  const hadCache = entry !== undefined;

  if (hadCache) {
    onData(entry.data, "cache");
    if (isFresh(key, ttlMs)) return;
  }

  const inflight =
    entry?.inflight ??
    (async () => {
      try {
        const data = await fetcher();
        put(key, data);
        return data;
      } finally {
        const current = store.get(key) as Entry<T> | undefined;
        if (current) current.inflight = undefined;
      }
    })();

  if (entry) entry.inflight = inflight;

  try {
    const fresh = await inflight;
    // Skip the re-render when the refresh changed nothing.
    if (!hadCache || JSON.stringify(fresh) !== JSON.stringify(entry?.data)) {
      onData(fresh, "network");
    }
  } catch (err) {
    if (!hadCache) throw err;
  }
}
