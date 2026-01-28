import { NextResponse } from "next/server";
import { auth, db } from "../../../firebase/admin";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists first
    try {
      await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        return NextResponse.json(
          { success: false, message: "This email is not registered." },
          { status: 404 }
        );
      }
      throw error; // Re-throw other auth errors
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save to Firestore
    await db.collection("password_resets").doc(email).set({
      code,
      expiresAt,
      createdAt: new Date(),
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Mockrithm" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Verification Code - Mockrithm",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">Verification Code</h2>
          <p>Hello,</p>
          <p>You requested a password reset. Use the code below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; color: #000;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">Mockrithm © 2024</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email.",
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to send reset code. Please check if your SMTP details are correct or try again later.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
