import { Args } from "@oclif/core";
import { BaseCommand } from "../../lib/base-command.js";
import { getConfigValue, type SendlyConfig } from "../../lib/config.js";
import { colors, json, isJsonMode } from "../../lib/output.js";

const ALLOWED_KEYS: (keyof SendlyConfig)[] = [
  "environment",
  "baseUrl",
  "defaultFormat",
  "colorEnabled",
];

export default class ConfigGet extends BaseCommand {
  static description = "Get a configuration value";

  static examples = [
    "<%= config.bin %> config get environment",
    "<%= config.bin %> config get baseUrl",
  ];

  static args = {
    key: Args.string({
      description: "Configuration key",
      required: true,
      options: ALLOWED_KEYS as string[],
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigGet);

    const key = args.key as keyof SendlyConfig;
    const value = getConfigValue(key);

    if (isJsonMode()) {
      json({ [key]: value });
      return;
    }

    console.log(`${colors.dim(key + ":")} ${colors.primary(String(value))}`);
  }
}
