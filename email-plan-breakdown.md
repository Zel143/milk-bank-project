
Based on the design doc, email should implement the same event as SMS: “milk is now available for a waiting NICU beneficiary.” In this repo, email is already the accepted replacement for SMS, not an additional channel: see `context/DECISIONS.md`, `milk_bank_schema.sql`, and the existing `email_notifications` table.

Recommended implementation:

1. Keep the SMS workflow, change the transport

   - Old design doc event: milk becomes available → notify beneficiary via SMS.
   - Repo implementation: milk becomes available → queue email in `email_notifications` → Supabase Edge Function sends it via SMTP.

2. Add the missing automation trigger
   The current gap is that emails are logged manually/not at all. We should automate this around the inquiry lifecycle:

- When inventory becomes available, find the oldest eligible inquiry from `waitlist_fifo`.
- Queue a `milk_available` row in `email_notifications`.
- Send the email.
- Only after successful send, update the inquiry from `waiting` to `notified`.

That preserves FIFO fairness and avoids marking someone “notified” when delivery failed.

3. Put the business logic in Supabase, not React
   The frontend should not decide who gets notified. Add a Postgres RPC such as:

- `notify_next_waitlisted_recipient()`
- checks available bottle volume
- selects first `waitlist_fifo` row
- prevents duplicate notification rows
- inserts into `email_notifications`

Then call that RPC after places where inventory changes, especially after `LabTestingScreen.tsx` marks a batch `ready` and creates an available bottle.

4. Add an Edge Function email worker

Use a Supabase Edge Function like `send-email-notifications`:

- reads `email_notifications` where `status = 'queued'`
- sends via Google SMTP or another SMTP provider
- updates status to `sent` with `sent_at`
- updates status to `failed` with `failed_at` and `error_message`
- if sent successfully, updates the related inquiry to `notified`

5. Add safeguards

- Add a unique partial index so each inquiry only gets one active `milk_available` notification.
- Add retry support for failed emails.
- Keep SMTP credentials only in Supabase function secrets, never in Vite env.
- Move templates out of `localStorage`; admin-edited templates should live in a database table if they affect actual sending.

In short: implement email as the SMS module’s modern equivalent. The trigger remains “milk available for FIFO waitlist recipient,” but the delivery path becomes `inquiries/waitlist_fifo → email_notifications queued row → Supabase Edge Function → SMTP → sent/failed status → inquiry notified`.



Viewed email_notif_breakdown.md:1-50
Listed directory context
Viewed DECISIONS.md:1-103
Viewed SMSNotificationsScreen.tsx:1-150

The suggestions outlined in [email_notif_breakdown.md](file:///g:/milk-bank-project/email_notif_breakdown.md) are **highly sound, architecturally correct, and address several hidden design flaws** in the current repository setup.

Here is what you should make of each suggestion, why they matter, and how to act on them:

---

### 1. Unified Transport: "SMS" in UI, backed by "Email"

* **What to make of it:** **Adopt.**
* **Why:** In [SMSNotificationsScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/SMSNotificationsScreen.tsx#L51), the frontend is labeled "SMS Notifications" but it already queries the `email_notifications` table. Since the project's official decision in `context/DECISIONS.md` has superseded SMS in favor of automated Email notifications, you should keep the existing UI screen but **rename the visual labels** (crumbs, sidebar title, headers) from "SMS Notifications" to "Email Notifications" or "Notifications Log" to prevent admin confusion.

### 2. Auto-Triggering notifications on FIFO (First-In, First-Out)

* **What to make of it:** **Critical feature. Implement this next.**
* **Why:** Currently, there is no code linking a batch becoming ready to a waitlisted recipient being matched. When a batch passes lab testing, it should automatically:

  1. Look at the `waitlist_fifo` view to find the highest-priority beneficiary matching the criteria.
  2. Queue an email.
  3. Only advance their status to `notified` once the mailer reports success.

  * *State Machine Safety:* Updating the status to `notified` only *after* successful SMTP dispatch ensures a delivery error (e.g., bad email format) doesn't result in skipped recipients.

### 3. Business Logic belongs in PostgreSQL/Supabase, not React

* **What to make of it:** **Architecturally mandatory.**
* **Why:** If the React frontend matches beneficiaries to newly ready milk, two different staff members loading the page at the same time could trigger concurrent, duplicate, or out-of-order allocations. Matching should happen inside a PostgreSQL Transaction (or RPC/trigger) on the database level, ensuring atomic locks and strict FIFO integrity.

### 4. Supabase Edge Function for SMTP Sending

* **What to make of it:** **Standard practice.**
* **Why:** React apps run entirely in the user's browser; they cannot securely talk to an SMTP server without exposing SMTP usernames and passwords. An Edge Function acts as a secure backend worker that polls or is triggered by database inserts, securely formats the email, and sends it.

### 5. Fixing the `localStorage` Template Bug (Important Safeguard)

* **What to make of it:** **High Priority fix.**
* **Why:** In [SMSNotificationsScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/SMSNotificationsScreen.tsx#L9), message templates are saved to the browser's local storage (`localStorage`). This means:
  * If Nurse A edits a template, Nurse B won't see the edits.
  * The backend/Edge Function executing the email cannot access the browser's `localStorage` to get the customized message.
  * **Fix:** You should migrate these templates into a database table (e.g. `notification_templates`) so edits are shared globally and readable by the mail worker.

---

### Recommended Action Plan

If you want to move forward with implementing these suggestions, here is the sequence of tasks we should execute:

1. **Database Schema Update:** Create a table for templates (`notification_templates`) and migrate the initial placeholders there.
2. **Postgres RPC/Trigger:** Create a Postgres function `notify_next_waitlisted_recipient()` that triggers when a batch becomes `ready` (e.g. in [LabTestingScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/LabTestingScreen.tsx#L97)).
3. **React Screen Refactoring:** Update [SMSNotificationsScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/SMSNotificationsScreen.tsx) to fetch/update templates in Supabase rather than `localStorage`, and update text labels to refer to "Email" instead of "SMS".
4. **Edge Function Setup:** Establish the Edge Function framework to poll `email_notifications` for the SMTP transport.
