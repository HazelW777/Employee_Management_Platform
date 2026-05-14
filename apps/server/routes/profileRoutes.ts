import express from "express";
import {
  getMyProfile,
  updateMyProfile,
  getAllProfiles,
  getProfileById,
} from "../controllers/profileController";
import { protect, restrictTo } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { updateProfileSchema } from "shared";

const router = express.Router();

router.use(protect);

// Employee routes
router.get("/me", getMyProfile);
router.patch("/me", validate(updateProfileSchema.partial()), updateMyProfile);

// HR-only routes
router.use(restrictTo("hr"));
router.get("/", getAllProfiles);
router.get("/:id", getProfileById);

export default router;
