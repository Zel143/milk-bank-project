# Human Milk Bank Management System
## Design Document

---

### Executive Summary
Human milk is a superior factor regarding the nutrition of a child and far more valuable than what powdered milks may offer. Treatment of conditions like prematurity and neonatal illnesses has been proven through numerous scientific publications worldwide. It is really evident that the nutritional and immunologic properties of the human milk remains incontestable. Various study still recommend to breast feed infants until they are twelve (12) months of age. 

The World Health Assembly presented a document on Infant and Young Child Nutrition: Global Strategy on Infant and Young Child Feeding, back in 2002. Stating that when a mother is unable to provide her own milk for various reasons, donor milk can be the first alternative. The Infant and Young Child Feeding Program in the Philippines was encouraged to set-up a Human Milk Bank for the reasons stated above. This study will develop a human milk bank system that is accessible via web. It provides several functionalities as delivered by the bank. It also sends SMS notifications to the beneficiaries of the milk bank.

---

### Table of Contents
* **Chapter 1: Introduction**
  * Background of the Study (Page 1)
  * Milk Banks in the Philippines (Page 2)
  * Case Site (Page 3)
  * Makati Human Milk Bank Programs (Page 3)
  * Dispensing Procedure (Page 4)
  * Objectives of the Study (Page 4)
  * Scope and Limitations (Page 5)
  * Significance of the Study (Page 5)
* **List of Tables**
  * Table 4.1 Deliverable Summary (Page 46)
  * Table 5.1 Summary of Testing (Page 48)
  * Table 5.2 Log-in Test Results (Page 50)
  * Table 5.3 to 5.5 Donor List Test Results (Pages 51-54)
  * Table 5.6 to 5.8 Dispensing Test Results (Pages 55-57)
  * Table 5.9 to 5.11 Donor Info Test Results (Pages 58-60)
  * Table 5.12 to 5.14 Inquiries Test Results (Pages 61-62)
  * Table 5.15 to 5.17 New Milk Donation Test Results (Pages 62-63)
  * Table 5.18 to 5.20 Milk Records Test Results (Pages 64-65)
  * Table 5.21 to 5.23 Post Pasteurization Test Results (Pages 66-67)
  * Table 5.24 to 5.26 Collection Unit Report Test Results (Pages 68-70)
* **Appendices** (Page 72)
* **References** (Page 90)

---

### List of Figures
* **Figure 1**: Current System Flow for Supsup Todo (Page 6)
* **Figure 2**: Current System Flow for Milky Way (Page 7)
* **Figure 3**: Current System Flow for Mom's Act (Page 8)
* **Figure 4**: Current System Flow for Dispensing Procedure (Page 9)
* **Figure 5**: Current Milk Availability Inquiry (Page 10)
* **Figure 6**: Proposed System Flow for Supsup Todo (Page 11)
* **Figure 7**: Proposed System Flow for Milky Way (Page 12)
* **Figure 8**: Proposed System Flow for Mom's Act (Page 13)
* **Figure 9**: Proposed System Flow for Dispensing Procedure (Page 14)
* **Figure 10**: Proposed System Flow for Milk Availability Inquiry (Page 15)
* **Figure 11**: System Architecture (Page 16)
* **Figure 12**: TB Information Management System (Page 27)
* **Figure 13**: TB Inventory Form (Page 28)
* **Figure 14**: Blood Bank Monitoring System Login Page (Page 29)
* **Figure 15**: Blood Bank Monitoring System Home Page (Page 30)
* **Figure 16**: Blood Bank Monitoring System Dispensing Page (Page 31)
* **Figure 17**: e-Web based Human Milk Bank Management Solution (Page 32)
* **Figure 18**: Sterifeed Human Milk Bank Tracking and Management Software (Page 33)
* **Figure 19**: SafeBaby DMT (Page 34)
* **Figure 20 to 30**: System Module Screenshots (Pages 40-45)

---

## Chapter 1: Introduction

### Background of the Study
Human milk is a superior factor regarding the nutrition of a child and far more valuable than what powdered milks may offer. Treatment of conditions like prematurity and neonatal illnesses has been proven through numerous scientific publications worldwide. It is really evident that the nutritional and immunologic properties of the human milk remain incontestable. Various studies still recommend to breast feed infants until they are twelve (12) months of age.

