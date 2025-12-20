import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  success,
  json,
  keyValue,
  colors,
  header,
  isJsonMode,
} from "../../lib/output.js";

interface CreditsResponse {
  balance: number;
  lifetimeCredits: number;
  reservedBalance: number;
}

export default class CreditsBalance extends AuthenticatedCommand {
  static description = "Check your credit balance";

  static examples = [
    "<%= config.bin %> credits balance",
    "<%= config.bin %> credits balance --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    const credits = await apiClient.get<CreditsResponse>("/api/credits");

    if (isJsonMode()) {
      json(credits);
      return;
    }

    header("Credit Balance");

    const availableCredits = credits.balance - (credits.reservedBalance || 0);

    keyValue({
      Available: colors.primary(`${availableCredits.toLocaleString()} credits`),
      Reserved: credits.reservedBalance
        ? colors.warning(`${credits.reservedBalance.toLocaleString()} credits`)
        : colors.dim("0 credits"),
      "Total Balance": `${credits.balance.toLocaleString()} credits`,
      "Lifetime Credits": colors.dim(`${credits.lifetimeCredits.toLocaleString()} credits`),
    });

    console.log();

    // Show approximate message capacity
    const domesticMessages = Math.floor(availableCredits / 1);
    const internationalMessages = Math.floor(availableCredits / 8);

    console.log(colors.dim("Estimated capacity:"));
    console.log(`  ${colors.dim("US/Canada:")} ~${domesticMessages.toLocaleString()} messages`);
    console.log(`  ${colors.dim("International:")} ~${internationalMessages.toLocaleString()} messages`);
  }
}
