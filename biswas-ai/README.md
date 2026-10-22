# বিশ্বাস AI · Biswas AI for Office

An AI assistant made by **Bikram Biswas**. It answers anything a general AI assistant can (questions, writing, translation, maths, coding), with special expertise in West Bengal Government office administration and public services. Bengali and English.

**Office mode** (for SDO office staff)
- Follows how an SDO office works: the dealing employee writes the notesheet and puts it up directly to the SDO; the employee prepares the draft (DFA) for the SDO's signature; only the SDO approves or rejects
- Notes and drafts are written in paragraphs, not in points
- **Office format sample:** upload one old letter of the office (Word or PDF) under অফিসের তথ্য, and every draft copies its letterhead, memo style and signature block
- Attach GOs and circulars (PDF, Word, Excel, photos) for summaries, action points and draft notes
- Edit any answer, then save it as **Word (.docx)**, **PDF** or **Excel (.xlsx)**

**Language:** the বাংলা / EN switch in the header changes the whole screen and the answer language.

**Schemes page:** the "প্রকল্প / Schemes" button opens every scheme and service with benefit, eligibility, how to apply and a status label (confirmed / reported / unconfirmed), with an "Ask the AI" button on each.

**Public mode** (for citizens)
- Caste certificates (SC/ST/OBC, 2026 rules), other certificates, and every major prakalpa under its current name, with the old name in brackets
- Writes applications and explains Government letters

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
