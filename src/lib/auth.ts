/**
 * Authentication utilities for CLI
 * Handles browser-based login flow and API key authentication
 */

import open from "open";
import * as http from "node:http";
import * as crypto from "node:crypto";
import {
  setAuthTokens,
  setApiKey,
  clearAuth,
  getConfigValue,
  isAuthenticated,
  getAuthToken,
} from "./config.js";
import { colors, spinner } from "./output.js";

const DEVICE_CODE_LENGTH = 8;
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 150; // 5 minutes max

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  email: string;
}

/**
 * Generate a device code for browser-based authentication
 */
export function generateDeviceCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Generate a secure device code for the auth flow
 */
export function generateSecureCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  let code = "";
  const bytes = crypto.randomBytes(DEVICE_CODE_LENGTH);
  for (let i = 0; i < DEVICE_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Start the browser-based login flow
 */
export async function browserLogin(): Promise<TokenResponse> {
  const baseUrl = getConfigValue("baseUrl") || "https://sendly.live";
  const deviceCode = generateSecureCode();
  const userCode = `${deviceCode.slice(0, 4)}-${deviceCode.slice(4)}`;

  // Request device code from server
  const response = await fetch(`${baseUrl}/api/cli/auth/device-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceCode }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(error.message || "Failed to initiate login");
  }

  const data = (await response.json()) as DeviceCodeResponse;

  // Display instructions to user
  console.log();
  console.log(colors.bold("Login to Sendly"));
  console.log();
  console.log(`Open this URL in your browser:`);
  console.log(colors.primary(`  ${data.verificationUrl}`));
  console.log();
  console.log(`And enter this code:`);
  console.log(colors.bold(colors.primary(`  ${userCode}`)));
  console.log();

  // Try to open browser automatically
  try {
    await open(data.verificationUrl);
    console.log(colors.dim("Browser opened automatically"));
  } catch {
    console.log(colors.dim("Please open the URL manually"));
  }

  console.log();

  // Poll for token
  const spin = spinner("Waiting for authorization...");
  spin.start();

  let attempts = 0;
  while (attempts < MAX_POLL_ATTEMPTS) {
    await sleep(data.interval * 1000 || POLL_INTERVAL);
    attempts++;

    try {
      const tokenResponse = await fetch(`${baseUrl}/api/cli/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode }),
      });

      if (tokenResponse.ok) {
        const tokens = (await tokenResponse.json()) as TokenResponse;
        spin.succeed("Logged in successfully!");

        // Store tokens
        setAuthTokens(
          tokens.accessToken,
          tokens.refreshToken,
          tokens.expiresIn,
          tokens.userId,
          tokens.email,
        );

        return tokens;
      }

      const errorData = (await tokenResponse.json().catch(() => ({}))) as {
        error?: string;
      };

      if (errorData.error === "authorization_pending") {
        // Still waiting, continue polling
        continue;
      }

      if (errorData.error === "expired_token") {
        spin.fail("Login request expired. Please try again.");
        throw new Error("Login request expired");
      }

      if (errorData.error === "access_denied") {
        spin.fail("Login was denied");
        throw new Error("Login was denied");
      }
    } catch (error) {
      if (
        (error as Error).message.includes("expired") ||
        (error as Error).message.includes("denied")
      ) {
        throw error;
      }
      // Network error, continue polling
    }
  }

  spin.fail("Login timed out. Please try again.");
  throw new Error("Login timed out");
}

/**
 * Login with an API key directly
 */
export async function apiKeyLogin(apiKey: string): Promise<void> {
  const baseUrl = getConfigValue("baseUrl") || "https://sendly.live";

  // Validate the API key with the server
  const response = await fetch(`${baseUrl}/api/cli/auth/verify-key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(error.message || "Invalid API key");
  }

  // Store the API key
  setApiKey(apiKey);
}

/**
 * Logout - clear all stored credentials
 */
export function logout(): void {
  clearAuth();
}

/**
 * Check if currently authenticated
 */
export function checkAuth(): boolean {
  return isAuthenticated();
}

/**
 * Get current auth info for display
 */
export async function getAuthInfo(): Promise<{
  authenticated: boolean;
  email?: string;
  userId?: string;
  environment: string;
  keyType?: string;
}> {
  const token = getAuthToken();
  const email = getConfigValue("email");
  const userId = getConfigValue("userId");
  const apiKey = getConfigValue("apiKey");
  const environment = getConfigValue("environment");

  if (!token && !apiKey) {
    return { authenticated: false, environment };
  }

  let keyType: string | undefined;
  if (apiKey) {
    keyType = apiKey.startsWith("sk_test_") ? "test" : "live";
  }

  return {
    authenticated: true,
    email,
    userId,
    environment,
    keyType,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
