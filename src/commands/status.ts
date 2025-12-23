import { AuthenticatedCommand } from "../lib/base-command.js";
import { apiClient } from "../lib/api-client.js";
import {
  header,
  keyValue,
  colors,
  json,
  divider,
  isJsonMode,
  formatRelativeTime,
} from "../lib/output.js";
import { getConfigValue } from "../lib/config.js";

interface StatusResponse {
  account: {
    email: string;
    userId: string;
    verified: boolean;
  };
  credits: {
    balance: number;
    reserved: number;
    available: number;
  };
  usage: {
    messagesSentToday: number;
    messagesSentThisMonth: number;
    webhooksConfigured: number;
    activeApiKeys: number;
  };
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    rateLimit: number;
  };
}

export default class Status extends AuthenticatedCommand {
  static description =
    "Show account status dashboard with credits, usage, and health";

  static examples = [
    "<%= config.bin %> status",
    "<%= config.bin %> status --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    // Fetch all status data in parallel
    const [credits, messages, webhooks, keys] = await Promise.all([
      apiClient
        .get<{
          balance: number;
          reservedBalance: number;
          availableBalance: number;
        }>("/api/v1/account/credits")
        .catch(() => ({ balance: 0, reservedBalance: 0, availableBalance: 0 })),
      apiClient
        .get<{ messages: any[]; total: number }>("/api/v1/messages", {
          limit: 5,
        })
        .catch(() => ({ messages: [], total: 0 })),
      apiClient
        .get<any[]>("/api/v1/webhooks")
        .catch(() => []),
      apiClient
        .get<{ keys: any[] }>("/api/v1/account/keys")
        .catch(() => ({ keys: [] })),
    ]);

    const email = getConfigValue("email") || "Unknown";
    const apiMode = getConfigValue("environment") || "test";

    if (isJsonMode()) {
      json({
        account: {
          email,
          apiMode,
        },
        credits: {
          balance: credits.balance,
          reserved: credits.reservedBalance,
          available: credits.availableBalance,
        },
        usage: {
          recentMessages: messages.total,
          webhooksConfigured: webhooks.length,
          activeApiKeys: keys.keys?.filter((k: any) => k.isActive).length || 0,
        },
      });
      return;
    }

    // Beautiful dashboard output
    console.log();
    console.log(
      colors.bold(colors.primary("  Sendly Status Dashboard")),
    );
    console.log(colors.dim("  " + "─".repeat(40)));
    console.log();

    // Account Section
    console.log(colors.bold("  Account"));
    console.log(`    ${colors.dim("Email:")}        ${email}`);
    console.log(
      `    ${colors.dim("API Mode:")}     ${apiMode === "test" ? colors.warning("test") + colors.dim(" (sandbox)") : colors.success("live") + colors.dim(" (production)")}`,
    );
    console.log();

    // Credits Section
    console.log(colors.bold("  Credits"));
    const available = credits.availableBalance || 0;
    const creditColor =
      available > 100
        ? colors.success
        : available > 10
          ? colors.warning
          : colors.error;
    console.log(
      `    ${colors.dim("Available:")}    ${creditColor(available.toLocaleString())} credits`,
    );
    if (credits.reservedBalance > 0) {
      console.log(
        `    ${colors.dim("Reserved:")}     ${colors.warning(credits.reservedBalance.toLocaleString())} credits`,
      );
    }
    console.log(
      `    ${colors.dim("Capacity:")}     ~${Math.floor(available).toLocaleString()} SMS (US/CA)`,
    );
    console.log();

    // Usage Section
    console.log(colors.bold("  Resources"));
    const activeKeys = keys.keys?.filter((k: any) => k.isActive).length || 0;
    const activeWebhooks = webhooks.filter((w: any) => w.is_active).length;
    console.log(
      `    ${colors.dim("API Keys:")}     ${activeKeys} active`,
    );
    console.log(
      `    ${colors.dim("Webhooks:")}     ${activeWebhooks} configured${webhooks.length > activeWebhooks ? colors.dim(` (${webhooks.length - activeWebhooks} paused)`) : ""}`,
    );
    console.log();

    // Recent Activity
    if (messages.messages && messages.messages.length > 0) {
      console.log(colors.bold("  Recent Messages"));
      messages.messages.slice(0, 3).forEach((msg: any) => {
        const status = msg.status || "unknown";
        const statusIcon =
          status === "delivered"
            ? colors.success("✓")
            : status === "sent"
              ? colors.primary("→")
              : status === "failed"
                ? colors.error("✗")
                : colors.dim("○");
        const to = msg.to || "Unknown";
        const time = msg.createdAt
          ? formatRelativeTime(msg.createdAt)
          : "recently";
        console.log(
          `    ${statusIcon} ${colors.dim(to.slice(-4).padStart(8, "•"))} ${colors.dim(status.padEnd(10))} ${colors.dim(time)}`,
        );
      });
      console.log();
    }

    // Quick Actions
    console.log(colors.dim("  Quick Actions"));
    console.log(
      `    ${colors.code("sendly sms send")}      Send a message`,
    );
    console.log(
      `    ${colors.code("sendly credits balance")} Check credit balance`,
    );
    console.log(
      `    ${colors.code("sendly webhooks list")}  View webhooks`,
    );
    console.log();
  }
}
