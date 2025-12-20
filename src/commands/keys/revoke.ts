import { Args, Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import { success, error, json, colors, isJsonMode } from "../../lib/output.js";
import inquirer from "inquirer";

export default class KeysRevoke extends AuthenticatedCommand {
  static description = "Revoke an API key";

  static examples = [
    "<%= config.bin %> keys revoke key_abc123",
    '<%= config.bin %> keys revoke key_abc123 --reason "Compromised"',
    "<%= config.bin %> keys revoke key_abc123 --yes",
  ];

  static args = {
    keyId: Args.string({
      description: "Key ID to revoke (e.g., key_abc123)",
      required: true,
    }),
  };

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    reason: Flags.string({
      char: "r",
      description: "Reason for revoking the key",
    }),
    yes: Flags.boolean({
      char: "y",
      description: "Skip confirmation prompt",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(KeysRevoke);

    // Confirm revocation
    if (!flags.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `Are you sure you want to revoke ${colors.code(args.keyId)}? This cannot be undone.`,
          default: false,
        },
      ]);

      if (!confirm) {
        error("Revocation cancelled");
        return;
      }
    }

    // Find the key by keyId to get its internal id
    const keys = await apiClient.get<Array<{ id: string; keyId: string }>>(
      "/api/keys"
    );
    const key = keys.find((k) => k.keyId === args.keyId);

    if (!key) {
      error(`Key not found: ${args.keyId}`);
      this.exit(1);
    }

    await apiClient.patch(`/api/keys/${key.id}/revoke`, {
      reason: flags.reason || "Revoked via CLI",
    });

    if (isJsonMode()) {
      json({ success: true, keyId: args.keyId, revoked: true });
      return;
    }

    success("API key revoked", {
      "Key ID": args.keyId,
      Reason: flags.reason || "Revoked via CLI",
    });
  }
}
