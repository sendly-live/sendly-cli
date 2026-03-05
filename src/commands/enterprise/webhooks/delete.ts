import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import { success, error, json, isJsonMode } from "../../../lib/output.js";
import inquirer from "inquirer";

export default class EnterpriseWebhooksDelete extends AuthenticatedCommand {
  static description = "Delete the enterprise webhook";

  static examples = [
    "<%= config.bin %> enterprise webhooks delete",
    "<%= config.bin %> enterprise webhooks delete --yes",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    yes: Flags.boolean({
      char: "y",
      description: "Skip confirmation prompt",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(EnterpriseWebhooksDelete);

    if (!flags.yes && !isJsonMode()) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Delete the enterprise webhook? You will stop receiving events.",
          default: false,
        },
      ]);

      if (!confirm) {
        error("Deletion cancelled");
        return;
      }
    }

    await apiClient.delete("/api/v1/enterprise/webhooks");

    if (isJsonMode()) {
      json({ success: true });
      return;
    }

    success("Enterprise webhook deleted");
  }
}
