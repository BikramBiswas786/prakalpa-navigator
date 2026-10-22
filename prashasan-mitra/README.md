# প্রশাসন মিত্র · Prashasan Mitra

A free AI helper for West Bengal Government administration, in Bengali and English.

**Office mode** (for SDO / BDO office staff)
- Write notesheets (PUC, flags, proposal, "Submitted for kind perusal and orders")
- Draft letters and memos (memo no., subject, reference, copy forwarded to), in Bengali or English
- Attach a GO or circular (PDF, Word, Excel, or a photo of a scanned page) and get a plain summary, the steps your office has to take, and a draft note
- Hearing and show-cause notices, RTI replies, report tables, translation
- Edit any answer, then save it as **Word (.docx)**, **PDF** or **Excel (.xlsx)**

**Public mode** (for citizens)
- Which certificate is needed, where to apply, what documents to bring
- Which schemes someone may be eligible for
- Write an application to the SDO or BDO; explain a government letter

## How it runs

The page runs as a claude.ai Artifact. The AI answers use the viewer's own Claude account, including the free plan, so the app itself costs nothing to run. Each person who uses it needs to sign in to claude.ai, and the owner shares the link from the page's **Share** menu.

Office details (officer, sub-division, district, memo prefix) are set once under **অফিসের তথ্য** and are used in every draft.

## Accuracy and safety

- The standing instructions forbid the AI from inventing GO numbers, dates or limits, and tell it to say where to verify.
- A dated "recent updates" list (October 2026) is built into the instructions: the 2026 OBC list changes, DA, contractual pay, HRMS leave. Items taken from news reports are marked "reported". Update the `UPDATES` text in `index.html` when new orders come out.
- Do not attach confidential files or personal data (Aadhaar, bank details).
- This is not an official Government of West Bengal application. Get your Head of Office's approval before using it for official work.

## Files

- `index.html` is the whole app: the page fragment the Artifact tool publishes (no `<html>` wrapper).
- Libraries load on demand from jsDelivr, pinned to exact versions: pdf.js and mammoth to read PDF and Word files, SheetJS for Excel, JSZip to build Word files, and html2pdf for PDF.
