import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import { success, json, colors, isJsonMode, spinner } from "../../../lib/output.js";

interface CreateWorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export default class WorkspacesCreate extends AuthenticatedCommand {
  static description = "Create a new enterprise workspace";

  static examples = [
    '<%= config.bin %> enterprise workspaces create --name "Acme Corp"',
    '<%= config.bin %> enterprise workspaces create --name "Acme Corp" --json',
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    name: Flags.string({
      char: "n",
      description: "Workspace name",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(WorkspacesCreate);

    const spin = spinner("Creating workspace...");
    spin.start();

    const workspace = await apiClient.post<CreateWorkspaceResponse>(
      "/api/v1/enterprise/workspaces",
      { name: flags.name },
    );

    spin.succeed("Workspace created");

    if (isJsonMode()) {
      json(workspace);
      return;
    }

    success("Workspace created", {
      ID: workspace.id,
      Name: workspace.name,
      Slug: workspace.slug,
      Status: colors.success(workspace.status),
    });
  }
}
