import { Request, Response } from "express";
import Invitation from "../models/Invitation";
import AppError from "../utils/AppError";
import { sendEmail } from "../utils/sendEmail";
import { env } from "../config/env";

// ----------------- Send Invitation -----------------
export const sendInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body as { email: string };

  const existing = await Invitation.findOne({
    email,
    $or: [
      { used: true },
      { used: false, invalidated: false, expiresAt: { $gt: new Date() } },
    ],
  });

  if (existing?.used)
    throw new AppError("This email has already accepted an invitation.", 409);
  if (existing)
    throw new AppError(
      "A pending invitation for this email already exists.",
      409,
    );

  // Invalidate any active tokens for this email before issuing a new one
  await Invitation.invalidateActiveTokensForEmail(email);

  const { rawToken, hashedToken, expiresAt } =
    Invitation.generateInvitationToken();

  await Invitation.create({
    email,
    token: hashedToken,
    createdBy: req.user!.id,
    expiresAt,
  });

  const registrationLink = `${env.CLIENT_URL}/signup?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: "You have been invited to join Chuwa",
    text: `Hello,\n\nYou have been invited to register. Click the link below to set up your account:\n\n${registrationLink}\n\nThis link will expire in 3 hours.\n\nIf you did not expect this invitation, please ignore this email.`,
  });

  res.status(201).json({ message: "Invitation sent successfully" });
};

// ----------------- Resend Invitation -----------------
// Invalidates previous token for the email and sends a fresh one
export const resendInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const original = await Invitation.findById(id);
  if (!original) throw new AppError("Invitation not found", 404);

  if (original.used)
    throw new AppError("Invitation has already been used", 400);

  await Invitation.invalidateActiveTokensForEmail(original.email);

  const { rawToken, hashedToken, expiresAt } =
    Invitation.generateInvitationToken();

  await Invitation.create({
    email: original.email,
    token: hashedToken,
    createdBy: req.user!.id,
    expiresAt,
  });

  const registrationLink = `${env.CLIENT_URL}/signup?token=${rawToken}`;

  await sendEmail({
    to: original.email,
    subject: "Your invitation has been resent",
    text: `Hello,\n\nHere is your updated registration link:\n\n${registrationLink}\n\nThis link will expire in 3 hours.\n\nIf you did not expect this invitation, please ignore this email.`,
  });

  res.json({ message: "Invitation resent successfully" });
};

// ----------------- Revoke Invitation -----------------
export const revokeInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const invitation = await Invitation.findById(id);
  if (!invitation) throw new AppError("Invitation not found", 404);

  if (invitation.used)
    throw new AppError("Cannot revoke a used invitation", 400);
  if (invitation.invalidated)
    throw new AppError("Invitation is already revoked", 400);

  invitation.invalidated = true;
  invitation.invalidatedAt = new Date();
  await invitation.save();

  res.json({ message: "Invitation revoked successfully" });
};

// ----------------- Get All Invitations -----------------
export const getInvitations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit as string) || 20),
  );
  const skip = (page - 1) * limit;

  const [invitations, total] = await Promise.all([
    Invitation.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "email"),
    Invitation.countDocuments(),
  ]);

  res.json({
    invitations,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
