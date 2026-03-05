import { Args } from "@oclif/core";
import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import {
  json,
  keyValue,
  colors,
  header,
  isJsonMode,
} from "../../../lib/output.js";

interface QuotaSettings {
  dailyLimit: number | null;
  monthlyLimit: number | null;
  dailyUsed: number;
  monthlyUsed: number;
}

export default class QuotaGet extends AuthenticatedCommand {
  static description = "Get message quota for an enterprise workspace";

  static examples = [
    "<%= config.bin %> enterprise quota get org_abc123",
    "<%= config.bin %> enterprise quota get org_abc123 --json",
  ];

  static args = {
    workspaceId: Args.string({
      description: "Workspace ID",
      required: true,
    }),
  };

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args } = await this.parse(QuotaGet);

    const quota = await apiClient.get<QuotaSettings>(
      `/api/v1/enterprise/workspaces/${args.workspaceId}/quota`,
    );

    if (isJsonMode()) {
      json(quota);
      return;
    }

    header("Workspace Quota");

    keyValue({
      "Daily Limit": quota.dailyLimit !== null
        ? quota.dailyLimit.toLocaleString()
        : colors.dim("unlimited"),
      "Daily Used": `${quota.dailyUsed.toLocaleString()}${quota.dailyLimit ? ` / ${quota.dailyLimit.toLocaleString()}` : ""}`,
      "Monthly Limit": quota.monthlyLimit !== null
        ? quota.monthlyLimit.toLocaleString()
        : colors.dim("unlimited"),
      "Monthly Used": `${quota.monthlyUsed.toLocaleString()}${quota.monthlyLimit ? ` / ${quota.monthlyLimit.toLocaleString()}` : ""}`,
    });
  }
}
