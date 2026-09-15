# SAKSHAM — AI-Enabled Scholarship & Fellowship Management System

**SIH Problem Statement ID:** 26239
**Title:** AI-Enabled Scholarship and Fellowship Management System for Scheduled Tribes
**Organization:** Ministry of Tribal Affairs (MoTA)
**Category:** Software | **Theme:** Smart Education

---

## 1. PRD — Product Requirements Document

### 1.1 Problem
MoTA administers scholarship/fellowship schemes for Scheduled Tribe (ST) students — notably **NFST** (National Fellowship for ST students, for M.Phil/Ph.D research in India) and **NOS** (National Overseas Scholarship, for Master's/Ph.D. abroad). The current process is largely manual across registration, application, document scrutiny, selection, and post-selection stages, causing delays, repeated correspondence, low visibility, and verification errors.

### 1.2 Goal
A single configurable digital platform covering the full application lifecycle, with AI-assisted document verification, transparent selection, and separate applicant/admin interfaces with dashboards.

### 1.3 Users & Roles
| Role | Who | Core needs |
|---|---|---|
| Applicant | ST student | Register, check eligibility, apply, upload docs, track status, resolve deficiencies |
| Verifier | Scrutiny officer | Review assigned applications, verify/reject documents, raise deficiencies |
| Admin | MoTA official | Configure schemes, oversee selection, view dashboards/reports across all applications |

### 1.4 Core Features (MVP scope, priority order)
1. **Auth & profile** — email/password via Supabase Auth, role-based (applicant/verifier/admin)
2. **Scheme discovery** — list open schemes (NFST, NOS) with eligibility rules & required documents, configurable (not hardcoded)
3. **Application submission** — personal/academic/bank details + document upload, draft-save, one active application per scheme per applicant
4. **Status tracking** — draft → submitted → under_verification → deficiency_raised → verified → selected/waitlisted/rejected, with a visible timeline
5. **Document verification queue (admin/verifier)** — assigned applications, per-document verify/reject/raise-deficiency with remarks
6. **Deficiency loop** — verifier raises a specific deficiency → applicant notified → applicant resubmits the flagged item only → back into queue
7. **AI document intelligence** — OCR extraction on upload (Tesseract.js server-side), stores extracted text/fields/confidence in MongoDB, flags likely-incomplete or low-confidence documents for the verifier — **advisory only, human always decides**
8. **Admin dashboard** — counts by scheme/status/state, average processing time, deficiency rate
9. **Notifications** — in-app notification on every status change / deficiency

### 1.5 Out of scope for MVP (explicitly deferred)
- Payment/disbursal integration
- SMS/email delivery integration (notification records are created; delivery channel is a later integration point)
- Multi-language UI (structure supports it; translations deferred)
- Merit-list auto-ranking beyond configurable rule evaluation (final selection retains human sign-off)

### 1.6 Success Criteria (for the SIH demo)
- An applicant can register, apply to NFST or NOS, upload documents, and see real-time status change.
- A verifier can see an AI-flagged deficiency, act on it, and the applicant sees the update immediately.
- An admin can view a live dashboard reflecting the demo data — not mock numbers.
- RLS is provably enforced (an applicant cannot query another applicant's application, even by ID, via the API).

---

## 2. TRD — Technical Requirements Document

### 2.1 Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers (Node.js runtime) — API layer with Zod validation on every write
- **Relational DB:** Supabase (PostgreSQL 17) — system of record, RLS-enforced
- **Document/AI data:** MongoDB Atlas — OCR extraction results, audit event log
- **Auth:** Supabase Auth (email/password), JWT-based sessions, role stored in `profiles.role`
- **File storage:** Supabase Storage, private bucket, per-user folder policies
- **OCR:** Tesseract.js (server-side, no external API key required — demo-safe and offline-capable)

### 2.2 Why this split (Supabase vs MongoDB)
Relational, access-controlled, transactional data (applications, documents metadata, status, users) → **Postgres + RLS**, because correctness and per-row access control matter more than schema flexibility.
Variable-shape AI output per document type, and high-volume append-only audit events → **MongoDB**, because the shape of OCR output genuinely varies by document type and audit logs are naturally document-shaped, high-write, low-transactional-need data. No data is duplicated as source-of-truth across both — Mongo only ever *references* a Postgres `application_document.id`.

### 2.3 Non-functional requirements
- Every mutating API route validates input server-side with Zod — client validation is UX only, never trusted.
- Every table has RLS enabled; no table is queryable cross-tenant by default.
- Passwords are never handled directly by app code — delegated entirely to Supabase Auth.
- Secrets (service role key, Mongo URI) are server-only env vars, never shipped to the client bundle.
- All status transitions are recorded in `application_status_history` — no silent state changes.
- API responses use consistent shape: `{ data }` on success, `{ error: { message, code } }` on failure, with correct HTTP status codes (400 validation, 401 unauth, 403 forbidden, 404 not found, 409 conflict, 500 server error).

### 2.4 Environments
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, client-safe
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used only in trusted server routes (e.g. admin dashboard aggregate queries that intentionally bypass RLS)
- `MONGODB_URI`, `MONGODB_DB` — server-only

---

## 3. App Flow

### 3.1 Applicant flow
```
Register/Login
   │
   ▼
Scheme list (NFST, NOS — open schemes only)
   │  (eligibility rules shown inline)
   ▼
Start application → fill personal/academic/bank details
   │
   ▼
Upload required documents (per scheme's required_documents config)
   │  → each upload triggers server-side OCR extraction (async, non-blocking)
   ▼
Submit application  →  status: submitted
   │
   ▼
[Verifier reviews]  →  status: under_verification
   │
   ├── issue found → status: deficiency_raised → applicant notified
   │        │
   │        └── applicant fixes the specific document → re-enters queue
   │
   └── all clear → status: verified
            │
            ▼
      [Admin selection round] → selected / waitlisted / rejected
            │
            ▼
      Applicant sees final status + can view full timeline
```

### 3.2 Verifier / Admin flow
```
Login (role: verifier/admin)
   │
   ▼
Verification queue — applications assigned to me, sorted with
AI-flagged (low-confidence/incomplete) documents surfaced first
   │
   ▼
Open application → see personal/academic details + each document
   │  (with OCR-extracted fields shown alongside the original scan)
   ▼
Per document: Verify / Reject / Raise deficiency (with remark)
   │
   ▼
When all mandatory documents verified → mark application Verified
   │
   ▼
[Admin only] Selection round → Selected / Waitlisted / Rejected
   │
   ▼
Dashboard: live counts by scheme, status, state, avg. processing time
```

---

## 4. UI/UX Brief

### 4.1 Design tokens
- **Color:** Ink `#1B2A4A` (primary/trust), Turmeric `#C67F2E` (accent — used sparingly for primary actions and highlights), Paper `#FAF8F3` (background), Ink-text `#1C1C1C`, Verified-green `#2F6844`, Deficiency-red `#A63D2F`
- **Type:** "Source Serif 4" for headings/document-like content (application forms, status labels feel like an official record), "Inter" for UI chrome, body text, tables
- **Layout:** left-aligned, document-structured (not card-grid-everywhere); the application status is a genuine sequence, so a horizontal stepper/timeline is used there — not decoratively elsewhere
- **Motion:** minimal — one status-change confirmation animation, no scroll-triggered reveals

### 4.2 Principles
- This is a government system a student depends on for funding — clarity and trust over cleverness. No dark patterns, no ambiguous states.
- Every error state names what's wrong and what to do next ("Aadhaar scan is unreadable — re-upload a clearer photo", not "Upload failed").
- AI-flagged issues are always labeled as **suggestions for the verifier**, never as automatic rejections — human authority is visually explicit.
- Empty states are instructive: "No applications yet — schemes open for NFST and NOS" with a direct link, not a blank page.

### 4.3 Key screens
1. Scheme list (applicant) — open schemes as clear records, eligibility rules expandable
2. Application form — multi-step (personal → academic → bank → documents), autosave draft
3. Application detail (applicant) — status stepper, document list with per-doc status, deficiency responses inline
4. Verifier queue — table: applicant, scheme, submitted date, AI-flag indicator, assigned status
5. Verifier review — split view: form data left, document + OCR overlay right, action buttons per document
6. Admin dashboard — scheme-wise funnel (submitted → verified → selected), state-wise map/table, processing-time trend

---

## 5. Backend Schema *(already provisioned — live, not planned)*

### 5.1 Supabase (PostgreSQL) — project `Scholarship` (`pckucwsjsuacmyrgqwdz`)
- `profiles` — id (=auth.users.id), role (applicant/verifier/admin), full_name, email, phone, state, district, category
- `schemes` — code, name, type, description, `eligibility_rules` (jsonb), `required_documents` (jsonb), application window, status. **Seeded with real NFST and NOS data** from the problem statement's linked scheme pages.
- `applications` — applicant_id, scheme_id, status (enum, 8 states), personal/academic/bank details (jsonb), assigned_verifier_id, unique(applicant_id, scheme_id)
- `application_documents` — application_id, doc_type, file_path (Supabase Storage), status, verified_by/at, remarks
- `application_status_history` — full audit trail of every transition
- `deficiencies` — application_id, document_id, description, status, raised_by/at, resolved_at
- `notifications` — user_id, application_id, message, read

All tables have **Row Level Security enabled**: applicants see only their own rows; verifiers see only assigned applications; admins see all. Enforced with a `current_role()` `security definer` helper to avoid recursive RLS lookups. Storage bucket `application-documents` is private with folder-per-user policies.

### 5.2 MongoDB Atlas — cluster `Scholarship`, database `scholarship`
- `document_ai_extractions` — `{ applicationDocumentId, applicationId, docType, rawText, extractedFields, confidence, flags[], model, createdAt }`, indexed on `applicationDocumentId` and `applicationId`
- `audit_events` — `{ applicationId, actorId, action, metadata, createdAt }`, indexed on `(applicationId, createdAt)`

A dedicated Mongo DB user `scholarship_app` (readWrite on `scholarship` only, least-privilege) has been created; credentials are not stored in the repo.

---

## 6. Implementation Plan (phased)

| Phase | Scope | Status |
|---|---|---|
| 0 | Architecture decision, Supabase schema + RLS, storage bucket, scheme seed data, MongoDB collections + indexes | **Done** |
| 1 | Auth (register/login), profile creation, scheme list + detail | Next |
| 2 | Application form (multi-step) + document upload + draft autosave | Next |
| 3 | OCR pipeline on upload (Tesseract.js) → writes to `document_ai_extractions`, flags surfaced in UI | Next |
| 4 | Applicant status/timeline view + deficiency response flow | Next |
| 5 | Verifier queue + review screen + verify/reject/deficiency actions + status-history writes | Next |
| 6 | Admin: scheme configuration UI, selection round, dashboard/analytics | Next |
| 7 | Notifications (in-app), edge cases (empty states, expired sessions, large files, invalid IDs) | Next |
| 8 | Security/performance audit pass (OWASP checklist, RLS penetration check via `get_advisors`), deployment | Next |

Each phase is built frontend + API + DB + validation + auth + states + edge cases together, verified before moving to the next — per the standing engineering instructions for this project.

---

## 7. App Build Prompt (for a UI-generation tool / modern-UI build pass)

Use this as a standalone prompt if generating the UI with a design/build tool:

> Build a modern, trustworthy government web application called **SAKSHAM** — a Scholarship & Fellowship Management System for the Ministry of Tribal Affairs. Two portals in one app: an **Applicant Portal** and an **Admin/Verifier Portal**, role-gated after login.
>
> **Visual direction:** Not a generic SaaS dashboard. Base palette: deep ink blue `#1B2A4A` for primary UI and trust elements, warm turmeric `#C67F2E` as a single sparing accent for primary actions, warm paper `#FAF8F3` background, near-black `#1C1C1C` text, muted green `#2F6844` for verified/success states, muted brick red `#A63D2F` for deficiency/error states. Headings in a serif (Source Serif 4) to feel like an official record; UI chrome and body in Inter. Left-aligned, document-structured layouts — avoid identical rounded SaaS cards everywhere. Use a horizontal stepper only for the application-status timeline, since that's a genuine sequence — not decoratively elsewhere. One deliberate motion moment on status change; otherwise minimal animation.
>
> **Applicant Portal screens:** login/register, scheme list (NFST & NOS, eligibility shown inline, each scheme configurable — not hardcoded), multi-step application form (personal → academic → bank → documents) with autosave, application detail page with a status stepper (submitted → under verification → deficiency raised → verified → selected/waitlisted/rejected) and an inline deficiency-response flow, in-app notifications.
>
> **Admin/Verifier Portal screens:** verification queue (table, AI-flagged documents surfaced first), split-pane review screen (form data + document viewer with OCR-extracted fields overlaid, per-document verify/reject/raise-deficiency actions with a remark field), scheme configuration screen (eligibility rules + required documents as structured, editable config — not code), selection-round screen, and a dashboard with scheme-wise funnel, state-wise breakdown, average processing time, and deficiency rate — all backed by real data, no placeholder numbers.
>
> **Tone:** every empty state is instructive, every error names what's wrong and what to do next, AI-flagged issues are always labeled as suggestions for a human verifier — never as automatic decisions. This is a system a student's education funding depends on: clarity and accountability over cleverness.

---

*This document reflects the live database schema and provisioned infrastructure as of this session (Supabase project `pckucwsjsuacmyrgqwdz`, MongoDB Atlas cluster `Scholarship`). Application code (Next.js) scaffolding is in progress in `/scholarship-platform`.*
