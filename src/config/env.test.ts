import { describe, expect, it } from "vitest";

import {
  ConfigError,
  assertSafeDatabase,
  databaseNameFromUri,
  parseAppEnv,
  parseDatabaseEnv,
} from "@/config/env";

const devUri = "mongodb+srv://user:secret@cluster.example.net/wedding-home-dev";
const prodUri = "mongodb+srv://user:secret@cluster.example.net/wedding-home";

describe("database name", () => {
  it("reads the database from the URI path", () => {
    expect(databaseNameFromUri(devUri)).toBe("wedding-home-dev");
    expect(databaseNameFromUri("mongodb://localhost:27017")).toBeNull();
  });

  it("refuses the production database outside production", () => {
    expect(() => assertSafeDatabase(prodUri, undefined)).toThrow(ConfigError);
    expect(() => assertSafeDatabase(prodUri, "preview")).toThrow(/production database/);
    expect(() => assertSafeDatabase(devUri, undefined)).not.toThrow();
  });

  it("requires the production database when Vercel production is set", () => {
    expect(() => assertSafeDatabase(devUri, "production")).toThrow(/wedding-home database/);
    expect(() => assertSafeDatabase(prodUri, "production")).not.toThrow();
  });

  it("does not echo the connection string when configuration is missing", () => {
    expect(() => parseDatabaseEnv({})).toThrow(/MONGODB_URI/);
    expect(() => parseDatabaseEnv({})).not.toThrow(/mongodb/);
  });
});

describe("app URL", () => {
  it("defaults to localhost", () => {
    expect(parseAppEnv({}).NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("rejects a non-http URL", () => {
    expect(() => parseAppEnv({ NEXT_PUBLIC_APP_URL: "javascript:alert(1)" })).toThrow(ConfigError);
  });
});