The World Health Assembly presented a document on Infant and Young Child Nutrition: Global Strategy on Infant and Young Child Feeding, back in 2002. Stating that when a mother is unable to provide her own milk for various reasons, donor milk can be the first alternative. The Infant and Young Child Feeding Program in the Philippines was encouraged to set-up a Human Milk Bank for the reasons stated above.

The first human milk bank was established in Boston, Massachusetts which dates back to the early 20th century. Infant mortality and morbidity were significantly improved by breastfeeding alone. This so-called "bank" was actually a home for lactating women who were paid to wet-nurse infants in need and at the same time breastfeeding their own infants. Back in 1943, the American Academy of Pediatrics' Committee on Mother's Milk published standards for milk banking operations which includes collection, processing, storage, and dispensing of donated human milk. In the late 1980's, concerns were brought up about transmission of viruses like CMV and HIV through human milk, but with the increasing scientific evidence of both the benefits of human milk and the effectiveness of pasteurization and freezing in the destruction of viruses in human milk, donor human milk banking remains an important service for all newborns and adults who stand to benefit from the nutritional and immunologic value of human milk.

### Milk Banks in the Philippines
Back in March 16, 2010, the "Expanded Breastfeeding Promotion Act of 2009" was accepted into a law amending the Republic Act No. 7600 (which also states that, "An Act Providing Incentives to all government and private health institutions with rooming-in and breastfeeding practices and for other purposes"). Section 5 of the law states that health institutions are encouraged to set-up milk banks for storage of breastmilk donated by mothers and which have undergone pasteurization. 

The Implementing Rules and Regulations (IRR) of the law, which was signed on August 22, 2011, explicitly describe the implementation of Milk Storage and Milk Banking in Health Institutions. Hence, the IRR should be supported by guidelines or manual of operation for a successful and safe establishment and implementation of Human Milk Banks in the country. In order to achieve this goal, the NCDPC (National Center for Disease Prevention and Control) of the Department of Health took in local experts with experience in human milk banking in the country to set standard guidelines that are appropriate for Philippines setting.

The Philippine National Committee on Human Milk Banking (PNCHMB) is a steering committee formed to ensure the safe and effective operations of human milk banks in the country. Strategizing with the cooperation of the government by giving their utmost effort to achieve our "Millennium Development Goals" (MDGs) - that is, to provide and secure the optimal nutrition to the Filipino newborns and infants (MDG 1) and consequently, reduce childhood mortality (MDG 4).

### Case Site
The Bangkal Milk Bank in Makati was established in 2013 as the first and only Local Government Unit (LGU)-run milk bank in the country. In 2014, by virtue of City Ordinance no. 2014-089, it was named Makati Human Milk Bank. Currently, it is run by four (4) staff members (1 head nurse and 3 midwives). Likewise, it offers various products and services such as: pasteurized milk, collection and dispensing of milk, respectively. Moreover, the milk bank has three (3) major programs offered to its constituents namely: Supsup Todo, Mom's Act, and Milky Way.

According to Ms. Garcia, the head nurse, in their provision of such services like collecting of milk, registration of donors, recording of inventory, to name a few, they use logbooks to record data in a manual fashion. This is true in all their transactions. Please refer to Appendices G (Screening form), H (Screening form), I (Monthly Collection report), J (Monthly Processing report), and K (Monthly Dispensing report) for sample forms used by the facility.

### Opportunities for Study
Based on the claims of the staff of the milk bank and the observation, there are instances of errors in logbook entries such as delays in the entry of records and failure to update records. Likewise, they assert that they have difficulty in the backtracking of records of transactions, donors, and recipients. Thus, there is an opportunity for us to develop an information system that will computerize the said processes.

### Makati Human Milk Bank Programs
* **Supsup Todo (Saganang unang Pagkain ng Sanggol upang Protek Todo):** This is a community-based mobile human milk collection where staff members of the facility visit various health centers around Makati to collect milk.
* **Milky Way:** This is a program where beneficiaries are premature babies that are confined in hospitals. Donors of this program are pre-screened through their pre-natal records in the hospitals.
* **Mom's Act (Mom's Active Collection of Thriving Preemies):** This program caters to mothers who wish to donate milk but prefer to have their milk picked up by staff of the milk bank. The mothers who participate in this program usually come from middle and the upper classes based on observation. Likewise, the said donors have been pre-screened like the ones in Milky Way.

