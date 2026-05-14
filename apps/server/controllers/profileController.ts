import { Request, Response } from "express";
import Profile from "../models/Profile";
import AppError from "../utils/AppError";

// ----------------- Get My Profile -----------------
export const getMyProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const profile = await Profile.findOne({ user: req.user!.id }).select("+ssn");
  if (!profile) throw new AppError("Profile not found", 404);
  res.json({ profile });
};

// ----------------- Update My Profile -----------------
// Employee updates their own profile directly — no HR review required.
// Email and user reference are immutable and excluded from the update.
export const updateMyProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const profile = await Profile.findOne({ user: req.user!.id }).select("+ssn");
  if (!profile) throw new AppError("Profile not found", 404);

  const { email: _email, user: _user, ...updates } = req.body;

  Object.assign(profile, updates);
  await profile.save();

  res.json({ profile });
};

// ----------------- Get All Profiles (HR) -----------------
// Supports optional ?search= query to filter by first/last name.
export const getAllProfiles = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit as string) || 20),
  );
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (req.query.search) {
    const re = new RegExp(req.query.search as string, "i");
    filter.$or = [{ firstName: re }, { middleName: re }, { lastName: re }];
  }

  const [profiles, total] = await Promise.all([
    Profile.find(filter)
      .select("+ssn")
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username email"),
    Profile.countDocuments(filter),
  ]);

  res.json({
    profiles,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

// ----------------- Get Profile by ID (HR) -----------------
export const getProfileById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const profile = await Profile.findById(req.params.id)
    .select("+ssn")
    .populate("user", "username email");
  if (!profile) throw new AppError("Profile not found", 404);
  res.json({ profile });
};
