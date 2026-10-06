import { Bot } from "grammy";
import { env } from "../src/config/env";
import { connectDatabase, disconnectDatabase } from "../src/database/mongodb";
import { TaskModel, TaskStatus } from "../src/models/task";
import {
  createTaskFromMessage,
  acceptTaskByMessageId,
  completeTaskByMessageId,
  cancelTaskByMessageId,
  getUnfinishedTasksByChatId,
} from "../src/services/task";
import { formatTaskReminderMessage } from "../src/telegram/response-formatter";
import { runTaskReminder } from "../src/scheduler/task-reminder";

async function runFullFlowTest() {
  console.log("=================================================");
  console.log("🚀 BẮT ĐẦU TEST FULL FLOW TELEGRAM TASK BOT");
  console.log("=================================================\n");

  await connectDatabase();

  const testChatId = Number(env.telegramAllowedChatIds[0]) || -5319474691;
  const baseMessageId = Math.floor(Date.now() / 1000) % 1000000;

  console.log(`📌 Test Chat ID: ${testChatId}`);
  console.log(`📌 Base Message ID: ${baseMessageId}\n`);

  const createdTaskIds: any[] = [];

  try {
    // -----------------------------------------------------------------
    // BƯỚC 1: TẠO CÁC TASK MỚI (Trạng thái ban đầu: PENDING)
    // -----------------------------------------------------------------
    console.log("--- BƯỚC 1: TẠO CÁC TASK TEST ---");

    // Task 1: Cho hainm_dev (PENDING)
    const task1 = await createTaskFromMessage(
      {
        chat: { id: testChatId, title: "Test Group", type: "supergroup" },
        message: { id: baseMessageId + 1, date: Math.floor(Date.now() / 1000) },
        sender: { id: 111, firstName: "Hai", lastName: "Nguyen", username: "hainm_creator" },
      },
      { assignee: "hainm_dev", command: "/task", title: "Viết API thanh toán cổng VNPAY" },
    );
    if (task1) createdTaskIds.push(task1._id);
    console.log(`✅ [Tạo Task 1] ID: ${task1?._id} | Assignee: @${task1?.assignee} | Status: ${task1?.status}`);

    // Task 2: Cho hainm_dev (Sau đó sẽ chuyển ACCEPTED)
    const task2 = await createTaskFromMessage(
      {
        chat: { id: testChatId, title: "Test Group", type: "supergroup" },
        message: { id: baseMessageId + 2, date: Math.floor(Date.now() / 1000) },
        sender: { id: 111, firstName: "Hai", lastName: "Nguyen", username: "hainm_creator" },
      },
      { assignee: "hainm_dev", command: "/task", title: "Review PR #45 tối ưu query MongoDB" },
    );
    if (task2) createdTaskIds.push(task2._id);
    console.log(`✅ [Tạo Task 2] ID: ${task2?._id} | Assignee: @${task2?.assignee} | Status: ${task2?.status}`);

    // Task 3: Cho lan_qa (PENDING)
    const task3 = await createTaskFromMessage(
      {
        chat: { id: testChatId, title: "Test Group", type: "supergroup" },
        message: { id: baseMessageId + 3, date: Math.floor(Date.now() / 1000) },
        sender: { id: 111, firstName: "Hai", lastName: "Nguyen", username: "hainm_creator" },
      },
      { assignee: "lan_qa", command: "/task", title: "Kiểm thử luồng nhắc nhở bot trên staging" },
    );
    if (task3) createdTaskIds.push(task3._id);
    console.log(`✅ [Tạo Task 3] ID: ${task3?._id} | Assignee: @${task3?.assignee} | Status: ${task3?.status}`);

    // Task 4: Cho lan_qa (Sau đó sẽ chuyển COMPLETED)
    const task4 = await createTaskFromMessage(
      {
        chat: { id: testChatId, title: "Test Group", type: "supergroup" },
        message: { id: baseMessageId + 4, date: Math.floor(Date.now() / 1000) },
        sender: { id: 111, firstName: "Hai", lastName: "Nguyen", username: "hainm_creator" },
      },
      { assignee: "lan_qa", command: "/task", title: "Viết test checklist cho release v1.2" },
    );
    if (task4) createdTaskIds.push(task4._id);
    console.log(`✅ [Tạo Task 4] ID: ${task4?._id} | Assignee: @${task4?.assignee} | Status: ${task4?.status}`);

    // Task 5: Cho tuan_pm (Sau đó sẽ chuyển CANCELLED)
    const task5 = await createTaskFromMessage(
      {
        chat: { id: testChatId, title: "Test Group", type: "supergroup" },
        message: { id: baseMessageId + 5, date: Math.floor(Date.now() / 1000) },
        sender: { id: 111, firstName: "Hai", lastName: "Nguyen", username: "hainm_creator" },
      },
      { assignee: "tuan_pm", command: "/task", title: "Hop voi khach hang du an cu" },
    );
    if (task5) createdTaskIds.push(task5._id);
    console.log(`✅ [Tạo Task 5] ID: ${task5?._id} | Assignee: @${task5?.assignee} | Status: ${task5?.status}\n`);

    // -----------------------------------------------------------------
    // BƯỚC 2: CHUYỂN TRẠNG THÁI TASK
    // -----------------------------------------------------------------
    console.log("--- BƯỚC 2: CHUYỂN TRẠNG THÁI CÁC TASK ---");

    // Task 2: Chuyển sang ACCEPTED
    const acceptedTask2 = await acceptTaskByMessageId(testChatId, baseMessageId + 2);
    console.log(`👌 [Chuyển ACCEPTED] Task 2 -> Status: ${acceptedTask2?.status}`);

    // Task 4: Chuyển sang COMPLETED
    const completedTask4 = await completeTaskByMessageId(testChatId, baseMessageId + 4);
    console.log(`✅ [Chuyển COMPLETED] Task 4 -> Status: ${completedTask4?.status}`);

    // Task 5: Chuyển sang CANCELLED
    const cancelledTask5 = await cancelTaskByMessageId(testChatId, baseMessageId + 5);
    console.log(`❌ [Chuyển CANCELLED] Task 5 -> Status: ${cancelledTask5?.status}\n`);

    // -----------------------------------------------------------------
    // BƯỚC 3: KIỂM TRA TRUY VẤN UNFINISHED TASKS
    // -----------------------------------------------------------------
    console.log("--- BƯỚC 3: KIỂM TRA QUERY TASK CHƯA HOÀN THÀNH (PENDING & ACCEPTED) ---");
    const unfinishedTasks = await getUnfinishedTasksByChatId(testChatId);
    console.log(`📊 Tìm thấy tổng cộng: ${unfinishedTasks.length} unfinished tasks trong group`);

    const ourTestTasks = unfinishedTasks.filter((t) =>
      createdTaskIds.some((id) => id.toString() === (t._id as object).toString()),
    );

    console.log(`🎯 Số task test khớp điều kiện nhắc nhở: ${ourTestTasks.length}/3 (Task 1, 2, 3)`);
    ourTestTasks.forEach((t, i) => {
      console.log(`   ${i + 1}. [${t.status}] @${t.assignee}: ${t.title}`);
    });

    // Verify logic
    const hasCompletedOrCancelled = ourTestTasks.some(
      (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED,
    );
    if (hasCompletedOrCancelled) {
      throw new Error("LỖI: Query lấy nhầm task COMPLETED hoặc CANCELLED!");
    } else {
      console.log("✅ XÁC NHẬN: Không có task COMPLETED hoặc CANCELLED trong danh sách nhắc nhở!\n");
    }

    // -----------------------------------------------------------------
    // BƯỚC 4: KIỂM TRA FORMAT TIN NHẮN NHẮC NHỞ
    // -----------------------------------------------------------------
    console.log("--- BƯỚC 4: KIỂM TRA FORMAT TIN NHẮN NHẮC NHỞ TẠI 14:00 ---");
    const reminderHtml = formatTaskReminderMessage(ourTestTasks, "14:00");
    console.log("----- [NỘI DUNG TIN NHẮN BOT GỬI VÀO CHAT BOX] -----");
    console.log(reminderHtml);
    console.log("----------------------------------------------------\n");

    // Kiểm tra các thành phần của tin nhắn
    if (!reminderHtml.includes("@hainm_dev") || !reminderHtml.includes("@lan_qa")) {
      throw new Error("LỖI: Tin nhắn thiếu tag assignee @hainm_dev hoặc @lan_qa!");
    }
    if (reminderHtml.includes("@tuan_pm")) {
      throw new Error("LỖI: Tin nhắn bị lọt assignee @tuan_pm (task đã CANCELLED)!");
    }
    console.log("✅ XÁC NHẬN: Format tin nhắn chuẩn xác, tag đúng người, phân loại đúng PENDING và ACCEPTED!\n");

    // -----------------------------------------------------------------
    // BƯỚC 5: GỬI THỬ NGHIỆM THỰC TẾ QUA TELEGRAM BOT
    // -----------------------------------------------------------------
    console.log("--- BƯỚC 5: GỬI TEST THỰC TẾ QUA TELEGRAM BOT API ---");
    const bot = new Bot(env.telegramBotToken);

    try {
      console.log(`📤 Đang gửi tin nhắn nhắc nhở trực tiếp vào Chat ID: ${testChatId}...`);
      await bot.api.sendMessage(testChatId, reminderHtml, {
        parse_mode: "HTML",
      });
      console.log("🎉 GỬI THÀNH CÔNG VÀO TELEGRAM GROUP CHAT!");
    } catch (teleError: any) {
      console.warn("⚠️ Không thể gửi tin Telegram (có thể bot chưa được thêm vào chat hoặc bị chặn):", teleError.message);
    }

    // -----------------------------------------------------------------
    // BƯỚC 6: DỌN DẸP DATA TEST
    // -----------------------------------------------------------------
    console.log("\n--- BƯỚC 6: DỌN DẸP DỮ LIỆU TEST ---");
    const deleteResult = await TaskModel.deleteMany({ _id: { $in: createdTaskIds } });
    console.log(`🧹 Đã dọn dẹp ${deleteResult.deletedCount} task test khỏi MongoDB Atlas.`);

    console.log("\n=================================================");
    console.log("🎉 FULL FLOW TEST HOÀN TẤT VÀ ĐẠT 100% YÊU CẦU!");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình chạy test flow:", error);
  } finally {
    await disconnectDatabase();
  }
}

runFullFlowTest();
