import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import { json, colors, spinner, isJsonMode, table } from "../../lib/output.js";

interface Verification {
  id: string;
  status: string;
  phone: string;
  delivery_status: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
  sandbox: boolean;
}

interface ListResponse {
  verifications: Verification[];
  pagination: {
    limit: number;
    has_more: boolean;
  };
}

export default class VerifyList extends AuthenticatedCommand {
  static description = "List recent verifications";

  static examples = [
    "<%= config.bin %> verify list",
    "<%= config.bin %> verify list --limit 10",
    "<%= config.bin %> verify list --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    limit: Flags.integer({
      char: "n",
      description: "Number of verifications to show",
      default: 20,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(VerifyList);

    const listSpinner = spinner("Fetching verifications...");

    if (!isJsonMode()) {
      listSpinner.start();
    }

    try {
      const response = await apiClient.get<ListResponse>("/api/v1/verify", {
        limit: flags.limit,
      });

      listSpinner.stop();

      if (isJsonMode()) {
        json(response);
        return;
      }

      if (response.verifications.length === 0) {
        console.log(colors.dim("No verifications found."));
        console.log(
          colors.dim(
            `Send one with: ${colors.code('sendly verify send --to "+1234567890"')}`,
          ),
        );
        return;
      }

      const statusColor = (status: string) => {
        switch (status) {
          case "verified":
            return colors.success(status);
          case "pending":
            return colors.primary(status);
          case "expired":
            return colors.dim(status);
          default:
            return colors.error(status);
        }
      };

      const rows = response.verifications.map((v) => ({
        ...v,
        attemptsDisplay: `${v.attempts}/${v.max_attempts}`,
      }));

      table(rows, [
        { header: "ID", key: "id", width: 20, formatter: (v) => colors.code(String(v).slice(0, 16) + "...") },
        { header: "Phone", key: "phone", width: 16 },
        { header: "Status", key: "status", width: 12, formatter: (v) => statusColor(String(v)) },
        { header: "Attempts", key: "attemptsDisplay", width: 10 },
        { header: "Sandbox", key: "sandbox", width: 8, formatter: (v) => v ? colors.dim("yes") : "" },
        { header: "Created", key: "created_at", width: 20, formatter: (v) => new Date(String(v)).toLocaleString() },
      ]);

      if (response.pagination.has_more) {
        console.log(
          colors.dim(
            `\nShowing ${response.verifications.length} verifications. Use --limit to see more.`,
          ),
        );
      }
    } catch (err: any) {
      listSpinner.stop();
      throw err;
    }
  }
}
