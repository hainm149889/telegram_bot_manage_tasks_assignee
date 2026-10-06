import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.databaseUrl);
    console.log("[Database] Connected successfully to MongoDB Atlas");
  } catch (error) {
    console.error("[Database] Connection failed:", error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log("[Database] Disconnected from MongoDB Atlas");
  } catch (error) {
    console.error("[Database] Disconnection failed:", error);
  }
}
