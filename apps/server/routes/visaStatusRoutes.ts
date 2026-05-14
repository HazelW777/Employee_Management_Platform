import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware";
import {
  getVisaStatuses,
  notifyEmployee,
} from "../controllers/visaStatusController";

const router = express.Router();
router.use(protect, restrictTo("hr"));

router.get("/", getVisaStatuses);
router.post("/:userId/notify", notifyEmployee);

export default router;
