/**
 * Config module tests
 * Tests configuration management and credential storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Mock the conf module before importing config
vi.mock("conf", () => {
  const store: Record<string, any> = {
    environment: "test",
    baseUrl: "https://sendly.live",
    defaultFormat: "human",
    colorEnabled: true,
  };

  return {
    default: class MockConf {
      store = store;
      get(key: string) {
        return store[key];
      }
      set(key: string, value: any) {
        store[key] = value;
      }
      delete(key: string) {
        delete store[key];
      }
      clear() {
        Object.keys(store).forEach((key) => delete store[key]);
        // Restore defaults
        store.environment = "test";
        store.baseUrl = "https://sendly.live";
        store.defaultFormat = "human";
        store.colorEnabled = true;
      }
    },
  };
});

// Import after mocking
import {
  getConfig,
  setConfig,
  getConfigValue,
  clearConfig,
  clearAuth,
  isAuthenticated,
  getAuthToken,
  setApiKey,
  setAuthTokens,
} from "../../src/lib/config.js";

describe("Config Module", () => {
  beforeEach(() => {
    clearConfig();
  });

  describe("getConfig", () => {
    it("returns default config values", () => {
      const config = getConfig();
      expect(config.environment).toBe("test");
      expect(config.baseUrl).toBe("https://sendly.live");
      expect(config.defaultFormat).toBe("human");
      expect(config.colorEnabled).toBe(true);
    });
  });

  describe("setConfig / getConfigValue", () => {
    it("sets and retrieves config values", () => {
      setConfig("environment", "live");
      expect(getConfigValue("environment")).toBe("live");
    });

    it("sets custom base URL", () => {
      setConfig("baseUrl", "https://api.sendly.dev");
      expect(getConfigValue("baseUrl")).toBe("https://api.sendly.dev");
    });
  });

  describe("setApiKey", () => {
    it("accepts valid test API key", () => {
      expect(() => setApiKey("sk_test_v1_abc123")).not.toThrow();
      expect(getConfigValue("apiKey")).toBe("sk_test_v1_abc123");
      expect(getConfigValue("environment")).toBe("test");
    });

    it("accepts valid live API key", () => {
      expect(() => setApiKey("sk_live_v1_xyz789")).not.toThrow();
      expect(getConfigValue("apiKey")).toBe("sk_live_v1_xyz789");
      expect(getConfigValue("environment")).toBe("live");
    });

    it("rejects invalid API key format", () => {
      expect(() => setApiKey("invalid_key")).toThrow(
        "Invalid API key format"
      );
    });

    it("rejects API key without version", () => {
      expect(() => setApiKey("sk_test_abc123")).toThrow(
        "Invalid API key format"
      );
    });

    it("rejects empty API key", () => {
      expect(() => setApiKey("")).toThrow("Invalid API key format");
    });
  });

  describe("isAuthenticated", () => {
    it("returns false when no credentials", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("returns true with API key", () => {
      setApiKey("sk_test_v1_abc123");
      expect(isAuthenticated()).toBe(true);
    });

    it("returns true with access token", () => {
      setAuthTokens("access_token", "refresh_token", 3600, "user_123", "test@example.com");
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe("getAuthToken", () => {
    it("returns undefined when not authenticated", () => {
      expect(getAuthToken()).toBeUndefined();
    });

    it("returns API key when set", () => {
      setApiKey("sk_test_v1_abc123");
      expect(getAuthToken()).toBe("sk_test_v1_abc123");
    });

    it("prefers API key over access token", () => {
      setApiKey("sk_test_v1_abc123");
      setAuthTokens("access_token", "refresh_token", 3600, "user_123", "test@example.com");
      expect(getAuthToken()).toBe("sk_test_v1_abc123");
    });

    it("returns access token when no API key", () => {
      setAuthTokens("access_token", "refresh_token", 3600, "user_123", "test@example.com");
      expect(getAuthToken()).toBe("access_token");
    });
  });

  describe("clearAuth", () => {
    it("clears authentication credentials", () => {
      setApiKey("sk_test_v1_abc123");
      setAuthTokens("access_token", "refresh_token", 3600, "user_123", "test@example.com");

      clearAuth();

      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeUndefined();
    });

    it("preserves non-auth config", () => {
      setConfig("defaultFormat", "json");
      setApiKey("sk_test_v1_abc123");

      clearAuth();

      expect(getConfigValue("defaultFormat")).toBe("json");
    });
  });

  describe("setAuthTokens", () => {
    it("stores all token data", () => {
      setAuthTokens("access_123", "refresh_456", 3600, "user_789", "user@example.com");

      expect(getConfigValue("accessToken")).toBe("access_123");
      expect(getConfigValue("refreshToken")).toBe("refresh_456");
      expect(getConfigValue("userId")).toBe("user_789");
      expect(getConfigValue("email")).toBe("user@example.com");
    });

    it("calculates token expiration correctly", () => {
      const before = Date.now();
      setAuthTokens("access_123", "refresh_456", 3600, "user_789", "user@example.com");
      const after = Date.now();

      const expiresAt = getConfigValue("tokenExpiresAt")!;
      expect(expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);
      expect(expiresAt).toBeLessThanOrEqual(after + 3600 * 1000);
    });
  });
});
