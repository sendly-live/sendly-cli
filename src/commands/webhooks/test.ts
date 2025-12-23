import { Args } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  success,
  error,
  spinner,
  json,
  colors,
  keyValue,
  isJsonMode,
} from "../../lib/output.js";

interface TestWebhookResponse {
  id: string;
  delivery_id: string;
  webhook_url: string;
  event_type: string;
  status: string;
  response_time: number;
  status_code?: number;
  response_body?: string;
  error?: string;
  delivered_at: string;
}

export default class WebhooksTest extends AuthenticatedCommand {
  static description = "Send a test event to a webhook";

  static examples = [
    "<%= config.bin %> webhooks test whk_abc123",
    "<%= config.bin %> webhooks test whk_abc123 --json",
  ];

  static args = {
    id: Args.string({
      description: "Webhook ID to test",
      required: true,
    }),
  };

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args } = await this.parse(WebhooksTest);

    const testSpinner = spinner("Sending test event...");
    testSpinner.start();

    try {
      const result = await apiClient.post<TestWebhookResponse>(
        `/api/v1/webhooks/${args.id}/test`,
      );

      testSpinner.stop();

      if (isJsonMode()) {
        json(result);
        return;
      }

      if (result.status === "delivered") {
        success("Test event delivered", {
          "Delivery ID": result.delivery_id,
          "Webhook URL": result.webhook_url,
          "Event Type": result.event_type,
          "Response Time": `${result.response_time}ms`,
          "Status Code": String(result.status_code),
          "Delivered At": result.delivered_at,
        });

        if (result.response_body) {
          console.log();
          console.log(colors.dim("Response Body:"));
          console.log(
            result.response_body.substring(0, 200) +
              (result.response_body.length > 200 ? "..." : ""),
          );
        }
      } else {
        error("Test event failed", {
          "Delivery ID": result.delivery_id,
          "Webhook URL": result.webhook_url,
          Status: result.status,
          Error: result.error || "Unknown error",
          ...(result.status_code && {
            "Status Code": String(result.status_code),
          }),
        });
      }
    } catch (err) {
      testSpinner.stop();

      if (err instanceof Error && err.message.includes("404")) {
        error(`Webhook not found: ${args.id}`);
      } else {
        if (err instanceof Error) {
          error(`Failed to send test event: ${err.message}`);
        } else {
          error(`Failed to send test event: ${String(err)}`);
        }
      }
      this.exit(1);
    }
  }
}
