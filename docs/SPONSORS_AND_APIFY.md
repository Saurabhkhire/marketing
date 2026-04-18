# Sponsors and Apify usage

## Sponsor model vs. Apify

- **`fundsApifyLab`** on `Sponsor` indicates that the sponsor helps cover Apify compute and actor experimentation (scraping, enrichment pipelines).
- **`monthlyBudgetUsd`** is a coarse commercial field for demo reporting; it does not trigger Apify billing automatically.

## Curated Apify Store actors (demo catalog)

These entries mirror `APIFY_STORE_CATALOG` in `server/src/routes/apify.ts`. Each **website** links to the Store listing.

| Actor ID | Title | Website | Category |
| --- | --- | --- | --- |
| `apify/web-scraper` | Web Scraper | https://apify.com/apify/web-scraper | Scraping |
| `apify/google-search-scraper` | Google Search Results Scraper | https://apify.com/apify/google-search-scraper | SEO |
| `clockworks/tiktok-scraper` | TikTok Scraper | https://apify.com/clockworks/tiktok-scraper | Social |
| `apify/instagram-scraper` | Instagram Scraper | https://apify.com/apify/instagram-scraper | Social |
| `apify/facebook-pages-scraper` | Facebook Pages Scraper | https://apify.com/apify/facebook-pages-scraper | Social |
| `apify/linkedin-profile-scraper` | LinkedIn Profile Scraper | https://apify.com/apify/linkedin-profile-scraper | B2B |
| `apify/cheerio-scraper` | Cheerio Scraper | https://apify.com/apify/cheerio-scraper | Scraping |
| `apify/puppeteer-scraper` | Puppeteer Scraper | https://apify.com/apify/puppeteer-scraper | Scraping |
| `dtrungtin/airbnb-scraper` | Airbnb Scraper | https://apify.com/dtrungtin/airbnb-scraper | Travel |
| `compass/crawler-google-places` | Google Maps Scraper | https://apify.com/compass/crawler-google-places | Local |

Apify may rename Store slugs over time; treat this table as **orientation**, not a guarantee.

## Live API integration

Set `APIFY_TOKEN` in `server/.env` (Personal API token from Apify).

The backend calls:

| Endpoint | Purpose |
| --- | --- |
| `GET https://api.apify.com/v2/acts?limit=250` | Actors visible to your account |
| `GET https://api.apify.com/v2/store?limit=50` | Store discovery feed |

Responses are merged with the static catalog and deduplicated by actor ID.

Reference: [Apify API documentation](https://docs.apify.com/api/v2).

## Demo sponsors tied to Apify lab

Seed data marks **Northwind Ventures** and **Summit Analytics** with `fundsApifyLab: true` — see `server/prisma/seed.ts`.
