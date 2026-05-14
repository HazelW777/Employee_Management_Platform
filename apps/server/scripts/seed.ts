import mongoose from "mongoose";
import { connectDB } from "../config/db";
import User from "../models/User";

async function seed(): Promise<void> {
  await connectDB();

  const existing = await User.findOne({ username: "hr" });
  if (existing) {
    console.log("HR user already exists, skipping.");
    await mongoose.disconnect();
    return;
  }

  await User.create({
    username: "hr",
    email: "hr@chuwa.com",
    password: "Test1234",
    role: "hr",
  });

  console.log("HR user created: hr@chuwa.com");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
