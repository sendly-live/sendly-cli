import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import {
  table,
  json,
  info,
  colors,
  isJsonMode,
  formatRelativeTime,
  formatCredits,
} from "../../../lib/output.js";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  creditBalance: number;
  verificationStatus: string;
  memberCount: number;
  createdAt: string;
}

export default class WorkspacesList extends AuthenticatedCommand {
  static description = "List all enterprise workspaces";

  static examples = [
    "<%= config.bin %> enterprise workspaces list",
    "<%= config.bin %> enterprise workspaces list --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const workspaces = await apiClient.get<Workspace[]>(
      "/api/v1/enterprise/workspaces",
    );

    if (isJsonMode()) {
      json(workspaces);
      return;
    }

    if (workspaces.length === 0) {
      info("No workspaces found");
      console.log();
      console.log(
        `  Create one with ${colors.code("sendly enterprise workspaces create")}`,
      );
      return;
    }

    console.log();
    table(workspaces, [
      { header: "Name", key: "name", width: 24 },
      {
        header: "ID",
        key: "id",
        width: 18,
        formatter: (v) => colors.dim(String(v).slice(0, 16)),
      },
      {
        header: "Status",
        key: "status",
        width: 12,
        formatter: (v) =>
          v === "active"
            ? colors.success("active")
            : v === "suspended"
              ? colors.error("suspended")
              : colors.warning(String(v)),
      },
      {
        header: "Verification",
        key: "verificationStatus",
        width: 14,
        formatter: (v) =>
          v === "approved"
            ? colors.success("verified")
            : v === "pending"
              ? colors.warning("pending")
              : colors.dim(String(v)),
      },
      {
        header: "Credits",
        key: "creditBalance",
        width: 12,
        formatter: (v) => formatCredits(Number(v)),
      },
      {
        header: "Members",
        key: "memberCount",
        width: 8,
      },
      {
        header: "Created",
        key: "createdAt",
        width: 12,
        formatter: (v) => formatRelativeTime(String(v)),
      },
    ]);
  }
}
