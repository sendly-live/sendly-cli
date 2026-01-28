import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../../lib/base-command.js";
import { apiClient } from "../../../lib/api-client.js";
import { success, json, colors, isJsonMode } from "../../../lib/output.js";

interface ContactList {
  id: string;
  name: string;
  description?: string;
  contact_count: number;
  created_at: string;
}

export default class ContactsListsCreate extends AuthenticatedCommand {
  static description = "Create a new contact list";

  static examples = [
    '<%= config.bin %> contacts lists create --name "VIP Customers"',
    '<%= config.bin %> contacts lists create --name "Newsletter" --description "Weekly newsletter subscribers"',
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    name: Flags.string({
      char: "n",
      description: "List name",
      required: true,
    }),
    description: Flags.string({
      char: "d",
      description: "List description",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ContactsListsCreate);

    const list = await apiClient.post<ContactList>("/api/v1/contact-lists", {
      name: flags.name,
      description: flags.description,
    });

    if (isJsonMode()) {
      json(list);
      return;
    }

    success("Contact list created", {
      ID: list.id,
      Name: list.name,
      Description: list.description || colors.dim("(none)"),
    });
  }
}
