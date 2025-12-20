import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  table,
  json,
  info,
  formatStatus,
  formatPhone,
  colors,
  isJsonMode,
} from "../../lib/output.js";

interface ScheduledMessage {
  id: string;
  to: string;
  from?: string;
  text: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
}

interface ListScheduledResponse {
  data: ScheduledMessage[];
  count: number;
}

export default class SmsScheduled extends AuthenticatedCommand {
  static description = "List scheduled messages";

  static examples = [
    "<%= config.bin %> sms scheduled",
    "<%= config.bin %> sms scheduled --limit 10",
    "<%= config.bin %> sms scheduled --status scheduled",
    "<%= config.bin %> sms scheduled --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    limit: Flags.integer({
      char: "l",
      description: "Number of messages to show",
      default: 20,
    }),
    status: Flags.string({
      char: "s",
      description: "Filter by status (scheduled, sent, cancelled, failed)",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(SmsScheduled);

    const response = await apiClient.get<ListScheduledResponse>(
      "/api/v1/messages/scheduled",
      {
        limit: flags.limit,
        ...(flags.status && { status: flags.status }),
      },
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    if (response.data.length === 0) {
      info("No scheduled messages found");
      return;
    }

    console.log();
    console.log(
      colors.dim(
        `Showing ${response.data.length} of ${response.count} scheduled messages`,
      ),
    );
    console.log();

    table(response.data, [
      {
        header: "ID",
        key: "id",
        width: 20,
        formatter: (v) => colors.dim(String(v).slice(0, 16) + "..."),
      },
      {
        header: "To",
        key: "to",
        width: 18,
        formatter: (v) => formatPhone(String(v)),
      },
      {
        header: "Status",
        key: "status",
        width: 12,
        formatter: (v) => formatStatus(String(v)),
      },
      {
        header: "Scheduled For",
        key: "scheduledAt",
        width: 20,
        formatter: (v) => {
          const date = new Date(String(v));
          return colors.code(date.toLocaleString());
        },
      },
      {
        header: "Text",
        key: "text",
        width: 25,
        formatter: (v) => {
          const text = String(v);
          return text.length > 22 ? text.slice(0, 22) + "..." : text;
        },
      },
    ]);
  }
}