*In all of the programs, there is a maximum limit of 800mL per day per donor or 30mL–240mL per session.*

### Dispensing Procedure
There are two (2) ways for mothers/beneficiaries of inquiring on the availability of milk:
1. **Walk-in:** The mother may visit the milk bank. If she has the necessary requirements, then the milk bank may release the needed amount of milk along with the corresponding fee.
2. **Hotline Call:** The mother can call through the milk bank's hotline number and once the milk is available, she will be instructed to drop by the milk bank and pay the necessary fees.

### Objectives of the Study
The objective of this study is to develop the Makati Milk Bank Inventory System with SMS notification. Specifically:
* **a)** To develop a web-based inventory module that will enable the milk bank staff to record, update, view pertinent information about donated, pasteurized, and dispensed milk;
* **b)** To develop a module that will record and update information about mother-donors and mother-beneficiaries;
* **c)** To develop an auto-generation report module that will produce weekly, monthly, and yearly reports on collection, pasteurization, and dispensing;
* **d)** To develop an SMS notification module that will send text messages to mothers when milk becomes available.

### Scope and Limitation
The study will be conducted in Makati Human Milk Bank located in 1126 Rodriguez Ave., Brgy. Bangkal, Makati City. The project includes a web-based application and an SMS notification module. Furthermore, the study covers the processes from collecting, storing, and dispensing of milk in Supsup Todo, Mom's Act, and Milky Way.

### Significance of the Study
This proposed project may aid the Makati Human Milk Bank in their inventory and monitoring of their products and programs. Secondly, it may provide an efficient way for the staff to produce reports about its transactions. Finally, it may also afford mothers immediate information and feedback about the availability of milk.

---

### Process Flows & Diagram Interpretations

#### Figure 1: Current System Flow for Supsup Todo
```
[Start] -> [Screening: Prelim Lab Test]
                 |
                 +--> (Fail) -> [End]
                 |
                 +--> (Pass) -> [Counseling: 10-20 mins] -> [Interview & Consent Signing]
                                                                     |
[Milk Extraction] <- [Lactation Massage: 10-20 mins] <- [Update Donor List/Log]
        |
[Bottling & Labeling: Cold Chain Method] -> [Update Collection Log] -> [Sampling: <= 5ml]
                                                                               |
[Lab Results] <- (2 weeks) <- [Sent to City Hall for Lab Testing] <------------+
      |
      +--> (Fail) -> [Discard Milk (End)]
      |
      +--> (Pass) -> [Pasteurization] -> [Sampling: <= 5ml] -> [Sent to City Hall for Lab Testing]
                                                                               |
[Ready For Dispensing (End)] <-- (Pass) <-- [Lab Results] <----------- (2 weeks)
                                                  |
                                                  +--> (Fail) -> [Discard Milk (End)]
                                                  |
                                                  +--> [Update Milk Log]
```
> **Visual Interpretation of Figure 1:** A comprehensive multi-stage flowchart tracking the current layout for the mobile donation process. It features logic gates for initial maternal screening and two distinct rounds of laboratory safety evaluations carried out at City Hall, each lasting two weeks. Failure at any test node terminates the sequence and redirects to a "Discard Milk" or "End" status.

#### Figure 2: Current System Flow for Milky Way
```
[Start] -> [Collecting Milk in Hospital] -> [Bottling & Labeling: Cold Chain] -> [Update Collection Log]
                                                                                          |
[Lab Results] <- (2 weeks) <- [Sent to City Hall for Lab Testing] <---- [Sampling: <= 5ml]
      |
      +--> (Fail) -> [Discard Milk (End)]
      |
      +--> (Pass) -> [Pasteurization] -> [Sampling: <= 5ml] -> [Sent to City Hall for Lab Testing]
                                                                               |
[Ready For Dispensing (End)] <-- (Pass) <-- [Lab Results] <----------- (2 weeks)
                                                  |
                                                  +--> (Fail) -> [Discard Milk (End)]
                                                  |
                                                  +--> [Update Milk Log]
```
> **Visual Interpretation of Figure 2:** Represents the hospital-specific workflow. Since mothers are pre-screened in the hospital during prenatal checkups, the workflow completely bypasses the screening, counseling, and extraction tracking steps seen in Supsup Todo, starting directly with raw collection.

