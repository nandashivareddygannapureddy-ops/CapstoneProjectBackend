import nodemailer from "nodemailer";

export const sendResetEmail = async (email, resetToken) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"Blog App Elite" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request - Elite Access",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0f172a; margin-bottom: 10px;">Elite Story Password Reset</h1>
          <p style="color: #64748b;">You requested a password reset for your Blog App account.</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; text-align: center;">
          <p style="margin-bottom: 25px; color: #334155;">Please click the button below to reset your password. This link will expire in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Reset My Password</a>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #94a3b8; font-size: 13px;">
          <p>If you did not request this, please ignore this email.</p>
          <p>&copy; 2026 Blog App Elite. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
