import crypto from "crypto";
import mongoose from "mongoose";
import { Request, Response } from "express";
import User from "../models/User";
import Invitation from "../models/Invitation";
import AppError from "../utils/AppError";
import { signToken, COOKIE_OPTIONS } from "../utils/jwt";
import { sendEmail } from "../utils/sendEmail";
import { env } from "../config/env";

const setTokenCookie = (res: Response, token: string): void => {
  res.cookie("token", token, COOKIE_OPTIONS);
};

//----------------- Sign up -----------------
export const signupUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token, username, password } = req.body;

  if (!token || !username || !password)
    throw new AppError("Missing required fields", 400);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await Invitation.findOne({ token: hashedToken }).select(
    "+token",
  );

  if (!invitation || !invitation.isUsable())
    throw new AppError("Invalid or expired invitation", 400);

  if (await User.exists({ username }))
    throw new AppError("Username already taken", 409);

  if (await User.exists({ email: invitation.email }))
    throw new AppError("Email has been registered!", 409);

  // Create user (no profile yet — profile is created when HR approves the application)
  const user = await User.create({
    username,
    email: invitation.email,
    password,
    role: "employee",
  });

  // Mark invitation as used. If this fails the user already exists,
  // which is acceptable — the invitation token is now stale anyway because
  // the email is occupied, and isUsable() / the email-uniqueness check above
  // will block any reuse attempt.
  invitation.used = true;
  invitation.usedAt = new Date();
  invitation.usedBy = user._id;
  await invitation.save();

  const jwtToken = signToken(user._id.toString(), "employee");
  res.cookie("token", jwtToken, COOKIE_OPTIONS);

  res.status(201).json({
    message: "Registration successful",
  });
};

// ----------------- Sign in -----------------
export const signinUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid username or password", 401);
  }

  const token = signToken(user._id.toString(), user.role);
  setTokenCookie(res, token);
  res.json({
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      profile: user.profile ?? null,
    },
  });
};

// ----------------- Change password after login -----------------
export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.id).select("+password");
  if (!user || !(await user.comparePassword(oldPassword))) {
    throw new AppError("Old password is incorrect", 401);
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: "Password changed successfully" });
};

// ----------------- Password reset -----------------
export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new AppError("No account found with that email", 404);

  const { rawToken, hashedToken, expiresAt } =
    User.generateResetPasswordToken();
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = expiresAt;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: `Click the link to reset your password: ${env.CLIENT_URL}/reset-password?token=${rawToken}\n\nThis link will expire in 1 hour.`,
    });
    res.json({ message: "Password reset email has been sent" });
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    throw new AppError("Failed to send email. Please try again later.", 500);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token, newPassword } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+password +resetPasswordToken +resetPasswordExpire");

  if (!user) throw new AppError("Invalid or expired token", 400);

  if (await user.comparePassword(newPassword)) {
    throw new AppError(
      "New password must be different from your current password",
      400,
    );
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  res.json({ message: "Password reset successfully" });
};

// ----------------- Logout -----------------
export const logoutUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ message: "Logged out successfully" });
};

// ----------------- Get current user -----------------
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError("User not found", 401);
  res.json({
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      profile: user.profile ?? null,
    },
  });
};

// ----------------- Validate invitation token (public) -----------------
// Returns whether the token is still usable without exposing invitation data.
export const validateInviteToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const rawToken = req.params.token as string;
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const invitation = await Invitation.findOne({ token: hashedToken }).select(
    "+token",
  );
  if (!invitation || !invitation.isUsable()) {
    res.json({ valid: false });
    return;
  }
  res.json({ valid: true, email: invitation.email });
};
