import express from "express";
import {
  submitApplication,
  getMyApplication,
  getAllApplications,
  getApplicationById,
  reviewApplication,
} from "../controllers/applicationController";
import { protect, restrictTo } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { submitApplicationSchema, reviewApplicationSchema } from "shared";

const router = express.Router();

router.use(protect);

// Employee routes
router.get("/me", getMyApplication);
router.post("/", validate(submitApplicationSchema), submitApplication);

// HR-only routes
router.use(restrictTo("hr"));
router.get("/", getAllApplications);
router.get("/:id", getApplicationById);
router.patch("/:id/review", validate(reviewApplicationSchema), reviewApplication);

export default router;
