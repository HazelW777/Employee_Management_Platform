import mongoose, { Document, Model } from "mongoose";
import crypto from "crypto";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface IInvitation extends Document {
  email: string;
  token: string;
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  usedBy?: mongoose.Types.ObjectId;
  // True when this invitation has been replaced by a newer one for the same email
  invalidated: boolean;
  invalidatedAt?: Date;
  // Virtual
  status: InvitationStatus;
  isUsable(): boolean;
}

export interface IInvitationModel extends Model<IInvitation> {
  generateInvitationToken(): {
    rawToken: string;
    hashedToken: string;
    expiresAt: Date;
  };
  invalidateActiveTokensForEmail(
    email: string,
  ): Promise<mongoose.UpdateWriteOpResult>;
}

const invitationSchema = new mongoose.Schema<IInvitation>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true, select: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invalidated: { type: Boolean, default: false },
    invalidatedAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

invitationSchema.statics.generateInvitationToken = function () {
  const rawToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // expires in 3 hours
  return { rawToken, hashedToken, expiresAt };
};

invitationSchema.statics.invalidateActiveTokensForEmail = function (
  email: string,
) {
  return this.updateMany(
    {
      email: email.toLowerCase(),
      used: false,
      invalidated: false,
      expiresAt: { $gt: new Date() },
    },
    { $set: { invalidated: true, invalidatedAt: new Date() } },
  );
};

invitationSchema.methods.isUsable = function (): boolean {
  return !this.used && !this.invalidated && this.expiresAt > new Date();
};

invitationSchema.virtual("status").get(function (): InvitationStatus {
  if (this.used) return "accepted";
  if (this.invalidated) return "revoked";
  if (this.expiresAt < new Date()) return "expired";
  return "pending";
});

invitationSchema.index({ email: 1, createdAt: -1 });

const Invitation = mongoose.model<IInvitation, IInvitationModel>(
  "Invitation",
  invitationSchema,
);

export default Invitation;
