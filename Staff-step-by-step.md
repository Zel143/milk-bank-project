
Based on the `human_milk_bank_design_doc.md` and the audit in `reports.md`, here is the step-by-step flow of the sections and fields the staff needs to fill out for each specific program:

### 1. Supsup Todo (Community / Mobile-Based)

This is the most comprehensive flow because it involves registering walk-in/mobile donors who have not been pre-screened.

**Step 1: Donor Registration & Health Screening (Donor Management Section)**

* **Personal Profile:** Full Name, Address, Contact Number, Occupation, Date of Birth, Civil Status, Classification.
* **Health Screening Checklist:** Fill out the binary (Yes/No) health flags (e.g., travel history, tuberculosis/hepatitis history, recent blood transfusions, smoking/alcohol/drug use, medications, last delivery date).
* *Note: Per the `reports.md` gaps (G1 & G2), the staff will also need to acknowledge the maternal consent text and log the completion timestamps for the Interview, Counseling, and Consent Signing.*

**Step 2: Milk Collection & Bottling (Milk Collection Section)**

* **Collection Details:** Volume collected, Age of Baby (AOB), Date of Collection (DoC).
* **Mode of Collection:** Set to **Field Collection (FC)**.
* **Cold Chain:** Verify the cold chain method.
* *System Action:* Auto-generates the Collection Tracking Number (CTN) and Donor Tracking Number (DTN).

**Step 3: Lab Testing & Pasteurization (Lab & Pasteurization Sections)**

* Enter pre-pasteurization sample volume (≤5mL) and send to City Hall.
* Update status based on Lab Results (Pass/Fail).
* If Passed: Log pasteurization details (temperature, duration) and post-pasteurization lab results.

---

### 2. Milky Way (Hospital-Based)

This flow is faster because these donors are pre-screened through their pre-natal hospital records.

**Step 1: Donor Registration (Donor Management Section)**

* **Personal Profile:** Basic demographics (Name, Address, etc.).
* **Health Screening:** **Bypassed.** The staff does *not* need to fill out the health checklist. The system's screening status should be set to `not_required`.

**Step 2: Milk Collection & Bottling (Milk Collection Section)**

* **Collection Details:** Volume collected, Age of Baby (AOB), Date of Collection (DoC).
* **Mode of Collection:** Standard collection.
* *System Action:* Auto-generates the CTN and DTN.

**Step 3: Lab Testing & Pasteurization (Lab & Pasteurization Sections)**

* *Same pipeline as Supsup Todo:* Log samples, update lab results, and log pasteurization metrics.

---

### 3. Mom’s Act (Household-Based)

This flow caters to mothers who request their frozen milk to be picked up from their homes. Like *Milky Way*, they are pre-screened.

**Step 1: Donor Registration (Donor Management Section)**

* **Personal Profile:** Basic demographics.
* **Health Screening:** **Bypassed.** Screening status set to `not_required`.

**Step 2: Milk Collection & Bottling (Milk Collection Section)**

* **Collection Details:** Volume collected, Age of Baby (AOB), Date of Collection (DoC) — representing when the mother actually pumped the milk.
* **Mode of Collection:** Set to **Pickup (PU)**.
* **Date of Pickup (DoPU):** The staff must log the exact date and time the milk was retrieved from the household. *(Note: This is currently flagged as gap G3 in your reports.md and needs to be added to the UI)*.

**Step 3: Lab Testing & Pasteurization (Lab & Pasteurization Sections)**

* *Same pipeline as Supsup Todo:* Log samples, update lab results, and log pasteurization metrics.

---

### Summary of the Staff's UI Experience:

* **If Supsup Todo:** Fill out everything (Full Demographics + Full Health Screening + Extraction details).
* **If Milky Way:** Skip the Health Screening tab → Go straight to Collection details.
* **If Mom's Act:** Skip the Health Screening tab → Go straight to Collection details + explicitly log the **Pickup Date (DoPU)**.



Viewed AGENTS.md:16-30 

**VERIFICATION**

You can verify these exact flows and requirements by referencing the three core documents we've discussed: `docs/human_milk_bank_design_doc.md`, `reports.md`, and the `docs/SRS-doc.md`.

Here is exactly where to look in each file:

### 1. In `docs/human_milk_bank_design_doc.md` (The Single Source of Truth)

* **The Flowcharts:** Look at **Figure 1** (Supsup Todo), **Figure 2** (Milky Way), and **Figure 3** (Mom's Act) in the "Process Flows & Diagram Interpretations" section. You'll visually see how Supsup Todo includes the "Screening / Counseling / Interview" boxes, while Milky Way and Mom's Act skip straight to the Collection boxes.
* **The Program Descriptions:** Go to **Chapter 1 > Makati Human Milk Bank Programs**. Read the descriptions for Milky Way and Mom's Act, which explicitly state: *"Donors of this program are pre-screened..."*
* **The Form Fields to Fill Out:**
  * Look at **Appendix G & H** for the exact fields in the Donor Registration Form (Full Name, Health Checklist, Consent, etc.).
  * Look at **Appendix F** for the Milk Label fields, which shows the staff needs to log **"Mode of Collection: [ ] FC [ ] PU"** (Field Collection for Supsup Todo vs. Pickup for Mom's Act) and **DoPU** (Date of Pickup).

### 2. In `reports.md` (The Process & Compliance Audit)

* **Section 2.1 (Supsup Todo):** Lists the full 14-step table from Screening all the way to Dispensing. It flags that the counseling/interview timestamps are required but missing from the UI (Gap G1).
* **Section 2.2 (Milky Way):** Explicitly states: *"The workflow bypasses the screening and counseling steps entirely and begins directly at milk collection"* and notes that the app uses a `screening_status: 'not_required'` value.
* **Section 2.3 (Mom's Act):** Highlights the household pickup flow and flags that the **Date of Pickup (DoPU)** is currently missing from the collection form (Gap G3).

### 3. In `docs/SRS-doc.md` (System Requirements Specification)

* **Section 3.1 & 5.1:** Details the business logic and context diagrams for how the system handles the different categorizations for incoming donation records based on these three specific source programs.

If you'd like to verify this in the application's actual codebase, we would look at the `Collection` and `Donor` database schemas (likely in `src/lib/supabase.ts` or SQL migration files) to see how the `program` field (`milky_way`, `moms_act`, `supsup_todo`) interacts with the `screening_status` and `collection_mode` fields!
