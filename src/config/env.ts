import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.format());

  process.exit(1);
}

export const env = {
  telegramBotToken: parsed.data.TELEGRAM_BOT_TOKEN,

  databaseUrl: parsed.data.DATABASE_URL,

  telegramAllowedChatIds: parsed.data.TELEGRAM_ALLOWED_CHAT_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean),
};
