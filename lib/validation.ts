import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional(),
  state: z.string().trim().min(2).max(60).optional(),
  district: z.string().trim().min(2).max(60).optional(),
});

export const personalDetailsSchema = z.object({
  date_of_birth: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  gender: z.enum(["male", "female", "other"]),
  father_name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(10).max(500),
  aadhaar_last4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits only"),
});

export const academicDetailsSchema = z.object({
  qualification: z.string().trim().min(2).max(200),
  institution: z.string().trim().min(2).max(200),
  course: z.string().trim().min(2).max(200),
  percentage_or_cgpa: z.coerce.number().min(0).max(100),
  year_of_completion: z.coerce
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1),
});

export const bankDetailsSchema = z.object({
  account_holder_name: z.string().trim().min(2).max(120),
  account_number: z.string().regex(/^\d{9,18}$/, "Enter a valid account number"),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
  bank_name: z.string().trim().min(2).max(120),
});

export const applicationSubmitSchema = z.object({
  scheme_id: z.string().uuid(),
  personal_details: personalDetailsSchema,
  academic_details: academicDetailsSchema,
  bank_details: bankDetailsSchema,
});

export const documentUploadSchema = z.object({
  application_id: z.string().uuid(),
  doc_type: z.string().trim().min(1).max(60),
  file_name: z.string().trim().min(1).max(255),
  file_size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, "File must be under 10MB"),
  content_type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
});

export const statusTransitionSchema = z.object({
  to_status: z.enum([
    "under_verification",
    "deficiency_raised",
    "verified",
    "selected",
    "waitlisted",
    "rejected",
  ]),
  remarks: z.string().trim().max(1000).optional(),
});

export const deficiencySchema = z.object({
  application_id: z.string().uuid(),
  document_id: z.string().uuid().optional(),
  description: z.string().trim().min(5).max(1000),
});

// Allowed status transitions — enforced server-side so no client can skip a stage.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["under_verification"],
  under_verification: ["deficiency_raised", "verified", "rejected"],
  deficiency_raised: ["under_verification"],
  verified: ["selected", "waitlisted", "rejected"],
  selected: [],
  waitlisted: ["selected", "rejected"],
  rejected: [],
};
