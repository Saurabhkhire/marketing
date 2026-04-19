const { mergeExtraActorDefinitions } = require('./extraActorLoader');

const BASE_APIFY_ACTORS = [
  {
    key: 'reddit_posts_search',
    name: 'easyapi/reddit-posts-search-scraper',
    actorSlug: 'easyapi~reddit-posts-search-scraper',
    actorId: '9tC5hyQSyOISZh1AK',
    endpoint: 'https://api.apify.com/v2/acts/easyapi~reddit-posts-search-scraper/runs',
    defaultInput: { query: 'ai', sort: 'relevance', time: 'all', safeSearch: '0', maxItems: 100, proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } }
  },
  {
    key: 'reddit_scraper',
    name: 'trudax/reddit-scraper',
    actorSlug: 'trudax~reddit-scraper',
    actorId: 'FgJtjDwJCLhRH9saM',
    endpoint: 'https://api.apify.com/v2/acts/trudax~reddit-scraper/runs',
    defaultInput: { startUrls: [{ url: 'https://www.reddit.com/r/pasta/comments/vwi6jx/pasta_peperoni_and_ricotta_cheese_how_to_make/' }], skipComments: false, skipUserPosts: false, skipCommunity: false, ignoreStartUrls: false, searchPosts: true, searchComments: false, searchCommunities: false, searchUsers: false, sort: 'new', includeNSFW: true, maxItems: 10, maxPostCount: 10, maxComments: 10, maxCommunitiesCount: 2, maxUserCount: 2, scrollTimeout: 40, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }, debugMode: false }
  },
  {
    key: 'producthunt_runtime',
    name: 'runtime/producthunt-scraper',
    actorSlug: 'runtime~producthunt-scraper',
    actorId: '13oWgD2UCqH7mXrGI',
    endpoint: 'https://api.apify.com/v2/acts/runtime~producthunt-scraper/runs',
    defaultInput: { startUrls: 'https://www.producthunt.com/\nhttps://www.producthunt.com/leaderboard/daily/2025/1/15/all', startDate: '2026-01-01', endDate: '2026-01-21', getDetails: false, maxResults: 10, timeoutSecs: 900, maxRequestRetries: 5, maxConcurrency: 3, maxRequestsPerCrawl: 200, useApifyProxy: true, proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: [] }, maxCommentPages: 0 }
  },
  {
    key: 'producthunt_danpoletaev',
    name: 'danpoletaev/product-hunt-scraper',
    actorSlug: 'danpoletaev~product-hunt-scraper',
    actorId: 'ralZdliP7uuVVznKq',
    endpoint: 'https://api.apify.com/v2/acts/danpoletaev~product-hunt-scraper/runs',
    defaultInput: { scrapeMakers: true, scrapeWebsite: true, archiveDate: '2024-07-25', archiveYear: 2025, archiveWeek: 18, filter: { minVotes: 100, topNProducts: 10 }, saveWebsiteContent: true }
  },
  {
    key: 'crunchbase_company',
    name: 'davidsharadbhatt/crunchbase-company-scraper',
    actorSlug: 'davidsharadbhatt~crunchbase-company-scraper',
    actorId: 'YQI9efxp3oPWaCFfu',
    endpoint: 'https://api.apify.com/v2/acts/davidsharadbhatt~crunchbase-company-scraper/runs',
    defaultInput: { maxCompanies: 4000000, headquartersLocation: '', industry: [], operatingStatus: 'Active', companyType: 'For Profit', numberOfEmployees: [], funding_type: [] }
  },
  {
    key: 'crunchbase_pro',
    name: 'vulnv/crunchbase-scraper-pro',
    actorSlug: 'vulnv~crunchbase-scraper-pro',
    actorId: '396WTOnKwBlrti2p0',
    endpoint: 'https://api.apify.com/v2/acts/vulnv~crunchbase-scraper-pro/runs',
    defaultInput: { company_urls: [{ url: 'https://www.crunchbase.com/organization/apple' }] }
  },
  {
    key: 'yc_companies',
    name: 'michael.g/y-combinator-scraper',
    actorSlug: 'michael.g~y-combinator-scraper',
    actorId: 'wHFYMA8uTMrmdhjfK',
    endpoint: 'https://api.apify.com/v2/acts/michael.g~y-combinator-scraper/runs',
    defaultInput: { url: 'https://www.ycombinator.com/companies?batch=Winter%202026', scrape_founders: true, scrape_open_jobs: false, scrape_all_companies: false }
  },
  {
    key: 'techcrunch',
    name: 'dadhalfdev/techcrunch-scraper',
    actorSlug: 'dadhalfdev~techcrunch-scraper',
    actorId: 'fY4hBzChdNzVgs5eo',
    endpoint: 'https://api.apify.com/v2/acts/dadhalfdev~techcrunch-scraper/runs',
    defaultInput: { category: 'AI', max_posts: 100 }
  },
  {
    key: 'news_article',
    name: 'inquisitive_sarangi/news-article-scraper',
    actorSlug: 'inquisitive_sarangi~news-article-scraper',
    actorId: 'aA6WKIWoXnjUx2whf',
    endpoint: 'https://api.apify.com/v2/acts/inquisitive_sarangi~news-article-scraper/runs',
    defaultInput: { source: 'www.wired.com', startDate: '2024-09-10', endDate: '2024-09-12', proxy: { useApifyProxy: false }, maxConcurrency: 5, maxRequestsPerMinute: 200, maxRecords: 1 }
  },
  {
    key: 'website_content_crawler',
    name: 'apify/website-content-crawler',
    actorSlug: 'apify~website-content-crawler',
    actorId: null,
    endpoint: 'https://api.apify.com/v2/acts/apify~website-content-crawler/runs',
    defaultInput: {
      startUrls: [{ url: 'https://example.com' }],
      maxCrawlDepth: 1,
      maxCrawlPages: 8,
      maxConcurrency: 2
    }
  }
];

const APIFY_ACTORS = mergeExtraActorDefinitions(BASE_APIFY_ACTORS);

function findActor(ref) {
  const key = String(ref || '').toLowerCase().trim();
  return APIFY_ACTORS.find((a) => a.key === key || a.actorSlug === key || a.actorId === key) || null;
}

module.exports = { APIFY_ACTORS, BASE_APIFY_ACTORS, findActor };
