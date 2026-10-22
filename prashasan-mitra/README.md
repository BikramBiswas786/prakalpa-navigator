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

### Free AI providers (the website uses all the keys you add, one after another)

`api/chat.js` tries each provider in order. When one runs out of free quota (or fails before answering), the next one answers, so the free limits add up. The page shows which one answered. Add as many keys as you can, all free:

| Order | Provider | Where to get a free key | Free limit (2026, approximate) | Card? |
|---|---|---|---|---|
| 1 | Google Gemini | https://aistudio.google.com/apikey → `GEMINI_API_KEY` | Flash ~1,000–1,500 requests/day (Flash and Flash-Lite counted separately) | No |
| 2 | Mistral | https://console.mistral.ai → choose the free **Experiment** plan → `MISTRAL_API_KEY` | Large monthly token allowance shown in the console | No (phone check) |
| 3 | Groq | https://console.groq.com/keys → `GROQ_API_KEY` | 100K–500K tokens/day **per model**; three models are used | No |
| 4 | OpenRouter | https://openrouter.ai/keys → `OPENROUTER_API_KEY` | 50 requests/day on `:free` models (1,000 after a one-time $10 top-up) | No |
| 5 | GitHub Models | GitHub → Settings → Developer settings → fine-grained token with **Models: read** → `GITHUB_MODELS_TOKEN` | Daily request limit per model | No |
| 6 | Cerebras | https://cloud.cerebras.ai → `CEREBRAS_API_KEY` | Trial credit | Yes |
| 7 | Sarvam AI (Indian, best Bengali) | https://dashboard.sarvam.ai → `SARVAM_API_KEY` | ₹100 signup credit | No |

To save tokens, the page sends only the parts of the knowledge base a conversation needs. Model names can be changed without code through `GEMINI_MODELS`, `MISTRAL_MODELS`, `GROQ_MODELS`, `OPENROUTER_MODELS`, `GITHUB_MODELS`, `CEREBRAS_MODELS`, `SARVAM_MODELS` (comma-separated), and the order through `PROVIDER_ORDER`.

Free tiers of Gemini, Mistral and others may use prompts to improve their models, so the website tells users not to enter confidential or personal information.

### Put the public website online (free)

1. Create the keys above (at least Gemini, Mistral and Groq).
2. On https://vercel.com import this GitHub repository and set **Root Directory** to `prashasan-mitra`.
3. In the project's **Settings → Environment Variables** add each key with the names above, then redeploy.

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
