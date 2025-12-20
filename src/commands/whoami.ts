import { BaseCommand } from "../lib/base-command.js";
import { getAuthInfo } from "../lib/auth.js";
import { success, info, keyValue, colors, json } from "../lib/output.js";
import { getConfigValue, getConfigPath } from "../lib/config.js";

export default class Whoami extends BaseCommand {
  static description = "Show current authentication status";

  static examples = ["<%= config.bin %> whoami"];

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Whoami);

    const authInfo = await getAuthInfo();

    if (flags.json) {
      json({
        authenticated: authInfo.authenticated,
        email: authInfo.email,
        userId: authInfo.userId,
        environment: authInfo.environment,
        keyType: authInfo.keyType,
        configPath: getConfigPath(),
      });
      return;
    }

    if (!authInfo.authenticated) {
      info("Not logged in");
      console.log();
      console.log(`  Run ${colors.code("sendly login")} to authenticate`);
      return;
    }

    success("Authenticated");
    console.log();

    const displayData: Record<string, string> = {
      Environment: colors.primary(authInfo.environment),
    };

    if (authInfo.email) {
      displayData["Email"] = authInfo.email;
    }

    if (authInfo.keyType) {
      displayData["Key Type"] = authInfo.keyType === "test"
        ? colors.warning("test")
        : colors.success("live");
    }

    if (authInfo.userId) {
      displayData["User ID"] = colors.dim(authInfo.userId);
    }

    displayData["Config"] = colors.dim(getConfigPath());

    keyValue(displayData);
  }
}
