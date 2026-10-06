# Cấu trúc & Tài liệu Dự án: Telegram Task Bot

Dự án Telegram Bot hỗ trợ quản lý công việc (task management), được xây dựng bằng TypeScript, Node.js, framework grammY và Prisma ORM.

---

## 1. Cấu trúc thư mục dự án (Project Directory Tree)

```text
telegram-task-bot/
├── .env                         # File cấu hình biến môi trường (token, database url, whitelist chat)
├── .gitignore                    # Các file/thư mục bỏ qua khi đẩy lên Git
├── package.json                 # Định nghĩa dependencies, scripts chạy dự án
├── package-lock.json            # Lock version các dependencies npm
├── tsconfig.json                # Cấu hình TypeScript compiler
├── PROJECT_STRUCTURE.md         # File tài liệu cấu trúc dự án & nội dung mã nguồn
├── prisma/
│   └── schema.prisma            # Khai báo schema database và model cho Prisma ORM
└── src/
    ├── index.ts                 # Điểm khởi chạy chính của bot (Entry point)
    ├── config/
    │   └── env.ts               # Validate biến môi trường bằng Zod & export cấu hình
    ├── telegram/
    │   └── chat-access.ts       # Kiểm tra quyền truy cập của chat/group theo whitelist
    ├── bot/                     # (Mở rộng) Khởi tạo, middleware và cấu hình bot grammY
    ├── commands/                # (Mở rộng) Xử lý các bot commands (/task, /list, /done,...)
    ├── database/                # (Mở rộng) Khởi tạo Prisma Client instance & DB queries
    ├── parser/                  # Module phân tích cú pháp tin nhắn để tạo task
    ├── scheduler/               # Scheduler lập lịch tự động (nhắc nhở 10:00, 14:00, 16:30)
    │   └── task-reminder.ts
    └── services/                # Business logic xử lý công việc / task (MongoDB & Mongoose)
```

---

## 2. Chi tiết nội dung các file hiện có

### 2.1. File cấu hình gốc

#### `package.json`
```json
{
  "name": "telegram-task-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@prisma/client": "^7.10.0",
    "dotenv": "^18.0.5",
    "grammy": "^1.46.0",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@types/node": "^26.6.4",
    "prisma": "^7.10.0",
    "tsx": "^4.23.15",
    "typescript": "^7.0.2"
  }
}
```

#### `.gitignore`
```gitignore
node_modules
.env
dist
```

#### `tsconfig.json`
*(Hiện đang để trống - sẵn sàng để bổ sung cấu hình TypeScript compiler)*

#### `.env` *(Format mẫu)*
```env
TELEGRAM_BOT_TOKEN=8686000523:AAGLUYWCXDKzK61_8pFrOnh0VkX81XAQNkk
DATABASE_URL="postgresql://user:password@localhost:5432/task_bot_db"
TELEGRAM_ALLOWED_CHAT_IDS=-5319474691
```

---

### 2.2. Thư mục `prisma/`

#### `prisma/schema.prisma`
*(Hiện đang để trống - sẵn sàng định nghĩa database datasource và models)*

---

### 2.3. Thư mục `src/`

#### `src/config/env.ts`
Validate các biến môi trường lúc khởi động ứng dụng bằng thư viện `zod`:
```typescript
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.format());

  process.exit(1);
}

export const env = {
  telegramBotToken: parsed.data.TELEGRAM_BOT_TOKEN,

  databaseUrl: parsed.data.DATABASE_URL,

  telegramAllowedChatIds: parsed.data.TELEGRAM_ALLOWED_CHAT_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean),
};
```

#### `src/telegram/chat-access.ts`
Hàm lọc tin nhắn chỉ cho phép xử lý từ các `chatId` đã nằm trong whitelist:
```typescript
import { env } from "../config/env";

export function isAllowedChat(chatId: number): boolean {
  return env.telegramAllowedChatIds.includes(String(chatId));
}
```

#### `src/index.ts`
Khởi tạo và lắng nghe tin nhắn Telegram:
```typescript
import { Bot } from "grammy";
import { env } from "./config/env";
import { isAllowedChat } from "./telegram/chat-access";

const bot = new Bot(env.telegramBotToken);

bot.on(["message", "channel_post"], async (ctx) => {
  const chatId = ctx.chat.id;
  console.log("🚀 ~ chatId:", chatId);

  if (!isAllowedChat(chatId)) {
    console.log(`[IGNORED] Message from non-whitelisted chat: ${chatId}`);

    return;
  }

  const chat = ctx.chat;
  const message = ctx.message;

  console.log("=================================");

  console.log("ALLOWED CHAT");
  console.log({
    id: chat.id,
    type: chat.type,
    title: "title" in chat ? chat.title : undefined,
  });

  console.log("MESSAGE");
  console.log({
    messageId: message.message_id,
    threadId: message.message_thread_id,
    from: message.from?.username,
    text: message.text,
  });

  console.log("=================================");
});

bot.start();

console.log("Telegram bot started...");
```

---

## 3. Tài liệu & Nguồn tham khảo liên quan (Resources)

- **grammY Framework**:
  - Trang chủ & Quickstart: [https://grammy.dev/](https://grammy.dev/)
  - Xử lý tin nhắn và Filter Queries: [https://grammy.dev/guide/filter-queries.html](https://grammy.dev/guide/filter-queries.html)
  - Xử lý lỗi (Error Handling): [https://grammy.dev/guide/errors.html](https://grammy.dev/guide/errors.html)
- **Telegram Bot API**:
  - Official Bot API Docs: [https://core.telegram.org/bots/api](https://core.telegram.org/bots/api)
  - Bot Privacy Mode (Group Messages): [https://core.telegram.org/bots/features#privacy-mode](https://core.telegram.org/bots/features#privacy-mode)
- **Zod (Schema Validation)**:
  - Tài liệu Zod: [https://zod.dev/](https://zod.dev/)
- **Prisma ORM**:
  - Prisma Documentation: [https://www.prisma.io/docs](https://www.prisma.io/docs)
  - Schema Reference: [https://www.prisma.io/docs/orm/prisma-schema/overview](https://www.prisma.io/docs/orm/prisma-schema/overview)
- **tsx (TypeScript Execute & Watch)**:
  - Repository tsx: [https://github.com/privatenumber/tsx](https://github.com/privatenumber/tsx)
