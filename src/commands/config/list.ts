import { BaseCommand } from "../../lib/base-command.js";
import {
  getConfig,
  getConfigPath,
  type SendlyConfig,
} from "../../lib/config.js";
import { colors, keyValue, json, isJsonMode, header } from "../../lib/output.js";

export default class ConfigList extends BaseCommand {
  static description = "List all configuration values";

  static examples = [
    "<%= config.bin %> config list",
    "<%= config.bin %> config list --json",
  ];

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const config = getConfig();

    if (isJsonMode()) {
      // Don't expose sensitive data in JSON output
      const safeConfig = {
        environment: config.environment,
        baseUrl: config.baseUrl,
        defaultFormat: config.defaultFormat,
        colorEnabled: config.colorEnabled,
        hasApiKey: !!config.apiKey,
        hasAccessToken: !!config.accessToken,
        configPath: getConfigPath(),
      };
      json(safeConfig);
      return;
    }

    header("Configuration");

    const displayConfig: Record<string, string> = {
      Environment: config.environment === "live"
        ? colors.success(config.environment)
        : colors.warning(config.environment),
      "Base URL": config.baseUrl,
      "Output Format": config.defaultFormat,
      "Colors": config.colorEnabled ? colors.success("enabled") : colors.dim("disabled"),
      "API Key": config.apiKey ? colors.success("configured") : colors.dim("not set"),
      "Access Token": config.accessToken ? colors.success("configured") : colors.dim("not set"),
    };

    keyValue(displayConfig);

    console.log();
    console.log(colors.dim(`Config file: ${getConfigPath()}`));
  }
}
