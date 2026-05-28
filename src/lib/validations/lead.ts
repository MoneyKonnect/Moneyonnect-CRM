import { z } from "zod";

export const leadSchema = z.object({
  fullName: z.string().min(2, "Name required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  source: z
    .enum([
      "REFERRAL",
      "SOCIAL_MEDIA",
      "WEBSITE",
      "COLD_CALL",
      "EVENT",
      "ADVERTISEMENT",
      "EXISTING_CLIENT",
      "OTHER",
    ])
    .default("OTHER"),
  stage: z
    .enum([
      "NEW",
      "CONTACTED",
      "MEETING_SCHEDULED",
      "INTERESTED",
      "DOCUMENTATION_PENDING",
      "PAYMENT_PENDING",
      "CONVERTED",
      "DORMANT",
      "LOST",
    ])
    .default("NEW"),
  estimatedValue: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  otherInterest: z.string().optional().nullable(),
  residencyType: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
});

export const taskSchema = z.object({
  title: z.string().min(2, "Title required"),
  description: z.string().optional().nullable(),
  type: z
    .enum([
      "CALL",
      "MEETING",
      "FOLLOW_UP",
      "BIRTHDAY",
      "ANNIVERSARY",
      "KYC_RENEWAL",
      "INVESTMENT_MATURITY",
      "DOCUMENT_EXPIRY",
      "CUSTOM",
    ])
    .default("CUSTOM"),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"])
    .default("PENDING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueAt: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
