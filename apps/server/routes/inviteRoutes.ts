import express from "express";
import {
  sendInvitation,
  resendInvitation,
  revokeInvitation,
  getInvitations,
} from "../controllers/inviteController";
import { sendInvitationSchema, getInvitationsSchema } from "shared";
import { validate } from "../middlewares/validate";
import { protect, restrictTo } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(protect, restrictTo("hr"));

router.get("/", validate(getInvitationsSchema, "query"), getInvitations);
router.post("/", validate(sendInvitationSchema), sendInvitation);
router.post("/:id/resend", resendInvitation);
router.patch("/:id/revoke", revokeInvitation);

export default router;
