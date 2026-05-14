import express from "express";
import {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  serveDocument,
  reviewDocument,
  getAllDocuments,
  getI983EmptyTemplate,
  getI983SampleTemplate,
} from "../controllers/documentController";
import { protect, restrictTo } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { upload } from "../middlewares/uploadFiles";
import { uploadDocumentSchema, reviewDocumentSchema } from "shared";

const router = express.Router();

router.use(protect);

// Employee routes
router.get("/me", getMyDocuments);
router.post(
  "/",
  upload.single("file"),
  validate(uploadDocumentSchema),
  uploadDocument,
);

// i983 system templates — any authenticated user can download
router.get("/i983/templates/empty", getI983EmptyTemplate);
router.get("/i983/templates/sample", getI983SampleTemplate);

// Shared — employee (own) or HR (any), access control enforced in controller
router.get("/:id", getDocumentById);
router.get("/:id/file", serveDocument);

// HR-only routes
router.use(restrictTo("hr"));
router.get("/", getAllDocuments);
router.patch("/:id/review", validate(reviewDocumentSchema), reviewDocument);

export default router;
