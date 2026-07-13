import dotenv from "dotenv";
import { sendEmail } from "./utils/mailer.js";

dotenv.config();

// One-off SMTP sanity check — isolates whether email delivery is broken at
// the config/credentials level, separate from the admission flow. Run:
//   node testSendEmail.js you@example.com
const to = process.argv[2];

if (!to) {
  console.error("Usage: node testSendEmail.js <recipient-email>");
  process.exit(1);
}

console.log("Using SMTP config:");
console.log("  SMTP_HOST:", process.env.SMTP_HOST || "(not set)");
console.log("  SMTP_PORT:", process.env.SMTP_PORT || "(not set)");
console.log("  SMTP_USER:", process.env.SMTP_USER || "(not set)");
console.log(
  "  SMTP_PASS:",
  process.env.SMTP_PASS ? `set (${process.env.SMTP_PASS.length} chars)` : "(not set)"
);
console.log("  EMAIL_FROM:", process.env.EMAIL_FROM || "(not set, falls back to SMTP_USER)");
console.log("");

try {
  await sendEmail({
    to,
    subject: "OKI System — test email",
    html: `<p>This is a test email from the symptom-tracker-system backend, sent at ${new Date().toLocaleString()}.</p>
           <p>If you're reading this, SMTP delivery is working.</p>`,
  });
  console.log(`✅ Sent successfully to ${to}. Check inbox (and spam folder).`);
  process.exit(0);
} catch (error) {
  console.error("❌ Failed to send email. Full error below:");
  console.error(error);
  process.exit(1);
}
