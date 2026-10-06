import { Bot } from "grammy";
import { env } from "./config/env";
import { connectDatabase } from "./database/mongodb";
import {
  collectAndNormalizeMessage,
  isDuplicateMessage,
} from "./telegram/message-collector";
import { parseTaskMessage } from "./parser/message";
import {
  createTaskFromMessage,
  completeTaskByMessageId,
  completeTaskById,
  getAllTasksByChatId,
  acceptTaskByMessageId,
} from "./services/task";
import {
  sendTaskCreatedReply,
  formatTaskListMessage,
  formatTaskCompletedMessage,
  formatTaskAcceptedMessage,
} from "./telegram/response-formatter";

const bot = new Bot(env.telegramBotToken);

// Danh sách các từ khóa tiếp nhận task khi reply
const ACCEPT_KEYWORDS = [
  "ok",
  "oke",
  "okay",
  "vâng",
  "vang",
  "đã rõ",
  "da ro",
  "rõ",
  "ro",
  "nhận",
  "nhan",
  "thả tym",
  "thả like",
  "👍",
  "❤️",
];

// 1. Xử lý lệnh /tasks hoặc /list (Hiển thị TẤT CẢ các task)
bot.command(["tasks", "list"], async (ctx) => {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    if (!env.telegramAllowedChatIds.includes(chatId.toString())) {
      console.log(`[IGNORED /tasks] Non-whitelisted chat: ${chatId}`);
      return;
    }

    const tasks = await getAllTasksByChatId(chatId);
    const message = formatTaskListMessage(tasks);

    await ctx.reply(message, {
      parse_mode: "HTML",
      reply_parameters: ctx.msg?.message_id
        ? { message_id: ctx.msg.message_id }
        : undefined,
    });
  } catch (error) {
    console.error("[ERROR] Failed to execute /tasks command:", error);
    await ctx.reply("❌ Đã có lỗi xảy ra khi lấy danh sách task.");
  }
});

