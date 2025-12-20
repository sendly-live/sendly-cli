/**
 * API Client for Sendly CLI
 * Handles all HTTP requests to the Sendly API
 */

import { getAuthToken, getConfigValue } from "./config.js";

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Not authenticated. Run 'sendly login' first.") {
    super("authentication_error", message, 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends ApiError {
  constructor(
    public retryAfter: number,
    message: string = "Rate limit exceeded"
  ) {
    super("rate_limit_exceeded", message, 429);
    this.name = "RateLimitError";
  }
}

export class InsufficientCreditsError extends ApiError {
  constructor(message: string = "Insufficient credits") {
    super("insufficient_credits", message, 402);
    this.name = "InsufficientCreditsError";
  }
}

class ApiClient {
  private rateLimitInfo?: RateLimitInfo;

  private getBaseUrl(): string {
    return getConfigValue("baseUrl") || "https://sendly.live";
  }

  private getHeaders(requireAuth: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "@sendly/cli/1.0.0",
    };

    if (requireAuth) {
      const token = getAuthToken();
      if (!token) {
        throw new AuthenticationError();
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async request<T>(
    method: string,
    path: string,
    options: {
      body?: Record<string, unknown>;
      query?: Record<string, string | number | boolean | undefined>;
      requireAuth?: boolean;
    } = {}
  ): Promise<T> {
    const { body, query, requireAuth = true } = options;

    const url = new URL(`${this.getBaseUrl()}${path}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: this.getHeaders(requireAuth),
      body: body ? JSON.stringify(body) : undefined,
    });

    // Update rate limit info
    this.updateRateLimitInfo(response.headers);

    // Parse response
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      this.handleError(response.status, data);
    }

    return data as T;
  }

  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get("X-RateLimit-Limit");
    const remaining = headers.get("X-RateLimit-Remaining");
    const reset = headers.get("X-RateLimit-Reset");

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
  }

  private handleError(statusCode: number, data: any): never {
    const error = data?.error || "unknown_error";
    const message = data?.message || `HTTP ${statusCode}`;
    const details = data?.details;

    switch (statusCode) {
      case 401:
      case 403:
        throw new AuthenticationError(message);
      case 402:
        throw new InsufficientCreditsError(message);
      case 429:
        const retryAfter = data?.retryAfter || 60;
        throw new RateLimitError(retryAfter, message);
      default:
        throw new ApiError(error, message, statusCode, details);
    }
  }

  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo;
  }

  // Convenience methods
  async get<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    requireAuth: boolean = true
  ): Promise<T> {
    return this.request<T>("GET", path, { query, requireAuth });
  }

  async post<T>(
    path: string,
    body?: Record<string, unknown>,
    requireAuth: boolean = true
  ): Promise<T> {
    return this.request<T>("POST", path, { body, requireAuth });
  }

  async patch<T>(
    path: string,
    body?: Record<string, unknown>,
    requireAuth: boolean = true
  ): Promise<T> {
    return this.request<T>("PATCH", path, { body, requireAuth });
  }

  async delete<T>(path: string, requireAuth: boolean = true): Promise<T> {
    return this.request<T>("DELETE", path, { requireAuth });
  }
}

export const apiClient = new ApiClient();
