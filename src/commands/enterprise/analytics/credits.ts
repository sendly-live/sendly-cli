import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import {
  json,
  table,
  colors,
  header,
  isJsonMode,
  formatCredits,
} from "../../../lib/output.js";

interface CreditDataPoint {
  date: string;
  used: number;
  allocated: number;
  balance: number;
}

interface CreditsAnalyticsResponse {
  period: string;
  data: CreditDataPoint[];
  totals: {
    totalUsed: number;
    totalAllocated: number;
    currentBalance: number;
  };
}

export default class AnalyticsCredits extends AuthenticatedCommand {
  static description = "Get credit usage analytics over time";

  static examples = [
    "<%= config.bin %> enterprise analytics credits",
    "<%= config.bin %> enterprise analytics credits --period 30d",
    "<%= config.bin %> enterprise analytics credits --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    period: Flags.string({
      char: "p",
      description: "Time period (7d, 30d, 90d)",
      options: ["7d", "30d", "90d"],
      default: "7d",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AnalyticsCredits);

    const response = await apiClient.get<CreditsAnalyticsResponse>(
      "/api/v1/enterprise/analytics/credits",
      { period: flags.period },
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    header(`Credit Usage (${flags.period})`);

    console.log();
    console.log(
      `  ${colors.dim("Total Used:")} ${formatCredits(response.totals.totalUsed)}  ` +
        `${colors.dim("Allocated:")} ${formatCredits(response.totals.totalAllocated)}  ` +
        `${colors.dim("Balance:")} ${colors.primary(formatCredits(response.totals.currentBalance))}`,
    );
    console.log();

    table(response.data, [
      { header: "Date", key: "date", width: 12 },
      {
        header: "Used",
        key: "used",
        width: 12,
        formatter: (v) => Number(v).toLocaleString(),
      },
      {
        header: "Allocated",
        key: "allocated",
        width: 12,
        formatter: (v) =>
          Number(v) > 0
            ? colors.success(`+${Number(v).toLocaleString()}`)
            : colors.dim("0"),
      },
      {
        header: "Balance",
        key: "balance",
        width: 12,
        formatter: (v) => colors.primary(Number(v).toLocaleString()),
      },
    ]);
  }
}
