/**
 * CLI Configuration Management
 * Stores user preferences and credentials in ~/.sendly/
 *
 * Environment Variables (take precedence over config file):
 * - SENDLY_API_KEY: API key for authentication
 * - SENDLY_BASE_URL: Custom API endpoint
 * - SENDLY_OUTPUT_FORMAT: Default output format (human/json)
 * - SENDLY_NO_COLOR: Disable colored output (any value)
 * - SENDLY_TIMEOUT: Request timeout in ms (default: 30000)
 * - SENDLY_MAX_RETRIES: Max retry attempts (default: 3)
 * - CI: Auto-detect CI mode (disables interactive prompts)
 */

import Conf from "conf";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface SendlyConfig {
  // Authentication
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  userId?: string;
  email?: string;

  // Environment
  environment: "test" | "live";
  baseUrl: string;

  // Preferences
  defaultFormat: "human" | "json";
  colorEnabled: boolean;

  // Network
  timeout: number;
  maxRetries: number;
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.BUILDKITE
  );
}

/**
 * Check if color output is disabled
 */
export function isColorDisabled(): boolean {
  return !!(
    process.env.SENDLY_NO_COLOR ||
    process.env.NO_COLOR ||
    process.env.TERM === "dumb"
  );
}

const CONFIG_DIR = path.join(os.homedir(), ".sendly");
const CONFIG_FILE = "config.json";

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

const config = new Conf<SendlyConfig>({
  projectName: "sendly",
  cwd: CONFIG_DIR,
  configName: "config",
  defaults: {
    environment: "test",
    baseUrl: "https://sendly.live",
    defaultFormat: "human",
    colorEnabled: true,
    timeout: 30000,
    maxRetries: 3,
  },
  // Encrypt sensitive data
  encryptionKey: process.env.SENDLY_CONFIG_KEY || "sendly-cli-default-key-v1",
});

/**
 * Get effective config value with environment variable override
 * Priority: env var > config file > default
 */
export function getEffectiveValue<K extends keyof SendlyConfig>(
  key: K,
): SendlyConfig[K] {
  // Environment variable overrides
  switch (key) {
    case "apiKey":
      if (process.env.SENDLY_API_KEY) {
        return process.env.SENDLY_API_KEY as SendlyConfig[K];
      }
      break;
    case "baseUrl":
      if (process.env.SENDLY_BASE_URL) {
        return process.env.SENDLY_BASE_URL as SendlyConfig[K];
      }
      break;
    case "defaultFormat":
      if (process.env.SENDLY_OUTPUT_FORMAT) {
        const format = process.env.SENDLY_OUTPUT_FORMAT.toLowerCase();
        if (format === "json" || format === "human") {
          return format as SendlyConfig[K];
        }
      }
      break;
    case "colorEnabled":
      if (isColorDisabled()) {
        return false as SendlyConfig[K];
      }
      break;
    case "timeout":
      if (process.env.SENDLY_TIMEOUT) {
        const timeout = parseInt(process.env.SENDLY_TIMEOUT, 10);
        if (!isNaN(timeout) && timeout > 0) {
          return timeout as SendlyConfig[K];
        }
      }
      break;
    case "maxRetries":
      if (process.env.SENDLY_MAX_RETRIES) {
        const retries = parseInt(process.env.SENDLY_MAX_RETRIES, 10);
        if (!isNaN(retries) && retries >= 0) {
          return retries as SendlyConfig[K];
        }
      }
      break;
  }

  // Fall back to config file value
  return config.get(key);
}

export function getConfig(): SendlyConfig {
  return config.store;
}

export function setConfig<K extends keyof SendlyConfig>(
  key: K,
  value: SendlyConfig[K],
): void {
  config.set(key, value);
}

export function getConfigValue<K extends keyof SendlyConfig>(
  key: K,
): SendlyConfig[K] {
  return config.get(key);
}

export function clearConfig(): void {
  config.clear();
}

export function clearAuth(): void {
  config.delete("apiKey");
  config.delete("accessToken");
  config.delete("refreshToken");
  config.delete("tokenExpiresAt");
  config.delete("userId");
  config.delete("email");
}

export function isAuthenticated(): boolean {
  // Check env var first
  if (process.env.SENDLY_API_KEY) return true;

  const apiKey = config.get("apiKey");
  const accessToken = config.get("accessToken");
  return !!(apiKey || accessToken);
}

export function getAuthToken(): string | undefined {
  // Environment variable takes highest precedence
  if (process.env.SENDLY_API_KEY) {
    return process.env.SENDLY_API_KEY;
  }

  // Then stored API key
  const apiKey = config.get("apiKey");
  if (apiKey) return apiKey;

  // Finally, access token (if not expired)
  const accessToken = config.get("accessToken");
  const expiresAt = config.get("tokenExpiresAt");

  if (accessToken && expiresAt && Date.now() < expiresAt) {
    return accessToken;
  }

  return undefined;
}

export function setApiKey(apiKey: string): void {
  // Validate API key format
  if (!/^sk_(test|live)_v1_[a-zA-Z0-9_-]+$/.test(apiKey)) {
    throw new Error(
      "Invalid API key format. Expected sk_test_v1_xxx or sk_live_v1_xxx",
    );
  }

  config.set("apiKey", apiKey);

  // Set environment based on key type
  if (apiKey.startsWith("sk_test_")) {
    config.set("environment", "test");
  } else {
    config.set("environment", "live");
  }
}

export function setAuthTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  userId: string,
  email: string,
): void {
  config.set("accessToken", accessToken);
  config.set("refreshToken", refreshToken);
  config.set("tokenExpiresAt", Date.now() + expiresIn * 1000);
  config.set("userId", userId);
  config.set("email", email);
}

export function getConfigPath(): string {
  return path.join(CONFIG_DIR, CONFIG_FILE);
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export { config };
