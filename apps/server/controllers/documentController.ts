import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import DocumentModel, {
  DocCategory,
  DocType,
  REVIEWABLE_TYPES,
} from "../models/Document";
import AppError from "../utils/AppError";

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

// ----------------- I-983 Templates -----------------
export const getI983EmptyTemplate = (_req: Request, res: Response): void => {
  const filePath = path.join(TEMPLATES_DIR, "i983-empty.pdf");
  if (!fs.existsSync(filePath))
    throw new AppError("I-983 empty template is not available", 404);
  res.download(filePath, "i983-empty.pdf");
};

export const getI983SampleTemplate = (_req: Request, res: Response): void => {
  const filePath = path.join(TEMPLATES_DIR, "i983-sample.pdf");
  if (!fs.existsSync(filePath))
    throw new AppError("I-983 sample template is not available", 404);
  res.download(filePath, "i983-sample.pdf");
};

const TYPE_TO_CATEGORY: Record<DocType, DocCategory> = {
  profile_picture: "onboarding",
  drivers_license: "onboarding",
  work_auth: "onboarding",
  opt_receipt: "visa",
  opt_ead: "visa",
  i983: "visa",
  i20: "visa",
};

// Each key requires its value to be approved before upload is allowed
const OPT_PREREQUISITES: Partial<Record<DocType, DocType>> = {
  opt_ead: "opt_receipt",
  i983: "opt_ead",
  i20: "i983",
};

async function assertOptChain(userId: string, type: DocType): Promise<void> {
  const prerequisite = OPT_PREREQUISITES[type];
  if (!prerequisite) return;

  const approved = await DocumentModel.findOne({
    user: userId,
    type: prerequisite,
    status: "approved",
  });

  if (!approved)
    throw new AppError(
      `Cannot upload ${type}: ${prerequisite} must be approved first`,
      400,
    );
}

// ----------------- Upload Document -----------------
// Employee uploads a document. For reviewable types (opt chain), enforces chain
// order and blocks re-upload unless the previous attempt was rejected.
export const uploadDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const { type } = req.body as { type: DocType };
  const userId = req.user!.id;

  const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (type === "profile_picture" && !IMAGE_MIME.has(req.file.mimetype)) {
    fs.unlink(req.file.path, () => {});
    throw new AppError("Profile picture must be an image (JPEG, PNG, WEBP)", 400);
  }

  await assertOptChain(userId, type);

  const existing = await DocumentModel.findOne({ user: userId, type });

  if (existing) {
    if (REVIEWABLE_TYPES.has(type)) {
      if (existing.status === "pending") {
        fs.unlink(req.file.path, () => {});
        throw new AppError(`${type} is already pending review`, 400);
      }
      if (existing.status === "approved") {
        fs.unlink(req.file.path, () => {});
        throw new AppError(`${type} is already approved`, 400);
      }
      // status === "rejected" — allowed to re-upload; remove old file
      fs.unlink(existing.storedPath, () => {});
      await existing.deleteOne();
    } else {
      // Non-reviewable: always allow replacement
      fs.unlink(existing.storedPath, () => {});
      await existing.deleteOne();
    }
  }

  const doc = await DocumentModel.create({
    user: userId,
    category: TYPE_TO_CATEGORY[type],
    type,
    storedPath: req.file.path,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    // Non-reviewable docs (profile pic, licence, work_auth) need no HR review
    status: REVIEWABLE_TYPES.has(type) ? "pending" : "approved",
    uploadedAt: new Date(),
  });

  res.status(201).json({ document: doc });
};

// ----------------- Get My Documents -----------------
// Employee retrieves all their own documents.
export const getMyDocuments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const docs = await DocumentModel.find({ user: req.user!.id }).sort({
    uploadedAt: -1,
  });
  res.json({ documents: docs });
};

// ----------------- Get Document by ID -----------------
// Employee gets their own doc; HR can get any doc.
export const getDocumentById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const doc = await DocumentModel.findById(req.params.id);
  if (!doc) throw new AppError("Document not found", 404);

  if (req.user!.role !== "hr" && doc.user.toString() !== req.user!.id)
    throw new AppError("Forbidden", 403);

  res.json({ document: doc });
};

// ----------------- Serve Document File -----------------
// Streams the file to the client with the original filename.
// Employee can only download their own docs; HR can download any.
export const serveDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const doc = await DocumentModel.findById(req.params.id);
  if (!doc) throw new AppError("Document not found", 404);

  if (req.user!.role !== "hr" && doc.user.toString() !== req.user!.id)
    throw new AppError("Forbidden", 403);

  if (!fs.existsSync(doc.storedPath))
    throw new AppError("File not found on server", 404);

  res.setHeader("Content-Type", doc.mimetype);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(doc.filename)}"`,
  );
  res.sendFile(path.resolve(doc.storedPath));
};

// ----------------- Review Document -----------------
// HR approves or rejects a reviewable document (opt chain only).
// Only pending documents can be reviewed.
export const reviewDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { status, feedback } = req.body as {
    status: "approved" | "rejected";
    feedback?: string;
  };

  const doc = await DocumentModel.findById(req.params.id);
  if (!doc) throw new AppError("Document not found", 404);

  if (!REVIEWABLE_TYPES.has(doc.type))
    throw new AppError(`${doc.type} is not subject to HR review`, 400);

  if (doc.status !== "pending")
    throw new AppError("Only pending documents can be reviewed", 400);

  doc.status = status;
  doc.feedback = feedback;
  doc.reviewedAt = new Date();
  doc.reviewedBy = new mongoose.Types.ObjectId(req.user!.id);
  await doc.save();

  res.json({ document: doc });
};

// ----------------- Get All Documents (HR) -----------------
// Paginated list for HR with optional filters: type, status, category, user.
export const getAllDocuments = async (
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
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.user) filter.user = req.query.user;

  const [documents, total] = await Promise.all([
    DocumentModel.find(filter)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username email")
      .populate("reviewedBy", "username email"),
    DocumentModel.countDocuments(filter),
  ]);

  res.json({
    documents,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
