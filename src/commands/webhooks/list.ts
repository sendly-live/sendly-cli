import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  table,
  json,
  info,
  formatStatus,
  colors,
  isJsonMode,
} from "../../lib/output.js";

type WebhookMode = "all" | "test" | "live";

interface Webhook {
  id: string;
  url: string;
  description?: string;
  events: string[];
  mode: WebhookMode;
  is_active: boolean;
  failure_count: number;
  circuit_state: "closed" | "open" | "half_open";
  total_deliveries: number;
  success_rate: number;
  last_delivery_at: string | null;
  created_at: string;
}

export default class WebhooksList extends AuthenticatedCommand {
  static description = "List configured webhooks";

  static examples = [
    "<%= config.bin %> webhooks list",
    "<%= config.bin %> webhooks list --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const webhooks = await apiClient.get<Webhook[]>("/api/v1/webhooks");

    if (isJsonMode()) {
      json(webhooks);
      return;
    }

    if (webhooks.length === 0) {
      info("No webhooks configured");
      console.log();
      console.log(`  Create one with ${colors.code("sendly webhooks create")}`);
      console.log(
        `  Or test locally with ${colors.code("sendly webhooks listen")}`,
      );
      return;
    }

    console.log();

    table(webhooks, [
      {
        header: "ID",
        key: "id",
        width: 18,
        formatter: (v) => colors.dim(String(v).slice(0, 15) + "..."),
      },
      {
        header: "URL",
        key: "url",
        width: 30,
        formatter: (v) => {
          const url = String(v);
          return url.length > 27 ? url.slice(0, 27) + "..." : url;
        },
      },
      {
        header: "Events",
        key: "events",
        width: 12,
        formatter: (v) => {
          const events = v as string[];
          return events.length > 2
            ? `${events.length} events`
            : events.join(", ").replace(/message\./g, "");
        },
      },
      {
        header: "Mode",
        key: "mode",
        width: 6,
        formatter: (v) => {
          switch (v) {
            case "test":
              return colors.warning("test");
            case "live":
              return colors.success("live");
            default:
              return colors.dim("all");
          }
        },
      },
      {
        header: "Status",
        key: "is_active",
        width: 10,
        formatter: (v) =>
          v ? colors.success("active") : colors.error("disabled"),
      },
      {
        header: "Success",
        key: "success_rate",
        width: 8,
        formatter: (v) => {
          if (v === 0 || v === undefined) return colors.dim("—");
          const rate = Number(v);
          if (rate >= 90) return colors.success(`${rate}%`);
          if (rate >= 50) return colors.warning(`${rate}%`);
          return colors.error(`${rate}%`);
        },
      },
      {
        header: "Last Delivery",
        key: "last_delivery_at",
        width: 14,
        formatter: (v) => {
          if (!v) return colors.dim("Never");
          const date = new Date(String(v));
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        },
      },
    ]);
  }
}
