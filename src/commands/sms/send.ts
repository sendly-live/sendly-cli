import { Flags } from "@oclif/core";
import { AuthenticatedCommand } from "../../lib/base-command.js";
import { apiClient } from "../../lib/api-client.js";
import {
  success,
  error,
  spinner,
  colors,
  formatStatus,
  formatCredits,
  json,
  isJsonMode,
} from "../../lib/output.js";

interface SendMessageResponse {
  id: string;
  to: string;
  from: string;
  text: string;
  status: string;
  segments: number;
  creditsUsed: number;
  createdAt: string;
  mediaUrls?: string[];
}

export default class SmsSend extends AuthenticatedCommand {
  static description = "Send an SMS or MMS message";

  static examples = [
    '<%= config.bin %> sms send --to +15551234567 --text "Hello!"',
    '<%= config.bin %> sms send --to +15551234567 --text "Hello!" --from "Sendly"',
    '<%= config.bin %> sms send --to +15551234567 --text "Hello!" --type transactional',
    '<%= config.bin %> sms send --to +15551234567 --text "Hello!" --json',
    '<%= config.bin %> sms send --to +15551234567 --text "Check this out" --media-url https://example.com/image.jpg',
    '<%= config.bin %> sms send --to +15551234567 --media-url https://example.com/image.jpg',
    '<%= config.bin %> sms send --to +15551234567 --text "Two images" --media-url https://example.com/a.jpg --media-url https://example.com/b.jpg',
  ];

  static flags = {
    ...AuthenticatedCommand.baseFlags,
    to: Flags.string({
      char: "t",
      description: "Recipient phone number (E.164 format)",
      required: true,
    }),
    text: Flags.string({
      char: "m",
      description: "Message text (optional when --media-url is provided)",
    }),
    from: Flags.string({
      char: "f",
      description: "Sender ID or phone number",
    }),
    type: Flags.string({
      description: "Message type: marketing (default) or transactional",
      options: ["marketing", "transactional"],
      default: "marketing",
    }),
    "media-url": Flags.string({
      description: "Media URL to attach (MMS). Can be specified multiple times.",
      multiple: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(SmsSend);
    const mediaUrls = flags["media-url"];
    const hasMedia = mediaUrls && mediaUrls.length > 0;

    if (!/^\+[1-9]\d{1,14}$/.test(flags.to)) {
      error("Invalid phone number format", {
        hint: "Use E.164 format: +15551234567",
      });
      this.exit(1);
    }

    if (!flags.text && !hasMedia) {
      error("Either --text or --media-url is required");
      this.exit(1);
    }

    if (flags.text && !flags.text.trim()) {
      error("Message text cannot be empty");
      this.exit(1);
    }

    const messageLabel = hasMedia ? "MMS" : "SMS";
    const spin = spinner(`Sending ${messageLabel} message...`);
    spin.start();

    try {
      const response = await apiClient.post<SendMessageResponse>(
        "/api/v1/messages",
        {
          to: flags.to,
          messageType: flags.type,
          ...(flags.text && { text: flags.text }),
          ...(flags.from && { from: flags.from }),
          ...(hasMedia && { mediaUrls }),
        },
      );

      spin.stop();

      if (isJsonMode()) {
        json(response);
        return;
      }

      success(`${messageLabel} sent`, {
        ID: response.id,
        To: response.to,
        Type: messageLabel,
        Status: formatStatus(response.status),
        ...(response.segments != null && { Segments: response.segments }),
        Credits: formatCredits(response.creditsUsed),
        ...(hasMedia && { Media: `${mediaUrls.length} attachment${mediaUrls.length > 1 ? "s" : ""}` }),
      });

      if (hasMedia && !isJsonMode()) {
        for (const url of mediaUrls) {
          console.log(`  ${colors.dim("Media:")} ${url}`);
        }
      }
    } catch (err) {
      spin.stop();
      throw err;
    }
  }
}