#### Figure 3: Current System Flow for Mom's Act
```
[Start] -> [Contact Milk Bank] -> [Collecting Milk from Household] -> [Update Collection Log]
                                                                                   |
[Lab Results] <- (2 weeks) <- [Sent to City Hall for Lab Testing] <---- [Sampling: <= 5ml]
      |
      +--> (Fail) -> [Discard Milk (End)]
      |
      +--> (Pass) -> [Pasteurization] -> [Sampling: <= 5ml] -> [Sent to City Hall for Lab Testing]
                                                                               |
[Ready For Dispensing (End)] <-- (Pass) <-- [Lab Results] <----------- (2 weeks)
                                                  |
                                                  +--> (Fail) -> [Discard Milk (End)]
                                                  |
                                                  +--> [Update Milk Log]
```
> **Visual Interpretation of Figure 3:** Traces household pickup collection logic. Triggered by a phone call request from a donor, leading to an offline manual collection step before syncing back into the standard batch evaluation pipeline.

#### Figure 4: Current System Flow for the Dispensing Procedure
```
[Start] -> [Mothers visit the milk bank] -> [Staff checks if there is an existing record]
                                                          |
                 +----------- (Have Record) --------------+--> (None) -> [Creates a record]
                 |                                                              |
                 v                                                              v
[Staff checks if mother completed steps to avail milk] <------------------------+
                 |
                 +--> (Complete) -> [Mother pays deposit & amount] -> [Mother receives milk]
                 |                                                                 |
                 |                                                                 v
                 +--> (Incomplete) -> [Cancel transaction (End)]       [Staff updates logbook]
                                                                                   |
                                                                                   v
                                                                                [End]
```
> **Visual Interpretation of Figure 4:** Demonstrates the manual protocol implemented when a mother requests milk at the facility, checking documentation records before assessing fee collection and manually updating the dispensing ledger.

#### Figure 5: Current Milk Availability Inquiry
```
[Start] -> [Staff Receives an Inquiry] -> [Is the Baby in the NICU?]
                                                 |
               +------------ (Yes) --------------+--> (No) -> [End]
               v
[Is inventory within buffer & existing recipients?]
               |
               +--> (Yes) -> [Informs recipient of payment/requirements] -> [Updates Logbook] -> [End]
               |
               +--> (No)  -> [Record Details] -> [Inform person once milk available] ---------> [End]
```
> **Visual Interpretation of Figure 5:** Shows the decision logic used when handling phone or walk-in stock inquiries. Critically, priority is exclusively restricted to babies admitted to the Neonatal Intensive Care Unit (NICU).

---

### Proposed System Flows (With Database Integration)

The key distinction in Figures 6–10 is the addition of an automated database system and text alert capability, shifting away from standard paper logbooks.

#### Figure 6: Proposed System Flow for Supsup Todo
> **Visual Interpretation:** This chart introduces a dashed border surrounding all back-end workflow elements post-consent signing. Manual log actions are replaced with system events: `"Update Donor List/Log in the Database"`, `"Update Collection Log in the Database"`, and `"Update Milk Log in the Database"`.

#### Figure 7: Proposed System Flow for Milky Way
> **Visual Interpretation:** Highlights the transformation of hospital-based processing. The system replaces physical logging charts with real-time updates to centralized network tables.

#### Figure 8: Proposed System Flow for Mom's Act
> **Visual Interpretation:** Displays data logging shifting to back-office systems directly at the milk bank facility rather than forcing personnel to log data in real time at residential doorsteps.

#### Figure 9: Proposed System Flow for Dispensing Procedure
> **Visual Interpretation:** Shows structural verification shifts inside the workflow, executing programmatic query checks against historical patient fields within the application suite.

#### Figure 10: Proposed System Flow for Milk Availability Inquiry
```
[Start] -> [Staff Receives Inquiry] -> [Is Baby in NICU?] --(No)--> [End]
                                             | (Yes)
                                             v
                     [Is inventory within buffer & existing recipients?]
                                             |
                     +-----(No)------> [Record Details in the database]
                     |                               |
                     |                               v
                     |                 [Inform availing person via SMS once available] -> [End]
                     |
                     +-----(Yes)-----> [Informs recipient of payment/details]
                                                     |
                                                     v
                                       [Updates Record in Database] -> [End]
```
> **Visual Interpretation of Figure 10:** This proposed process flow chart integrates an automated SMS trigger element (`"Inform the availing person once milk is available through SMS"`), replacing the slow manual call-back system.

