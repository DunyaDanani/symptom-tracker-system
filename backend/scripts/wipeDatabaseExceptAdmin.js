/**
 * Wipes all application data from the MongoDB Atlas database EXCEPT admin
 * user accounts (role: "admin") in the users collection, which are kept
 * fully intact (username + hashed password + role + name) so you can still
 * log in afterward.
 *
 * Every other collection (students, symptom logs, emotion check-ins,
 * alerts, messages, notices, doctor documents, study resources, teacher
 * profiles, academic terms, teacher assignment requests, break activity
 * logs, cao/parent/teacher/principal users, etc.) is fully cleared.
 *
 * This does NOT delete files on disk in backend/uploads/ — those become
 * orphaned once the DoctorDocument/StudyResource/Message records that
 * reference them are gone. Delete that folder's contents separately if you
 * want a full reset.
 *
 * Usage (run from the backend/ folder):
 *   node scripts/wipeDatabaseExceptAdmin.js            -> dry run, shows what would happen
 *   node scripts/wipeDatabaseExceptAdmin.js --confirm   -> actually deletes, after an interactive prompt
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "node:readline/promises";

dotenv.config();

const isConfirmRun = process.argv.includes("--confirm");

const ask = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set (check backend/.env).");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log(`✅ Connected to database: ${db.databaseName}`);

  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name).sort();

  const usersCollection = db.collection("users");
  const adminCount = await usersCollection.countDocuments({ role: "admin" });
  const nonAdminUserCount = await usersCollection.countDocuments({ role: { $ne: "admin" } });

  console.log("\n=== Plan ===");
  console.log(`Admin users to KEEP: ${adminCount}`);
  console.log(`Non-admin users to DELETE (parent/child/teacher/principal/cao): ${nonAdminUserCount}`);

  let totalOtherDocs = 0;
  for (const name of collectionNames) {
    if (name === "users") continue;
    const count = await db.collection(name).countDocuments();
    totalOtherDocs += count;
    console.log(`${name}: ${count} document(s) to DELETE`);
  }

  if (adminCount === 0) {
    console.error(
      "\n❌ No user with role \"admin\" was found. Refusing to continue — running this now would leave you " +
        "unable to log in at all. Run backend/seedAdmin.js first, or check MONGO_URI points at the right database."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!isConfirmRun) {
    console.log(
      `\nDry run only — no changes made. Re-run with --confirm to proceed (you'll get one more prompt before anything is deleted).`
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(
    `\n⚠️  This will permanently delete ${nonAdminUserCount} non-admin user(s) and ${totalOtherDocs} document(s) ` +
      `across ${collectionNames.length - 1} other collection(s) from "${db.databaseName}". Admin accounts are kept.`
  );
  const answer = await ask('Type "DELETE ALL DATA" to continue: ');
  if (answer.trim() !== "DELETE ALL DATA") {
    console.log("Aborted — no changes made.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\n=== Deleting ===");
  const usersResult = await usersCollection.deleteMany({ role: { $ne: "admin" } });
  console.log(`users: deleted ${usersResult.deletedCount}, kept ${adminCount} admin account(s)`);

  for (const name of collectionNames) {
    if (name === "users") continue;
    const result = await db.collection(name).deleteMany({});
    console.log(`${name}: deleted ${result.deletedCount}`);
  }

  console.log("\n✅ Done. Only admin account(s) remain.");
  await mongoose.disconnect();
  process.exit(0);
};

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
