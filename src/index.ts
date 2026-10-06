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
  cancelTaskByMessageId,
  cancelTaskById,
  getAllTasksByChatId,
  acceptTaskByMessageId,
  getUnfinishedTasksByChatId,
} from "./services/task";
import {
  sendTaskCreatedReply,
  formatTaskListMessage,
  formatTaskCompletedMessage,
  formatTaskAcceptedMessage,
  formatTaskCancelledMessage,
  formatTaskReminderMessage,
} from "./telegram/response-formatter";
import { initTaskReminderScheduler } from "./scheduler/task-reminder";

const bot = new Bot(env.telegramBotToken);

// Regex phát hiện phản hồi hoàn thành task (Completed)
const COMPLETED_REGEX =
  /^(?:(?:\/(?:done|completed)(?:\s+([0-9a-fA-F]{24}|\w+))?)|xong rồi|xong|ok rồi ạ|ok done|done|đã xong|hoàn thành|đã làm xong)$/i;

// Regex phát hiện phản hồi hủy task (Cancelled)
const CANCELLED_REGEX =
  /^(?:(?:\/(?:cancel|cancelled)(?:\s+([0-9a-fA-F]{24}|\w+))?)|thôi|dừng|để vậy đã|tạm vậy đã|stop|hủy đi|không phải làm|hủy|cancel|bỏ)$/i;

// Danh sách các từ khóa tiếp nhận task khi reply (Accepted)
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

