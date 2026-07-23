/**
 * Paddle.js checkout.
 *
 * Paddle is the merchant of record, so the card never touches our servers or
 * our code: this loads Paddle's script and opens their overlay. The
 * organization id travels in customData so the webhook can attribute the
 * purchase — on a first purchase there is no earlier record to match a
 * customer against, so passing it through is the only reliable link.
 */

interface PaddleCheckoutOptions {
  items: { priceId: string; quantity: number }[];
  customData?: Record<string, string>;
  customer?: { email?: string };
  settings?: { theme?: "light" | "dark"; displayMode?: "overlay" | "inline" };
}

interface PaddleGlobal {
  Environment: { set(env: "sandbox" | "production"): void };
  Initialize(options: { token: string }): void;
  Checkout: { open(options: PaddleCheckoutOptions): void };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

const SCRIPT_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";

let loader: Promise<PaddleGlobal> | null = null;

function loadScript(): Promise<PaddleGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paddle can only load in the browser"));
  }
  if (window.Paddle) return Promise.resolve(window.Paddle);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? document.createElement("script");

    script.addEventListener("load", () => {
      if (window.Paddle) resolve(window.Paddle);
      else reject(new Error("Paddle loaded but did not initialise"));
    });
    script.addEventListener("error", () =>
      reject(new Error("Could not load the payment provider")),
    );

    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/** Loads and initialises Paddle once, reusing the same promise thereafter. */
export function getPaddle(): Promise<PaddleGlobal> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    return Promise.reject(new Error("Payments are not configured"));
  }

  loader ??= loadScript().then((paddle) => {
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
    if (environment === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({ token });
    return paddle;
  });

  return loader;
}

export function isPaddleConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
}

export async function openCheckout(input: {
  priceId: string;
  organizationId: string;
  email?: string | null;
}): Promise<void> {
  const paddle = await getPaddle();
  paddle.Checkout.open({
    items: [{ priceId: input.priceId, quantity: 1 }],
    customData: { organization_id: input.organizationId },
    ...(input.email ? { customer: { email: input.email } } : {}),
    settings: { theme: "dark", displayMode: "overlay" },
  });
}
