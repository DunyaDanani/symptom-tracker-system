import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./models/User.js";

dotenv.config();

// Creates the first CAO (Chief Administrative Officer) account. CAO has
// identical permissions to admin (enforced centrally in
// middleware/authMiddleware.js) and logs into the same admin dashboard —
// this just seeds the account itself, mirroring seedAdmin.js.
const seedCAO = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    const existingCAO = await User.findOne({ username: "cao" });

    if (existingCAO) {
      console.log("⚠️  CAO user already exists. No changes made.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Cao@123", 10);

    const cao = new User({
      username: "cao",
      password: hashedPassword,
      role: "cao",
      name: "Chief Administrative Officer",
    });

    await cao.save();

    console.log("✅ CAO user created successfully!");
    console.log("   Username: cao");
    console.log("   Password: Cao@123");
    console.log("   (Change this password after first login)");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding CAO:", error);
    process.exit(1);
  }
};

seedCAO();