// 2. Xử lý lệnh /done hoặc /complete /completed
bot.command(["done", "complete", "completed"], async (ctx) => {
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

// 3. Xử lý lệnh /cancel hoặc /cancelled
bot.command(["cancel", "cancelled"], async (ctx) => {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    if (!env.telegramAllowedChatIds.includes(chatId.toString())) {
      console.log(`[IGNORED /cancel] Non-whitelisted chat: ${chatId}`);
      return;
    }

    const repliedMessageId = ctx.msg?.reply_to_message?.message_id;
    const args = ctx.match?.trim();

    let updatedTask = null;

    if (repliedMessageId) {
      updatedTask = await cancelTaskByMessageId(chatId, repliedMessageId);
    } else if (args) {
      if (!/^[0-9a-fA-F]{24}$/.test(args)) {
        await ctx.reply(
          "⚠️ Task ID không hợp lệ. Vui lòng kiểm tra lại ID hoặc reply trực tiếp vào tin nhắn task gốc.",
          { parse_mode: "HTML" },
        );
        return;
      }
      updatedTask = await cancelTaskById(chatId, args);
    } else {
      await ctx.reply(
        "💡 <b>Hướng dẫn sử dụng lệnh /cancel:</b>\n" +
          "1. Reply trực tiếp lệnh <code>/cancel</code> vào tin nhắn tạo task gốc.\n" +
          "2. Hoặc gõ lệnh: <code>/cancel &lt;taskId&gt;</code>",
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

    const responseMsg = formatTaskCancelledMessage(updatedTask);
    await ctx.reply(responseMsg, {
      parse_mode: "HTML",
      reply_parameters: ctx.msg?.message_id
        ? { message_id: ctx.msg.message_id }
        : undefined,
    });
  } catch (error) {
    console.error("[ERROR] Failed to execute /cancel command:", error);
    await ctx.reply("❌ Đã có lỗi xảy ra khi hủy task.");
  }
});

// 4. Xử lý lệnh /remind (Nhắc nhở kiểm tra tiến độ thủ công)
bot.command(["remind", "nhacnho"], async (ctx) => {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    if (!env.telegramAllowedChatIds.includes(chatId.toString())) {
      console.log(`[IGNORED /remind] Non-whitelisted chat: ${chatId}`);
      return;
    }

    const unfinishedTasks = await getUnfinishedTasksByChatId(chatId);
    if (unfinishedTasks.length === 0) {
      await ctx.reply("🎉 Hiện tại nhóm không có task nào đang chờ xử lý (PENDING hoặc ACCEPTED)!", {
        parse_mode: "HTML",
        reply_parameters: ctx.msg?.message_id
          ? { message_id: ctx.msg.message_id }
          : undefined,
      });
      return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    });

    const reminderMsg = formatTaskReminderMessage(unfinishedTasks, timeString);
    await ctx.reply(reminderMsg, {
      parse_mode: "HTML",
      reply_parameters: ctx.msg?.message_id
        ? { message_id: ctx.msg.message_id }
        : undefined,
    });
  } catch (error) {
    console.error("[ERROR] Failed to execute /remind command:", error);
    await ctx.reply("❌ Đã có lỗi xảy ra khi thực hiện nhắc nhở.");
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

  // --- Kiểm tra tự động chuyển đổi trạng thái Task (Completed, Cancelled, Accepted) ---
  const repliedMessageId = ctx.msg?.reply_to_message?.message_id;
  const rawMessageContent = (
    normalized.message.text ||
    normalized.message.caption ||
    ""
  ).trim();
  const messageTextLower = rawMessageContent.toLowerCase();

  // 1. Kiểm tra trạng thái: HOÀN THÀNH (Completed)
  const completedMatch = rawMessageContent.match(COMPLETED_REGEX);
  if (completedMatch && (repliedMessageId || completedMatch[1])) {
    let completedTask = null;
    const targetTaskId = completedMatch[1]?.trim();

    if (targetTaskId && /^[0-9a-fA-F]{24}$/.test(targetTaskId)) {
      completedTask = await completeTaskById(normalized.chat.id, targetTaskId);
    } else if (repliedMessageId) {
      completedTask = await completeTaskByMessageId(
        normalized.chat.id,
        repliedMessageId,
      );
    }

    if (completedTask) {
      console.log(
        `[TASK COMPLETED] Task #${completedTask._id} marked as COMPLETED`,
      );
      await ctx.reply(formatTaskCompletedMessage(completedTask), {
        parse_mode: "HTML",
        reply_parameters: { message_id: ctx.msg.message_id },
      });
      return;
    }
  }

  // 2. Kiểm tra trạng thái: ĐÃ HỦY (Cancelled)
  const cancelledMatch = rawMessageContent.match(CANCELLED_REGEX);
  if (cancelledMatch && (repliedMessageId || cancelledMatch[1])) {
    let cancelledTask = null;
    const targetTaskId = cancelledMatch[1]?.trim();

    if (targetTaskId && /^[0-9a-fA-F]{24}$/.test(targetTaskId)) {
      cancelledTask = await cancelTaskById(normalized.chat.id, targetTaskId);
    } else if (repliedMessageId) {
      cancelledTask = await cancelTaskByMessageId(
        normalized.chat.id,
        repliedMessageId,
      );
    }

    if (cancelledTask) {
      console.log(
        `[TASK CANCELLED] Task #${cancelledTask._id} marked as CANCELLED`,
      );
      await ctx.reply(formatTaskCancelledMessage(cancelledTask), {
        parse_mode: "HTML",
        reply_parameters: { message_id: ctx.msg.message_id },
      });
      return;
    }
  }

  // 3. Kiểm tra trạng thái: TIẾP NHẬN (Accepted) khi Reply từ khóa
  if (repliedMessageId && messageTextLower) {
    const isAcceptKeyword = ACCEPT_KEYWORDS.some(
      (kw) => messageTextLower === kw || messageTextLower.includes(kw),
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

  // Khởi động Scheduler nhắc nhở tự động 10:00, 14:00, 16:30
  initTaskReminderScheduler(bot);

  // Khai báo rõ ràng nhận sự kiện message_reaction
  bot.start({
    allowed_updates: ["message", "edited_message", "message_reaction"],
  });
  console.log("[Bot] Telegram Task Bot is running...");
}

main();
