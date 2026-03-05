import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import {
  json,
  keyValue,
  colors,
  header,
  isJsonMode,
  formatCredits,
} from "../../../lib/output.js";

interface OverviewResponse {
  totalWorkspaces: number;
  activeWorkspaces: number;
  suspendedWorkspaces: number;
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  totalCreditsUsed: number;
  totalCreditsRemaining: number;
  deliveryRate: number;
}

export default class AnalyticsOverview extends AuthenticatedCommand {
  static description = "Get enterprise-wide analytics overview";

  static examples = [
    "<%= config.bin %> enterprise analytics overview",
    "<%= config.bin %> enterprise analytics overview --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const overview = await apiClient.get<OverviewResponse>(
      "/api/v1/enterprise/analytics/overview",
    );

    if (isJsonMode()) {
      json(overview);
      return;
    }

    header("Enterprise Overview");

    keyValue({
      "Total Workspaces": String(overview.totalWorkspaces),
      Active: colors.success(String(overview.activeWorkspaces)),
      Suspended:
        overview.suspendedWorkspaces > 0
          ? colors.error(String(overview.suspendedWorkspaces))
          : colors.dim("0"),
    });

    console.log();
    header("Messaging");

    keyValue({
      "Messages Sent": overview.totalMessagesSent.toLocaleString(),
      "Messages Delivered": overview.totalMessagesDelivered.toLocaleString(),
      "Delivery Rate": `${overview.deliveryRate.toFixed(1)}%`,
    });

    console.log();
    header("Credits");

    keyValue({
      "Credits Used": formatCredits(overview.totalCreditsUsed),
      "Credits Remaining": colors.primary(
        formatCredits(overview.totalCreditsRemaining),
      ),
    });
  }
}