---

#### Figure 11: System Architecture Diagram
> **Visual Interpretation of Figure 11:** An structural architecture layout diagram centering around a cloud infrastructure icon labeled **Internet**.
> * **Central Node:** Connected directly via TCP/IP pipes to a master relational server storage environment (**Database**).
> * **Stakeholder Profiles:** An **Administrator** graphic controls inventory permissions.
> * **Inbound Collection Endpoints:** Linked dynamically to external points including a **Hospital**, **Household**, and regional **Health Center** branches.
> * **Outbound Notifications:** Dispatches automated event updates to an external **SMS Server**, which relays cell updates over cellular channels directly to the end **Recipient**.

---

## Chapter 2: Review of Related Literature & Systems

A human milk bank is a service established for the purpose of collecting, screening, processing, storing and distributing donated human milk to meet the specific medical needs of individuals for whom human milk is prescribed. These individuals include preterm babies, critically-ill neonates with necrotizing enterocolitis, immunodeficiency disease, feeding intolerance, allergies, inborn errors of metabolism, and others especially those who are admitted in NICU (neonatal intensive care unit) in the hospitals.

### Milk Bank Collection Programs

There are three (3) current programs that are used in the Makati Human Milk Bank; these are Milky Way, Mom’s Act and Supsup Todo. The following programs happen outside the Milk Bank itself.

### Supsup Todo (Community/Mobile-based) 

1. Screening (Prelin Lab tests)
  - Pass the lab test proceed to counseling
2. Counseling (10-20 minutes)
3. Interview
  - Consent Signing
4. Lactation Massage (10-20 minutes)
5. Milk Extraction
6. Bottling and Labeling
  - Placed in cooler (Cold Chain Method)
7. Sampling
  - Get samples less than 5ml
8. Sends sample to City hall for Lab Testing (2 weeks)
9. Lab results sent back to the milk bank
  - Milk that passes the lab test proceed to pasteurization
  - Milk that fails the lab test are disposed
10. Pasteurization for milks that passed the Lab tests
11. Sampling Pasteurized Milk
12. Send back to Laboratory for testing
13. Lab results sent back to the milk bank
  - Milk that passes the lab test are ready for storage and Dispensing
  - Milk that fails that lab test are disposed

### Milky Way (Hospital-based)

1. Milk Bank staff visits hospital to collect breast milk.  
2. Bottling and Labeling 
  - Placed in cooler (Cold Chain Method) 
3. Sampling 
  - Get samples less than 5 ml 
4. Sends sample to City Hall for Lab Testing (2 weeks) 
5. Lab results sent back to the milk bank 
  - Milk that passes the lab test proceed to pasteurization 
  - Milk that fails the lab test are disposed 
6. Pasteurization for milks that passed the Lab tests 
7. Sampling Pasteurized Milk 
8. Send back to Laboratory for testing 
9. Lab results sent back to the milk bank 
  - Milk that passes the lab test are ready for storage and Dispensing 
  - Milk that fails the lab test are disposed 

### Mom's Act (Household-Based)

1. Mother Contacts Milk Bank  
2. Staff picks up the milk from the household 
3. Sampling 
  - Get samples less than 5 ml 
4. Sends sample to City Hall for Lab Testing (2 weeks) 
5. Lab results sent back to the milk bank 
  - Milk that passes the lab test proceed to pasteurization 
  - Milk that fails the lab test are disposed 
6. Pasteurization for milks that passed the Lab tests 
7. Sampling Pasteurized Milk 
8. Send back to Laboratory for testing 
9. Lab results sent back to the milk bank 
  - Milk that passes the lab test are ready for storage and Dispensing 
  - Milk that fails the lab test are disposed

### Review of Related Systems

#### 1. TB Inventory Management System (Figure 12 & 13)
This is an inventory management system for TB International production, its functions are ordering management, company administration, and production reports.
> **Visual Interpretation of Figure 12 & 13:** System dashboard screens showcasing relational layout structures monitoring raw storage items, active category groupings, procurement costs, and automated stock balances across transactional lines.

