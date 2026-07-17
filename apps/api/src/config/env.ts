import { z } from "zod";

/**
 * Environment schema — the single typed source of runtime configuration.
 * Boot fails immediately with a precise message if anything is missing or
 * malformed (Secure by Default, 16-Backend-Architecture Core Principles).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid postgres:// URL" }),
  DB_SSL: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

  // Required from Stage 6 (Authentication) onward; optional until then so
  // the API stays deployable at every stage.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** ConfigModule `validate` hook. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
