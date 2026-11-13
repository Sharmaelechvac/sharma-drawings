# Sharma Job Drawings — Filing App

Internal filing app for job drawings. Live: https://sharmaelechvac.github.io/sharma-drawings/

## How it works
- `data.json` holds one record per job: job name, address, builder, contacts, date filed.
- Each record lists (a) the ORIGINAL plans as received from the builder/architect and
  (b) OUR Sharma drawing sets, each with revision, date, sheets, status and approval status.
- PDFs live under `files/<job-id>/original/` and `files/<job-id>/sharma/`.
- The page is phone-friendly, with search by job name, address or builder, and
  one-click View (opens the PDF) / Download on every file.

## Adding a job
Send the original plans PDF and the Sharma set PDF in the Mike Holt (Engineering) thread.
Jarvis verifies both files (page count, sheets, dates), files them byte-identical,
adds the record to `data.json`, pushes, and verifies the live page and both PDF links.

## Jobs filed
- Antle Residence Addition — 3119 Colorado Ave, Orlando, FL 32826 — NOK Construction.
  Original: Antle_Updated_Plans_102926.pdf (architect, 10/29/2026, 11 pages).
  Sharma: Antle-3119-Colorado-wire-layout-DRAFT.pdf — 6 sheets (CS, E-0, E-1, E-2, E-3.1, E-3.2),
  R0, 2026-11-13, DRAFT, approved by Sanjay 2026-11-13 (approval as reported by Mike Holt).
