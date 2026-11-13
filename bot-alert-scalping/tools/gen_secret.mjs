// Prints a random secret for SESSION_SECRET / CRON_SECRET. Generate it in your own terminal; never paste it in chat.
import { randomBytes } from "node:crypto";
console.log(randomBytes(32).toString("base64url"));
