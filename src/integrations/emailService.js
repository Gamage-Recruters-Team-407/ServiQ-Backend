const nodemailer = require("nodemailer");
const { AppError } = require("../utils/authUtils");

function isEmailConfigured() {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  return Boolean(user && pass);
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function buildResetOtpHtml({ firstName, otp }) {
  const greetingName = firstName ? ` ${firstName}` : "";
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #FFF7ED; padding: 32px 16px; color: #0F172A;">
      <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 28px;">
        <div style="font-size: 22px; font-weight: 800; color: #0F172A; margin-bottom: 16px;">
          servi<span style="color: #F97316;">Q</span>
        </div>
        <h2 style="font-size: 18px; margin: 0 0 10px; color: #0F172A;">Password Reset Verification Code</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 0 0 20px;">
          Hi${greetingName}, use the 6-digit verification code below to reset your ServiQ account password.
          This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #EA580C;">${otp}</span>
        </div>
        <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0;">
          If you did not request a password reset, you can safely ignore this email or contact
          <a href="mailto:support@serviq.lk" style="color: #EA580C; font-weight: 600;">support@serviq.lk</a>.
        </p>
      </div>
    </div>
  `;
}

async function sendPasswordResetOtpEmail({ to, firstName, otp }) {
  if (!to || typeof to !== "string" || !to.includes("@")) {
    throw new AppError("Valid recipient email address is required.", 400, "INVALID_RECIPIENT");
  }

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      console.warn(
        `[ServiQ Email] SMTP_USER/SMTP_PASS not configured yet. Dev OTP for ${to}: ${otp}`
      );
    }
    return { delivered: false, mode: "dev-console" };
  }

  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || `ServiQ Support <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({
      from,
      to,
      subject: "ServiQ Password Reset Verification Code",
      text: `Your ServiQ password reset OTP code is: ${otp}. It expires in 10 minutes.`,
      html: buildResetOtpHtml({ firstName, otp })
    });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error("[ServiQ Email] Failed to send OTP email:", err.message);
    throw new AppError(
      "Unable to send verification email right now. Please check email settings or try again later.",
      502,
      "EMAIL_DELIVERY_FAILED"
    );
  }
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetOtpEmail
};
