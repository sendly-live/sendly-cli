import { Args, Flags } from "@oclif/core";
import { readFileSync } from "node:fs";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  json,
  success,
  colors,
  isJsonMode,
  keyValue,
  warn,
} from "../../lib/output.js";

interface ImportResponse {
  imported: number;
  skippedDuplicates: number;
  errors: Array<{ index: number; phone: string; error: string }>;
  totalErrors: number;
}

function normalizePhone(raw: string): string {
  let phone = raw.replace(/[\s\-\(\)\.\+]/g, "");
  if (/^\d{10}$/.test(phone)) {
    phone = "1" + phone;
  }
  if (/^\d{11}$/.test(phone) && phone.startsWith("1")) {
    return "+" + phone;
  }
  if (/^\d{7,15}$/.test(phone)) {
    return "+" + phone;
  }
  if (raw.startsWith("+")) {
    return "+" + phone;
  }
  return raw.trim();
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return rows;
}

function detectPhoneColumn(headers: string[]): string | null {
  const candidates = [
    "phone",
    "phonenumber",
    "phone_number",
    "to",
    "number",
    "mobile",
    "cell",
  ];
  for (const h of headers) {
    if (candidates.includes(h.toLowerCase())) return h;
  }
  return null;
}

export default class ContactsImport extends AuthenticatedCommand {
  static description = "Import contacts from a CSV file";

  static examples = [
    "<%= config.bin %> contacts import contacts.csv",
    "<%= config.bin %> contacts import contacts.csv --list lst_xxx",
    "<%= config.bin %> contacts import contacts.csv --list lst_xxx --json",
  ];

  static args = {
    file: Args.string({
      description: "Path to CSV file (columns: phone, name, email)",
      required: true,
    }),
  };

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    list: Flags.string({
      char: "l",
      description: "Contact list ID to add imported contacts to",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ContactsImport);

    let content: string;
    try {
      content = readFileSync(args.file, "utf-8");
    } catch {
      this.error(`Cannot read file: ${args.file}`);
    }

    const rows = parseCsv(content);
    if (rows.length === 0) {
      this.error("CSV file is empty or has no data rows");
    }

    const headers = Object.keys(rows[0]);
    const phoneCol = detectPhoneColumn(headers);
    if (!phoneCol) {
      this.error(
        `No phone column found. Expected one of: phone, phoneNumber, to, number, mobile`,
      );
    }

    const contacts = rows.map((row) => ({
      phone: normalizePhone(row[phoneCol] || ""),
      name: row["name"] || row["fullname"] || row["full_name"] || undefined,
      email: row["email"] || row["e-mail"] || undefined,
    }));

    if (!isJsonMode()) {
      console.log();
      console.log(
        colors.dim(`Importing ${contacts.length} contacts from ${args.file}`),
      );
      if (flags.list) {
        console.log(colors.dim(`Adding to list: ${flags.list}`));
      }
      console.log();
    }

    const result = await apiClient.post<ImportResponse>(
      "/api/v1/contacts/import",
      {
        contacts,
        listId: flags.list,
      },
    );

    if (isJsonMode()) {
      json(result);
      return;
    }

    success(`Import complete`);
    console.log();

    keyValue([
      ["Imported", colors.success(String(result.imported))],
      ["Skipped (duplicates)", String(result.skippedDuplicates)],
      ["Errors", result.totalErrors > 0 ? colors.error(String(result.totalErrors)) : "0"],
    ]);

    if (result.totalErrors > 0 && result.errors.length > 0) {
      console.log();
      warn(`${result.totalErrors} contacts had errors:`);
      for (const err of result.errors.slice(0, 10)) {
        console.log(
          colors.dim(`  Row ${err.index + 1}: ${err.phone || "(empty)"} - ${err.error}`),
        );
      }
      if (result.totalErrors > 10) {
        console.log(
          colors.dim(`  ... and ${result.totalErrors - 10} more`),
        );
      }
    }
  }
}
