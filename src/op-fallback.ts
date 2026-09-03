import { execFileSync } from "node:child_process";

let onePasswordAvailable: boolean | undefined;

function canUseOnePassword(): boolean {
  if (onePasswordAvailable !== undefined) return onePasswordAvailable;

  // Service-account and Connect credentials do not require a configured
  // desktop/CLI account.
  if (
    process.env.OP_SERVICE_ACCOUNT_TOKEN ||
    (process.env.OP_CONNECT_HOST && process.env.OP_CONNECT_TOKEN)
  ) {
    onePasswordAvailable = true;
    return true;
  }

  try {
    const output = execFileSync("op", ["account", "list", "--format=json"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const accounts: unknown = JSON.parse(output);
    onePasswordAvailable = Array.isArray(accounts) && accounts.length > 0;
  } catch {
    onePasswordAvailable = false;
  }

  return onePasswordAvailable;
}

/**
 * If the given env var is empty, attempt to resolve it from 1Password CLI.
 * Sets process.env[envVar] on success so downstream code can read it normally.
 */
export function resolveApiKey(envVar: string, opRef: string): void {
  if (process.env[envVar]) return;
  if (!canUseOnePassword()) return;
  try {
    const value = execFileSync("op", ["read", opRef], {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (value) process.env[envVar] = value;
  } catch {
    // 1Password CLI unavailable or item not found
  }
}
