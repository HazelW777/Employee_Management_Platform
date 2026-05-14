import { Request, Response } from "express";
import mongoose from "mongoose";
import Application from "../models/Application";
import Profile from "../models/Profile";
import User from "../models/User";
import DocumentModel from "../models/Document";
import AppError from "../utils/AppError";
import type { UpdateProfileInput } from "shared";

// ----------------- Submit Application -----------------
// Employee submits onboarding form. Email is pulled from the User record so it
// cannot be spoofed. Doc IDs for picture/licence are resolved from Document
// collection. workAuthDocId and optReceiptDocId are intentionally excluded from
// the snapshot — HR looks them up dynamically from the Document collection.
export const submitApplication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.user!.id;
  const body = req.body as UpdateProfileInput;

  const existing = await Application.findOne({
    user: userId,
    status: { $in: ["pending", "approved"] },
  });

  if (existing) {
    throw new AppError(
      existing.status === "approved"
        ? "Your application has already been approved"
        : "You already have a pending application under review",
      400,
    );
  }

  const [user, picDoc, licenseDoc] = await Promise.all([
    User.findById(userId).select("email"),
    DocumentModel.findOne({ user: userId, type: "profile_picture", status: "approved" }),
    DocumentModel.findOne({ user: userId, type: "drivers_license", status: "approved" }),
  ]);

  if (!user) throw new AppError("User not found", 404);

  const application = await Application.create({
    user: userId,
    snapshot: {
      ...body,
      email: user.email,
      profilePictureDocId: picDoc?._id,
      driversLicenseDocId: licenseDoc?._id,
    },
  });

  res.status(201).json({ application });
};

// ----------------- Get My Application -----------------
// Returns the employee's most recent application. opt_receipt and work_auth
// documents are attached dynamically so their live review status is accurate.
export const getMyApplication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const application = await Application.findOne({ user: req.user!.id }).sort({
    createdAt: -1,
  });

  if (!application) {
    res.json({ application: null });
    return;
  }

  const [optReceiptDoc, workAuthDoc] = await Promise.all([
    DocumentModel.findOne({ user: req.user!.id, type: "opt_receipt" }).sort({ uploadedAt: -1 }),
    DocumentModel.findOne({ user: req.user!.id, type: "work_auth" }).sort({ uploadedAt: -1 }),
  ]);

  res.json({ application, documents: { optReceipt: optReceiptDoc, workAuth: workAuthDoc } });
};

// ----------------- Get All Applications (HR) -----------------
export const getAllApplications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username email"),
    Application.countDocuments(filter),
  ]);

  res.json({
    applications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

// ----------------- Get Application by ID (HR) -----------------
export const getApplicationById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const application = await Application.findById(req.params.id).populate(
    "user",
    "username email",
  );
  if (!application) throw new AppError("Application not found", 404);

  const [optReceiptDoc, workAuthDoc, driversLicenseDoc] = await Promise.all([
    DocumentModel.findOne({ user: application.user, type: "opt_receipt" }).sort({ uploadedAt: -1 }),
    DocumentModel.findOne({ user: application.user, type: "work_auth" }).sort({ uploadedAt: -1 }),
    application.snapshot.driversLicenseDocId
      ? DocumentModel.findById(application.snapshot.driversLicenseDocId)
      : null,
  ]);

  res.json({
    application,
    documents: { optReceipt: optReceiptDoc, workAuth: workAuthDoc, driversLicense: driversLicenseDoc },
  });
};

// ----------------- Review Application (HR) -----------------
// Rejection is a simple update. Approval runs a transaction:
//   1. Create Profile from snapshot
//   2. Link Profile back onto the User document
//   3. Mark Application approved
export const reviewApplication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { status, feedback } = req.body as {
    status: "approved" | "rejected";
    feedback?: string;
  };

  const application = await Application.findById(req.params.id);
  if (!application) throw new AppError("Application not found", 404);
  if (application.status !== "pending")
    throw new AppError("Only pending applications can be reviewed", 400);

  const reviewMeta = {
    feedback,
    reviewedAt: new Date(),
    reviewedBy: new mongoose.Types.ObjectId(req.user!.id),
  };

  if (status === "rejected") {
    Object.assign(application, { status: "rejected", ...reviewMeta });
    await application.save();
    res.json({ application });
    return;
  }

  // Approval path — transactional
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { snapshot } = application;

    const [profile] = await Profile.create(
      [
        {
          user: application.user,
          firstName: snapshot.firstName,
          lastName: snapshot.lastName,
          middleName: snapshot.middleName,
          preferredName: snapshot.preferredName,
          email: snapshot.email,
          address: snapshot.address,
          cellPhone: snapshot.cellPhone,
          workPhone: snapshot.workPhone,
          ssn: snapshot.ssn,
          dob: snapshot.dob,
          gender: snapshot.gender,
          citizenship: snapshot.citizenship,
          workAuth: snapshot.workAuth,
          reference: snapshot.reference,
          emergencyContacts: snapshot.emergencyContacts,
          profilePictureDocId: snapshot.profilePictureDocId,
          driversLicenseDocId: snapshot.driversLicenseDocId,
        },
      ],
      { session },
    );

    await User.findByIdAndUpdate(
      application.user,
      { profile: profile._id },
      { session },
    );

    Object.assign(application, { status: "approved", ...reviewMeta });
    await application.save({ session });

    await session.commitTransaction();

    res.json({ application, profile });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