#### 2. Blood Bank Monitoring System of the Philippines (Figure 14, 15 & 16)
A custom local web system implementing GSM/SMS cellular protocols to streamline regional blood donation schedules, screening records, cross-matching logs, and distribution orders.
> **Visual Interpretation of Figure 14, 15 & 16:** Classic crimson-themed interface components mapping entry pages, reference checks, status fields (`RESERVED`), patient demographic charts, and clinical blood component balances (`PRBC`).

#### 3. e-Delphyn Milk Bank Solution (Figure 17)
An integrated industrial health software suite designed alongside neonatal clinicians to handle barcode label generation, track batch validation states, and enforce strict recipient allocation protocols.
> **Visual Interpretation of Figure 17:** An infographic detailing milk asset routing steps: `Unit Entry` -> `Unit Request` -> `Distribution` -> `Unit Tracking` -> `Units in Storage` -> `Inventory and Location Management` -> `Unit Transfusion`.

#### 4. Sterifeed Human Milk Bank Tracking Software (Figure 18)
A flexible configuration engine ensuring complete donor-to-recipient traceability across health systems, using rule tables to manage micro-nutrient parameters and pasteurization run data.
> **Visual Interpretation of Figure 18:** System split-screens showcasing tracking parameters: Left view displays fields for detailed donor identification profile data; Right view monitors pasteurization metrics including temperature levels ($62.5^\circ\text{C}$), holding durations (30 min), and microbiological control results (`NEGATIVE / ACCEPTED`).

#### 5. SafeBaby DMT (Figure 19)
A cloud solution combining barcode workflows and weighing scales to eliminate documentation errors in busy NICU environments.
> **Visual Interpretation of Figure 19:** Features the corporate medical brand logo containing a stylized orange emblem depicting a parent cradling a newborn child.

---

## Chapter 3: Technical Specifications & Testing

### Target Hardware & Architecture
* **Deployment Matrix:** Centrally deployed web solution accessible via standard cross-platform desktop frameworks or mobile browsers.
* **Mobile Runtime Profile:** Minimum browser support requires Internet Explorer, Opera Mini, Google Chrome, Mozilla Firefox Mobile, or Safari.
* **Cellular Infrastructure Linkage:** Requires a dedicated 2G modem layer on the host gateway infrastructure to execute automated SMS actions.

---

### Verification and System Testing Tables

#### Table 5.2: Log-in Test Results
| Test Case | To Be Tested | Expected Results | Results | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Test Login using both correct username and password of a doctor account | Login successful | | |
| 2 | Test Login using both correct username and password of a nurse account | Login successful | | |
| 3 | Test Login using both correct username and password of a midwife account | Login successful | NONE | |
| 4 | Test Login if both username and password supplied are wrong in admin account | Login unsuccessful | PASSED | NONE |
| 5 | Test Login if both username and password supplied are wrong in nurse account | Login unsuccessful | PASSED | NONE |
| 6 | Test Login if both username and password supplied are wrong in midwife account | Login unsuccessful | PASSED | NONE |
| 7 | Test Login if correct username but wrong password was supplied in admin account | Login unsuccessful | PASSED | NONE |
| 8 | Test Login if correct username but wrong password was supplied in nurse account | Login unsuccessful | PASSED | NONE |
| 9 | Test Login if correct username but wrong password was supplied in midwife account | Login unsuccessful | PASSED | NONE |
| 10 | Test Login if correct password but wrong username was supplied in admin account | Login unsuccessful | PASSED | NONE |
| 11 | Test Login if correct password but wrong username was supplied in nurse account | Login unsuccessful | PASSED | NONE |
| 12 | Test Login if correct password but wrong username and password was supplied | Login unsuccessful | PASSED | NONE |

---

## Appendices: Operational Materials & Forms

### Hardware Components (Image Appraisals)
* **Appendix C: Standard Asset Collection Vessel**
  > **Visual Interpretation:** A clean, clear cylindrical medical-grade polypropylene plastic collection cup featuring a wide mouth and secured with a durable red screw-on sealing cap.
* **Appendix D: Breast Extraction Assembly Unit**
  > **Visual Interpretation:** A manual/electric breast pump component attachment built from clear silicone, consisting of a wide suction flange, a clear valve body compartment, and a collection bottle interface base.
