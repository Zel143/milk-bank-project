
# Staff Logical Flow — Three Collection Programs

> Source: `context/`, `frontend-pink/src/`, design doc & SRS

---

## Shared Lifecycle (All Programs)

Once milk is collected, every batch follows the **same** downstream pipeline:

```
RAW → PRE_TESTING → PRE_TEST_PASSED → PASTEURIZED → POST_TESTING → READY → DISPENSED
                ↘ PRE_TEST_FAILED → DISCARDED              ↘ POST_TEST_FAILED → DISCARDED
```

Every record carries three mandatory identifiers:

- **DTN** — Donor Tracking Number (donor-level, e.g. `DONOR-0001`)
- **CTN** — Collection Tracking Number (session-level, e.g. `COLL-0002`)
- **Batch Number** — generated at collection

---

## Program 1: Supsup Todo

> *"Saganang unang Pagkain ng Sanggol upang Protek Todo"*
> Community/Mobile Collection — staff travel to health centers in barangays

### Key Characteristics

- Donors are **NOT pre-screened** — full screening happens at point of collection
- Collection Mode: **FC (Field Collection)**
- Volume: 30–240 mL/session, max 800 mL/day per donor
- Classification: typically `Community`

### Step-by-Step Staff Flow

| #  | Step                                            | Staff Action                                                                                                                                                                                                                  | System Action                                                                                                                                                                       |
| -- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | **Donor Registration**                    | Staff registers new donor — enter full name, address, contact, DOB, occupation, civil status, classification, prenatal center                                                                                                | System auto-generates**DTN**; creates donor record with `screening_status = Pending`                                                                                        |
| 2  | **Preliminary Lab Test (Screening Gate)** | Staff records preliminary lab test results (TB sputum, Hepatitis B blood test)                                                                                                                                                | System updates`donor_screenings` record with test results                                                                                                                         |
| 3  | **Screening Result Decision**             | Staff enters result:**Pass or Fail**                                                                                                                                                                                    | **FAIL** → donor record stays `Failed`; process ends. **PASS** → donor moves to `Passed`; proceed to Step 4                                                       |
| 4  | **Counseling Session**                    | Staff conducts 10–20 min counseling session                                                                                                                                                                                  | Staff logs counseling completion in system                                                                                                                                          |
| 5  | **Interview & Consent Signing**           | Staff conducts donor interview; donor signs maternal authorization consent                                                                                                                                                    | Staff logs completion; health screening checklist (TB, HepB, Mastitis, Syphilis, Herpes, alcohol, smoking, drugs, blood transfusion, organ transplant) saved to`donor_screenings` |
| 6  | **Lactation Massage**                     | Staff performs 10–20 min lactation massage                                                                                                                                                                                   | No direct system action; preparatory step                                                                                                                                           |
| 7  | **Milk Extraction**                       | Donor expresses milk                                                                                                                                                                                                          | —                                                                                                                                                                                  |
| 8  | **Log Collection**                        | Staff opens**Milk Collection → New Collection**; selects donor by DTN, selects program `Supsup Todo`, enters volume (validated 30–240 mL), mode `FC`, collection date, Age of Baby (AOB), collected-by staff name | System auto-generates**CTN** and **Batch Number**; creates `collections` and `batches` records; batch status set to **RAW**                                   |
| 9  | **Bottling & Labeling**                   | Staff bottles milk using cold-chain method; prints**Unpasteurized Label** (DTN, Volume, AOB, Mode FC, Date of Collection, Date of Pickup, Collected By, Expiry)                                                         | System provides label data                                                                                                                                                          |
| 10 | **Pre-Pasteurization Lab Sample**         | Medical Technologist takes ≤5 mL sample; enters sample volume, date sent to City Hall                                                                                                                                        | System sets batch status →**PRE_TESTING**; expected result date = sent date + ~14 days                                                                                       |
| 11 | **Wait ~2 Weeks**                         | —                                                                                                                                                                                                                            | Batch shows in "Pending Lab Results" dashboard with days elapsed                                                                                                                    |
| 12 | **Pre-Test Result Entry**                 | Medical Technologist receives City Hall results and enters:**PASS or FAIL**                                                                                                                                             | **FAIL** → status → **PRE_TEST_FAILED → DISCARDED**. **PASS** → status → **PRE_TEST_PASSED**                                                           |
| 13 | **Pasteurization**                        | Medical Technologist selects batch (must be`PRE_TEST_PASSED`), logs operator, temperature (62.5°C), duration (30 min), date                                                                                                | System sets status →**PASTEURIZED**; triggers creation of post-test record                                                                                                   |
| 14 | **Post-Pasteurization Lab Sample**        | Medical Technologist takes ≤5 mL sample; sends to City Hall again                                                                                                                                                            | System sets status →**POST_TESTING**                                                                                                                                         |
| 15 | **Wait ~2 Weeks**                         | —                                                                                                                                                                                                                            | Batch in pending dashboard                                                                                                                                                          |
| 16 | **Post-Test Result Entry**                | Medical Technologist enters City Hall results                                                                                                                                                                                 | **FAIL** → **POST_TEST_FAILED → DISCARDED**. **PASS** → **READY**                                                                                        |
| 17 | **Print Pasteurized Label**               | Staff prints label: Batch No, Bottle No, Volume, Date of Expiration                                                                                                                                                           | —                                                                                                                                                                                  |
| 18 | **Milk Ready for Dispensing**             | Inventory reflects READY status; notified recipients may be dispatched via SMS/Email                                                                                                                                          | —                                                                                                                                                                                  |

