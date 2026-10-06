import { Context } from "grammy";
import { isAllowedChat } from "./chat-access";
import { NormalizedTelegramMessage } from "../types/normalized-message";

// In-memory cache lưu các message key dạng `${chatId}:${messageId}`
const processedMessages = new Set<string>();
const MAX_CACHE_SIZE = 1000;

export function isDuplicateMessage(chatId: number, messageId: number): boolean {
  const key = `${chatId}:${messageId}`;
  if (processedMessages.has(key)) {
    return true;
  }

  // Nếu cache đầy, xóa bớt entry cũ nhất để tránh leak memory
  if (processedMessages.size >= MAX_CACHE_SIZE) {
    const firstKey = processedMessages.values().next().value;
    if (firstKey) {
      processedMessages.delete(firstKey);
    }
  }

  processedMessages.add(key);
  return false;
}

export function collectAndNormalizeMessage(
  ctx: Context,
): NormalizedTelegramMessage | null {
  const rawMsg = ctx.msg;
  const rawChat = ctx.chat;

  if (!rawMsg || !rawChat) {
    return null;
  }

  const chatId = rawChat.id;
  const isWhitelisted = isAllowedChat(chatId);

  const rawFrom = ctx.from;
  const sender = {
    id: rawFrom?.id,
    username: rawFrom?.username,
    firstName: rawFrom?.first_name,
    lastName: rawFrom?.last_name,
  };

  const timestamp = new Date(rawMsg.date * 1000);

  const normalized: NormalizedTelegramMessage = {
    chat: {
      id: rawChat.id,
      type: rawChat.type,
      title: "title" in rawChat ? rawChat.title : undefined,
    },
    sender,
    message: {
      id: rawMsg.message_id,
      text: rawMsg.text,
      caption: rawMsg.caption,
      timestamp,
    },
    source: {
      isWhitelisted,
    },
  };

  return normalized;
}
