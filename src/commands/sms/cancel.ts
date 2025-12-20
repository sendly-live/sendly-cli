import { Args } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  success,
  error,
  spinner,
  json,
  isJsonMode,
} from "../../lib/output.js";

interface CancelResponse {
  id: string;
  status: string;
  message?: string;
}

export default class SmsCancel extends AuthenticatedCommand {
  static description = "Cancel a scheduled message";

  static examples = [
    "<%= config.bin %> sms cancel sched_abc123",
    "<%= config.bin %> sms cancel sched_abc123 --json",
  ];

  static args = {
    id: Args.string({
      description: "Scheduled message ID to cancel",
      required: true,
    }),
  };

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args } = await this.parse(SmsCancel);

    if (!args.id.trim()) {
      error("Scheduled message ID is required");
      this.exit(1);
    }

    const spin = spinner("Cancelling scheduled message...");
    spin.start();

    try {
      const response = await apiClient.delete<CancelResponse>(
        `/api/v1/messages/scheduled/${encodeURIComponent(args.id)}`
      );

      spin.stop();

      if (isJsonMode()) {
        json(response);
        return;
      }

      success("Scheduled message cancelled", {
        ID: response.id,
        Status: "cancelled",
      });
    } catch (err) {
      spin.stop();
      throw err;
    }
  }
}
