import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  table,
  json,
  info,
  formatRelativeTime,
  colors,
  isJsonMode,
} from "../../lib/output.js";

interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  type: "purchase" | "usage" | "bonus" | "refund";
  description: string;
  created_at: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
}

export default class CreditsHistory extends AuthenticatedCommand {
  static description = "View credit transaction history";

  static examples = [
    "<%= config.bin %> credits history",
    "<%= config.bin %> credits history --limit 10",
    "<%= config.bin %> credits history --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    limit: Flags.integer({
      char: "l",
      description: "Number of transactions to show",
      default: 20,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CreditsHistory);

    const response = await apiClient.get<TransactionsResponse>(
      "/api/v1/credits/transactions",
      { limit: flags.limit },
    );

    if (isJsonMode()) {
      json(response.transactions);
      return;
    }

    if (response.transactions.length === 0) {
      info("No transactions found");
      return;
    }

    console.log();

    table(response.transactions, [
      {
        header: "Type",
        key: "type",
        width: 10,
        formatter: (v) => {
          switch (v) {
            case "purchase":
              return colors.success("purchase");
            case "usage":
              return colors.warning("usage");
            case "bonus":
              return colors.primary("bonus");
            case "refund":
              return colors.info("refund");
            default:
              return String(v);
          }
        },
      },
      {
        header: "Amount",
        key: "amount",
        width: 12,
        formatter: (v) => {
          const num = v as number;
          if (num > 0) {
            return colors.success(`+${num.toLocaleString()}`);
          }
          return colors.error(num.toLocaleString());
        },
      },
      {
        header: "Balance",
        key: "balance_after",
        width: 12,
        formatter: (v) => `${(v as number).toLocaleString()}`,
      },
      {
        header: "Description",
        key: "description",
        width: 35,
        formatter: (v) => {
          const desc = String(v);
          return desc.length > 32 ? desc.slice(0, 32) + "..." : desc;
        },
      },
      {
        header: "When",
        key: "created_at",
        width: 12,
        formatter: (v) => formatRelativeTime(String(v)),
      },
    ]);
  }
}
