const nodemailer = require("nodemailer");

/**
 * Configure email transporter
 * Supports Gmail or any custom SMTP provider via environment variables
 */
function createTransporter() {
  // If SMTP credentials exist in .env
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback / Development mode warning
  return null;
}

/**
 * Send Password Reset OTP Email
 * @param {string} toEmail 
 * @param {string} userName 
 * @param {string} otpCode 
 */
async function sendPasswordResetEmail(toEmail, userName, otpCode) {
  const transporter = createTransporter();

  // If SMTP credentials not provided, log clearly to console for easy testing
  if (!transporter) {
    console.log("\n=======================================================");
    console.log(`[SMTP DEV MODE] Password Reset OTP for ${toEmail}:`);
    console.log(`OTP CODE: ${otpCode}`);
    console.log("To send real emails, set SMTP_USER and SMTP_PASS in backend/.env");
    console.log("=======================================================\n");
    return { success: true, mode: "console" };
  }

  const mailOptions = {
    from: `"serviQ Support" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your serviQ Password Reset Code",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #fed7aa; }
          .header { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%); padding: 32px 24px; text-align: center; }
          .logo { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .logo span { color: #ea580c; }
          .content { padding: 32px 28px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .otp-box { background: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ea580c; font-family: monospace; }
          .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">servi<span>Q</span></div>
            <p style="margin: 6px 0 0; font-size: 13px; color: #c2410c; font-weight: 600;">Security & Account Recovery</p>
          </div>
          <div class="content">
            <div class="title">Password Reset Request</div>
            <p class="text">Hello ${userName || "there"},</p>
            <p class="text">We received a request to reset your password for your serviQ account. Use the verification code below to complete the reset process:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
              <p style="margin: 8px 0 0; font-size: 11px; color: #9a3412;">Code is valid for 15 minutes only.</p>
            </div>
            
            <p class="text">If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} serviQ Marketplace. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${toEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Failed to send email via SMTP:", err.message);
    throw new Error("Failed to dispatch verification email. Please try again later.");
  }
}

module.exports = {
  sendPasswordResetEmail
};

