import { NormalizedTelegramMessage } from "../types/normalized-message";
import { ParsedTaskData } from "../types/parse-task";
import { TaskModel, ITask, TaskStatus } from "../models/task";

export async function createTaskFromMessage(
  normalized: NormalizedTelegramMessage,
  parsedData: ParsedTaskData,
): Promise<ITask | null> {
  try {
    const task = await TaskModel.create({
      telegramChatId: normalized.chat.id,
      telegramMessageId: normalized.message.id,
      chatTitle: normalized.chat.title,
      assignee: parsedData.assignee,
      creatorTelegramId: normalized.sender.id,
      creatorUsername: normalized.sender.username,
      creatorFirstName: normalized.sender.firstName,
      creatorLastName: normalized.sender.lastName,
      title: parsedData.title,
      command: parsedData.command,
      status: TaskStatus.PENDING,
    });

    console.log(
      `[TaskService] Task created successfully | ID: ${task._id} \vert{} Assignee: @${task.assignee}`,
    );
    return task;
  } catch (error: any) {
    if (error && error.code === 11000) {
      console.warn(
        `[TaskService] Duplicate task skipped | chatId=${normalized.chat.id} \vert{} messageId=${normalized.message.id}`,
      );
      return null;
    }

    console.error("[TaskService] Error creating task:", error);
    throw error;
  }
}

/**
 * Lấy TẤT CẢ các task trong nhóm chat (không phân biệt status)
 */
export async function getAllTasksByChatId(
  telegramChatId: number,
): Promise<ITask[]> {
  try {
    return await TaskModel.find({ telegramChatId }).sort({ createdAt: -1 });
  } catch (error) {
    console.error(
      `[TaskService] Error fetching all tasks for chatId=${telegramChatId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Cập nhật trạng thái task thành ACCEPTED khi nhận được phản hồi tiếp nhận/reaction
 */
export async function acceptTaskByMessageId(
  telegramChatId: number,
  telegramMessageId: number,
): Promise<ITask | null> {
  try {
    return await TaskModel.findOneAndUpdate(
      {
        telegramChatId,
        telegramMessageId,
        // Bỏ điều kiện bắt buộc status = PENDING nếu muốn thả tym lúc nào cũng chuyển ACCEPTED,
        // hoặc giữ điều kiện status khác COMPLETED để tránh ghi đè task đã xong:
        status: { $ne: TaskStatus.COMPLETED },
      },
      {
        $set: { status: TaskStatus.ACCEPTED },
      },
      { new: true },
    );
  } catch (error) {
    console.error(
      `[TaskService] Error accepting task by messageId=${telegramMessageId} in chatId=${telegramChatId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Cập nhật trạng thái task thành COMPLETED theo Telegram Message ID gốc trong chat
 */
export async function completeTaskByMessageId(
  telegramChatId: number,
  telegramMessageId: number,
): Promise<ITask | null> {
  try {
    return await TaskModel.findOneAndUpdate(
      {
        telegramChatId,
        telegramMessageId,
      },
      {
        $set: { status: TaskStatus.COMPLETED },
      },
      { new: true },
    );
  } catch (error) {
    console.error(
      `[TaskService] Error completing task by messageId=${telegramMessageId} in chatId=${telegramChatId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Cập nhật trạng thái task thành COMPLETED theo Task Mongo ID
 */
export async function completeTaskById(
  telegramChatId: number,
  taskId: string,
): Promise<ITask | null> {
  try {
    return await TaskModel.findOneAndUpdate(
      {
        _id: taskId,
        telegramChatId,
      },
      {
        $set: { status: TaskStatus.COMPLETED },
      },
      { new: true },
    );
  } catch (error) {
    console.error(
      `[TaskService] Error completing task by taskId=${taskId} in chatId=${telegramChatId}:`,
      error,
    );
    throw error;
  }
}
