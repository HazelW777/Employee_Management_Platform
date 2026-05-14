export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface Contact {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  email?: string;
  relationship: string;
}

export interface WorkAuth {
  type: "H1B" | "L2" | "F1-CPT" | "F1-OPT" | "H4" | "other";
  otherTitle?: string;
  startDate?: string;
  endDate?: string;
}

export interface Citizenship {
  isPermanentResidentOrCitizen: boolean;
  type?: "citizen" | "green_card";
}

export type Gender = "male" | "female" | "no_answer";

export interface Profile {
  _id: string;
  user: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  email: string;
  address: Address;
  cellPhone: string;
  workPhone?: string;
  ssn: string;
  dob: string;
  gender: Gender;
  citizenship: Citizenship;
  workAuth?: WorkAuth;
  reference: Contact;
  emergencyContacts: Contact[];
  profilePictureDocId?: string;
  driversLicenseDocId?: string;
  createdAt: string;
  updatedAt: string;
}
