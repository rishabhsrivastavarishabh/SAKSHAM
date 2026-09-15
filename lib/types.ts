export type UserRole = "applicant" | "verifier" | "admin";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_verification"
  | "deficiency_raised"
  | "verified"
  | "selected"
  | "waitlisted"
  | "rejected";

export type DocumentStatus = "pending" | "verified" | "rejected" | "deficient";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  state: string | null;
  district: string | null;
  category: string | null;
  created_at: string;
}

export interface RequiredDocument {
  code: string;
  label: string;
  mandatory: boolean;
}

export interface Scheme {
  id: string;
  code: string;
  name: string;
  type: "fellowship" | "scholarship";
  description: string | null;
  eligibility_rules: Record<string, unknown>;
  required_documents: RequiredDocument[];
  application_start: string | null;
  application_end: string | null;
  status: "draft" | "open" | "closed" | "archived";
}

export interface Application {
  id: string;
  applicant_id: string;
  scheme_id: string;
  status: ApplicationStatus;
  personal_details: Record<string, unknown>;
  academic_details: Record<string, unknown>;
  bank_details: Record<string, unknown>;
  assigned_verifier_id: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  doc_type: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  status: DocumentStatus;
  verified_by: string | null;
  verified_at: string | null;
  remarks: string | null;
  uploaded_at: string;
}

export interface Deficiency {
  id: string;
  application_id: string;
  document_id: string | null;
  description: string;
  status: "open" | "resolved";
  raised_by: string | null;
  raised_at: string;
  resolved_at: string | null;
}

export interface ApiSuccess<T> {
  data: T;
}
export interface ApiError {
  error: { message: string; code: string };
}
export type ApiResult<T> = ApiSuccess<T> | ApiError;
