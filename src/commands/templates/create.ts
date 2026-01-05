import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  success,
  error,
  json,
  colors,
  spinner,
  isJsonMode,
} from "../../lib/output.js";

interface TemplateResponse {
  id: string;
  name: string;
  text: string;
  variables: Array<{ key: string; type: string; fallback?: string }>;
  is_preset: boolean;
  status: string;
  version: number;
  created_at: string;
}

export default class TemplatesCreate extends AuthenticatedCommand {
  static description = "Create a new SMS template";

  static examples = [
    '<%= config.bin %> templates create --name "My OTP" --text "Your code is {{code}}"',
    '<%= config.bin %> templates create --name "Login" --text "{{code}} is your {{app_name}} login code"',
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    name: Flags.string({
      char: "n",
      description: "Template name",
      required: true,
    }),
    text: Flags.string({
      char: "t",
      description: "Message text (use {{code}} and {{app_name}} variables)",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TemplatesCreate);

    const createSpinner = spinner("Creating template...");

    if (!isJsonMode()) {
      createSpinner.start();
    }

    try {
      const response = await apiClient.post<TemplateResponse>(
        "/api/v1/templates",
        {
          name: flags.name,
          text: flags.text,
        },
      );

      createSpinner.stop();

      if (isJsonMode()) {
        json(response);
        return;
      }

      success("Template created", {
        ID: colors.code(response.id),
        Name: response.name,
        Status: colors.dim(response.status),
        Variables: response.variables
          .map((v) => colors.code(`{{${v.key}}}`))
          .join(", ") || colors.dim("none"),
      });

      console.log();
      console.log(
        colors.dim(
          `Publish with: ${colors.code(`sendly templates publish ${response.id}`)}`,
        ),
      );
    } catch (err: any) {
      createSpinner.stop();

      if (err.message?.includes("1600 characters")) {
        error("Template text too long", {
          hint: "Maximum 1600 characters (10 SMS segments)",
        });
      } else {
        throw err;
      }
      this.exit(1);
    }
  }
}
