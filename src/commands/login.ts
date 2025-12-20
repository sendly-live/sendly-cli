import { Flags } from "@oclif/core";
import { BaseCommand } from "../lib/base-command.js";
import { browserLogin, apiKeyLogin } from "../lib/auth.js";
import { success, error, colors, info } from "../lib/output.js";
import { isAuthenticated } from "../lib/config.js";
import inquirer from "inquirer";

export default class Login extends BaseCommand {
  static description = "Authenticate with Sendly";

  static examples = [
    "<%= config.bin %> login",
    "<%= config.bin %> login --api-key sk_test_v1_xxx",
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    "api-key": Flags.string({
      char: "k",
      description: "API key to use for authentication",
    }),
    interactive: Flags.boolean({
      char: "i",
      description: "Force interactive mode",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Login);

    // Check if already logged in
    if (isAuthenticated() && !flags["api-key"]) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "You are already logged in. Do you want to re-authenticate?",
          default: false,
        },
      ]);

      if (!confirm) {
        info("Login cancelled");
        return;
      }
    }

    // API key login
    if (flags["api-key"]) {
      try {
        await apiKeyLogin(flags["api-key"]);
        const keyType = flags["api-key"].startsWith("sk_test_") ? "test" : "live";
        success("Logged in with API key", {
          environment: keyType,
        });
        return;
      } catch (err) {
        error((err as Error).message);
        this.exit(1);
      }
    }

    // Interactive mode - ask user what they want
    if (flags.interactive || process.stdin.isTTY) {
      const { method } = await inquirer.prompt([
        {
          type: "list",
          name: "method",
          message: "How would you like to authenticate?",
          choices: [
            { name: "Login with browser (recommended)", value: "browser" },
            { name: "Enter API key", value: "apikey" },
          ],
        },
      ]);

      if (method === "apikey") {
        const { apiKey } = await inquirer.prompt([
          {
            type: "password",
            name: "apiKey",
            message: "Enter your API key:",
            mask: "*",
            validate: (input: string) => {
              if (!input) return "API key is required";
              if (!/^sk_(test|live)_v1_/.test(input)) {
                return "Invalid API key format. Expected sk_test_v1_xxx or sk_live_v1_xxx";
              }
              return true;
            },
          },
        ]);

        try {
          await apiKeyLogin(apiKey);
          const keyType = apiKey.startsWith("sk_test_") ? "test" : "live";
          success("Logged in with API key", {
            environment: keyType,
          });
          return;
        } catch (err) {
          error((err as Error).message);
          this.exit(1);
        }
      }
    }

    // Browser login (default)
    try {
      const result = await browserLogin();
      success("Logged in successfully", {
        email: result.email,
      });
    } catch (err) {
      error((err as Error).message);
      this.exit(1);
    }
  }
}
