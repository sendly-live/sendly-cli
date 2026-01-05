import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import { json, colors, spinner, isJsonMode, table } from "../../lib/output.js";

interface PresetTemplate {
  id: string;
  name: string;
  text: string;
  preset_slug: string;
  description: string;
  variables: Array<{ key: string; type: string; fallback?: string }>;
}

interface PresetsResponse {
  templates: PresetTemplate[];
}

export default class TemplatesPresets extends AuthenticatedCommand {
  static description = "List available preset templates";

  static examples = [
    "<%= config.bin %> templates presets",
    "<%= config.bin %> templates presets --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    await this.parse(TemplatesPresets);

    const listSpinner = spinner("Fetching preset templates...");

    if (!isJsonMode()) {
      listSpinner.start();
    }

    try {
      const response = await apiClient.get<PresetsResponse>(
        "/api/v1/templates/presets",
        {},
        false, // No auth required
      );

      listSpinner.stop();

      if (isJsonMode()) {
        json(response);
        return;
      }

      console.log(colors.bold("\nAvailable Preset Templates\n"));
      console.log(
        colors.dim("Use these directly with verify send or clone to customize.\n"),
      );

      for (const template of response.templates) {
        console.log(colors.bold(template.name));
        console.log(`  ID: ${colors.code(template.id)}`);
        console.log(`  Slug: ${colors.primary(template.preset_slug)}`);
        console.log(`  Text: ${colors.dim(template.text)}`);
        console.log(
          `  Variables: ${template.variables.map((v) => colors.code(`{{${v.key}}}`)).join(", ")}`,
        );
        console.log();
      }

      console.log(colors.dim("Usage example:"));
      console.log(
        colors.code(
          '  sendly verify send --to "+1234567890" --template tpl_preset_2fa',
        ),
      );
    } catch (err: any) {
      listSpinner.stop();
      throw err;
    }
  }
}
