import { BaseCommand } from "../lib/base-command.js";
import { logout } from "../lib/auth.js";
import { success, info } from "../lib/output.js";
import { isAuthenticated } from "../lib/config.js";

export default class Logout extends BaseCommand {
  static description = "Log out of Sendly";

  static examples = ["<%= config.bin %> logout"];

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    if (!isAuthenticated()) {
      info("Not currently logged in");
      return;
    }

    logout();
    success("Logged out successfully");
  }
}
