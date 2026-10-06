import { Context } from "grammy";
import { ITask, TaskStatus } from "../models/task";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return "⏳";
    case TaskStatus.ACCEPTED:
      return "👌";
    case TaskStatus.IN_PROGRESS:
      return "🔄";
    case TaskStatus.COMPLETED:
      return "✅";
    case TaskStatus.CANCELLED:
      return "❌";
    default:
      return "📌";
  }
}

export function formatTaskCreatedMessage(task: ITask): string {
  const taskId = (task._id as object).toString();
  const safeAssignee = escapeHtml(task.assignee);
  const safeTitle = escapeHtml(task.title);

  return [
    `📌 <b>TASK ĐÃ ĐƯỢC TẠO THÀNH CÔNG</b>`,
    ``,
    `🆔 <b>Task ID:</b> <code>${taskId}</code>`,
    `👤 <b>Người thực hiện:</b> @${safeAssignee}`,
    `📋 <b>Nội dung:</b> ${safeTitle}`,
    `⏳ <b>Trạng thái:</b> <code>${task.status}</code>`,
  ].join("\n");
}

export async function sendTaskCreatedReply(
  ctx: Context,
  task: ITask,
): Promise<void> {
  try {
    const messageText = formatTaskCreatedMessage(task);

    await ctx.reply(messageText, {
      parse_mode: "HTML",
      reply_parameters: {
        message_id: task.telegramMessageId,
      },
    });

    console.log(
      `[TelegramResponse] Replied successfully to messageId=${task.telegramMessageId} \vert{} taskId=${task._id}`,
    );
  } catch (error) {
    console.error(
      `[TelegramResponse] Failed to send reply message for taskId=${task._id}:`,
      error,
    );
  }
}

/**
 * Format toàn bộ danh sách task (bao gồm cả COMPLETED)
 */
export function formatTaskListMessage(tasks: ITask[]): string {
  if (tasks.length === 0) {
    return `🎉 <b>Chưa có task nào được khởi tạo trong nhóm này!</b>`;
  }

  const header = `📋 <b>TỔNG HỢP DANH SÁCH TASK (${tasks.length})</b>\n`;
  const items = tasks.map((t, index) => {
    const taskId = (t._id as object).toString();
    const safeAssignee = escapeHtml(t.assignee);
    const safeTitle = escapeHtml(t.title);
    const icon = getStatusIcon(t.status);

    return `${index + 1}.${icon} <b>[${t.status}]</b> @${safeAssignee}: ${safeTitle}\n   └ 🆔 <code>${taskId}</code>`;
  });

  return [header, ...items].join("\n\n");
}

/**
 * Format thông báo khi task chuyển sang ACCEPTED
 */
export function formatTaskAcceptedMessage(task: ITask): string {
  const taskId = (task._id as object).toString();
  const safeAssignee = escapeHtml(task.assignee);

  return `👌 <b>Đã ghi nhận tiếp nhận task <code>${taskId}</code> bởi @${safeAssignee}!</b> (Trạng thái: <code>${task.status}</code>)`;
}

/**
 * Format thông báo khi task chuyển sang COMPLETED
 */
export function formatTaskCompletedMessage(task: ITask): string {
  const taskId = (task._id as object).toString();
  const safeAssignee = escapeHtml(task.assignee);
  const safeTitle = escapeHtml(task.title);

  return [
    `✅ <b>TASK ĐÃ HOÀN THÀNH</b>`,
    ``,
    `🆔 <b>Task ID:</b> <code>${taskId}</code>`,
    `👤 <b>Người thực hiện:</b> @${safeAssignee}`,
    `📋 <b>Nội dung:</b> ${safeTitle}`,
    `🎉 <b>Trạng thái:</b> <code>${task.status}</code>`,
  ].join("\n");
}
