import nodemailer from "nodemailer";

// Requires these in backend/.env (not set yet — add your own SMTP
// credentials before forgot-username/forgot-password will actually send
// mail; until then these calls will throw and the routes will return a
// 500, which is safe but won't reach anyone's inbox):
//   SMTP_HOST=
//   SMTP_PORT=587
//   SMTP_USER=
//   SMTP_PASS=
//   EMAIL_FROM=OKI International School <no-reply@oki.school>
//   ADMIN_EMAIL=   (where admin recovery-activity alerts go)

// Built lazily on first actual use, NOT at module load time. This file
// gets imported transitively (index.js -> authRoutes.js -> authController.js
// -> mailer.js) before index.js's own dotenv.config() call has a chance to
// run — ES module imports are fully resolved before the importing file's
// own top-level code executes, so a transporter built eagerly here would
// read SMTP_HOST/PORT/USER/PASS while they're still undefined, silently
// defaulting nodemailer to localhost and failing every send with
// ECONNREFUSED 127.0.0.1. Deferring construction until sendEmail()/
// notifyAdmin() are actually called guarantees dotenv has already run by
// then (the server doesn't start accepting requests until after it has).
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
};

export const notifyAdmin = async ({ subject, html }) => {
  if (!process.env.ADMIN_EMAIL) return;
  await sendEmail({ to: process.env.ADMIN_EMAIL, subject, html });
};
