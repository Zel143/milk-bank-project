# Changelog — Frontend Improvement Pass
**Date:** 2026-06-28
**Branch:** `vivamax`
**Author:** Antigravity (AI pair programmer)
**Build:** ✅ Vite v6.4.3 — 2681 modules, 0 errors

---

## Overview

This pass addresses all P1 (go-live blocker), P2 (handoff-ready), and P3 (polish) gaps identified in the frontend audit against `reports.md`, `Checklist_Audit.md`, and `docs/human_milk_bank_design_doc.md`.

---

## Changed Files

### `src/app/components/screens/InquiryWaitingListScreen.tsx`
**Gaps closed: G6, G7, G8**

- **G6 — Inventory availability check:** Added a live `bottles` query on mount (`status = 'available'`). Total `remaining_volume_ml` is surfaced as a banner above the table (green if available, amber if not) and as an inline badge inside the "Log Inquiry" slide-over form. No schema change required.
- **G7 — Mark as Notified action:** Added a "Mark Notified" button per row in the Waiting List tab. On click: updates `inquiries.status = 'notified'` and inserts a record into `email_notifications` for paper-trail audit. No email is sent from the client — backend function handles delivery.
- **G8 — Days Waiting always visible:** The `Days Waiting` column now renders on **both** the Active Inquiries tab and the Waiting List tab. Previously it was Waiting-only.

---

### `src/app/components/screens/MilkCollectionScreen.tsx`
**Gaps closed: G3, D5**

- **G3 — Date of Pickup (DoPU):** Added a `datetime-local` input labelled "Date of Pickup (DoPU)" that renders **only when Collection Mode = Pickup**. Value is bound to `collections.pickup_at` on insert. Required for Mom's Act pickups per Appendix F of the design doc.
- **D5 — Collected By FK fix:** Replaced the free-text "Collected By" input with a `<select>` dropdown that queries `profiles` (`is_active = true`) and stores the staff UUID. Fixes a silent FK constraint violation where the old free-text value was incompatible with `collections.collected_by` (UUID FK → profiles).
- Added `StaffProfile` type and `staffList` state. Added `profiles` to the `load()` Promise.all.

---

### `src/app/components/screens/DonorManagementScreen.tsx`
**Gaps closed: G1, G2, D4**

- **D4 — Screening bypass for pre-screened programs:** Added `BYPASS_PROGRAMS = ['milky_way', 'moms_act']` constant. When one of these programs is selected:
  - The Health Screening tab is hidden from the drawer tab strip.
  - A sky-blue info banner is shown: "Health screening not required — set to Not Required automatically."
  - On save, `screening_status` is inserted as `'not_required'` instead of `'pending'`.
  - `donor_screenings` row is not created.
- **G1 — Completion timestamps:** Added three `datetime-local` inputs at the bottom of the Health Screening tab: **Counseling Completed At**, **Interview Completed At**, **Consent Signed At**. All bound to `donor_screenings` columns.
- **G2 — Maternal consent acknowledgment:** Added a read-only Maternal Authorization Statement block and a required checkbox ("I have read this consent statement to the donor and they have agreed and signed.") on the Health Screening tab.
- Added `selectedProgram` and `consentAcknowledged` state. `closeDrawer()` resets both.

---

### `src/app/components/screens/InventoryScreen.tsx`
**Polish: P3**

- Expanded from a single unformatted 4-line block into properly structured JSX matching the code style of all other screens.
- No logic changes — same Supabase query, same data model.

---

### `src/app/components/screens/AccountSettingsScreen.tsx`
**Polish: P3**

- Replaced a 13-line stub with a full two-panel settings page:
  - **Profile card:** Avatar initials, display name, and role badge.
  - **Change Password card:** New/confirm password inputs with client-side validation wired to `supabase.auth.updateUser({ password })`. Shows success/error notice inline.

---

### `src/app/components/screens/DashboardScreen.tsx`
**Polish: P3**

- Removed the vestigial "Active Inquiries" card (dev leftover).
- Replaced with **"Ready to Dispense"** metric card — total mL and batch count from `batches.status = 'ready'`.
- Removed unused `Inquiry` type, `inquiries` state, and the `inquiries` leg of the `Promise.all` fetch. Dashboard now makes 4 parallel queries instead of 5.

---

### `src/app/components/Layout.tsx`
**Polish: P3 / Deviation D1**

- Renamed nav label: `"SMS Notifications"` → `"Notifications"`.
- Renamed `SCREEN_TITLES.sms`: `"SMS Notifications"` → `"Notifications"`.
- Aligns with Deviation D1 in `reports.md` — the system uses email, not SMS.

---

## No Schema Changes Required

All changes are **frontend-only**. Every Supabase column written to already exists in the database schema:

| Column | Table | Change |
|---|---|---|
| `bottles.remaining_volume_ml` | `bottles` | Read-only (new query) |
| `inquiries.status` | `inquiries` | Now writes `'notified'` |
| `email_notifications.*` | `email_notifications` | New insert on notify |
| `collections.pickup_at` | `collections` | New write path |
| `collections.collected_by` | `collections` | Now sends UUID (was free-text) |
| `donor_screenings.counseling_completed_at` | `donor_screenings` | New write path |
| `donor_screenings.interview_completed_at` | `donor_screenings` | New write path |
| `donor_screenings.consent_signed_at` | `donor_screenings` | New write path |
| `donors.screening_status` | `donors` | Now writes `'not_required'` for bypass programs |

---

## Gaps Remaining (Out of Scope for This Pass)

| ID | Description |
|---|---|
| G4 | Dispensing screen does not show FIFO queue position |
| G5 | Lab result entry does not auto-advance batch status |
| G9 | No period/date filter on Reports screen |
| G10 | Pasteurization screen does not log `pasteurized_by` |
| D6 | Audit log admin check is client-side only (should be RLS) |
| D7 | Route ID for notifications screen is still `sms` (only label renamed) |