// 2. Xử lý lệnh /done hoặc /complete
bot.command(["done", "complete"], async (ctx) => {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    if (!env.telegramAllowedChatIds.includes(chatId.toString())) {
      console.log(`[IGNORED /done] Non-whitelisted chat: ${chatId}`);
      return;
    }

    const repliedMessageId = ctx.msg?.reply_to_message?.message_id;
    const args = ctx.match?.trim();

    let updatedTask = null;

    if (repliedMessageId) {
      updatedTask = await completeTaskByMessageId(chatId, repliedMessageId);
    } else if (args) {
      if (!/^[0-9a-fA-F]{24}$/.test(args)) {
        await ctx.reply(
          "⚠️ Task ID không hợp lệ. Vui lòng kiểm tra lại ID hoặc reply trực tiếp vào tin nhắn task gốc.",
          { parse_mode: "HTML" },
        );
        return;
      }
      updatedTask = await completeTaskById(chatId, args);
    } else {
      await ctx.reply(
        "💡 <b>Hướng dẫn sử dụng lệnh /done:</b>\n" +
          "1. Reply trực tiếp lệnh <code>/done</code> vào tin nhắn tạo task gốc.\n" +
          "2. Hoặc gõ lệnh: <code>/done &lt;taskId&gt;</code>",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (!updatedTask) {
      await ctx.reply("❌ Không tìm thấy task tương ứng trong nhóm này.", {
        parse_mode: "HTML",
      });
      return;
    }

    const responseMsg = formatTaskCompletedMessage(updatedTask);
    await ctx.reply(responseMsg, {
      parse_mode: "HTML",
      reply_parameters: ctx.msg?.message_id
        ? { message_id: ctx.msg.message_id }
        : undefined,
    });
  } catch (error) {
    console.error("[ERROR] Failed to execute /done command:", error);
    await ctx.reply("❌ Đã có lỗi xảy ra khi hoàn thành task.");
  }
});

// Xử lý Reaction (Thả tim 👍, ❤️ vào tin nhắn task gốc)
bot.on("message_reaction", async (ctx) => {
  try {
    const reactionUpdate = ctx.messageReaction;
    if (!reactionUpdate) return;

    const chatId = reactionUpdate.chat.id;
    const messageId = reactionUpdate.message_id;

    if (!env.telegramAllowedChatIds.includes(chatId.toString())) {
      return;
    }

    // Kiểm tra danh sách reaction mới được thêm vào
    const newReactions = reactionUpdate.new_reaction || [];
    const hasTargetReaction = newReactions.some((r) => {
      if (r.type === "emoji") {
        //@ts-ignore
        return r.emoji === "👍" || r.emoji === "❤️";
      }
      return false;
    });

    if (hasTargetReaction) {
      console.log(
        `[REACTION DETECTED] chatId=${chatId} | messageId=${messageId}`,
      );

      const updatedTask = await acceptTaskByMessageId(chatId, messageId);
      if (updatedTask) {
        console.log(
          `[ACCEPT REACTION] Task #${updatedTask._id} status updated to ACCEPTED`,
        );
        await ctx.reply(formatTaskAcceptedMessage(updatedTask), {
          parse_mode: "HTML",
          reply_parameters: { message_id: messageId },
        });
      }
    }
  } catch (error) {
    console.error("[ERROR] Failed to process message_reaction:", error);
  }
});

// 4. Xử lý tin nhắn văn bản (Tạo task hoặc Reply từ khóa tiếp nhận)
bot.on(["message", "channel_post"], async (ctx) => {
  console.log(
    `[Telegram] Message received | chatId=${ctx.chat?.id} | messageId=${ctx.msg?.message_id}`,
  );

  const normalized = collectAndNormalizeMessage(ctx);

  if (!normalized) {
    console.log(
      "[MessageCollector] Skipped: Invalid message or chat structure",
    );
    return;
  }

  if (isDuplicateMessage(normalized.chat.id, normalized.message.id)) {
    console.log(
      `[DUPLICATE SKIPPED] chatId=${normalized.chat.id} | messageId=${normalized.message.id}`,
    );
    return;
  }

  if (!normalized.source.isWhitelisted) {
    console.log(
      `[IGNORED] Message from non-whitelisted chat: ${normalized.chat.id}`,
    );
    return;
  }

  // --- Kiểm tra xem đây có phải tin nhắn Reply chứa TỪ KHÓA TIẾP NHẬN không ---
  const repliedMessageId = ctx.msg?.reply_to_message?.message_id;
  const messageText = (
    normalized.message.text ||
    normalized.message.caption ||
    ""
  )
    .trim()
    .toLowerCase();

  if (repliedMessageId && messageText) {
    const isAcceptKeyword = ACCEPT_KEYWORDS.some(
      (kw) => messageText === kw || messageText.includes(kw),
    );

    if (isAcceptKeyword) {
      const acceptedTask = await acceptTaskByMessageId(
        normalized.chat.id,
        repliedMessageId,
      );
      if (acceptedTask) {
        console.log(
          `[ACCEPT KEYWORD] Task #${acceptedTask._id} status updated to ACCEPTED`,
        );
        await ctx.reply(formatTaskAcceptedMessage(acceptedTask), {
          parse_mode: "HTML",
          reply_parameters: { message_id: ctx.msg.message_id },
        });
        return;
      }
    }
  }

  // --- Nếu không phải reply tiếp nhận, tiến hành parse tạo Task mới ---
  const parseResult = parseTaskMessage(normalized, ctx);

  if (!parseResult.isTask) {
    console.log(
      `[PARSER IGNORED] Not a valid task message | Reason: ${parseResult.reason}`,
    );
    return;
  }

  try {
    const createdTask = await createTaskFromMessage(
      normalized,
      parseResult.data,
    );
    if (createdTask) {
      console.log(`[SUCCESS] Task #${createdTask._id} saved to MongoDB`);
      await sendTaskCreatedReply(ctx, createdTask);
    }
  } catch (error) {
    console.error("[ERROR] Failed to save task to MongoDB:", error);
  }
});

async function main() {
  await connectDatabase();
  // Khai báo rõ ràng nhận sự kiện message_reaction
  bot.start({
    allowed_updates: ["message", "edited_message", "message_reaction"],
  });
  console.log("[Bot] Telegram Task Bot is running...");
}

main();
