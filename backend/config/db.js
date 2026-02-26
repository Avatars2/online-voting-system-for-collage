import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ovs";
if (MONGO_URI.includes("mongodb.net") && !MONGO_URI.match(/mongodb\.net\/[^/?]+/)) {
  MONGO_URI = MONGO_URI.replace(/\/\?/, "/ovs?");
}

export default async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      retryWrites: true,
      w: "majority",
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
