import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import AppError from "../utils/AppError";

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as Express.Request).user!.id;
    const dir = path.join(UPLOAD_ROOT, userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const random = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const IMAGE_ONLY_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const makeFilter =
  (allowed: Set<string>): multer.Options["fileFilter"] =>
  (_req, file, cb) => {
    if (allowed.has(file.mimetype)) cb(null, true);
    else cb(new AppError("Unsupported file type", 400));
  };

// For documents that can be images or PDFs (work auth, visa docs, etc.)
export const upload = multer({
  storage,
  fileFilter: makeFilter(ALLOWED_MIME),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// For profile_picture uploads — no PDFs
export const uploadImage = multer({
  storage,
  fileFilter: makeFilter(IMAGE_ONLY_MIME),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
