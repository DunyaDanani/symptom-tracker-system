import mongoose from "mongoose";

// Fail fast (10s) instead of the 30s default so a bad connection shows up
// quickly in the console instead of making every request hang before
// falling through to the generic 500 handler in each controller.
const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
};

const connectDB = async () => {
  try {
    console.log("Connecting to:");
    console.log(process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI, CONNECT_OPTIONS);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ FULL ERROR:");
    console.error(error);
    process.exit(1);
  }
};

// The initial connect() above only guards the *first* connection attempt.
// If Atlas drops the connection later (free-tier cluster pausing, network
// blip, IP briefly falling off the Atlas Network Access list, etc.), every
// controller's try/catch will start returning a generic "Server Error" for
// every request with no indication of why — this is the #1 real-world
// cause of that message in this app. These listeners make that visible in
// the server console the moment it happens, instead of only showing up as
// unexplained "Server Error" responses in the UI.
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected — requests will fail until it reconnects.");
});
mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

export default connectDB;