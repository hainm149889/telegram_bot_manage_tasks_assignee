import { Schema, model, Document } from "mongoose";

export enum TaskStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface ITask extends Document {
  telegramChatId: number;
  telegramMessageId: number;
  chatTitle?: string;
  assignee: string;
  creatorTelegramId?: number;
  creatorUsername?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  title: string;
  command: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    telegramChatId: {
      type: Number,
      required: true,
      index: true,
    },
    telegramMessageId: {
      type: Number,
      required: true,
    },
    chatTitle: {
      type: String,
      required: false,
    },
    assignee: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    creatorTelegramId: {
      type: Number,
      required: false,
    },
    creatorUsername: {
      type: String,
      required: false,
    },
    creatorFirstName: {
      type: String,
      required: false,
    },
    creatorLastName: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    command: {
      type: String,
      required: true,
      default: "/task",
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "tasks",
  },
);

// Unique Compound Index để phòng ngừa trùng lặp message ở mức Database
taskSchema.index({ telegramChatId: 1, telegramMessageId: 1 }, { unique: true });

export const TaskModel = model<ITask>("Task", taskSchema);
