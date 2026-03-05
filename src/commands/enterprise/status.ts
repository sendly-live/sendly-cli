import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  json,
  keyValue,
  colors,
  header,
  isJsonMode,
  formatDate,
  formatCredits,
} from "../../lib/output.js";

interface EnterpriseAccount {
  id: string;
  userId: string;
  status: "pending" | "active" | "suspended" | "deactivated";
  companyName: string;
  maxWorkspaces: number;
  webhookUrl?: string;
  webhookSecret?: string;
  totalCreditsAllocated: number;
  monthlyPlatformFee?: number;
  perWorkspaceFee?: number;
  createdAt: string;
  activatedAt?: string;
}

interface StatusResponse {
  account: EnterpriseAccount;
  workspaceCount: number;
}

export default class EnterpriseStatus extends AuthenticatedCommand {
  static description = "Show enterprise account status";

  static examples = [
    "<%= config.bin %> enterprise status",
    "<%= config.bin %> enterprise status --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const response = await apiClient.get<StatusResponse>(
      "/api/v1/enterprise/account",
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    const { account, workspaceCount } = response;

    header("Enterprise Account");

    const statusColor =
      account.status === "active"
        ? colors.success
        : account.status === "pending"
          ? colors.warning
          : colors.error;

    keyValue({
      Company: colors.primary(account.companyName),
      Status: statusColor(account.status),
      Workspaces: `${workspaceCount} / ${account.maxWorkspaces}`,
      "Credits Allocated": formatCredits(account.totalCreditsAllocated),
      "Platform Fee": account.monthlyPlatformFee
        ? `$${account.monthlyPlatformFee}/mo`
        : colors.dim("not set"),
      "Per-Workspace Fee": account.perWorkspaceFee
        ? `$${account.perWorkspaceFee}/mo`
        : colors.dim("not set"),
      "Enterprise Webhook": account.webhookUrl || colors.dim("not configured"),
      "Activated At": account.activatedAt
        ? formatDate(account.activatedAt)
        : colors.dim("pending"),
      "Created At": formatDate(account.createdAt),
    });
  }
}
