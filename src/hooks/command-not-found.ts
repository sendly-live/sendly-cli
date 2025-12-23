import { Hook } from "@oclif/core";
import { colors } from "../lib/output.js";

// Known commands for suggestions
const KNOWN_COMMANDS = [
  "send",
  "status",
  "login",
  "logout",
  "whoami",
  "doctor",
  "onboarding",
  "help",
  "sms send",
  "sms list",
  "sms get",
  "sms batch",
  "sms schedule",
  "sms scheduled",
  "sms cancel",
  "credits balance",
  "credits history",
  "keys list",
  "keys create",
  "keys revoke",
  "webhooks list",
  "webhooks create",
  "webhooks delete",
  "webhooks test",
  "webhooks listen",
  "webhooks deliveries",
  "webhooks rotate-secret",
  "logs tail",
  "config get",
  "config set",
  "config reset",
];

// Common typos and their corrections
const TYPO_MAP: Record<string, string> = {
  "text": "send",
  "txt": "send",
  "msg": "send",
  "message": "sms send",
  "messages": "sms list",
  "balance": "credits balance",
  "credit": "credits balance",
  "key": "keys list",
  "apikey": "keys list",
  "apikeys": "keys list",
  "webhook": "webhooks list",
  "hook": "webhooks list",
  "hooks": "webhooks list",
  "log": "logs tail",
  "tail": "logs tail",
  "auth": "login",
  "signin": "login",
  "signout": "logout",
  "me": "whoami",
  "info": "status",
  "dashboard": "status",
  "account": "status",
  "check": "doctor",
  "test": "doctor",
  "setup": "onboarding",
  "init": "onboarding",
  "start": "onboarding",
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar commands based on Levenshtein distance
 */
function findSimilarCommands(input: string, maxDistance = 3): string[] {
  const inputLower = input.toLowerCase();
  const suggestions: Array<{ command: string; distance: number }> = [];

  for (const command of KNOWN_COMMANDS) {
    const distance = levenshteinDistance(inputLower, command.toLowerCase());
    if (distance <= maxDistance) {
      suggestions.push({ command, distance });
    }
  }

  // Sort by distance and return top 3
  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((s) => s.command);
}

const hook: Hook<"command_not_found"> = async function (options) {
  const { id } = options;
  const inputCommand = id;

  console.log();
  console.log(colors.error(`Command not found: ${colors.code(inputCommand)}`));
  console.log();

  // Check for known typos first
  const typoFix = TYPO_MAP[inputCommand.toLowerCase()];
  if (typoFix) {
    console.log(colors.dim("Did you mean?"));
    console.log(`  ${colors.code(`sendly ${typoFix}`)}`);
    console.log();
    return;
  }

  // Find similar commands
  const similar = findSimilarCommands(inputCommand);
  if (similar.length > 0) {
    console.log(colors.dim("Did you mean?"));
    similar.forEach((cmd) => {
      console.log(`  ${colors.code(`sendly ${cmd}`)}`);
    });
    console.log();
    return;
  }

  // Default help
  console.log(colors.dim("Available topics:"));
  console.log(`  ${colors.code("sendly sms")}        Send and manage SMS messages`);
  console.log(`  ${colors.code("sendly credits")}    Check credit balance`);
  console.log(`  ${colors.code("sendly keys")}       Manage API keys`);
  console.log(`  ${colors.code("sendly webhooks")}   Manage webhooks`);
  console.log();
  console.log(`Run ${colors.code("sendly --help")} for all commands.`);
  console.log();
};

export default hook;
