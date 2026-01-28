import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import {
  table,
  json,
  info,
  formatRelativeTime,
  colors,
  isJsonMode,
} from "../../../lib/output.js";

interface ContactList {
  id: string;
  name: string;
  description?: string;
  contact_count: number;
  created_at: string;
}

interface ListContactListsResponse {
  lists: ContactList[];
}

export default class ContactsListsList extends AuthenticatedCommand {
  static description = "List all contact lists";

  static examples = [
    "<%= config.bin %> contacts lists",
    "<%= config.bin %> contacts lists --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
  };

  async run(): Promise<void> {
    await this.parse(ContactsListsList);

    const response = await apiClient.get<ListContactListsResponse>(
      "/api/v1/contact-lists",
    );

    if (isJsonMode()) {
      json(response);
      return;
    }

    if (response.lists.length === 0) {
      info("No contact lists found");
      return;
    }

    console.log();
    console.log(colors.dim(`${response.lists.length} contact lists`));
    console.log();

    table(response.lists, [
      {
        header: "ID",
        key: "id",
        width: 18,
        formatter: (v) => colors.dim(String(v).slice(0, 15) + "..."),
      },
      {
        header: "Name",
        key: "name",
        width: 24,
        formatter: (v) => {
          const name = String(v);
          return name.length > 22 ? name.slice(0, 22) + "..." : name;
        },
      },
      {
        header: "Description",
        key: "description",
        width: 28,
        formatter: (v) => {
          if (!v) return colors.dim("-");
          const desc = String(v);
          return desc.length > 26 ? desc.slice(0, 26) + "..." : desc;
        },
      },
      {
        header: "Contacts",
        key: "contact_count",
        width: 10,
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
