import mongoose, { Document, Schema } from "mongoose";
import type { IAddress, IContact, IWorkAuth, ICitizenship } from "./Profile";

export interface IApplicationSnapshot {
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  email: string;
  address: IAddress;
  cellPhone: string;
  workPhone?: string;
  ssn: string;
  dob: Date;
  gender: "male" | "female" | "no_answer";
  citizenship: ICitizenship;
  workAuth?: IWorkAuth;
  reference?: IContact;
  emergencyContacts: IContact[];
  profilePictureDocId?: mongoose.Types.ObjectId;
  driversLicenseDocId?: mongoose.Types.ObjectId;
  workAuthDocId?: mongoose.Types.ObjectId; // for non-OPT visa holders
  optReceiptDocId?: mongoose.Types.ObjectId; // for F1-CPT/OPT users
}

export interface IApplication extends Document {
  user: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
  snapshot: IApplicationSnapshot;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
}

// Reuse the same sub-schemas defined for profile by re-declaring here.
// (We intentionally re-declare rather than import to keep schemas decoupled.)
const addressSchema = new Schema<IAddress>(
  {
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    zip: String,
  },
  { _id: false },
);
const contactSchema = new Schema<IContact>(
  {
    firstName: String,
    lastName: String,
    middleName: String,
    phone: String,
    email: String,
    relationship: String,
  },
  { _id: false },
);
const workAuthSchema = new Schema<IWorkAuth>(
  {
    type: {
      type: String,
      enum: ["H1B", "L2", "F1-CPT", "F1-OPT", "H4", "other"],
    },
    otherTitle: String,
    startDate: Date,
    endDate: Date,
  },
  { _id: false },
);
const citizenshipSchema = new Schema<ICitizenship>(
  {
    isPermanentResidentOrCitizen: { type: Boolean, required: true },
    type: { type: String, enum: ["citizen", "green_card"] },
  },
  { _id: false },
);

const snapshotSchema = new Schema<IApplicationSnapshot>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: String,
    preferredName: String,
    email: { type: String, required: true },
    address: { type: addressSchema, required: true },
    cellPhone: { type: String, required: true },
    workPhone: String,
    ssn: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "no_answer"],
      required: true,
    },
    citizenship: { type: citizenshipSchema, required: true },
    workAuth: workAuthSchema,
    reference: { type: contactSchema },
    emergencyContacts: { type: [contactSchema], required: true, default: [] },
    profilePictureDocId: { type: Schema.Types.ObjectId, ref: "Document" },
    driversLicenseDocId: { type: Schema.Types.ObjectId, ref: "Document" },
    workAuthDocId: { type: Schema.Types.ObjectId, ref: "Document" },
    optReceiptDocId: { type: Schema.Types.ObjectId, ref: "Document" },
  },
  { _id: false },
);

const applicationSchema = new Schema<IApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    feedback: String,
    snapshot: { type: snapshotSchema, required: true },
    reviewedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

applicationSchema.index({ user: 1, createdAt: -1 });
// At most one pending application per user
applicationSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

const Application = mongoose.model<IApplication>(
  "Application",
  applicationSchema,
);
export default Application;
