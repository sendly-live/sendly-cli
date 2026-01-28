import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import { success, json, colors, isJsonMode } from "../../lib/output.js";

interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  created_at: string;
}

export default class ContactsCreate extends AuthenticatedCommand {
  static description = "Create a new contact";

  static examples = [
    "<%= config.bin %> contacts create --phone +15551234567",
    '<%= config.bin %> contacts create --phone +15551234567 --name "John Doe"',
    '<%= config.bin %> contacts create --phone +15551234567 --name "John" --email john@example.com',
    "<%= config.bin %> contacts create --phone +15551234567 --json",
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    phone: Flags.string({
      char: "p",
      description: "Phone number in E.164 format (e.g., +15551234567)",
      required: true,
    }),
    name: Flags.string({
      char: "n",
      description: "Contact name",
    }),
    email: Flags.string({
      char: "e",
      description: "Contact email",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ContactsCreate);

    const contact = await apiClient.post<Contact>("/api/v1/contacts", {
      phone_number: flags.phone,
      name: flags.name,
      email: flags.email,
    });

    if (isJsonMode()) {
      json(contact);
      return;
    }

    success("Contact created", {
      ID: contact.id,
      Phone: contact.phone_number,
      Name: contact.name || colors.dim("(none)"),
      Email: contact.email || colors.dim("(none)"),
    });
  }
}
