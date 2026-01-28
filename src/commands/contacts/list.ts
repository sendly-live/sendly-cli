import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  table,
  json,
  info,
  formatRelativeTime,
  colors,
  isJsonMode,
} from "../../lib/output.js";

interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  opted_out?: boolean;
  created_at: string;
}

interface ListContactsResponse {
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
}

export default class ContactsList extends AuthenticatedCommand {
  static description = "List contacts";

  static examples = [
    "<%= config.bin %> contacts list",
    "<%= config.bin %> contacts list --search john",
    "<%= config.bin %> contacts list --list lst_xxx",
    "<%= config.bin %> contacts list --limit 50",
    "<%= config.bin %> contacts list --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    limit: Flags.integer({
      char: "l",
      description: "Number of contacts to show",
      default: 50,
    }),
    offset: Flags.integer({
      description: "Offset for pagination",
      default: 0,
    }),
    search: Flags.string({
      char: "s",
      description: "Search by name, phone, or email",
    }),
    list: Flags.string({
      description: "Filter by contact list ID",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ContactsList);

    const response = await apiClient.get<ListContactsResponse>(
      "/api/v1/contacts",
      {
        limit: flags.limit,
        offset: flags.offset,
        ...(flags.search && { search: flags.search }),
        ...(flags.list && { list_id: flags.list }),
      },
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    if (response.contacts.length === 0) {
      info("No contacts found");
      return;
    }

    console.log();
    console.log(
      colors.dim(`Showing ${response.contacts.length} of ${response.total} contacts`),
    );
    console.log();

    table(response.contacts, [
      {
        header: "ID",
        key: "id",
        width: 18,
        formatter: (v) => colors.dim(String(v).slice(0, 15) + "..."),
      },
      {
        header: "Phone",
        key: "phone_number",
        width: 16,
      },
      {
        header: "Name",
        key: "name",
        width: 20,
        formatter: (v) => {
          if (!v) return colors.dim("-");
          const name = String(v);
          return name.length > 18 ? name.slice(0, 18) + "..." : name;
        },
      },
      {
        header: "Email",
        key: "email",
        width: 24,
        formatter: (v) => {
          if (!v) return colors.dim("-");
          const email = String(v);
          return email.length > 22 ? email.slice(0, 22) + "..." : email;
        },
      },
      {
        header: "Status",
        key: "opted_out",
        width: 10,
        formatter: (v) => v ? colors.error("opted-out") : colors.success("active"),
      },
      {
        header: "Created",
        key: "created_at",
        width: 12,
        formatter: (v) => formatRelativeTime(String(v)),
      },
    ]);
  }
}
