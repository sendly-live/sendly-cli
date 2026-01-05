import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import { json, colors, spinner, isJsonMode, table } from "../../lib/output.js";

interface Template {
  id: string;
  name: string;
  text: string;
  is_preset: boolean;
  preset_slug: string | null;
  status: string;
  version: number;
  created_at: string;
}

interface ListResponse {
  templates: Template[];
}

export default class TemplatesList extends AuthenticatedCommand {
  static description = "List your SMS templates";

  static examples = [
    "<%= config.bin %> templates list",
    "<%= config.bin %> templates list --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    await this.parse(TemplatesList);

    const listSpinner = spinner("Fetching templates...");

    if (!isJsonMode()) {
      listSpinner.start();
    }

    try {
      const response = await apiClient.get<ListResponse>("/api/v1/templates");

      listSpinner.stop();

      if (isJsonMode()) {
        json(response);
        return;
      }

      if (response.templates.length === 0) {
        console.log(colors.dim("No templates found."));
        console.log(
          colors.dim(
            `View presets with: ${colors.code("sendly templates presets")}`,
          ),
        );
        return;
      }

      const rows = response.templates.map((t) => ({
        ...t,
        typeDisplay: t.is_preset ? colors.primary("preset") : t.status === "published" ? colors.success("published") : colors.dim("draft"),
      }));

      table(rows, [
        { header: "ID", key: "id", width: 20, formatter: (v) => colors.code(String(v).slice(0, 16) + "...") },
        { header: "Name", key: "name", width: 20 },
        { header: "Type", key: "typeDisplay", width: 12 },
        { header: "Ver", key: "version", width: 5 },
        { header: "Text", key: "text", width: 40, formatter: (v) => String(v).length > 40 ? String(v).slice(0, 37) + "..." : String(v) },
      ]);
    } catch (err: any) {
      listSpinner.stop();
      throw err;
    }
  }
}
