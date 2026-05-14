import express from "express";
import {
  signupUser,
  signinUser,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
  logoutUser,
  validateInviteToken,
} from "../controllers/authController";
import { protect } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import {
  signupSchema,
  signinSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "shared";

const router = express.Router();

router.get("/invite/:token", validateInviteToken);
router.post("/signup", validate(signupSchema), signupUser);
router.post("/signin", validate(signinSchema), signinUser);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.get("/me", protect, getMe);
router.post("/logout", protect, logoutUser);
router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
