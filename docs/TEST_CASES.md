# Test Cases

- POST /launchpad/run returns phase1–4 payload; phase4 is storyboard `panels[]` (requires APIFY_API_TOKEN).
- POST /launchpad/run with `input_mode: company_url` runs website crawler + parallel intel actors.
- GET /apify/actors returns 9 actors.
- POST /apify/run runs actor with APIFY_API_TOKEN.
- `npm run demo:seed` inserts one stub LaunchPad run in `server/data/state.json` (for UI checks without live keys).
- `npm run demo:clear` clears all LaunchPad runs from state.
