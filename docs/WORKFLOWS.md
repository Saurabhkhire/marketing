# Workflows

1. User enters a startup idea or a company URL (optional notes).
2. API runs Apify market intel in parallel (adds website crawl in URL mode).
3. API runs Minds scoring.
4. API runs OpenAI narrative (no Claude), or template if no key.
5. API returns storyboard panels (image + caption per panel).
