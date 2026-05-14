import { Request, Response } from "express";
import DocumentModel from "../models/Document";
import Profile from "../models/Profile";
import User from "../models/User";
import AppError from "../utils/AppError";
import { sendEmail } from "../utils/sendEmail";
import { OPT_CHAIN, OPT_STEP_LABELS, type OptStep } from "shared";

interface PopulatedUser {
  _id: { toString(): string };
  username: string;
  email: string;
}

interface DocEntry {
  docId: string;
  filename: string;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
}

interface EmployeeVisa {
  userId: string;
  username: string;
  fullName: string | null;
  lastName: string | null;
  email: string;
  docs: Partial<Record<OptStep, DocEntry>>;
  nextStep: string | null;
  nextStepType: OptStep | null;
  currentDocId: string | null;
  canNotify: boolean;
  workAuthStartDate: string | null;
  workAuthEndDate: string | null;
}

function computeChain(docs: Partial<Record<OptStep, DocEntry>>): {
  nextStep: string | null;
  nextStepType: OptStep | null;
  currentDocId: string | null;
  canNotify: boolean;
} {
  for (const step of OPT_CHAIN) {
    const doc = docs[step];
    if (!doc) {
      return { nextStep: `Upload ${OPT_STEP_LABELS[step]}`, nextStepType: step, currentDocId: null, canNotify: true };
    }
    if (doc.status === "rejected") {
      return { nextStep: `Re-upload ${OPT_STEP_LABELS[step]}`, nextStepType: step, currentDocId: doc.docId, canNotify: true };
    }
    if (doc.status === "pending") {
      return { nextStep: `${OPT_STEP_LABELS[step]} under HR review`, nextStepType: step, currentDocId: doc.docId, canNotify: false };
    }
  }
  return { nextStep: null, nextStepType: null, currentDocId: null, canNotify: false };
}

export const getVisaStatuses = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const approvedUserIds = await Profile.distinct("user");

  const docs = await DocumentModel.find({
    category: "visa",
    user: { $in: approvedUserIds },
  })
    .populate("user", "username email")
    .sort({ uploadedAt: -1 })
    .lean();

  const userMap = new Map<string, EmployeeVisa>();

  for (const doc of docs) {
    const user = doc.user as unknown as PopulatedUser;
    const userId = user._id.toString();
    const type = doc.type as OptStep;

    if (!OPT_CHAIN.includes(type)) continue;

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        username: user.username,
        fullName: null,
        lastName: null,
        email: user.email,
        docs: {},
        nextStep: null,
        nextStepType: null,
        currentDocId: null,
        canNotify: false,
        workAuthStartDate: null,
        workAuthEndDate: null,
      });
    }

    const entry = userMap.get(userId)!;
    if (!entry.docs[type]) {
      entry.docs[type] = {
        docId: (doc._id as { toString(): string }).toString(),
        filename: doc.filename,
        status: doc.status as "pending" | "approved" | "rejected",
        feedback: doc.feedback,
      };
    }
  }

  // Enrich with work auth dates from each employee's profile
  const userIds = Array.from(userMap.keys());
  if (userIds.length > 0) {
    const profiles = await Profile.find({ user: { $in: userIds } })
      .select("user firstName middleName lastName workAuth")
      .lean();

    for (const p of profiles) {
      const uid = (p.user as { toString(): string }).toString();
      const entry = userMap.get(uid);
      if (entry) {
        entry.fullName = [p.firstName, p.middleName, p.lastName]
          .filter(Boolean)
          .join(" ") || null;
        entry.lastName = p.lastName ?? null;
        entry.workAuthStartDate = p.workAuth?.startDate
          ? new Date(p.workAuth.startDate).toISOString()
          : null;
        entry.workAuthEndDate = p.workAuth?.endDate
          ? new Date(p.workAuth.endDate).toISOString()
          : null;
      }
    }
  }

  const employees: EmployeeVisa[] = Array.from(userMap.values())
    .map((e) => {
      const { nextStep, nextStepType, currentDocId, canNotify } = computeChain(e.docs);
      return { ...e, nextStep, nextStepType, currentDocId, canNotify };
    })
    .sort((a, b) =>
      (a.lastName ?? a.username).localeCompare(b.lastName ?? b.username),
    );

  res.json({ employees });
};

export const notifyEmployee = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("email username");
  if (!user) throw new AppError("User not found", 404);

  const docs = await DocumentModel.find({ user: userId, category: "visa" })
    .sort({ uploadedAt: -1 })
    .lean();

  const docMap: Partial<Record<OptStep, DocEntry>> = {};
  for (const doc of docs) {
    const type = doc.type as OptStep;
    if (OPT_CHAIN.includes(type) && !docMap[type]) {
      docMap[type] = {
        docId: (doc._id as { toString(): string }).toString(),
        filename: doc.filename,
        status: doc.status as "pending" | "approved" | "rejected",
      };
    }
  }

  const { nextStep, canNotify } = computeChain(docMap);
  if (!canNotify || !nextStep) throw new AppError("No pending action for this employee", 400);

  await sendEmail({
    to: user.email,
    subject: "Action Required: Visa Documentation",
    text: `Dear ${user.username},\n\nThis is a reminder that the following action is required for your visa documentation:\n\n  ${nextStep}\n\nPlease log in to the employee portal and complete this step as soon as possible.\n\nIf you have any questions, please contact your HR representative.`,
  });

  res.json({ message: "Notification sent successfully" });
};
