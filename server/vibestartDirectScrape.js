/**
 * Same spirit as OpenClaw/VibeStart backend/src/scraper.js — axios + cheerio public HTML → text.
 * Used when company URL mode runs: complements Apify Website Content Crawler with fast first-party text.
 */
const axios = require('axios');
const cheerio = require('cheerio');

const UA =
  'Mozilla/5.0 (compatible; LaunchPadDirectScout/1.0; marketing-research; +https://localhost)';

function normalizeUrl(input) {
  let u = String(input || '').trim();
  if (!u) throw new Error('Empty URL');
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

/**
 * @returns {{ url: string, title: string | null, excerpt: string, bodyPreview: string, ok: true } | { ok: false, error: string }}
 */
async function vibestartDirectScrape(urlInput) {
  try {
    const normalized = normalizeUrl(urlInput);
    const res = await axios.get(normalized, {
      timeout: 28000,
      maxRedirects: 5,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      validateStatus: (s) => s >= 200 && s < 400
    });

    const html = String(res.data || '');
    const $ = cheerio.load(html);
    $('script, style, noscript, svg').remove();
    const title = $('title').first().text().trim() || null;
    const metaDesc =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;

    const textBits = [];
    $('h1, h2, h3, p, li').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length > 2) textBits.push(t);
    });
    let bodyText = textBits.join('\n').slice(0, 120_000);
    if (!bodyText.trim()) {
      bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 120_000);
    }

    const excerpt = (metaDesc || bodyText.slice(0, 500)).slice(0, 800);
    const bodyPreview = bodyText.slice(0, 6000);

    return {
      ok: true,
      url: normalized,
      title,
      excerpt,
      bodyPreview,
      items: [
        {
          title,
          description: excerpt,
          text: bodyPreview,
          url: normalized,
          source: 'vibestart_site_scout'
        }
      ]
    };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

module.exports = { vibestartDirectScrape };
