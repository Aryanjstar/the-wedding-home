import "server-only";

import { z } from "zod";

const secret = z.string().trim().min(32);

const appEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().trim().min(1).default("http://localhost:3000"),
});

const databaseEnvSchema = z.object({
  MONGODB_URI: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a mongodb:// or mongodb+srv:// URL.",
    ),
});

const authEnvSchema = z.object({
  SESSION_SECRET: secret,
});

const rateLimitEnvSchema = z.object({
  RATE_LIMIT_HMAC_SECRET: secret,
});

const cronEnvSchema = z.object({
  CRON_SECRET: secret,
});

const storageEnvSchema = z.object({
  S3_BUCKET: z.string().trim().min(1),
  S3_REGION: z.string().trim().min(1).default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().trim().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().trim().min(1),
});

const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().trim().min(1),
  EMAIL_FROM: z.string().trim().min(3),
});

const placesEnvSchema = z.object({
  GOOGLE_PLACES_API_KEY: z.string().trim().min(1),
});

const mapsEnvSchema = z.object({
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: z.string().trim().min(1),
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
export type RateLimitEnv = z.infer<typeof rateLimitEnvSchema>;
export type CronEnv = z.infer<typeof cronEnvSchema>;
export type StorageEnv = z.infer<typeof storageEnvSchema>;
export type EmailEnv = z.infer<typeof emailEnvSchema>;
export type PlacesEnv = z.infer<typeof placesEnvSchema>;
export type MapsEnv = z.infer<typeof mapsEnvSchema>;

export const PRODUCTION_DATABASE_NAME = "wedding-home";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type EnvSource = Record<string, string | undefined>;

let cachedAppEnv: AppEnv | undefined;
let cachedDatabaseEnv: DatabaseEnv | undefined;
let cachedAuthEnv: AuthEnv | undefined;
let cachedRateLimitEnv: RateLimitEnv | undefined;
let cachedCronEnv: CronEnv | undefined;
let cachedStorageEnv: StorageEnv | undefined;
let cachedEmailEnv: EmailEnv | undefined;
let cachedPlacesEnv: PlacesEnv | undefined;
let cachedMapsEnv: MapsEnv | undefined;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function databaseNameFromUri(uri: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(uri).pathname;
  } catch {
    return null;
  }

  const name = decodeURIComponent(pathname.replace(/^\//, "").split("/")[0] ?? "");
  return name.length > 0 ? name : null;
}

export function assertSafeDatabase(uri: string, vercelEnv: string | undefined): void {
  const name = databaseNameFromUri(uri);
  if (!name) {
    throw new ConfigError(
      "MONGODB_URI must include a database name, for example wedding-home-dev.",
    );
  }

  if (vercelEnv === "production" && name !== PRODUCTION_DATABASE_NAME) {
    throw new ConfigError("Production must use the wedding-home database.");
  }

  if (vercelEnv !== "production" && name === PRODUCTION_DATABASE_NAME) {
    throw new ConfigError(
      "Refusing the production database outside production. Use wedding-home-dev locally.",
    );
  }
}

function read<T>(schema: z.ZodType<T>, label: string, source: EnvSource): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.map(String).join(".") || label)),
    ];
    throw new ConfigError(`${label} is not configured. Check ${fields.join(", ")} in .env.local.`);
  }
  return result.data;
}

export function parseAppEnv(source: EnvSource): AppEnv {
  const env = read(appEnvSchema, "App", source);
  if (!isHttpUrl(env.NEXT_PUBLIC_APP_URL)) {
    throw new ConfigError("App is not configured. Check NEXT_PUBLIC_APP_URL in .env.local.");
  }
  return env;
}

export function parseDatabaseEnv(source: EnvSource): DatabaseEnv {
  const env = read(databaseEnvSchema, "Database", source);
  assertSafeDatabase(env.MONGODB_URI, source.VERCEL_ENV);
  return env;
}

export function getAppEnv(): AppEnv {
  cachedAppEnv ??= parseAppEnv(process.env);
  return cachedAppEnv;
}

export function getDatabaseEnv(): DatabaseEnv {
  cachedDatabaseEnv ??= parseDatabaseEnv(process.env);
  return cachedDatabaseEnv;
}

export function getAuthEnv(): AuthEnv {
  cachedAuthEnv ??= read(authEnvSchema, "Auth", process.env);
  return cachedAuthEnv;
}

export function getRateLimitEnv(): RateLimitEnv {
  cachedRateLimitEnv ??= read(rateLimitEnvSchema, "Rate limit", process.env);
  return cachedRateLimitEnv;
}

export function getCronEnv(): CronEnv {
  cachedCronEnv ??= read(cronEnvSchema, "Cron", process.env);
  return cachedCronEnv;
}

export function getStorageEnv(): StorageEnv {
  cachedStorageEnv ??= read(storageEnvSchema, "Storage", process.env);
  return cachedStorageEnv;
}

export function getEmailEnv(): EmailEnv {
  cachedEmailEnv ??= read(emailEnvSchema, "Email", process.env);
  return cachedEmailEnv;
}

export function getPlacesEnv(): PlacesEnv {
  cachedPlacesEnv ??= read(placesEnvSchema, "Places", process.env);
  return cachedPlacesEnv;
}

export function getMapsEnv(): MapsEnv {
  cachedMapsEnv ??= read(mapsEnvSchema, "Maps", process.env);
  return cachedMapsEnv;
}
