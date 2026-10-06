export interface NormalizedChat {
  id: number;
  type: string;
  title?: string;
}

export interface NormalizedSender {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface NormalizedMessageData {
  id: number;
  text?: string;
  caption?: string;
  timestamp: Date; // Đã chuẩn hóa từ Unix seconds của Telegram sang JS Date
}

export interface NormalizedSource {
  isWhitelisted: boolean;
}

export interface NormalizedTelegramMessage {
  chat: NormalizedChat;
  sender: NormalizedSender;
  message: NormalizedMessageData;
  source: NormalizedSource;
}
