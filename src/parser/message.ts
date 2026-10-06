import { Context } from "grammy";
import { NormalizedTelegramMessage } from "../types/normalized-message";
import { ParsedTaskData, ParseTaskResult } from "../types/parse-task";

// Regex khớp với cú pháp: @assignee /task <content>
// Support cả xuống dòng trong <content> bằng cờ 's' (dotAll)
const TASK_COMMAND_REGEX = /^@([a-zA-Z0-9_]+)\s+(\/task)\s+([\s\S]+)$/i;

/**
 * Hàm hỗ trợ lấy username/assignee linh hoạt từ Telegram Message Entity hoặc Regex text thuần
 */
export function extractTaskDataFromMessage(
  ctx: Context,
  rawText: string,
): ParsedTaskData | null {
  const text = rawText.trim();
  const entities = ctx.msg?.entities || ctx.msg?.caption_entities || [];

  // 1. Kiểm tra xem có command /task hay không
  const commandMatch = text.match(/(\/task|\/todo)\b/i);
  if (!commandMatch) {
    return null;
  }

  const command = commandMatch[1].toLowerCase();
  const commandIndex = text.indexOf(commandMatch[0]);

  let assignee = "";

  // 2. Ưu tiên tìm mention từ Telegram Message Entities
  const mentionEntity = entities.find(
    (e) => e.type === "text_mention" || e.type === "mention",
  );

  if (mentionEntity) {
    if (mentionEntity.type === "text_mention" && mentionEntity.user) {
      // Trường hợp user không có username (Tag theo tên như trong ảnh)
      assignee =
        mentionEntity.user.username ||
        mentionEntity.user.first_name ||
        "UnknownUser";
    } else if (mentionEntity.type === "mention") {
      // Tag dạng @username
      const rawMention = text.substring(
        mentionEntity.offset,
        mentionEntity.offset + mentionEntity.length,
      );
      assignee = rawMention.replace(/^@/, "");
    }
  }

  // 3. Fallback: Nếu không phát hiện Entity, dùng Regex bóc tách từ text thuần
  if (!assignee) {
    const textBeforeCommand = text.substring(0, commandIndex).trim();
    const regexMatch = textBeforeCommand.match(/@([a-zA-Z0-9_]+)/);
    if (regexMatch) {
      assignee = regexMatch[1];
    }
  }

  if (!assignee) {
    return null;
  }

  // 4. Lấy nội dung task đằng sau lệnh /task
  const title = text.substring(commandIndex + commandMatch[0].length).trim();

  if (!title) {
    return null;
  }

  return {
    assignee,
    command,
    title,
  };
}

export function parseTaskMessage(
  normalized: NormalizedTelegramMessage,
  ctx?: Context,
): ParseTaskResult {
  const text = normalized.message.text || normalized.message.caption;

  if (!text) {
    return {
      isTask: false,
      reason: "Message contains no text or caption",
    };
  }

  // Nếu truyền ctx vào parser
  if (ctx) {
    const parsed = extractTaskDataFromMessage(ctx, text);
    if (parsed) {
      return {
        isTask: true,
        data: parsed,
      };
    }
  }

  // Fallback regex cũ trường hợp không truyền ctx
  const regex = /^@([a-zA-Z0-9_]+)\s+(\/task|\/todo)\s+(.+)$/s;
  const match = text.trim().match(regex);

  if (!match) {
    return {
      isTask: false,
      reason: "Does not match format: @assignee /task <content>",
    };
  }

  return {
    isTask: true,
    data: {
      assignee: match[1],
      command: match[2].toLowerCase(),
      title: match[3].trim(),
    },
  };
}
