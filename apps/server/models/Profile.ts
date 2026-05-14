import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface IContact {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  email?: string;
  relationship: string;
}

export interface IWorkAuth {
  type: "H1B" | "L2" | "F1-CPT" | "F1-OPT" | "H4" | "other";
  otherTitle?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ICitizenship {
  isPermanentResidentOrCitizen: boolean;
  type?: "citizen" | "green_card";
}

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;
  // Name
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  readonly legalFullName: string;
  // Email (mirrored from user/invite for convenience)
  email: string;
  // Address
  address: IAddress;
  // Contact
  cellPhone: string;
  workPhone?: string;
  // Sensitive
  ssn: string;
  dob: Date;
  gender: "male" | "female" | "no_answer";
  // Citizenship / work auth
  citizenship: ICitizenship;
  workAuth?: IWorkAuth;
  // Reference & emergency contacts
  reference?: IContact;
  emergencyContacts: IContact[];
  // Documents
  profilePictureDocId?: mongoose.Types.ObjectId;
  driversLicenseDocId?: mongoose.Types.ObjectId;
}

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

const profileSchema = new Schema<IProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: String,
    preferredName: String,
    email: { type: String, required: true },
    address: { type: addressSchema, required: true },
    cellPhone: { type: String, required: true },
    workPhone: String,
    ssn: { type: String, required: true, select: false },
    dob: { type: Date, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "no_answer"],
      required: true,
    },
    citizenship: { type: citizenshipSchema, required: true },
    workAuth: { type: workAuthSchema },
    reference: { type: contactSchema },
    emergencyContacts: { type: [contactSchema], required: true, default: [] },
    profilePictureDocId: { type: Schema.Types.ObjectId, ref: "Document" },
    driversLicenseDocId: { type: Schema.Types.ObjectId, ref: "Document" },
  },
  { timestamps: true },
);

profileSchema.virtual("legalFullName").get(function (this: IProfile) {
  return [this.firstName, this.middleName, this.lastName]
    .filter(Boolean)
    .join(" ");
});
profileSchema.set("toJSON", { virtuals: true });
profileSchema.set("toObject", { virtuals: true });

const Profile = mongoose.model<IProfile, Model<IProfile>>(
  "Profile",
  profileSchema,
);
export default Profile;
