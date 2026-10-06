// --- Thêm vào cuối file src/telegram/types.ts ---

export interface ParsedTaskData {
  assignee: string; // Tên người được assign (đã bỏ ký tự @)
  command: string; // Ví dụ: "/task"
  title: string; // Nội dung công việc
}

export interface ParseTaskSuccessResult {
  isTask: true;
  data: ParsedTaskData;
}

export interface ParseTaskFailureResult {
  isTask: false;
  reason?: string; // Lý do không parse được (ví dụ: "No text", "Invalid format", v.v.)
}

export type ParseTaskResult = ParseTaskSuccessResult | ParseTaskFailureResult;
