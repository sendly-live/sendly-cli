/**
 * Sendly CLI
 *
 * The official command-line interface for Sendly SMS API.
 *
 * @example
 * ```bash
 * # Install
 * npm install -g @sendly/cli
 *
 * # Login
 * sendly login
 *
 * # Send an SMS
 * sendly sms send --to +15551234567 --text "Hello from Sendly!"
 *
 * # List messages
 * sendly sms list
 *
 * # Listen for webhooks locally
 * sendly webhooks listen --forward http://localhost:3000/webhook
 * ```
 *
 * @packageDocumentation
 */

export { run } from "@oclif/core";
