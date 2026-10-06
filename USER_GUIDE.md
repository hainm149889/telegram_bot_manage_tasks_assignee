# Hướng Dẫn Sử Dụng Telegram Task Bot

Tài liệu tổng hợp toàn bộ các câu lệnh, cú pháp và thao tác tương tác mà Telegram Task Bot hiện tại hỗ trợ theo đúng mã nguồn dự án.

---

## 1. Tạo Task Mới (Task Creation)

Bot không sử dụng câu lệnh độc lập mà lắng nghe tin nhắn chứa cú pháp tạo task trực tiếp trong nhóm chat được cấp quyền (Whitelist).

### Cú pháp chuẩn:
```text
@assignee /task <Nội dung công việc>
```
hoặc:
```text
@assignee /todo <Nội dung công việc>
```

### Cách sử dụng:
* **Trường hợp 1 (Người dùng có username):**
  ```text
  @nguyena /task Thiết kế banner sự kiện
  ```
* **Trường hợp 2 (Người dùng không có username - Dùng Tag Member):**
  * Gõ `@` rồi chọn trực tiếp thành viên Telegram đó từ danh sách gợi ý của Telegram (dạng text_mention), sau đó gõ kèm `/task <Nội dung>` hoặc `/todo <Nội dung>`.

> [!NOTE]
> Bot hỗ trợ cả nội dung công việc nhiều dòng (xuống dòng thoải mái trong phần nội dung).

---

## 2. Xem Danh Sách Task (Task Query)

Lấy toàn bộ danh sách task đã tạo trong nhóm chat hiện tại kèm theo trạng thái:
* ⏳ `PENDING`: Đang chờ xử lý
* 👌 `ACCEPTED`: Đã tiếp nhận
* 🔄 `IN_PROGRESS`: Đang thực hiện
* ✅ `COMPLETED`: Đã hoàn thành
* ❌ `CANCELLED`: Đã hủy

### Câu lệnh:
```text
/tasks
```
hoặc:
```text
/list
```

---

## 3. Hoàn Thành Task (Mark as Completed)

Đánh dấu chuyển trạng thái task sang `COMPLETED` (✅).

### Cách 1: Reply trực tiếp vào tin nhắn task gốc
Tìm lại tin nhắn thông báo tạo task gốc (hoặc tin nhắn lệnh tạo task) và Reply một trong các nội dung sau:
* Lệnh: `/done`, `/complete`, `/completed`
* Từ khóa tự nhiên: `xong rồi`, `xong`, `ok rồi ạ`, `ok done`, `done`, `đã xong`, `hoàn thành`, `đã làm xong`

### Cách 2: Sử dụng Task ID
1. Lấy **Task ID** (chuỗi Hex 24 ký tự từ MongoDB, ví dụ: `65f1a2b3c4d5e6f7a8b9c0d1`).
2. Gõ lệnh trực tiếp:
   ```text
   /done <taskId>
   ```
   *Ví dụ:*
   ```text
   /done 65f1a2b3c4d5e6f7a8b9c0d1
   ```

---

## 4. Hủy Task (Mark as Cancelled)

Đánh dấu chuyển trạng thái task sang `CANCELLED` (❌).

### Cách 1: Reply trực tiếp vào tin nhắn task gốc
Reply trực tiếp vào tin nhắn task gốc với một trong các nội dung sau:
* Lệnh: `/cancel`, `/cancelled`
* Từ khóa tự nhiên: `thôi`, `dừng`, `để vậy đã`, `tạm vậy đã`, `stop`, `hủy đi`, `không phải làm`, `hủy`, `cancel`, `bỏ`

### Cách 2: Sử dụng Task ID
Gõ lệnh trực tiếp kèm Task ID:
```text
/cancel <taskId>
```
*Ví dụ:*
```text
/cancel 65f1a2b3c4d5e6f7a8b9c0d1
```

---

## 5. Tiếp Nhận Task (Accept Task - Tự động)

Không cần dùng câu lệnh gạch chéo `/`, bot tự động nhận diện và chuyển trạng thái task sang `ACCEPTED` (👌) qua **2 cách linh hoạt**:

### Cách 1: Reply từ khóa tiếp nhận vào tin nhắn task gốc
Reply trực tiếp vào tin nhắn task gốc bằng một trong các từ hoặc cụm từ sau:
* `ok`, `oke`, `okay`
* `vâng`, `vang`
* `đã rõ`, `da ro`, `rõ`, `ro`
* `nhận`, `nhan`
* `thả tym`, `thả like`
* `👍`, `❤️`

### Cách 2: Thả Emoji Reaction
Thả trực tiếp reaction cảm xúc vào tin nhắn task gốc:
* 👍 *(Thumbs Up)*
* ❤️ *(Red Heart)*

Bot sẽ tự động bắt sự kiện reaction và gửi thông báo xác nhận tiếp nhận task.

---

## 📊 Bảng Tóm Tắt

| Thao tác | Cú pháp / Hành động | Ví dụ |
| :--- | :--- | :--- |
| **Tạo task** | `@assignee /task <Nội dung>`<br>`@assignee /todo <Nội dung>` | `@nam /task Check bug login`<br>*(Hoặc tag tên member)* |
| **Xem danh sách** | `/tasks` hoặc `/list` | `/tasks` |
| **Tiếp nhận task** | Reply từ khóa (`ok`, `đã rõ`,...) hoặc thả emoji (`👍`, `❤️`) | Reply tin task: `ok`<br>Thả reaction: 👍 |
| **Hoàn thành (Reply)** | Reply `/done` hoặc các từ khóa (`xong`, `đã xong`, `done`, `hoàn thành`,...) | Reply tin task: `xong rồi` hoặc `/done` |
| **Hoàn thành (ID)** | `/done <taskId>` | `/done 65f1a2b3c4d5e6f7a8b9c0d1` |
| **Hủy task (Reply)** | Reply `/cancel` hoặc các từ khóa (`thôi`, `hủy`, `dừng`, `stop`, `bỏ`,...) | Reply tin task: `hủy` hoặc `/cancel` |
| **Hủy task (ID)** | `/cancel <taskId>` | `/cancel 65f1a2b3c4d5e6f7a8b9c0d1` |

