import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "hr" | "employee";
  profile?: mongoose.Types.ObjectId;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser> {
  generateResetPasswordToken(): {
    rawToken: string;
    hashedToken: string;
    expiresAt: Date;
  };
}

const userSchema = new mongoose.Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["hr", "employee"],
      required: true,
      default: "employee",
    },
    profile: { type: Schema.Types.ObjectId, ref: "Profile", unique: true, sparse: true },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.statics.generateResetPasswordToken = function () {
  const rawToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // expires in 1 hour
  return { rawToken, hashedToken, expiresAt };
};

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ email: 1, createdAt: -1 });

const User = mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;
