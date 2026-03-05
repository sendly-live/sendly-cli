import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  json,
  table,
  colors,
  header,
  isJsonMode,
} from "../../lib/output.js";

interface WorkspaceBillingItem {
  workspaceId: string;
  workspaceName: string;
  creditsPurchased: number;
  creditsUsed: number;
  messagesCount: number;
  seatFee: number;
}

interface BillingBreakdown {
  platformFee: number;
  totalSeatFees: number;
  totalCreditsPurchased: number;
  totalAmount: number;
  workspaces: WorkspaceBillingItem[];
  page: number;
  totalPages: number;
}

export default class EnterpriseBilling extends AuthenticatedCommand {
  static description = "Get billing breakdown by workspace";

  static examples = [
    "<%= config.bin %> enterprise billing",
    "<%= config.bin %> enterprise billing --page 2",
    "<%= config.bin %> enterprise billing --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    page: Flags.integer({
      description: "Page number",
      default: 1,
    }),
    limit: Flags.integer({
      description: "Results per page",
      default: 20,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(EnterpriseBilling);

    const response = await apiClient.get<BillingBreakdown>(
      "/api/v1/enterprise/billing/workspace-breakdown",
      { page: flags.page, limit: flags.limit },
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    header("Billing Breakdown");

    console.log();
    console.log(
      `  ${colors.dim("Platform Fee:")}  $${response.platformFee.toFixed(2)}/mo`,
    );
    console.log(
      `  ${colors.dim("Seat Fees:")}     $${response.totalSeatFees.toFixed(2)}/mo`,
    );
    console.log(
      `  ${colors.dim("Credits:")}       $${response.totalCreditsPurchased.toFixed(2)}`,
    );
    console.log(
      `  ${colors.bold("Total:")}         ${colors.primary("$" + response.totalAmount.toFixed(2))}`,
    );
    console.log();

    table(response.workspaces, [
      { header: "Workspace", key: "workspaceName", width: 24 },
      {
        header: "Seat Fee",
        key: "seatFee",
        width: 10,
        formatter: (v) => `$${Number(v).toFixed(2)}`,
      },
      {
        header: "Credits Bought",
        key: "creditsPurchased",
        width: 14,
        formatter: (v) => Number(v).toLocaleString(),
      },
      {
        header: "Credits Used",
        key: "creditsUsed",
        width: 12,
        formatter: (v) => Number(v).toLocaleString(),
      },
      {
        header: "Messages",
        key: "messagesCount",
        width: 10,
        formatter: (v) => Number(v).toLocaleString(),
      },
    ]);

    if (response.totalPages > 1) {
      console.log();
      console.log(
        colors.dim(
          `  Page ${response.page} of ${response.totalPages}. Use --page to navigate.`,
        ),
      );
    }
  }
}
