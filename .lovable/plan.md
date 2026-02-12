

## Job Application Form

A professional, single-page job application form with validated fields and dynamic tables.

### 1. Personal Information Section
- **Full Name** — required text input
- **Email Address** — required, email-validated
- **Phone Number** — required

### 2. Summary / Short Introduction
- Textarea for a brief self-introduction

### 3. Experience Table (Dynamic)
Each row captures:
- **Position/Role** — text input
- **Description** — brief job/role description
- **Employer** — company name
- **Number of Years** — numeric input

Features:
- "Add Experience" button to append rows
- Each row has a delete/remove button
- Starts with one empty row

### 4. Education Table (Dynamic)
Each row captures:
- **Qualification** — name of the qualification
- **Level** — dropdown select (Bachelor's Degree, Diploma, Master's, PhD/Doctorate, Higher Diploma, Certificate, Other)
- **Field/Industry of Study** — text input
- **School/Institution** — text input
- **Year of Completion** — year input
- **PDF Attachment of Accolade** — file upload (PDF only)

Features:
- "Add Education" button to append rows
- Each row has a delete/remove button
- Starts with one empty row

### 5. CV Upload
- File upload accepting **PDF only**
- Maximum size: **12MB**
- Clear error messages for invalid file type or size

### 6. Apply Button
- Validates all required fields before submission
- Shows success toast on valid submission
- Displays inline error messages for missing/invalid fields

### Design
- Card-based layout grouping each section
- Clean, modern, mobile-responsive design
- Professional color scheme with clear visual hierarchy

> **Note:** No backend is connected — the form validates and shows a success message. Database persistence can be added later with Supabase.

