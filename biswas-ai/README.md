# বিশ্বাস AI · Biswas AI for Office

An AI assistant made by **Bikram Biswas**. It answers anything a general AI assistant can (questions, writing, translation, maths, coding), with special expertise in West Bengal Government office administration and public services. Bengali and English.

The app has two separate sections, switched in the header (অফিস / জনসাধারণ), and a বাংলা / EN switch for the whole screen and the AI's answers.

### অফিস — Office (for SDO office staff)
| Tab | What it does |
|---|---|
| **বিক্রম AI / Bikram AI** (first tab) | A chat that works like a drafting partner: it asks what to create (notesheet, DFA, order, notice, report, Excel, Word, PDF), asks only for the missing details, then writes the document in paragraphs. Each document appears as a printable page in the chat with **Print, Word, PDF, Excel** (tables), Edit, "open in drafting desk" and **Keep as approved**. **Memory:** Bikram AI saves lasting facts it learns (names, designations, office, preferred formats, corrections) and the drafts you approve, and uses them in every later conversation; see, add, delete, export or import them in the **Memory / স্মৃতি** panel. The model does not retrain; it improves through this memory and your approved examples. |
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