---

## Program 2: Milky Way

> Hospital-Based Collection — from mothers of premature babies in partner hospital NICUs

### Key Characteristics

- Donors are **pre-screened** via prenatal hospital records — **screening step is SKIPPED**
- Collection Mode: **FC (Field Collection)**
- Primary recipients: premature babies in NICU
- Staff log hospital visit schedules

### Step-by-Step Staff Flow

| #  | Step                                    | Staff Action                                                                                                                                                                             | System Action                                                                                  |
| -- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1  | **Donor Pre-Screening**           | *(Handled externally by hospital prenatal records — not logged in system)*                                                                                                            | Staff may register donor in system with`screening_status = Passed` (bypassed)                |
| 2  | **Register Donor**                | Staff registers hospital donor: name, address, contact, program`Milky Way`, classification (typically `Institutional`)                                                               | System auto-generates**DTN**; `screening_status = Passed` (no screening form required) |
| 3  | **Hospital Visit Scheduling**     | Staff logs/schedules hospital visit                                                                                                                                                      | — (planned feature; currently logged informally)                                              |
| 4  | **Milk Collection at Hospital**   | Staff collects milk from donor at partner hospital                                                                                                                                       | —                                                                                             |
| 5  | **Log Collection**                | Staff opens**Milk Collection → New Collection**; selects donor by DTN, selects program `Milky Way`, enters volume (30–240 mL), mode `FC`, collection date, AOB, collected-by | System generates**CTN** + **Batch Number**; status → **RAW**                |
| 6  | **Bottling & Labeling**           | Staff bottles milk cold-chain; prints**Unpasteurized Label** (same Appendix F format)                                                                                              | —                                                                                             |
| 7  | **Pre-Pasteurization Lab Sample** | Medical Technologist takes ≤5 mL; logs in system                                                                                                                                        | Status →**PRE_TESTING**; City Hall tracking starts                                      |
| 8  | **Wait ~2 Weeks**                 | —                                                                                                                                                                                       | Pending dashboard                                                                              |
| 9  | **Pre-Test Result**               | Medical Technologist enters result                                                                                                                                                       | **FAIL** → DISCARDED. **PASS** → **PRE_TEST_PASSED**                       |
| 10 | **Pasteurization**                | Medical Technologist pasteurizes (62.5°C / 30 min)                                                                                                                                      | Status →**PASTEURIZED**                                                                 |
| 11 | **Post-Test Sample**              | Medical Technologist sends ≤5 mL sample to City Hall                                                                                                                                    | Status →**POST_TESTING**                                                                |
| 12 | **Wait ~2 Weeks**                 | —                                                                                                                                                                                       | Pending dashboard                                                                              |
| 13 | **Post-Test Result**              | Medical Technologist enters result                                                                                                                                                       | **FAIL** → DISCARDED. **PASS** → **READY**                                 |
| 14 | **Ready for Dispensing**          | NICU recipients have priority access; milk available for dispensing                                                                                                                      | Inventory updated; SMS/email notification triggered                                            |

> **Key Difference from Supsup Todo:** Steps 1–3 (preliminary lab test, counseling, interview, consent, lactation massage) are **entirely absent**. Flow starts directly at milk collection.

---

## Program 3: Mom's Act

> *"Mom's Active Collection of Thriving Preemies"*
> Household Pickup — staff collect from donor's home

### Key Characteristics

- Donors are **pre-screened** (similar to Milky Way, skipped in system)
- Collection Mode: **PU (Pickup)**
- Triggered by **donor calling the milk bank hotline**
- Donors typically from middle/upper-class households

### Step-by-Step Staff Flow

