import { Args } from "@oclif/core";
import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import {
  json,
  keyValue,
  colors,
  header,
  isJsonMode,
  formatDate,
  formatCredits,
} from "../../../lib/output.js";

interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  creditBalance: number;
  verificationStatus: string;
  phoneNumber?: string;
  memberCount: number;
  messagesSent: number;
  messagesDelivered: number;
  createdAt: string;
}

export default class WorkspacesGet extends AuthenticatedCommand {
  static description = "Get details of an enterprise workspace";

  static examples = [
    "<%= config.bin %> enterprise workspaces get org_abc123",
    "<%= config.bin %> enterprise workspaces get org_abc123 --json",
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
    const { args } = await this.parse(WorkspacesGet);

    const workspace = await apiClient.get<WorkspaceDetail>(
      `/api/v1/enterprise/workspaces/${args.workspaceId}`,
    );

    if (isJsonMode()) {
      json(workspace);
      return;
    }

    header(`Workspace: ${workspace.name}`);

    const statusColor =
      workspace.status === "active" ? colors.success : colors.error;

    keyValue({
      ID: colors.dim(workspace.id),
      Name: workspace.name,
      Slug: workspace.slug,
      Status: statusColor(workspace.status),
      Verification:
        workspace.verificationStatus === "approved"
          ? colors.success("verified")
          : colors.warning(workspace.verificationStatus),
      Phone: workspace.phoneNumber || colors.dim("not assigned"),
      Credits: formatCredits(workspace.creditBalance),
      Members: String(workspace.memberCount),
      "Messages Sent": workspace.messagesSent.toLocaleString(),
      "Messages Delivered": workspace.messagesDelivered.toLocaleString(),
      "Delivery Rate":
        workspace.messagesSent > 0
          ? `${((workspace.messagesDelivered / workspace.messagesSent) * 100).toFixed(1)}%`
          : colors.dim("n/a"),
      Created: formatDate(workspace.createdAt),
    });
  }
}
