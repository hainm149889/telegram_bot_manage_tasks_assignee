import cron from "node-cron";
import { Bot } from "grammy";
import { env } from "../config/env";
import { getUnfinishedTasksByChatId } from "../services/task";
import { formatTaskReminderMessage } from "../telegram/response-formatter";

const TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Quét các task tồn đọng (PENDING, ACCEPTED) và gửi tin nhắn nhắc nhở vào nhóm chat
 */
export async function runTaskReminder(
  bot: Bot,
  timeSlot?: string,
  targetChatId?: number,
): Promise<{ sentChats: number; totalTasks: number }> {
  const chatIds = targetChatId
    ? [targetChatId.toString()]
    : env.telegramAllowedChatIds;

  let sentChats = 0;
  let totalTasks = 0;

  for (const rawChatId of chatIds) {
    const chatId = Number(rawChatId.trim());
    if (isNaN(chatId)) continue;

    try {
      const unfinishedTasks = await getUnfinishedTasksByChatId(chatId);
      if (unfinishedTasks.length === 0) {
        continue;
      }

      const message = formatTaskReminderMessage(unfinishedTasks, timeSlot);
      if (!message) continue;

      await bot.api.sendMessage(chatId, message, {
        parse_mode: "HTML",
      });

      sentChats++;
      totalTasks += unfinishedTasks.length;
      console.log(
        `[TaskReminder] Sent reminder to chatId=${chatId} (${unfinishedTasks.length} tasks) at ${timeSlot || "manual"}`,
      );
    } catch (error) {
      console.error(
        `[TaskReminder] Error sending reminder to chatId=${chatId}:`,
        error,
      );
    }
  }

  return { sentChats, totalTasks };
}

/**
 * Khởi tạo Scheduler nhắc nhở tự động 3 khung giờ mỗi ngày: 10:00, 14:00, 16:30
 */
export function initTaskReminderScheduler(bot: Bot): void {
  console.log(
    `[TaskReminder] Initializing reminder scheduler (Timezone: ${TIMEZONE})...`,
  );

  // 1. Nhắc nhở lúc 10h00 sáng mỗi ngày
  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log("[TaskReminder] Executing scheduled reminder: 10:00 AM");
      await runTaskReminder(bot, "10:00");
    },
    { timezone: TIMEZONE },
  );

  // 2. Nhắc nhở lúc 14h00 chiều mỗi ngày
  cron.schedule(
    "0 14 * * *",
    async () => {
      console.log("[TaskReminder] Executing scheduled reminder: 14:00 PM");
      await runTaskReminder(bot, "14:00");
    },
    { timezone: TIMEZONE },
  );

  // 3. Nhắc nhở lúc 16h30 chiều mỗi ngày
  cron.schedule(
    "30 16 * * *",
    async () => {
      console.log("[TaskReminder] Executing scheduled reminder: 16:30 PM");
      await runTaskReminder(bot, "16:30");
    },
    { timezone: TIMEZONE },
  );

  console.log(
    `[TaskReminder] Scheduled 3 daily reminder jobs: 10:00, 14:00, 16:30 (Every day, ${TIMEZONE})`,
  );
}
