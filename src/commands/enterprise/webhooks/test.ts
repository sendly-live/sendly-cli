import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import { success, json, colors, isJsonMode, spinner } from "../../../lib/output.js";

interface TestResponse {
  success: boolean;
  statusCode: number;
  responseTime: number;
  error?: string;
}

export default class EnterpriseWebhooksTest extends AuthenticatedCommand {
  static description = "Send a test event to the enterprise webhook";

  static examples = [
    "<%= config.bin %> enterprise webhooks test",
    "<%= config.bin %> enterprise webhooks test --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const spin = spinner("Sending test webhook...");
    spin.start();

    const response = await apiClient.post<TestResponse>(
      "/api/v1/enterprise/webhooks/test",
    );

    if (response.success) {
      spin.succeed("Webhook delivered");
    } else {
      spin.fail("Webhook delivery failed");
    }

    if (isJsonMode()) {
      json(response);
      return;
    }

    if (response.success) {
      success("Test webhook delivered", {
        "Status Code": String(response.statusCode),
        "Response Time": `${response.responseTime}ms`,
      });
    } else {
      console.log();
      console.log(`  ${colors.error("Status Code:")} ${response.statusCode}`);
      if (response.error) {
        console.log(`  ${colors.error("Error:")} ${response.error}`);
      }
    }
  }
}
