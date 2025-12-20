import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  table,
  json,
  info,
  formatStatus,
  formatRelativeTime,
  colors,
  isJsonMode,
} from "../../lib/output.js";

interface ApiKey {
  id: string;
  keyId: string;
  name: string;
  keyPrefix: string;
  type: "test" | "live";
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  revokedAt?: string;
}

export default class KeysList extends AuthenticatedCommand {
  static description = "List your API keys";

  static examples = [
    "<%= config.bin %> keys list",
    "<%= config.bin %> keys list --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const keys = await apiClient.get<ApiKey[]>("/api/keys");

    if (isJsonMode()) {
      json(keys);
      return;
    }

    if (keys.length === 0) {
      info("No API keys found");
      console.log();
      console.log(`  Create one with ${colors.code("sendly keys create")}`);
      return;
    }

    console.log();

    table(keys, [
      {
        header: "Name",
        key: "name",
        width: 20,
      },
      {
        header: "Key ID",
        key: "keyId",
        width: 18,
        formatter: (v) => colors.dim(String(v)),
      },
      {
        header: "Prefix",
        key: "keyPrefix",
        width: 16,
        formatter: (v) => colors.code(String(v) + "..."),
      },
      {
        header: "Type",
        key: "type",
        width: 8,
        formatter: (v) =>
          v === "test" ? colors.warning("test") : colors.success("live"),
      },
      {
        header: "Status",
        key: "isActive",
        width: 10,
        formatter: (v) =>
          v ? colors.success("active") : colors.error("revoked"),
      },
      {
        header: "Last Used",
        key: "lastUsedAt",
        width: 12,
        formatter: (v) => (v ? formatRelativeTime(String(v)) : colors.dim("never")),
      },
    ]);
  }
}
