import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  table,
  json,
  info,
  formatStatus,
  formatRelativeTime,
  formatPhone,
  colors,
  isJsonMode,
} from "../../lib/output.js";

interface Message {
  id: string;
  to: string;
  from: string;
  text: string;
  status: string;
  segments: number;
  creditsUsed: number;
  createdAt: string;
  deliveredAt?: string;
}

interface ListMessagesResponse {
  data: Message[];
  count: number;
}

export default class SmsList extends AuthenticatedCommand {
  static description = "List sent messages";

  static examples = [
    "<%= config.bin %> sms list",
    "<%= config.bin %> sms list --limit 10",
    "<%= config.bin %> sms list --status delivered",
    "<%= config.bin %> sms list --json",
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
      description: "Filter by status (queued, sent, delivered, failed)",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(SmsList);

    const response = await apiClient.get<ListMessagesResponse>(
      "/api/v1/messages",
      {
        limit: flags.limit,
        ...(flags.status && { status: flags.status }),
      }
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    if (response.data.length === 0) {
      info("No messages found");
      return;
    }

    console.log();
    console.log(
      colors.dim(`Showing ${response.data.length} of ${response.count} messages`)
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
        header: "Text",
        key: "text",
        width: 30,
        formatter: (v) => {
          const text = String(v);
          return text.length > 27 ? text.slice(0, 27) + "..." : text;
        },
      },
      {
        header: "Sent",
        key: "createdAt",
        width: 12,
        formatter: (v) => formatRelativeTime(String(v)),
      },
    ]);
  }
}
