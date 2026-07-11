import mongoose from "mongoose";
import dns from "node:dns";

// استخدام Google DNS لتجاوز حجب الشبكة المحلية
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

export { mongoose };

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI must be set. Did you forget to configure MongoDB?");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  isConnected = true;
}

export * from "./schema";
