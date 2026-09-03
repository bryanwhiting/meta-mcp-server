import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execFileSync } = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({ execFileSync }));

const ENV_KEYS = [
  "META_ACCESS_TOKEN",
  "OP_SERVICE_ACCOUNT_TOKEN",
  "OP_CONNECT_HOST",
  "OP_CONNECT_TOKEN",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

describe("resolveApiKey", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSync.mockReset();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("does not invoke 1Password when the environment variable is already set", async () => {
    process.env.META_ACCESS_TOKEN = "from-env";
    const { resolveApiKey } = await import("../op-fallback.js");

    resolveApiKey("META_ACCESS_TOKEN", "op://Development/Meta Access Token/credential");

    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("does not invoke op read when no 1Password accounts are configured", async () => {
    execFileSync.mockReturnValueOnce("[]");
    const { resolveApiKey } = await import("../op-fallback.js");

    resolveApiKey("META_ACCESS_TOKEN", "op://Development/Meta Access Token/credential");

    expect(execFileSync).toHaveBeenCalledTimes(1);
    expect(execFileSync).toHaveBeenCalledWith(
      "op",
      ["account", "list", "--format=json"],
      expect.any(Object)
    );
    expect(process.env.META_ACCESS_TOKEN).toBeUndefined();
  });

  it("reads the secret when a 1Password account is configured", async () => {
    execFileSync.mockReturnValueOnce('[{"url":"example.1password.com"}]').mockReturnValueOnce("from-op\n");
    const { resolveApiKey } = await import("../op-fallback.js");

    resolveApiKey("META_ACCESS_TOKEN", "op://Development/Meta Access Token/credential");

    expect(execFileSync).toHaveBeenCalledTimes(2);
    expect(process.env.META_ACCESS_TOKEN).toBe("from-op");
  });
});
