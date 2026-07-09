import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    const existingAdmin = await User.findOne({ username: "admin" });

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists. No changes made.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    const admin = new User({
      username: "admin",
      password: hashedPassword,
      role: "admin",
      name: "System Administrator",
    });

    await admin.save();

    console.log("✅ Admin user created successfully!");
    console.log("   Username: admin");
    console.log("   Password: Admin@123");
    console.log("   (Change this password after first login)");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();