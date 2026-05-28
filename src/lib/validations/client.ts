import { z } from "zod";

export const clientSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  dob: z.string().optional().nullable(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional()
    .nullable()
    .or(z.literal("")),
  occupation: z.string().optional().nullable(),
  incomeBracket: z.string().optional().nullable(),
  riskAppetite: z
    .enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE", "VERY_AGGRESSIVE"])
    .optional()
    .nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  category: z
    .enum(["PREMIUM", "STANDARD", "HNI", "ULTRA_HNI", "RETAIL"])
    .default("STANDARD"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "PROSPECT", "DORMANT"])
    .default("ACTIVE"),
  aum: z.string().optional().nullable(),
});

export const familyMemberSchema = z.object({
  relationship: z.enum([
    "SPOUSE",
    "CHILD",
    "PARENT",
    "SIBLING",
    "GRANDPARENT",
    "GRANDCHILD",
    "OTHER",
  ]),
  fullName: z.string().min(2, "Name required"),
  dob: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  occupation: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const residencySchema = z.object({
  residencyType: z.enum([
    "RESIDENT_INDIAN",
    "NRI",
    "OCI",
    "PIO",
    "FOREIGN_NATIONAL",
    "RETURNING_NRI",
  ]),
  countryOfResidence: z.string().optional().nullable(),
  citizenship: z.string().optional().nullable(),
  visaType: z
    .enum(["H1B", "L1", "GREEN_CARD", "CITIZEN", "WORK_PERMIT", "STUDENT", "OTHER"])
    .optional()
    .nullable(),
  taxResidency: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  accountType: z
    .enum(["NRO", "NRE", "FCNR", "BOTH", "ALL_THREE"])
    .optional()
    .nullable(),
  fatcaCompliant: z.boolean().default(false),
  foreignAddress: z.string().optional().nullable(),
  indianAddress: z.string().optional().nullable(),
  passportNumber: z.string().optional().nullable(),
  passportExpiry: z.string().optional().nullable(),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type ResidencyInput = z.infer<typeof residencySchema>;
