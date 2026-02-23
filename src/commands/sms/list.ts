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
  isSandbox: boolean;
  createdAt: string;
  deliveredAt?: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

interface ListMessagesResponse {
  data: Message[];
  pagination: Pagination;
  count: number;
}

export default class SmsList extends AuthenticatedCommand {
  static description = "List sent messages";

  static examples = [
    "<%= config.bin %> sms list",
    "<%= config.bin %> sms list --limit 10",
    "<%= config.bin %> sms list --page 2",
    "<%= config.bin %> sms list --status delivered",
    "<%= config.bin %> sms list --sandbox",
    "<%= config.bin %> sms list --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    limit: Flags.integer({
      char: "l",
      description: "Number of messages per page",
      default: 20,
    }),
    page: Flags.integer({
      char: "p",
      description: "Page number (starts at 1)",
    }),
    offset: Flags.integer({
      description: "Offset from start (alternative to --page)",
    }),
    status: Flags.string({
      char: "s",
      description: "Filter by status (queued, sent, delivered, failed, bounced, retrying)",
    }),
    sandbox: Flags.boolean({
      description: "Show sandbox/test messages (live keys only)",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(SmsList);

    const response = await apiClient.get<ListMessagesResponse>(
      "/api/v1/messages",
      {
        limit: flags.limit,
        ...(flags.page && { page: flags.page }),
        ...(flags.offset && { offset: flags.offset }),
        ...(flags.status && { status: flags.status }),
        ...(flags.sandbox && { sandbox: "true" }),
      },
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    if (response.data.length === 0) {
      info(flags.sandbox ? "No sandbox messages found" : "No messages found");
      return;
    }

    const pagination = response.pagination || {
      total: response.count,
      page: 1,
      totalPages: 1,
      hasMore: false,
    };
    const modeLabel = flags.sandbox ? "sandbox " : "";

    console.log();
    console.log(
      colors.dim(
        `Showing ${response.data.length} ${modeLabel}messages (page ${pagination.page} of ${pagination.totalPages}, ${pagination.total} total)`,
      ),
    );
    console.log();

    table(response.data, [
      {
        header: "ID",
        key: "id",
        width: 18,
        formatter: (v) => colors.dim(String(v).slice(0, 15) + "..."),
      },
      {
        header: "To",
        key: "to",
        width: 16,
        formatter: (v) => formatPhone(String(v)),
      },
      {
        header: "Status",
        key: "status",
        width: 11,
        formatter: (v) => formatStatus(String(v)),
      },
      {
        header: "Mode",
        key: "isSandbox",
        width: 6,
        formatter: (v) => (v ? colors.warning("test") : colors.success("live")),
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
      {
        header: "Sent",
        key: "createdAt",
        width: 12,
        formatter: (v) => formatRelativeTime(String(v)),
      },
    ]);

    // Show pagination hint if more pages available
    if (pagination.hasMore) {
      console.log();
      console.log(
        colors.dim(
          `  Use ${colors.code(`--page ${pagination.page + 1}`)} to see more`,
        ),
      );
    }
  }
}
