# Job Tracker (Chrome Extension)

Job Tracker is a simple Chrome extension that helps you keep your job applications organized in one place. It lets you save a posting quickly, track your progress, add notes, and search through everything later without digging through bookmarks or messy documents.

## What it does
- Saves job details like title, company, date, link, and the full description
- Lets you track progress (Applied, Interview, Offer, Rejected, Ghosted)
- Search by title or company
- Filter and sort your saved applications
- Add notes for things you want to remember (recruiter name, referral, follow-up plan, etc.)
- Export your saved jobs to a CSV file

## How to use it
1. Open a job posting (LinkedIn, Indeed, or any company careers page).
2. Use the extension to save the job.
3. Open the Job Tracker Options page to view all saved jobs.
4. Click a job to see the full description, update status/date, and add notes.
5. Export to CSV anytime if you want a backup or want to work in Excel/Google Sheets.

## Installation (Load Unpacked)
1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on Developer mode.
4. Click "Load unpacked".
5. Select the folder that contains `manifest.json`.

## Exporting to CSV
On the Options page, click "Export CSV" to download a spreadsheet-friendly file containing your saved applications.

## Project structure
```text
job-tracker-extension/
├─ manifest.json
├─ popup.html
├─ popup.css
├─ popup.js
├─ options.html
├─ options.css
├─ options.js
└─ icons/
Notes
Job descriptions vary a lot from site to site. If a description looks off, try highlighting only the main description on the page before saving.

Roadmap
Ability to edit title/company manually after saving

Tags (Remote, Hybrid, Referral, etc.)

Follow-up reminder
