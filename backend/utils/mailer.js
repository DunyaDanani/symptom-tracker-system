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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
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
