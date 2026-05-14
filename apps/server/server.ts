import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/authRoutes";
import inviteRoutes from "./routes/inviteRoutes";
import documentRoutes from "./routes/documentRoutes";
import applicationRoutes from "./routes/applicationRoutes";
import profileRoutes from "./routes/profileRoutes";
import visaStatusRoutes from "./routes/visaStatusRoutes";

const app = express();

connectDB();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.send("Server is running successfully");
});

app.use("/api/auth", authRoutes);
app.use("/api/hr/invites", inviteRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/onboarding", applicationRoutes);
app.use("/api/hr/application", applicationRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/hr/visa-status", visaStatusRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});