* **Appendix E: Thermal Pasteurization Unit**
  > **Visual Interpretation:** A compact laboratory bottle-warmer system wrapped in a cream housing frame. Features analog temperature dial controls and a shaped base deck accommodating multiple bottles during pasteurization runs.

---

### Appendix F: Institutional Label Configurations```
+------------------------------------------+  +------------------------------------------+
|          MAKATI HUMAN MILK BANK          |  |          MAKATI HUMAN MILK BANK          |
|     Unpasteurized Human Breast Milk      |  |          Pasteurized Human Milk          |
|                                          |  |                                          |
| DTN: ___________________________________ |  | Batch No: ______________________________ |
| Volume: ________________________________ |  | Bottle No: _____________________________ |
| AOB: ___________________________________ |  | Volume: ________________________________ |
| Mode of Collection:                      |  | Date of Expiration: ____________________ |
|   [ ] FC  [ ] PU  [ ] PU-L  [ ] F       |  |                                          |
| DoC: _______________ DoPU: _____________ |  |                                          |
| Collected by: ______ DoEx: _____________ |  |                                          |
+------------------------------------------+  +------------------------------------------+
```
> **Visual Interpretation of Appendix F:** High-contrast printed labeling sheets designed for container tracking. The raw collection label captures identity markers (`DTN`), collection modes, and expiration parameters, while the final pasteurized label tracks processed metrics (`Batch No`, `Bottle No`) and storage limits.

---

### Appendix G & H: Donor Health Profile Screening Form
* **Personal Data Fields:** Full Name, Address, Prenatal Health Center Location, Telephone Number, Occupation, Age, and Civil Status (Single, Married, Separated, Widowed).
* **Classification Trackers:** Community Donor, Private Donor, or Institutional Employee.
* **Travel History Grid:** Queries international travel history over a 5-year period to identify potential geographical health risks.
* **Clinical Health Checklist (Binary Yes/No):**
  1. Last delivery date metrics.
  2. History of infectious illnesses: Tuberculosis, Hepatitis B, Mastitis, Syphilis, Herpes, or other STDs.
  3. Blood product transfusions or organ transplant history over the past 12 months.
  4. Lifestyle indicators: Alcohol consumption within 24 hours, active smoking history, or illegal drug use.
  5. Dietary patterns (e.g., strict veganism) and current medication use (multivitamins, herbal remedies, hormonal therapies).
* **Maternal Authorization Text:** *"I hereby voluntarily donate my breastmilk without financial compensation under the supervision of the Makati Human Milk Bank. I consent to blood testing for Hepatitis B and sputum tests for Tuberculosis clearance before donation..."*

---

### Appendix I: Monthly Collection Unit Ledger Template
* **Structural Row Breakdowns:** Tracked by collection stream: In-House, Mom's Act, Milky Way, and Supsup Todo.
* **Volumetric Auditing Fields:**
  * Total raw collection counts (mL).
  * Quality Assurance Test failure volume adjustments (mL).
  * Net asset baseline metrics transferred into pasteurization lines.
  * Operational reserve margins and historical carryover balances (`MHMB Previous`, `OSMAK Previous`).

---
### References
1. Christensson, P. (2013, February 5). Web Development Definition. Retrieved 2016, Mar 5, from Web Development Definition: http://techterms.com/definition/web_development
2. http://www.asp.net/get-started/websites
3. http://smallbusiness.chron.com/sms-technology-58872.html
4. http://www.hkvstore.com/aspreportmaker/
5. http://www.businessdbbuilder.com/mfinventorymngscreen.html
6. MOP. The Philippine Human Milk Banking (Manual of Operation). Department of Health. 2014
7. Rodriguez, Fritzie. Got milk? Makati says yes. Rappler report. http://www.rappler.com/move-ph/issues/hunger/59227-makati-human-milk-bank. 2014. Jakob Nielsen Usability 101: Introduction to Usability [online] Available: https://www.nngroup.com/articles/usability-101-introduction-to-usability
8. e-Delphyn web based Human Milk Bank Management Solution http://www.hemasoft.com/humanMilkBank.html
9. Sterifeed Human Milk Bank Tracking and Management Software http://www.sterifeed.com/product/human-milk-bank-tracking-managementsoftware/
10. SafeBaby DMT. http://safebabybmt.paragondsi.com/safebaby-donor-milk-tracking/