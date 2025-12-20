import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  success,
  error,
  info,
  warn,
  colors,
  formatStatus,
  formatDate,
  spinner,
  json as jsonOutput,
  isJsonMode,
} from "../../lib/output.js";
import { getConfigValue } from "../../lib/config.js";
import localtunnel from "localtunnel";

interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created: number;
}

export default class WebhooksListen extends AuthenticatedCommand {
  static description =
    "Listen for webhooks locally (like Stripe CLI). Creates a secure tunnel to forward events to your local server.";

  static examples = [
    "<%= config.bin %> webhooks listen",
    "<%= config.bin %> webhooks listen --forward http://localhost:3000/webhook",
    "<%= config.bin %> webhooks listen --events message.delivered,message.failed",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    forward: Flags.string({
      char: "f",
      description: "Local URL to forward events to",
      default: "http://localhost:3000/webhook",
    }),
    events: Flags.string({
      char: "e",
      description: "Comma-separated list of events to listen for",
      default: "message.sent,message.delivered,message.failed,message.bounced",
    }),
    port: Flags.integer({
      char: "p",
      description: "Local port for the tunnel (auto-detected from forward URL if not specified)",
    }),
  };

  private tunnel: localtunnel.Tunnel | null = null;
  private webhookId: string | null = null;

  async run(): Promise<void> {
    const { flags } = await this.parse(WebhooksListen);

    const forwardUrl = new URL(flags.forward);
    const localPort = flags.port || parseInt(forwardUrl.port) || 3000;
    const events = flags.events.split(",").map((e) => e.trim());

    const spin = spinner("Starting webhook listener...");
    spin.start();

    try {
      // Create localtunnel
      this.tunnel = await localtunnel({
        port: localPort,
        subdomain: `sendly-${Date.now().toString(36)}`,
      });

      const tunnelUrl = this.tunnel.url;
      spin.succeed("Tunnel established");

      // Register temporary webhook with Sendly
      const webhookResponse = await apiClient.post<{
        id: string;
        secret: string;
      }>("/api/cli/webhooks/listen", {
        url: `${tunnelUrl}/cli-webhook`,
        events,
        forwardUrl: flags.forward,
      });

      this.webhookId = webhookResponse.id;
      const secret = webhookResponse.secret;

      // Display connection info
      console.log();
      console.log(colors.bold(colors.primary("Webhook listener ready!")));
      console.log();
      console.log(`  ${colors.dim("Tunnel URL:")}     ${colors.code(tunnelUrl)}`);
      console.log(`  ${colors.dim("Forwarding to:")} ${colors.code(flags.forward)}`);
      console.log(`  ${colors.dim("Events:")}        ${events.join(", ")}`);
      console.log();
      console.log(`  ${colors.dim("Webhook Secret:")}`);
      console.log(`  ${colors.primary(secret)}`);
      console.log();
      console.log(colors.dim("Use this secret to verify webhook signatures in your app."));
      console.log();
      console.log(colors.bold("Waiting for events..."));
      console.log(colors.dim("─".repeat(60)));
      console.log();

      // Set up event forwarding
      this.tunnel.on("request", (info) => {
        // This is just for logging - actual forwarding happens server-side
      });

      // Handle tunnel close
      this.tunnel.on("close", () => {
        warn("Tunnel closed");
        this.cleanup();
        process.exit(0);
      });

      this.tunnel.on("error", (err) => {
        error(`Tunnel error: ${err.message}`);
      });

      // Poll for events and display them
      await this.pollEvents(flags.forward, secret);
    } catch (err) {
      spin.fail("Failed to start listener");
      throw err;
    }
  }

  private async pollEvents(forwardUrl: string, secret: string): Promise<void> {
    const baseUrl = getConfigValue("baseUrl") || "https://sendly.live";

    // Set up SSE connection for real-time events
    const eventSource = new EventSource(
      `${baseUrl}/api/cli/webhooks/events?webhookId=${this.webhookId}`,
      {
        // @ts-ignore - headers not in type but supported
        headers: {
          Authorization: `Bearer ${getConfigValue("apiKey") || getConfigValue("accessToken")}`,
        },
      }
    );

    // Fallback to polling if SSE not available
    const pollInterval = setInterval(async () => {
      try {
        const events = await apiClient.get<WebhookEvent[]>(
          `/api/cli/webhooks/events?webhookId=${this.webhookId}&since=${Date.now() - 5000}`
        );

        for (const event of events) {
          this.displayEvent(event);
          await this.forwardEvent(forwardUrl, event, secret);
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    // Handle graceful shutdown
    const cleanup = () => {
      clearInterval(pollInterval);
      this.cleanup();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Keep process alive
    await new Promise(() => {});
  }

  private displayEvent(event: WebhookEvent): void {
    const timestamp = new Date(event.created * 1000).toLocaleTimeString();
    const eventType = event.type;

    let statusColor = colors.info;
    if (eventType.includes("delivered")) statusColor = colors.success;
    if (eventType.includes("failed")) statusColor = colors.error;

    console.log(
      `${colors.dim(timestamp)} ${statusColor("→")} ${colors.bold(eventType)}`
    );

    if (event.data) {
      const messageId = (event.data as any).message_id || (event.data as any).id;
      const to = (event.data as any).to;
      if (messageId) {
        console.log(`  ${colors.dim("message_id:")} ${messageId}`);
      }
      if (to) {
        console.log(`  ${colors.dim("to:")} ${to}`);
      }
    }
    console.log();
  }

  private async forwardEvent(
    forwardUrl: string,
    event: WebhookEvent,
    secret: string
  ): Promise<void> {
    try {
      const payload = JSON.stringify(event);
      const signature = await this.generateSignature(payload, secret);

      const response = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sendly-Signature": signature,
          "X-Sendly-Event": event.type,
        },
        body: payload,
      });

      if (response.ok) {
        console.log(
          `  ${colors.success("✓")} Forwarded to ${forwardUrl} (${response.status})`
        );
      } else {
        console.log(
          `  ${colors.error("✗")} Forward failed (${response.status})`
        );
      }
    } catch (err) {
      console.log(
        `  ${colors.error("✗")} Forward error: ${(err as Error).message}`
      );
    }
    console.log();
  }

  private async generateSignature(
    payload: string,
    secret: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `v1=${hashHex}`;
  }

  private async cleanup(): Promise<void> {
    // Clean up tunnel
    if (this.tunnel) {
      this.tunnel.close();
    }

    // Clean up temporary webhook
    if (this.webhookId) {
      try {
        await apiClient.delete(`/api/cli/webhooks/listen/${this.webhookId}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// Polyfill EventSource for Node.js if needed
class EventSource {
  constructor(url: string, options?: any) {
    // Simple implementation - in production use a proper polyfill
  }
}
