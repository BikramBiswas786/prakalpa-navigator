# প্রশাসন মিত্র · Prashasan Mitra

A free AI helper for West Bengal Government administration, in Bengali and English.

**Office mode** (for SDO office staff)
- Follows how an SDO office works: the dealing employee writes the notesheet and puts it up directly to the SDO; the employee prepares the draft (DFA) for the SDO's signature; only the SDO approves or rejects
- Notes and drafts are written in paragraphs, not in points
- **Office format sample:** upload one old letter of your office (Word or PDF) under অফিসের তথ্য. Every draft then copies its letterhead, memo number style and signature block. Without a sample the letterhead is left as a blank line to fill
- Draft letters and memos (memo no., subject, reference, copy forwarded to), in Bengali or English
- Attach a GO or circular (PDF, Word, Excel, or a photo of a scanned page) and get a plain summary, the steps your office has to take, and a draft note
- Hearing and show-cause notices, RTI replies, report tables, translation
- Edit any answer, then save it as **Word (.docx)**, **PDF** or **Excel (.xlsx)**

**Public mode** (for citizens)
- Which certificate is needed, where to apply, what documents to bring
- Which schemes someone may be eligible for, using the current names of the BJP-led State government's schemes (Annapurna Yojana, Kanyaratna, Sarathi, Ayushman Bharat, pensions at Rs. 1,500 and so on), with the old name in brackets
- Write an application to the SDO or BDO; explain a government letter

## Two ways to run it (same `index.html`)

| | claude.ai Artifact | Public website (Vercel) |
|---|---|---|
| Who can use it | People signed in to claude.ai (free plan works), shared from the page's **Share** menu | Anyone with the link, no login |
| AI | Claude, on each viewer's own account | Google Gemini free tier, through `api/chat.js` |
| Cost | Free | Free (Vercel Hobby + Gemini free quota) |

The page detects where it is running: inside claude.ai it uses Claude; anywhere else it calls `api/chat`.

### Put the public website online (free)

1. Get a free Gemini API key at https://aistudio.google.com/apikey (Google account, no card).
2. On https://vercel.com import this GitHub repository, set **Root Directory** to `prashasan-mitra`.
3. In the project's **Settings → Environment Variables** add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, default `gemini-flash-latest`). Redeploy.

The free Gemini quota is shared by everyone using the site (roughly hundreds to about a thousand questions a day, depending on the model). When it runs out, users see a "try later" message until the next day. Google may use free-tier prompts to improve its products, so the website warns users not to enter confidential or personal information.

Office details (officer, sub-division, district, memo prefix) are set once under **অফিসের তথ্য** and are used in every draft.

## Accuracy and safety

- The standing instructions forbid the AI from inventing GO numbers, dates or limits, and tell it to say where to verify.
- A knowledge base dated October 2026 is built into the instructions (`UPDATES` in `index.html`): the May 2026 change of government; caste certificates, including the 14.05.2026 re-verification order and the 18.05.2026 OBC list; all major prakalpa (Annapurna Bhandar, Ayushman Bharat, Kanyashree, Rupashree, Jai Bangla pensions, Krishak Bandhu, scholarships and more); DA, contractual pay and HRMS. News-sourced items are marked "reported" and schemes whose continuation is unconfirmed are marked "status?". Edit that text when new orders come out.
- Do not attach confidential files or personal data (Aadhaar, bank details).
- This is not an official Government of West Bengal application. Get your Head of Office's approval before using it for official work.

## Files

- `index.html`: the whole app. The claude.ai Artifact is published from a copy with the `<html>/<head>/<body>` wrapper lines removed.
- `api/chat.js`: the Vercel function for the public website (input limits, same-origin check, streaming from Gemini).
- `vercel.json`, `package.json`: Vercel settings.
- Libraries load on demand from jsDelivr, pinned to exact versions: pdf.js and mammoth to read PDF and Word files, SheetJS for Excel, JSZip to build Word files, and html2pdf for PDF.
