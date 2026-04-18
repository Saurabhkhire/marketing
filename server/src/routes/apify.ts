import { Router } from "express";

export const apifyRouter = Router();

/** Catalog of popular Apify Store actors / websites for demos when token is absent */
export const APIFY_STORE_CATALOG: {
  actorId: string;
  title: string;
  website: string;
  category: string;
}[] = [
  {
    actorId: "apify/web-scraper",
    title: "Web Scraper",
    website: "https://apify.com/apify/web-scraper",
    category: "Scraping",
  },
  {
    actorId: "apify/google-search-scraper",
    title: "Google Search Results Scraper",
    website: "https://apify.com/apify/google-search-scraper",
    category: "SEO",
  },
  {
    actorId: "clockworks/tiktok-scraper",
    title: "TikTok Scraper",
    website: "https://apify.com/clockworks/tiktok-scraper",
    category: "Social",
  },
  {
    actorId: "apify/instagram-scraper",
    title: "Instagram Scraper",
    website: "https://apify.com/apify/instagram-scraper",
    category: "Social",
  },
  {
    actorId: "apify/facebook-pages-scraper",
    title: "Facebook Pages Scraper",
    website: "https://apify.com/apify/facebook-pages-scraper",
    category: "Social",
  },
  {
    actorId: "apify/linkedin-profile-scraper",
    title: "LinkedIn Profile Scraper",
    website: "https://apify.com/apify/linkedin-profile-scraper",
    category: "B2B",
  },
  {
    actorId: "apify/cheerio-scraper",
    title: "Cheerio Scraper",
    website: "https://apify.com/apify/cheerio-scraper",
    category: "Scraping",
  },
  {
    actorId: "apify/puppeteer-scraper",
    title: "Puppeteer Scraper",
    website: "https://apify.com/apify/puppeteer-scraper",
    category: "Scraping",
  },
  {
    actorId: "dtrungtin/airbnb-scraper",
    title: "Airbnb Scraper",
    website: "https://apify.com/dtrungtin/airbnb-scraper",
    category: "Travel",
  },
  {
    actorId: "compass/crawler-google-places",
    title: "Google Maps Scraper",
    website: "https://apify.com/compass/crawler-google-places",
    category: "Local",
  },
];

/**
 * GET /actors — merge live Apify API (if APIFY_TOKEN) with static catalog for sponsor demos.
 */
apifyRouter.get("/actors", async (_req, res, next) => {
  try {
    const token = process.env.APIFY_TOKEN;
    const catalog = [...APIFY_STORE_CATALOG];

    if (!token) {
      res.json({
        source: "catalog",
        message:
          "Set APIFY_TOKEN for live actor list from your Apify account (console.apify.com).",
        actors: catalog,
      });
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const urls = [
      "https://api.apify.com/v2/acts?limit=250",
      "https://api.apify.com/v2/store?limit=50",
    ];

    const results = await Promise.allSettled(
      urls.map((u) =>
        fetch(u, { headers }).then((r) => {
          if (!r.ok) throw new Error(`${u} ${r.status}`);
          return r.json();
        }),
      ),
    );

    type ActorRow = {
      id?: string;
      username?: string;
      name?: string;
      title?: string;
      description?: string;
    };

    const merged = new Map<string, ActorRow & { website: string }>();

    for (const a of catalog) {
      merged.set(a.actorId, {
        id: a.actorId,
        name: a.title,
        title: a.title,
        website: a.website,
      });
    }

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const data = r.value as {
        data?: { items?: ActorRow[] };
        items?: ActorRow[];
      };
      const items = data.data?.items ?? data.items ?? [];
      for (const item of items) {
        const id =
          item.id ??
          (item.username && item.name
            ? `${item.username}/${item.name}`
            : undefined);
        if (!id) continue;
        const website = `https://apify.com/${id}`;
        merged.set(id, {
          ...item,
          id,
          website,
        });
      }
    }

    res.json({
      source: "apify+catalog",
      actors: [...merged.values()],
    });
  } catch (e) {
    next(e);
  }
});
