# বিশ্বাস AI · Biswas AI for Office

An AI assistant made by **Bikram Biswas**. It answers anything a general AI assistant can (questions, writing, translation, maths, coding), with special expertise in West Bengal Government office administration and public services. Bengali and English.

The app has two separate sections, switched in the header (অফিস / জনসাধারণ), and a বাংলা / EN switch for the whole screen and the AI's answers.

### অফিস — Office (for SDO office staff)
| Tab | What it does |
|---|---|
| **লেখার টেবিল / Drafting desk** | Choose the document (notesheet put up to the SDO, DFA for the SDO's signature, office order, hearing or show-cause notice, RTI reply, enquiry report, caste certificate re-verification report, general letter), fill To / Subject / PUC / facts, attach a GO or letter, and the AI writes it on a paper-style page in paragraphs. Edit it yourself or give an "AI revise" instruction; undo; print view; save as **Word** or **PDF**. Uses the office's own letterhead when a sample letter is set in Settings. |
| **টেবিল / Excel** | Editable grid; "make a table from this text" with AI; open an Excel / CSV file; save as **Excel** or **PDF**; copy to paste into Excel. |
| **ফাইল টুল / File tools** | Word → PDF, Excel → PDF, photos → PDF, merge PDFs, take text out of a PDF or Word file (copy it or send it to the drafting desk). Runs inside the browser; files are not uploaded. |
| **AI চ্যাট / AI chat** | Ask anything; attach PDFs, Word, Excel or photos; send any answer to the drafting desk or save it as Word / PDF / Excel. |

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

## AI providers (free tokens add up)

`api/chat.js` tries each provider whose key is set, in order. When one is out of free quota or fails before answering, the next answers. The page shows which one answered.

| Order | Provider | Models | Free? | Get a key |
|---|---|---|---|---|
| 1 | Google Gemini | Gemini Flash, Flash-Lite | Free | https://aistudio.google.com/apikey |
| 2 | NVIDIA developer API | **Llama 4 Maverick, Kimi K2, Llama 3.3 70B** | Free for developers | https://build.nvidia.com/settings/api-keys |
| 3 | Groq | **Llama 3.3 70B**, gpt-oss | Free, daily quota per model | https://console.groq.com/keys |
| 4 | Mistral | Mistral Medium / Small | Free "Experiment" plan | https://console.mistral.ai |
| 5 | OpenRouter | **Kimi K2**, Llama 3.3 70B, gpt-oss (`:free`) | Free, 50 requests/day | https://openrouter.ai/keys |
| 6 | Cloudflare Workers AI | **Llama 3.3 70B, Llama 4 Scout** | Free daily allowance | Cloudflare dashboard → AI → Workers AI (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`) |
| 7 | GitHub Models | GPT-4.1 mini, GPT-4o mini | Free | GitHub fine-grained token with "Models: read" |
| 8 | Cerebras | gpt-oss-120b | Trial credit | https://cloud.cerebras.ai |
| 9 | Sarvam AI | Sarvam 105B (strong Bengali) | ₹100 signup credit | https://dashboard.sarvam.ai |
| 10 | Kimi (Moonshot) | **Kimi K3** | Paid, $1 minimum top-up | https://platform.kimi.ai |

Model lists and order can be changed without editing code: `GEMINI_MODELS`, `NVIDIA_MODELS`, `GROQ_MODELS`, `MISTRAL_MODELS`, `OPENROUTER_MODELS`, `CLOUDFLARE_MODELS`, `GITHUB_MODELS`, `CEREBRAS_MODELS`, `SARVAM_MODELS`, `KIMI_MODELS` (comma-separated) and `PROVIDER_ORDER`. To save tokens, the page sends only the parts of the knowledge base a conversation needs.

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
