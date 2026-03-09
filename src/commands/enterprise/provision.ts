import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  success,
  json,
  table,
  colors,
  isJsonMode,
  spinner,
} from "../../lib/output.js";
import * as fs from "node:fs";

interface ProvisionResponse {
  workspace: { id: string; name: string; slug: string };
  verification?: { status: string };
  credits?: { balance: number };
  key?: { id: string; name: string; key: string; keyPrefix: string; type: string };
  webhook?: { url: string };
  optInPage?: { id: string; slug: string };
}

interface BulkProvisionItem {
  name: string;
  credits?: number;
  inheritVerificationFrom?: string;
  webhookUrl?: string;
  createApiKey?: boolean;
}

interface BulkResultItem {
  name: string;
  success: boolean;
  workspaceId?: string;
  error?: string;
}

interface BulkProvisionResponse {
  results: BulkResultItem[];
  totalRequested: number;
  totalCreated: number;
  totalFailed: number;
}

export default class EnterpriseProvision extends AuthenticatedCommand {
  static description = "Provision a new workspace with full setup, or bulk provision from a JSON file";

  static examples = [
    '<%= config.bin %> enterprise provision --name "Acme Corp" --credits 1000',
    '<%= config.bin %> enterprise provision --name "Acme Corp" --credits 500 --inherit-from org_abc123 --webhook-url https://example.com/hook',
    "<%= config.bin %> enterprise provision --bulk workspaces.json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    name: Flags.string({
      char: "n",
      description: "Workspace name (single provision)",
    }),
    credits: Flags.integer({
      char: "c",
      description: "Initial credits to allocate",
    }),
    "inherit-from": Flags.string({
      description: "Workspace ID to inherit verification from",
    }),
    "webhook-url": Flags.string({
      description: "Webhook URL for the workspace",
    }),
    "create-key": Flags.boolean({
      description: "Create an API key for the workspace",
      default: false,
    }),
    bulk: Flags.string({
      char: "b",
      description: "Path to JSON file for bulk provisioning (up to 50 workspaces)",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(EnterpriseProvision);

    if (flags.bulk) {
      await this.bulkProvision(flags.bulk);
      return;
    }

    if (!flags.name) {
      this.error("--name is required for single provisioning. Use --bulk for batch provisioning.");
    }

    const spin = spinner("Provisioning workspace...");
    spin.start();

    const body: Record<string, unknown> = { name: flags.name };
    if (flags.credits) body.credits = flags.credits;
    if (flags["inherit-from"]) body.inheritVerificationFrom = flags["inherit-from"];
    if (flags["webhook-url"]) body.webhookUrl = flags["webhook-url"];
    if (flags["create-key"]) body.createApiKey = true;

    const response = await apiClient.post<ProvisionResponse>(
      "/api/v1/enterprise/workspaces/provision",
      body,
    );

    spin.succeed("Workspace provisioned");

    if (isJsonMode()) {
      json(response);
      return;
    }

    const details: Record<string, string> = {
      ID: response.workspace.id,
      Name: response.workspace.name,
      Slug: response.workspace.slug,
    };

    if (response.verification) {
      details["Verification"] = response.verification.status === "approved"
        ? colors.success("inherited")
        : colors.warning(response.verification.status);
    }
    if (response.credits) {
      details["Credits"] = `${response.credits.balance.toLocaleString()} credits`;
    }
    if (response.key) {
      details["API Key"] = response.key.key;
    }
    if (response.webhook) {
      details["Webhook"] = response.webhook.url;
    }

    success("Workspace provisioned", details);

    if (response.key) {
      console.log();
      console.log(
        colors.warning("  Save the API key now — it won't be shown again."),
      );
    }
  }

  private async bulkProvision(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      this.error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    let workspaces: BulkProvisionItem[];

    try {
      workspaces = JSON.parse(content);
    } catch {
      this.error("Invalid JSON file. Expected an array of workspace objects.");
    }

    if (!Array.isArray(workspaces)) {
      this.error("JSON file must contain an array of workspace objects.");
    }

    if (workspaces.length > 50) {
      this.error("Bulk provisioning supports up to 50 workspaces at a time.");
    }

    const spin = spinner(`Provisioning ${workspaces.length} workspaces...`);
    spin.start();

    const response = await apiClient.post<BulkProvisionResponse>(
      "/api/v1/enterprise/workspaces/provision/bulk",
      { workspaces },
    );

    spin.succeed(
      `Provisioned ${response.totalCreated}/${response.totalRequested} workspaces`,
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    console.log();
    table(response.results, [
      { header: "Name", key: "name", width: 24 },
      {
        header: "Status",
        key: "success",
        width: 10,
        formatter: (v) =>
          v ? colors.success("created") : colors.error("failed"),
      },
      {
        header: "Workspace ID",
        key: "workspaceId",
        width: 20,
        formatter: (v) => (v ? colors.dim(String(v)) : colors.dim("—")),
      },
      {
        header: "Error",
        key: "error",
        width: 30,
        formatter: (v) => (v ? colors.error(String(v)) : ""),
      },
    ]);

    if (response.totalFailed > 0) {
      console.log();
      console.log(
        colors.warning(
          `  ${response.totalFailed} workspace(s) failed to provision.`,
        ),
      );
    }
  }
}
