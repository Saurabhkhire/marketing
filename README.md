# LaunchPad — Node.js Backend (No Lovable)

Backend is now **Node.js (Express)**. Frontend is **React + Vite**.

Four-phase loop:
1. **Apify** market intel (live actors — token required)
2. **Minds AI** VC scoring (OpenAI-compatible endpoint)
3. **OpenAI** one-pager narrative (no Claude)
4. **Storyboard** pitch panels (image + caption per panel; Pollinations images, OpenAI optional for copy)

## Run locally

```powershell
cd "d:\Demo Projects\Marketing\marketing"
npm run install:all
Copy-Item .env.example .env
npm run dev
```

- API: `http://127.0.0.1:8000`
- UI: `http://127.0.0.1:5173`

## Commands

```powershell
npm run demo:seed   # inserts one stub LaunchPad run (server must be up)
npm run demo:clear  # clears all LaunchPad runs from server/data/state.json
```

## Key endpoints

- `POST /launchpad/run` — JSON body:
  - `{ "input_mode": "idea", "idea": "…" }` (idea ≥ 3 chars), or
  - `{ "input_mode": "company_url", "company_url": "https://…", "idea": "optional notes" }`
  - Requires **`APIFY_API_TOKEN`** (live Reddit, Product Hunt, TechCrunch runs; plus **Website Content Crawler** when using a company URL).
- `GET /launchpad/:runId`
- `GET /apify/actors`
- `POST /apify/run`

Phase 4 returns a **storyboard**: panels with image (Pollinations from scene prompts) and caption text — not video/Pixero.

## Apify collector troubleshooting

| Symptom | What to do |
|--------|------------|
| Reddit: `maxItems must be >= 100` | Fixed in code (`maxItems: 100`). Restart the API after pulling. |
| Product Hunt: must **rent** actor / trial ended | Product Hunt is **off by default** so runs do not fail on billing. Set `LAUNCHPAD_USE_PRODUCTHUNT=1` and rent the actor on Apify to enable it. |
| TechCrunch: **memory limit** (8192MB) | By default only the **AI** category runs (`LAUNCHPAD_TECHCRUNCH_BOTH=1` for AI + Startups). Lower `APIFY_TECHCRUNCH_MAX_POSTS` (default 12), or set `LAUNCHPAD_SKIP_TECHCRUNCH=1` to skip TechCrunch. Upgrade Apify plan if you need heavier runs. |

## OpenClaw / VibeStart integration

- **VibeStart** (`D:\OpenClaw\vibestart`) does not ship Apify actors; it uses direct HTML scraping. LaunchPad still **merges** optional Apify actor definitions from:
  - `server/vibestart-apify-actors.json` in this repo,
  - `EXTRA_APIFY_ACTORS_JSON` (absolute path),
  - `config/apify-actors.json` next to project root,
  - `D:\OpenClaw\vibestart\backend\config\apify-actors.json` when that file exists.
- Each entry is JSON: `{ "key": "short_id", "name": "Human label", "actorSlug": "username~actor-name", "defaultInput": { ... } }`. Duplicates merge by `key`.

**Company URL mode** also runs a **VibeStart-style direct scout** (axios + cheerio) alongside Apify’s Website Content Crawler — faster first-party copy when Apify returns sparse data.
