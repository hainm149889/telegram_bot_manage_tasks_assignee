import { env } from "../config/env";

export function isAllowedChat(chatId: number): boolean {
  return env.telegramAllowedChatIds.includes(String(chatId));
}