| #  | Step                                    | Staff Action                                                                                                                                                                                   | System Action                                                                   |
| -- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1  | **Donor Pre-Screening**           | *(Handled externally; donor is already on approved list)*                                                                                                                                    | Donor registered in system with`screening_status = Passed`                    |
| 2  | **Register Donor**                | Staff registers donor: name, address, contact, program`Mom's Act`, classification (`Private`)                                                                                              | System auto-generates**DTN**; `screening_status = Passed`               |
| 3  | **Donor Contacts Milk Bank**      | Donor calls hotline to request a pickup                                                                                                                                                        | Staff receives inquiry and schedules household visit                            |
| 4  | **Staff Collects at Household**   | Staff travels to donor's home and collects expressed milk                                                                                                                                      | —                                                                              |
| 5  | **Log Collection**                | Staff opens**Milk Collection → New Collection**; selects donor by DTN, selects program `Mom's Act`, enters volume (30–240 mL), mode **PU**, collection date, AOB, collected-by | System generates**CTN** + **Batch Number**; status → **RAW** |
| 6  | **Bottling & Labeling**           | Staff bottles milk at facility; prints**Unpasteurized Label** (mode shown as `PU`)                                                                                                     | —                                                                              |
| 7  | **Pre-Pasteurization Lab Sample** | Medical Technologist takes ≤5 mL; logs date sent to City Hall                                                                                                                                 | Status →**PRE_TESTING**                                                  |
| 8  | **Wait ~2 Weeks**                 | —                                                                                                                                                                                             | Pending dashboard                                                               |
| 9  | **Pre-Test Result**               | Medical Technologist enters City Hall result                                                                                                                                                   | **FAIL** → DISCARDED. **PASS** → **PRE_TEST_PASSED**        |
| 10 | **Pasteurization**                | Medical Technologist pasteurizes (62.5°C / 30 min)                                                                                                                                            | Status →**PASTEURIZED**                                                  |
| 11 | **Post-Test Sample**              | Medical Technologist sends ≤5 mL to City Hall                                                                                                                                                 | Status →**POST_TESTING**                                                 |
| 12 | **Wait ~2 Weeks**                 | —                                                                                                                                                                                             | Pending dashboard                                                               |
| 13 | **Post-Test Result**              | Medical Technologist enters result                                                                                                                                                             | **FAIL** → DISCARDED. **PASS** → **READY**                  |
| 14 | **Ready for Dispensing**          | Inventory updated; waiting recipients notified                                                                                                                                                 | SMS/email trigger fires                                                         |

> **Key Difference from Supsup Todo:** No onsite screening. Flow is triggered by the donor's phone call instead of a staff field visit. Collection mode is `PU` not `FC`.
> **Key Difference from Milky Way:** Collection happens at residence, not hospital. Mode is `PU` not `FC`.

---

## Side-by-Side Comparison

| Stage                          | Supsup Todo                        | Milky Way                        | Mom's Act                        |
| ------------------------------ | ---------------------------------- | -------------------------------- | -------------------------------- |
| **Screening required?**  | ✅ Yes — full screening in-system | ❌ No — pre-screened externally | ❌ No — pre-screened externally |
| **Trigger**              | Staff visits health center         | Staff visits hospital            | Donor calls hotline              |
| **Collection location**  | Barangay health centers            | Partner hospitals                | Donor's home                     |
| **Collection mode**      | FC                                 | FC                               | PU                               |
| **Counseling / consent** | ✅ Required                        | ❌ Skipped                       | ❌ Skipped                       |
| **Lactation massage**    | ✅ Required                        | ❌ Skipped                       | ❌ Skipped                       |
| **Pre-lab test**         | ✅                                 | ✅                               | ✅                               |
| **Pasteurization**       | ✅                                 | ✅                               | ✅                               |
| **Post-lab test**        | ✅                                 | ✅                               | ✅                               |
| **Primary recipients**   | Community beneficiaries            | NICU premature babies            | General beneficiaries            |

---

## Downstream: Dispensing Flow (All Programs)

After any batch reaches **READY**, the dispensing flow is shared:

1. **Inquiry received** — Walk-in or Hotline Call; staff logs in Inquiry module
2. **NICU gate** — If baby is NOT NICU-admitted → inquiry cannot proceed to waiting list
3. **Waiting list** — Inquiry enters queue ordered by date; NICU flagged entries highlighted
4. **Inventory check** — Confirm `READY` batches with sufficient volume
5. **Notification** — SMS/email sent to recipient when milk is available (status → `NOTIFIED`)
6. **Recipient visits** — Verifies requirements & pays deposit
7. **Fee calculation** — ₱2.00/mL × volume dispensed
8. **Dispensing logged** — Volume, batch (DTN + CTN linked), fee, staff, date recorded
9. **Batch updated** — Status → `DISPENSED`; linked inquiry → `FULFILLED`

---

## System Screens Involved (frontend-pink)

| Module                         | Screen File                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Donor Registration + Screening | [DonorManagementScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/DonorManagementScreen.tsx)       |
| Milk Collection Logging        | [MilkCollectionScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/MilkCollectionScreen.tsx)         |
| Lab Testing (Pre & Post)       | [LabTestingScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/LabTestingScreen.tsx)                 |
| Pasteurization                 | [PasteurizationScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/PasteurizationScreen.tsx)         |
| Inventory Dashboard            | [InventoryScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/InventoryScreen.tsx)                   |
| Inquiry & Waiting List         | [InquiryWaitingListScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/InquiryWaitingListScreen.tsx) |
| Dispensing                     | [DispensingScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/DispensingScreen.tsx)                 |
| SMS Notifications              | [SMSNotificationsScreen.tsx](file:///g:/milk-bank-project/frontend-pink/src/app/components/screens/SMSNotificationsScreen.tsx)     |
