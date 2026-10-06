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
    // case TaskStatus.IN_PROGRESS:
    //   return "🔄";
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
 * Format toàn bộ danh sách task kèm thống kê chi tiết theo từng trạng thái
 */
export function formatTaskListMessage(tasks: ITask[]): string {
  if (tasks.length === 0) {
    return `🎉 <b>Chưa có task nào được khởi tạo trong nhóm này!</b>`;
  }

  // 1. Thống kê số lượng theo từng TaskStatus
  const stats = tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.ACCEPTED]: 0,
      //   [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
    } as Record<TaskStatus, number>,
  );

  // 2. Tạo phần header & dashboard thống kê
  const header = `📋 <b>TỔNG HỢP DANH SÁCH TASK (${tasks.length})</b>`;
  const summary = [
    `📊 <b>Thống kê:</b>`,
    `• ${getStatusIcon(TaskStatus.PENDING)} Chờ tiếp nhận (PENDING): <b>${stats[TaskStatus.PENDING]}</b>`,
    `• ${getStatusIcon(TaskStatus.ACCEPTED)} Đã tiếp nhận (ACCEPTED): <b>${stats[TaskStatus.ACCEPTED]}</b>`,
    // `• ${getStatusIcon(TaskStatus.IN_PROGRESS)} Đang thực hiện (IN_PROGRESS): <b>${stats[TaskStatus.IN_PROGRESS]}</b>`,
    `• ${getStatusIcon(TaskStatus.COMPLETED)} Đã hoàn thành (COMPLETED): <b>${stats[TaskStatus.COMPLETED]}</b>`,
    `• ${getStatusIcon(TaskStatus.CANCELLED)} Đã hủy (CANCELLED): <b>${stats[TaskStatus.CANCELLED]}</b>`,
  ].join("\n");

  // 3. Format danh sách từng task
  const items = tasks.map((t, index) => {
    const taskId = (t._id as object).toString();
    const safeAssignee = escapeHtml(t.assignee);
    const safeTitle = escapeHtml(t.title);
    const icon = getStatusIcon(t.status);

    return `${index + 1}. ${icon} <b>[${t.status}]</b> @${safeAssignee}: ${safeTitle}\n   └ 🆔 <code>${taskId}</code>`;
  });

  return [header, summary, ...items].join("\n\n");
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

/**
 * Format thông báo khi task chuyển sang CANCELLED
 */
export function formatTaskCancelledMessage(task: ITask): string {
  const taskId = (task._id as object).toString();
  const safeAssignee = escapeHtml(task.assignee);
  const safeTitle = escapeHtml(task.title);

  return [
    `❌ <b>TASK ĐÃ ĐƯỢC HỦY</b>`,
    ``,
    `🆔 <b>Task ID:</b> <code>${taskId}</code>`,
    `👤 <b>Người thực hiện:</b> @${safeAssignee}`,
    `📋 <b>Nội dung:</b> ${safeTitle}`,
    `🚫 <b>Trạng thái:</b> <code>${task.status}</code>`,
  ].join("\n");
}

/**
 * Format tin nhắn nhắc nhở tự động theo khung giờ, gom nhóm theo assignee và tag (@mention)
 */
export function formatTaskReminderMessage(
  tasks: ITask[],
  timeSlot?: string,
): string {
  if (tasks.length === 0) {
    return "";
  }

  // 1. Gom nhóm task theo assignee
  const tasksByAssignee = new Map<string, { pending: ITask[]; accepted: ITask[] }>();

  for (const task of tasks) {
    const rawAssignee = (task.assignee || "Unknown").trim().replace(/^@/, "");
    if (!tasksByAssignee.has(rawAssignee)) {
      tasksByAssignee.set(rawAssignee, { pending: [], accepted: [] });
    }
    const group = tasksByAssignee.get(rawAssignee)!;
    if (task.status === TaskStatus.PENDING) {
      group.pending.push(task);
    } else if (task.status === TaskStatus.ACCEPTED) {
      group.accepted.push(task);
    }
  }

  const timeLabel = timeSlot ? ` [${timeSlot}]` : "";
  const header = [
    `⏰ <b>NHẮC NHỞ TIẾN ĐỘ CÔNG VIỆC${timeLabel}</b>`,
    `<i>Các bạn vui lòng kiểm tra và cập nhật trạng thái các task tồn đọng:</i>`,
  ].join("\n");

  const assigneeSections: string[] = [];

  for (const [assignee, group] of tasksByAssignee.entries()) {
    const sectionLines: string[] = [];
    const safeAssignee = escapeHtml(assignee);
    sectionLines.push(`👤 <b>@${safeAssignee}</b>:`);

    if (group.pending.length > 0) {
      sectionLines.push(`  ⏳ <i>Chờ tiếp nhận (${group.pending.length}):</i>`);
      for (const t of group.pending) {
        const taskId = (t._id as object).toString();
        const safeTitle = escapeHtml(t.title);
        sectionLines.push(`    • ${safeTitle} <code>(${taskId.slice(-6)})</code>`);
      }
    }

    if (group.accepted.length > 0) {
      sectionLines.push(`  👌 <i>Chờ hoàn thành (${group.accepted.length}):</i>`);
      for (const t of group.accepted) {
        const taskId = (t._id as object).toString();
        const safeTitle = escapeHtml(t.title);
        sectionLines.push(`    • ${safeTitle} <code>(${taskId.slice(-6)})</code>`);
      }
    }

    assigneeSections.push(sectionLines.join("\n"));
  }

  const footer = `💡 <i>Mẹo: Reply tin nhắn task với <b>ok</b> / thả 👍 để nhận việc, reply <b>/done</b> hoặc <b>xong</b> để hoàn thành!</i>`;

  return [header, ...assigneeSections, footer].join("\n\n");
}


