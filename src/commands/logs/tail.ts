import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  colors,
  formatRelativeTime,
  info,
  json as jsonOutput,
  isJsonMode,
} from "../../lib/output.js";
import { getConfigValue } from "../../lib/config.js";

interface LogEntry {
  id: string;
  type: "message" | "api_call" | "webhook";
  status: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  to?: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export default class LogsTail extends AuthenticatedCommand {
  static description = "Tail logs in real-time (like stripe logs tail)";

  static examples = [
    "<%= config.bin %> logs tail",
    "<%= config.bin %> logs tail --status failed",
    "<%= config.bin %> logs tail --since 1h",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    status: Flags.string({
      char: "s",
      description: "Filter by status (sent, delivered, failed)",
    }),
    since: Flags.string({
      description: "Show logs since (e.g., 1h, 30m, 1d)",
      default: "1h",
    }),
    type: Flags.string({
      char: "t",
      description: "Filter by type (message, api_call, webhook)",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(LogsTail);

    console.log();
    console.log(colors.bold(colors.primary("Sendly Logs")));
    console.log(colors.dim("─".repeat(60)));
    console.log();
    console.log(colors.dim("Streaming logs in real-time. Press Ctrl+C to stop."));
    console.log();

    const since = this.parseSince(flags.since);

    // Initial fetch of recent logs
    await this.fetchAndDisplayLogs(since, flags.status, flags.type);

    // Poll for new logs
    let lastTimestamp = new Date().toISOString();

    const pollInterval = setInterval(async () => {
      try {
        const logs = await apiClient.get<LogEntry[]>("/api/logs", {
          since: lastTimestamp,
          status: flags.status,
          type: flags.type,
          limit: 50,
        });

        for (const log of logs) {
          this.displayLog(log);
          lastTimestamp = log.timestamp;
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      clearInterval(pollInterval);
      console.log();
      info("Log streaming stopped");
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});
  }

  private async fetchAndDisplayLogs(
    since: Date,
    status?: string,
    type?: string
  ): Promise<void> {
    try {
      const logs = await apiClient.get<LogEntry[]>("/api/logs", {
        since: since.toISOString(),
        status,
        type,
        limit: 50,
      });

      if (logs.length === 0) {
        info("No recent logs found");
        console.log();
        return;
      }

      // Display logs in reverse chronological order
      for (const log of logs.reverse()) {
        this.displayLog(log);
      }
    } catch (err) {
      // If endpoint doesn't exist, show friendly message
      info("Fetching message history...");

      // Fallback to messages endpoint
      try {
        const messages = await apiClient.get<{ data: any[] }>("/api/v1/messages", {
          limit: 20,
        });

        for (const msg of messages.data.reverse()) {
          this.displayLog({
            id: msg.id,
            type: "message",
            status: msg.status,
            to: msg.to,
            messageId: msg.id,
            timestamp: msg.createdAt,
          });
        }
      } catch {
        info("No logs available");
      }
    }
  }

  private displayLog(log: LogEntry): void {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();

    let icon = "•";
    let statusColor = colors.dim;

    switch (log.status) {
      case "delivered":
      case "success":
        icon = "✓";
        statusColor = colors.success;
        break;
      case "failed":
      case "error":
        icon = "✗";
        statusColor = colors.error;
        break;
      case "queued":
      case "pending":
        icon = "○";
        statusColor = colors.warning;
        break;
      case "sent":
        icon = "→";
        statusColor = colors.info;
        break;
    }

    const typeLabel = this.getTypeLabel(log.type);

    console.log(
      `${colors.dim(timestamp)} ${statusColor(icon)} ${typeLabel} ${statusColor(log.status)}`
    );

    // Additional details
    if (log.to) {
      console.log(`  ${colors.dim("to:")} ${log.to}`);
    }
    if (log.endpoint) {
      console.log(
        `  ${colors.dim("endpoint:")} ${log.method || "GET"} ${log.endpoint}`
      );
    }
    if (log.messageId) {
      console.log(`  ${colors.dim("id:")} ${log.messageId}`);
    }
    if (log.error) {
      console.log(`  ${colors.error("error:")} ${log.error}`);
    }
    console.log();
  }

  private getTypeLabel(type: string): string {
    switch (type) {
      case "message":
        return colors.primary("[SMS]");
      case "api_call":
        return colors.code("[API]");
      case "webhook":
        return colors.warning("[HOOK]");
      default:
        return colors.dim(`[${type.toUpperCase()}]`);
    }
  }

  private parseSince(since: string): Date {
    const match = since.match(/^(\d+)([hdm])$/);
    if (!match) {
      return new Date(Date.now() - 60 * 60 * 1000); // Default 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const now = Date.now();
    switch (unit) {
      case "h":
        return new Date(now - value * 60 * 60 * 1000);
      case "d":
        return new Date(now - value * 24 * 60 * 60 * 1000);
      case "m":
        return new Date(now - value * 60 * 1000);
      default:
        return new Date(now - 60 * 60 * 1000);
    }
  }
}
