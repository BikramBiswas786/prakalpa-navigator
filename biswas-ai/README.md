# বিশ্বাস AI · Biswas AI

An office assistant for West Bengal Government work. It answers questions, writes drafts, and handles tables and files, in Bengali and English. It is an independent tool, not a Government app.

The app has two separate sections, switched in the header (অফিস / জনসাধারণ), and a বাংলা / EN switch for the whole screen and the AI's answers.

### অফিস — Office (for SDO office staff)
| Tab | What it does |
|---|---|
| **বিশ্বাস AI / Biswas AI** (first tab) | A chat that works like a drafting partner: it asks what to create (notesheet, DFA, order, notice, report, Excel, Word, PDF), asks only for the missing details, then writes the document in paragraphs. Each document appears as a printable page in the chat with **Print, Word, PDF, Excel** (tables), Edit, "open in drafting desk" and **Keep as approved**. **Memory:** Biswas AI saves lasting facts it learns (names, designations, office, preferred formats, corrections) and the drafts you approve, and uses them in every later conversation; see, add, delete, export or import them in the **Memory / স্মৃতি** panel. The model does not retrain; it improves through this memory and your approved examples. |
| **লেখার টেবিল / Drafting desk** | Choose the document (notesheet put up to the SDO, DFA for the SDO's signature, office order, hearing or show-cause notice, RTI reply, enquiry report, caste certificate re-verification report, general letter), fill To / Subject / PUC / facts, attach a GO or letter, and the AI writes it on a paper-style page in paragraphs. Edit it yourself or give an "AI revise" instruction; undo; print view; save as **Word** or **PDF**. Uses the office's own letterhead when a sample letter is set in Settings. |
| **টেবিল / Excel** | Editable grid; "make a table from this text" with AI; open an Excel / CSV file; save as **Excel** or **PDF**; copy to paste into Excel. |
| **ফাইল টুল / File tools** | Word → PDF, Excel → PDF, photos → PDF, merge PDFs, take text out of a PDF or Word file (copy it or send it to the drafting desk). Runs inside the browser; files are not uploaded. |

Office rules built into the AI: the dealing employee writes the note and the draft, puts them up directly to the SDO, and only the SDO approves or rejects; notes and drafts are in paragraphs, not points.

### জনসাধারণ — Public
| Tab | What it does |
|---|---|
| **প্রকল্প ও পরিষেবা / Schemes and services** | 32 schemes and services of the BJP-led State government and the Centre, in 8 categories with search. Each has its own page: what you get, eligibility, documents, step-by-step application, **buttons to the official application portals**, helpline, and a confirmed / reported / unconfirmed label. A page can be linked directly as `…/#s-annapurna`. |
| **AI সহায়ক / AI helper** | Questions in Bengali or English; "ask about this scheme" and "write my application" buttons on every scheme page. |

The AI reads the same catalogue (`SERVICES` in `index.html`), so the pages and the AI answers always agree.

## Run it anywhere (independent, no platform lock-in)

The app is one folder with no packages to install: `index.html` (the app), `server.js` (a small Node.js server) and `api/chat.js` (the AI connector). Keys go in `.env` or in the host's environment settings, and are never sent to the browser. The server only serves the app page, so `.env` cannot be downloaded.

### A. Free website on Render (recommended)
1. Merge this folder and `render.yaml` into the repository's main branch.
2. Open `https://render.com/deploy?repo=https://github.com/BikramBiswas786/prakalpa-navigator`, sign in with GitHub and allow access to the repository.
3. Render reads `render.yaml`, asks for the API keys (leave empty the ones you don't have) and creates the free web service at `https://biswas-ai-for-office.onrender.com` (or a similar name).

Render's free plan sleeps after 15 minutes without visitors; the next visitor waits about a minute while it wakes. 750 free hours a month are enough for one always-used service.

### B. Office computer (works on the office network)
1. Install Node.js 20 or newer from https://nodejs.org.
2. Copy the `biswas-ai` folder, copy `.env.example` to `.env` and fill in the keys.
3. Windows: double-click `start-windows.bat`. Linux/Mac: `./start.sh`.
4. Open `http://localhost:3000`. Colleagues on the same network open `http://<this computer's IP>:3000`.

### C. Any Docker host or VPS (Koyeb, Railway, Fly.io, Oracle Cloud free VM, Hugging Face Docker Space)
```
docker build -t biswas-ai biswas-ai
docker run -p 7860:7860 --env-file biswas-ai/.env biswas-ai
```

### D. claude.ai Artifact
The same `index.html` (without the `<html>/<head>/<body>` wrapper lines) runs as a claude.ai Artifact, where it uses Claude on each viewer's own claude.ai account and needs no keys.

## AI providers

`api/chat.js` tries each provider whose key is set, in `PROVIDER_ORDER`. When one is out of quota or fails before answering, the next answers. The page shows which one answered.

These limits do not add up to millions of tokens a day. One account of every free provider is still a few thousand chats. A paid key is the only way to buy more, and it is spent by every visitor because the site has no login.

| Order | Provider | What you get | Get a key |
|---|---|---|---|
| 1 | Google Gemini | Free tier on Flash. Limits are in AI Studio. | https://aistudio.google.com/apikey |
| 2 | NVIDIA | Prototyping only. Not for a public site. | https://build.nvidia.com/settings/api-keys |
| 3 | Groq | About 1,000 requests and 200,000 tokens/day per model | https://console.groq.com/keys |
| 4 | Mistral | Free plan, limits shown after login | https://console.mistral.ai |
| 5 | OpenRouter | `:free` models, about 50 requests/day | https://openrouter.ai/keys |
| 6 | Cloudflare Workers AI | 10,000 Neurons/day | https://dash.cloudflare.com |
| 7 | SambaNova | Llama and others, about 20 requests and 200,000 tokens/day per model | https://cloud.sambanova.ai |
| 8 | Z.ai | GLM-4.7-Flash priced at $0, tight concurrency | https://z.ai |
| 9 | Cerebras | About $5 after a card, expires in 30 days | https://cloud.cerebras.ai |
| 10 | Sarvam | Signup credit, strong Bengali | https://dashboard.sarvam.ai |
| 11 | Kimi K3 | Paid | https://platform.kimi.ai |

GitHub Models was removed from the default order. The service shut down on 30 July 2026.

### Paid, or a grant that then bills

Not used until you add the name to `PROVIDER_ORDER`. Example: `PROVIDER_ORDER=gemini,groq,deepseek`.

| Name in `PROVIDER_ORDER` | Env var | Get a key | Note |
|---|---|---|---|
| `cohere` | `COHERE_API_KEY` | https://dashboard.cohere.com/api-keys | Trial, about 1,000 calls/month. Not for production. |
| `deepseek` | `DEEPSEEK_API_KEY` | https://platform.deepseek.com/api_keys | No free tier. Cheapest way to buy a large number of tokens. Model `deepseek-flash`. |
| `qwen` | `DASHSCOPE_API_KEY` | https://www.alibabacloud.com/help/en/model-studio/new-free-quota | Singapore only. About 1,000,000 tokens per model, once, for 90 days. Turn on Free Quota Only or it bills after that. |
| `openai` | `OPENAI_API_KEY` | https://platform.openai.com/api-keys | Prepaid. |
| `xai` | `XAI_API_KEY` | https://console.x.ai | Prepaid. Default model `grok-4.7`. |
| `together` | `TOGETHER_API_KEY` | https://api.together.ai/settings/api-keys | Prepaid. |
| `fireworks` | `FIREWORKS_API_KEY` | https://fireworks.ai/account/api-keys | About $1 starter credit, then paid. |
| `kimi` | `KIMI_API_KEY` | https://platform.kimi.ai | Already last in the default order, so a key here is spent when the free ones fail. |

Anthropic has no OpenAI-compatible chat route in this app: https://console.anthropic.com

Llama with no host and no per-token fee is a model you run yourself: https://ollama.com (`http://localhost:11434/v1`). That still needs a computer with a GPU. It is not an API key.

Model lists can be changed without editing code: `GEMINI_MODELS`, `NVIDIA_MODELS`, `GROQ_MODELS`, `MISTRAL_MODELS`, `OPENROUTER_MODELS`, `CLOUDFLARE_MODELS`, `SAMBANOVA_MODELS`, `ZAI_MODELS`, `COHERE_MODELS`, `CEREBRAS_MODELS`, `SARVAM_MODELS`, `KIMI_MODELS`, `DEEPSEEK_MODELS`, `QWEN_MODELS`, `OPENAI_MODELS`, `XAI_MODELS`, `TOGETHER_MODELS`, `FIREWORKS_MODELS`, and `PROVIDER_ORDER`. To save tokens, the page sends only the parts of the knowledge base a conversation needs.

## Checking the AI keys

Open the app → **Menu** (on phones) → **AI status / AI অবস্থা পরীক্ষা**. It asks every configured model a one-word question and shows which keys work and why the others fail. A provider that sends nothing for 25 seconds (`FIRST_TEXT_MS`) is skipped automatically, and the screen shows a seconds counter while waiting.

## Owner settings

- **Side-panel message** (for example your privacy message): set `OWNER_NOTICE` near the top of the script in `index.html`.
- **Schemes and services:** edit the `SERVICES` list in `index.html` (both `bn` and `en` text, `links` for application portals, `st` for the status label). The AI picks up the changes automatically.
- **Knowledge base** (October 2026): the `UPDATES` text in `index.html` covers the May 2026 change of government, caste certificates (14.05.2026 re-verification order, 18.05.2026 OBC list), all major prakalpa under the BJP-led government, DA, contractual pay and HRMS. Items from news reports are marked "reported" and schemes whose status is unconfirmed are marked "status?". Edit it when new orders come out.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app |
| `server.js` | Standalone server (Node.js 20+, no packages) |
| `api/chat.js` | AI provider chain |
| `.env.example` | Key names and where to get each key |
| `Dockerfile` | Container image |
| `start-windows.bat`, `start.sh` | Start on an office computer |
| `../render.yaml` | Render one-click Blueprint |

## AI Pendrive (v101, folders and capacity v102, storage pool v103)

v103 storage pool: file bytes are spread over several free S3-compatible buckets. The primary is the `S3_*` set (B2; it also
keeps all metadata). Extra backends: `S3_<n>_NAME`, `S3_<n>_ENDPOINT`, `S3_<n>_REGION`, `S3_<n>_BUCKET`, `S3_<n>_ACCESS_KEY_ID`,
`S3_<n>_SECRET_ACCESS_KEY` for n = 2..6 (gaps allowed; a backend with a missing var is skipped), optional `S3_<n>_ADDRESSING=virtual`
and `S3_<n>_CAP_BYTES`. Default caps by name (GiB): b2 9, coritan 9, tigris 4.5, filebase 4.5, internetport 9, vatora 4.5, others 4.
Each new file goes to the healthy backend with the most free room that fits it whole (recorded per file); a backend that fails
with a network/auth error is skipped for 10 min. `PENDRIVE_TOTAL_CAP_BYTES` defaults to the sum of the caps. CORS is applied on
every backend at boot, every endpoint origin is in the CSP, usage is reconciled by listing every 6 h, and `/healthz/pendrive`
lists each backend's name, cors, used, cap and health. Test-only placement: `POST /api/pd/upload/init?backend=<name>` with header
`x-admin-token: $ADMIN_TOKEN`. Test: `tests/pendrive-pool.mjs`.


A shared folder opened with a name + PIN, stored in any S3-compatible bucket (Backblaze B2 by default,
Cloudflare R2 also works). The browser uploads straight to the bucket with SigV4-presigned multipart URLs
(10 MB parts, 4 at a time), so big files never pass through the server.

**Env vars:** `S3_ENDPOINT` (e.g. `https://s3.us-west-004.backblazeb2.com`), `S3_REGION` (e.g. `us-west-004`),
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, plus `PENDRIVE_SECRET`. Optional: `S3_ADDRESSING=virtual`
(default is path-style, `https://endpoint/bucket/key`), `PENDRIVE_QUOTA_BYTES` (default 5 GB per pendrive; max file 5 GB, 10 MB parts so at most 512 parts),
`PENDRIVE_TOTAL_CAP_BYTES` (default 9 GB across all pendrives, below the B2 free 10 GB; uploads past it get a clear "total storage full" message).

v102 import: "Add folder from desktop" (keeps subfolders) and "Add files" buttons, or drag folders/files onto the drop zone.
Before uploading it shows "N files, X in Y folders"; empty files, `.DS_Store`, `Thumbs.db`, `desktop.ini` and system folders are skipped,
and files already in the pendrive with the same path and size are skipped. Uploads run as a queue (3 files, 4 parts each) with an
overall bar (files, bytes, speed, time left) plus per-file bars. Large files resume after a reload: the browser keeps the upload id
and finished parts in IndexedDB, the server keeps the multipart upload for 24 h; pick the same file or folder again and it continues
(browsers can't reopen a file without the user picking it). Metadata is cached in memory to keep B2 class B calls low.
Tests: `tests/pendrive-e2e.mjs` (server with `PENDRIVE_CACHE=0`), `tests/pendrive-v102.mjs` (server with `PENDRIVE_TOTAL_CAP_BYTES=52428800`).
R2 alias (used only if the S3_* set is incomplete): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

**Backblaze B2 setup:**
1. B2 → Buckets → Create a Bucket, **Private**. Note the *Endpoint* shown on the bucket (`s3.<region>.backblazeb2.com`).
2. Application Keys → Add a New Application Key, access to that bucket only, Read and Write. Copy the keyID
   (`S3_ACCESS_KEY_ID`) and applicationKey (`S3_SECRET_ACCESS_KEY`). It's shown once.
3. Leave the bucket's CORS Rules in the web UI as "Do not share". **The server applies the CORS rule itself at
   startup** (GetBucketCors → PutBucketCors only if different, in the background, `CORS_ORIGIN` overrides the
   origin) and reports it at `/healthz/pendrive`, e.g. `{"storage":"b2","cors":"applied"}`
   (`already` / `applied` / `native_rules` / `failed` / `n/a`). To do it by hand instead, run the
   script (Node built-ins only, prints no secrets):
   ```
   cd biswas-ai
   S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com S3_REGION=us-west-004 S3_BUCKET=<bucket> \
   S3_ACCESS_KEY_ID=<keyID> S3_SECRET_ACCESS_KEY=<applicationKey> node scripts/set-b2-cors.js
   ```
   It applies S3 `PutBucketCors` (origin `https://biswas-ai-for-office.onrender.com`, GET/PUT/HEAD, headers `*`,
   expose `ETag`, max age 3600) and reads it back. `--show` only reads; `--native` uses B2's `b2_update_bucket`
   instead (`s3_get`/`s3_put`/`s3_head`); `CORS_ORIGIN=a,b` changes the origins.

For local testing: `PENDRIVE_STORAGE=local PENDRIVE_MOCK_AI=1 node server.js`.

### v105 — pendrive folder navigation and AI scope
- Breadcrumb (🏠 › 📁 Folder › 📁 Sub, each clickable), ⬆ Up and ← Back buttons, browser Back/Forward (one history entry per folder), Backspace = up, Alt+← = back, and the folder survives a reload (`#pd=` in the URL).
- "Select for AI" on every file/folder row. A chip bar above the AI box shows what the AI will use (a folder counts all files under it), with ✕ per chip and Clear. With nothing selected it says the AI reads the whole pendrive. The answer lists the files the AI used; the server only reads `scope.ids`.
- Tests: `tests/pendrive-v105.mjs` (API scope, mock AI) and `tests/pendrive-ui-v105.mjs` (headless Chrome, needs puppeteer-core).

### v106 — downloads, bigger AI chat, output panel
- ⬇ on every file and folder row, plus right-click menu. Files download from a presigned GET with `Content-Disposition: attachment` (ASCII fallback + RFC 5987 UTF-8 name). Folders and "⬇ Download selected" make one ZIP in the browser: store-only ZIP/ZIP64 writer (no libraries), files streamed from presigned URLs (`download-urls`), written via `showSaveFilePicker`, else the `/pd-dl-sw.js` service-worker stream, else a Blob (warns above 2 GB). Progress bar and Cancel.
- Larger resizable question box; a right-side Output panel (stacks on mobile) with Copy, Word (.docx via the same ZIP writer), PDF (print stylesheet with Noto Serif Bengali), Excel/CSV (UTF-8 BOM, only when there is a table), .txt, .md, Share, Save to pendrive, and recent outputs.
- Tests: `tests/pendrive-zip64.mjs` (plain + forced ZIP64 with Python zipfile/unzip) and `tests/pendrive-ui-v106.mjs` (headless Chrome, full flow).

## v107 — upload backend fallback
If the browser cannot reach a storage host at all (firewall or blocked port: a network error, or no progress for 25 s, before any part finishes), the upload aborts its reservation, remembers that host for the session (`sessionStorage pd:avoid`), and re-runs `upload/init` with `avoid: [hosts]`. The server then places the file on another backend that has room. Up to 3 moves per file. Test: `tests/pendrive-ui-v107.mjs` (blocks one backend with CDP).

## v108 — tables on request
- When a question asks for a table, list, comparison or summary table (English, or Bengali টেবিল/সারণি/তালিকা/তুলনা/ছক), or the new **Output format** selector (Auto / Table / Report / Letter) is set to Table, the prompt makes a GitHub markdown table mandatory. The map step keeps one line per item, and the reduce step must keep every row. If the model still answers in prose, the server asks it once more to reshape its own answer into a table.
- The output panel normalises any table it gets: markdown tables, pipe rows without a separator or outer pipes, tab-separated rows, and HTML `<table>`. Word, PDF and CSV exports all use the normalised table.
- Tests: `tests/pendrive-v108.mjs` (API, mock), `tests/pendrive-ui-v108.mjs` (parser, 8 cases).

## v110 — faster uploads
- Files under 16 MB go up in one presigned PUT. Bigger files use multipart with adaptive 16–64 MB parts, sized from the measured speed.
- The browser plans files in batches (`upload/batch-init`, up to 100 files) and commits them in batches (`upload/batch-complete`). Index, metadata and search-index writes happen once per batch instead of once per file. Up to 8 files and 6 parts per file are in flight at once.
- Text extraction runs after the upload: txt-like files and docx are handled in a Web Worker (`pd-text-worker.js`), and the text is saved in batches (`text-batch`).
- At session start the browser quickly checks that each storage host can be reached and skips hosts that can't. The server does a cheap liveness check before giving out a single-PUT URL. When backends have similar free space (within 20%), the one with the lowest measured latency is chosen.
- The progress bar shows speed (MB/s), the ETA, and how many files still need text read.
- Tests: `tests/pendrive-v110.mjs`, and `tests/pendrive-upload-profile.mjs` (100 small docs plus a 200 MB file, `BASE=... TAG=... UPDIR=... BIG=...`, zz-test pendrives only).

## v113: share links and upload-request links

- **Share a file, a folder or a multi-select** from AI Pendrive (🔗 Share link). The link is `/s/<128-bit id>`. Options: expiry (1 day, 7 days, 30 days, never), maximum downloads, an optional password (scrypt-hashed, 5 wrong tries lock the link for 15 minutes) and "Allow AI questions" (off by default). **🔗 My links** lists every link with its state, download count, bytes, a "Downloaded / Uploaded" activity list, Copy and Revoke.
- **Receiver page** (no login, `noindex`, `no-referrer`, its own CSP): the folder tree as shared, previews for PDF (iframe of a 5-minute presigned URL), images, video/audio, text/code, DOCX (small built-in parser: headings, lists, tables), XLSX (SheetJS, pinned + SRI), single-file download and "Download all (ZIP)" with the same v106 ZIP/ZIP64 writer (served as `/pd-zip.js`, cut from index.html at start-up). When AI is allowed, questions are answered only from the shared files, with no write actions and with link-relative paths.
- **📥 Request files**: an upload-only link into one folder (default `Received`) with a file-count limit, a per-file size limit, optional password and expiry. Files of 16 MB or more go multipart and resume after a reload (state kept in the browser's localStorage). Name clashes become `name (2).ext`; path separators are flattened.
- **Guards**: per-IP rate limits (open 20/min, downloads 60/min, AI 6/min), short-lived presigned URLs, receiver tokens (HMAC, 2 h) bound to the link and its password, a per-pendrive daily share-download cap (`SHARE_PD_DAILY_BYTES`, default 2 GB), a daily AI-question budget per link (`SHARE_AI_DAILY`, default 30) and per-backend daily egress budgets. When a budget is used up the page says "Link busy, try later" (HTTP 503 `busy`).
- **Egress budgets** (checked 26 Oct 2026; override with `SHARE_EGRESS_<BACKEND>` in bytes):

| Backend | Free egress | Daily budget used here |
|---|---|---|
| Backblaze B2 | free up to 3× the average stored data per month | 1 GB |
| Filebase (free) | 5 GB per month, then requests are refused | 160 MB |
| Tigris | egress free (free tier: 5 GB storage, 100k reads/month) | 5 GB |
| Coritan | egress free (10M reads/month) | 5 GB |

- **Delete reliability**: one failing storage call no longer fails a whole delete with "server". Each object delete is retried; if a backend still refuses, the key is parked and removed by the next delete.
- Tests: `tests/share-v113.mjs` (API lifecycle for share and upload-request links, budgets with `SHARE_EGRESS_LOCAL=300`), `tests/share-ui-v113.mjs` (headless owner + receiver), `tests/pendrive-del-v113.mjs` (delete with a backend down).

## v112 — fast bulk delete
- Deleting many files at once removes the stored objects 8 at a time and rewrites the search index once, instead of four storage calls in a row per file. On the live pool, deleting 5 or more files at once used to fail with a server error.
