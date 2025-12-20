import { Args } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  keyValue,
  json,
  header,
  formatStatus,
  formatDate,
  formatCredits,
  formatPhone,
  colors,
  divider,
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
  error?: string;
  isSandbox: boolean;
}

export default class SmsGet extends AuthenticatedCommand {
  static description = "Get details of a specific message";

  static examples = [
    "<%= config.bin %> sms get msg_abc123",
    "<%= config.bin %> sms get msg_abc123 --json",
  ];

  static args = {
    id: Args.string({
      description: "Message ID",
      required: true,
    }),
  };

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args } = await this.parse(SmsGet);

    const message = await apiClient.get<Message>(
      `/api/v1/messages/${encodeURIComponent(args.id)}`
    );

    if (isJsonMode()) {
      json(message);
      return;
    }

    header("Message Details");

    keyValue({
      ID: message.id,
      To: formatPhone(message.to),
      From: message.from || colors.dim("(default)"),
      Status: formatStatus(message.status),
      Segments: message.segments,
      Credits: formatCredits(message.creditsUsed),
      Sandbox: message.isSandbox ? colors.warning("Yes") : "No",
      Created: formatDate(message.createdAt),
      ...(message.deliveredAt && {
        Delivered: formatDate(message.deliveredAt),
      }),
      ...(message.error && {
        Error: colors.error(message.error),
      }),
    });

    divider();
    console.log(colors.bold("Message Text:"));
    console.log(colors.dim("─".repeat(40)));
    console.log(message.text);
    console.log();
  }
}
