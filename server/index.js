const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { APIFY_ACTORS, findActor } = require('./apifyCatalog');
const { vibestartDirectScrape } = require('./vibestartDirectScrape');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT || 8000);
const stateFile = path.join(__dirname, 'data', 'state.json');

function nowIso() { return new Date().toISOString(); }
function rid(prefix='run'){ return `${prefix}_${Math.random().toString(36).slice(2,10)}${Date.now().toString(36)}`; }

function readState() {
  if (!fs.existsSync(stateFile)) return { launchpadRuns: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return { launchpadRuns: raw.launchpadRuns || {} };
  } catch {
    return { launchpadRuns: {} };
  }
}
function writeState(state) { fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8'); }
let state = readState();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadDatasetItems(token, datasetId, maxItems) {
  if (!datasetId) return [];
  const limit = Math.max(1, Math.min(maxItems, 500));
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=false&limit=${limit}`;
  const ds = await fetch(url);
  if (!ds.ok) return [];
  const raw = await ds.json();
  return Array.isArray(raw) ? raw : [];
}

async function fetchActorRun(token, runId) {
  const r = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`);
  if (!r.ok) return null;
  return ((await r.json()) || {}).data || null;
}

async function runApifyActor(actorRef, inputOverride = null, waitForFinish = 120, maxItems = 40) {
  const token = String(process.env.APIFY_API_TOKEN || '').trim();
  if (!token) throw new Error('APIFY_API_TOKEN is missing');
  const actor = findActor(actorRef);
  if (!actor) throw new Error('Unknown actor');
  const payload = inputOverride || actor.defaultInput;

  const wait = Math.max(1, Math.min(waitForFinish, 300));
  const runUrl = `https://api.apify.com/v2/acts/${actor.actorSlug}/runs?token=${encodeURIComponent(token)}&waitForFinish=${wait}`;
  const runRes = await fetch(runUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!runRes.ok) throw new Error(await runRes.text());
  let runData = ((await runRes.json()) || {}).data || {};
  let datasetId = runData.defaultDatasetId;
  let items = await loadDatasetItems(token, datasetId, maxItems);

  if (!items.length && runData.id) {
    await sleep(2500);
    const refreshed = await fetchActorRun(token, runData.id);
    if (refreshed?.defaultDatasetId) {
      datasetId = refreshed.defaultDatasetId;
      items = await loadDatasetItems(token, datasetId, maxItems);
    }
  }

  if (!items.length && datasetId) {
    await sleep(2000);
    items = await loadDatasetItems(token, datasetId, maxItems);
  }

  return { actor, run: runData, dataset_items_count: items.length, items };
}

function keywordize(idea) {
  return String(idea || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((x) => x.length > 2).slice(0, 8).join(' ') || 'startup';
}

function broadenKeyword(kw) {
  const s = String(kw || '').trim();
  if (!s) return 'startup saas b2b';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return `${s} startup product`;
  return s;
}

function extractFromItem(item) {
  if (!item || typeof item !== 'object') {
    const s = String(item ?? '');
    return { text: s.slice(0, 400), url: null, image: null };
  }
  const text =
    item.selftext ||
    item.text ||
    item.description ||
    item.content ||
    item.textContent ||
    item.crawledText ||
    item.markdown ||
    item.title ||
    item.name ||
    item.headline ||
    item.tagline ||
    item.description ||
    item.summary ||
    item.body ||
    item.excerpt ||
    '';
  const url =
    item.url ||
    item.link ||
    item.articleUrl ||
    item.canonicalUrl ||
    item.website ||
    item.postUrl ||
    item.permalink ||
    null;
  let image = item.image || item.thumbnailUrl || item.thumbnail || item.ogImage || item.featureImage || null;
  if (!image && Array.isArray(item.images) && item.images.length) image = item.images[0];
  if (!image && item.media?.[0]?.url) image = item.media[0].url;
  return {
    text: String(text).slice(0, 500),
    url: url ? String(url) : null,
    image: image ? String(image) : null
  };
}

function dedupeQuotes(quotes, max = 22) {
  const seen = new Set();
  const out = [];
  for (const q of quotes) {
    const k = `${q.url || ''}|${(q.text || '').slice(0, 100)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(q);
    if (out.length >= max) break;
  }
  return out;
}

async function runRedditWithFallbacks(searchKw) {
  const attempts = [
    { query: broadenKeyword(searchKw), time: 'month', groups: ['RESIDENTIAL'] },
    { query: searchKw.split(/\s+/).slice(0, 4).join(' ') || 'saas startup', time: 'year', groups: ['RESIDENTIAL'] },
    { query: 'b2b saas startup product market', time: 'month', groups: [] }
  ];
  let last = null;
  for (const a of attempts) {
    const res = await runApifyActor(
      'reddit_posts_search',
      {
        query: a.query,
        sort: 'relevance',
        time: a.time,
        safeSearch: '1',
        maxItems: 100,
        proxyConfiguration: a.groups.length
          ? { useApifyProxy: true, apifyProxyGroups: a.groups }
          : { useApifyProxy: true }
      },
      300,
      120
    ).catch((e) => ({ actor: { key: 'reddit_posts_search' }, error: String(e), items: [], query_tried: a.query }));
    last = res;
    if ((res.items || []).length > 0) return res;
  }
  return last || { actor: { key: 'reddit_posts_search' }, items: [], error: 'empty after fallbacks' };
}

function proseStripMarkdown(raw) {
  let t = String(raw || '').trim();
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/^\s*[-*]\s+/gm, '• ');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

const ACTOR_LABELS = {
  reddit_posts_search: 'Reddit — demand language',
  producthunt_runtime: 'Product Hunt — launches',
  techcrunch: 'TechCrunch — headlines',
  website_content_crawler: 'Apify site crawl — deep pages',
  vibestart_site_scout: 'VibeStart direct scout — first-party HTML (OpenClaw stack)'
};

function buildCollectorReport(apify_runs) {
  return apify_runs.map((r) => {
    const key = r.actor?.key || 'unknown';
    const variant = r.actor?.variant;
    const n = (r.items || []).length;
    let label = ACTOR_LABELS[key] || key;
    if (variant) label = `${label} · ${variant}`;
    let status = 'ok';
    let message = n ? `Pulled ${n} raw rows into the dataset.` : 'No rows yet — query dates or targets may need a wider net.';
    if (r.error) {
      status = 'error';
      message = String(r.error).slice(0, 180);
    } else if (n === 0) status = 'empty';

    return { actor_key: key, label, items_found: n, status, message };
  });
}

function buildPipelineComplexity({
  apify_run_count,
  deduped_quote_count,
  timings_sec,
  modes,
  isUrlMode,
  actor_catalog_size,
  skip_producthunt,
  skip_all_techcrunch,
  run_both_techcrunch
}) {
  const wall = Object.values(timings_sec || {}).reduce((a, b) => a + b, 0);
  const flagLine = (() => {
    const tc = skip_all_techcrunch
      ? 'TechCrunch off'
      : run_both_techcrunch
        ? 'TechCrunch AI + Startups'
        : 'TechCrunch AI only (memory-safe default)';
    const ph = skip_producthunt ? 'Product Hunt off (opt-in)' : 'Product Hunt on';
    return `${ph} · ${tc}`;
  })();
  return {
    headline: 'Evidence-first orchestration — not a single ChatGPT prompt',
    stats: [
      { label: 'Chained phases', value: 'Intel → VC lens → market pitch → storyboard' },
      { label: 'Collector legs (this run)', value: String(apify_run_count) },
      { label: 'Deduped market signals', value: String(deduped_quote_count) },
      { label: 'Merged Apify actor catalog', value: `${actor_catalog_size} actors` },
      { label: 'Server wall time', value: `${wall.toFixed(1)}s` },
      { label: 'URL enrichment', value: isUrlMode ? 'Apify crawl + VibeStart HTML scout' : 'Idea keywords only' },
      { label: 'Collector flags', value: flagLine }
    ],
    mechanisms: [
      'Multi-source intel: Reddit with query fallbacks, Product Hunt (optional), TechCrunch categories sequenced with backoff for Apify memory limits.',
      'Quote fingerprint dedupe (URL + text prefix) before any LLM sees the bundle.',
      'Company URL mode stacks redundant extractors: fast cheerio pass + Apify Website Content Crawler.',
      'Extra Store actors merge from JSON paths — extend without fork.',
      `Downstream modes this run: narrative=${modes.narrative}, minds=${modes.minds}, storyboard=${modes.storyboard}.`
    ]
  };
}

function buildMarketingAgentsBundle({
  kw,
  narrativeIdea,
  phase1,
  phase2,
  phase3,
  collector_report,
  modes,
  timings_sec
}) {
  const intel = collector_report || [];
  const thin = intel.every((x) => x.items_found === 0);
  return [
    {
      id: 'intel_mesh',
      role: 'Market intelligence mesh',
      title: 'Signal scouts & collectors',
      layers: [
        {
          name: 'Source orchestration',
          detail:
            'Runs Apify actors in parallel (Reddit, Product Hunt, TechCrunch). In company URL mode, also runs the OpenClaw VibeStart-style direct HTML scout plus Apify website crawler — complementary angles on the same URL.'
        },
        {
          name: 'Catalog merge & normalization',
          detail:
            'Extra Apify actors can load from EXTRA_APIFY_ACTORS_JSON or config under your VibeStart checkout. Rows are distilled into quotable buyer language with links — not blobs.'
        },
        {
          name: 'Complexity budget',
          detail:
            'TechCrunch legs run sequentially (not parallel) with optional single-category mode to stay inside platform memory quotas — engineering trade-off for reliability.'
        }
      ],
      outputs: intel.map((c) => `${c.label}: ${c.items_found} rows (${c.status})`),
      footnote: thin
        ? 'Collectors returned thin data — widen your idea keywords or try company URL mode with a crawl.'
        : `Keyword spine used for search: “${kw}”.`
    },
    {
      id: 'vc_lens',
      role: 'Capital allocation lens',
      title: 'Funding-fit analyst',
      layers: [
        {
          name: 'Thesis matching',
          detail:
            modes.minds === 'live'
              ? 'Minds AI scores how venture-scale the wedge looks vs. timing, differentiation, and team signals.'
              : 'Template VC ranking until MINDS_AI_* is configured — wire your OpenAI-compatible endpoint.'
        }
      ],
      outputs: [`Viability score ${phase2.vc_viability_score}`, 'Top 10 funds with thesis fit'],
      footnote: 'Uses your market summary + curated signals as grounding.'
    },
    {
      id: 'narrative_studio',
      role: 'Narrative studio',
      title: 'Positioning & story lead',
      layers: [
        {
          name: 'Pitch craft',
          detail:
            modes.narrative === 'live'
              ? 'OpenAI drafts a board-ready market pitch: tension hook, wedge solution, ICP, proof tied to scraped themes, differentiation, motion, and ask — plain paragraphs only.'
              : 'Runs a structured template when OPENAI_API_KEY is missing.'
        },
        {
          name: 'Continuity check',
          detail: 'Claims must trace to evidence summary themes; no invented revenue, logos, or user counts.'
        },
        {
          name: 'Anti-slop guardrails',
          detail: 'Prompts strip markdown artifacts and discourage generic AI filler; tone is crisp buyer/investor English.'
        }
      ],
      outputs: [modes.narrative === 'live' ? 'VC-ready one-pager (prose)' : 'Template narrative'],
      footnote: narrativeIdea.slice(0, 140) + (narrativeIdea.length > 140 ? '…' : '')
    },
    {
      id: 'creative_board',
      role: 'Creative board',
      title: 'Storyboard director',
      layers: [
        {
          name: 'Panel sequencing',
          detail:
            'Builds six investor panels: hook, solution, urgency, wedge, moat, ask — each caption is persuasive prose.'
        },
        {
          name: 'Visual prompts',
          detail:
            'Hands Pollinations a scene brief per panel so imagery matches the beat (images are illustrative, not claims).'
        }
      ],
      outputs: [`${(phase3.one_pager || '').length ? 'Locked to narrative continuity' : 'Drafting'}`, '6 panels with art direction'],
      footnote: `Storyboard timing ${(timings_sec.phase4_storyboard || 0).toFixed(1)}s`
    }
  ];
}

function hashToSeed(str) {
  let h = 5381;
  const s = String(str || 'x');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return `lp${Math.abs(h).toString(36)}`;
}

function pollinationsImageUrl(visualPrompt) {
  const p = String(visualPrompt || 'minimal abstract startup illustration').slice(0, 220);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=960&height=540&nologo=true`;
}

function picsumStoryboardUrl(title, visualPrompt) {
  return `https://picsum.photos/seed/${hashToSeed(`${title}|${visualPrompt}`)}/960/540`;
}

function qualitativeVcLandscape() {
  return [
    { name: 'US seed — B2B workflow & SaaS infrastructure', thesis_fit: 'Modernizing ops stacks; PLG with sales-assist expansion', fit_score: 76, recent_activity: 'Illustrative category — configure MINDS_AI_* for named funds' },
    { name: 'EU growth — vertical & regulated software', thesis_fit: 'Long sales cycles; compliance-heavy buyers', fit_score: 72, recent_activity: 'Illustrative category' },
    { name: 'Developer tools & API infrastructure', thesis_fit: 'Seat expansion via integrations and ecosystem', fit_score: 74, recent_activity: 'Illustrative category' },
    { name: 'Applied AI for desk work (measured ROI)', thesis_fit: 'Pilot budgets; disciplined onboarding metrics', fit_score: 73, recent_activity: 'Illustrative category' },
    { name: 'Operator angels & micro-funds', thesis_fit: 'Founders who scaled similar GTM motions', fit_score: 69, recent_activity: 'Illustrative category' },
    { name: 'Corporate venture & innovation labs', thesis_fit: 'Strategic pilots with reference paths', fit_score: 67, recent_activity: 'Illustrative category' },
    { name: 'Impact / reporting crossover (if wedge fits)', thesis_fit: 'Measurement & audit workflows', fit_score: 64, recent_activity: 'Verify relevance for your vertical' },
    { name: 'Efficient GTM–focused funds', thesis_fit: 'CAC discipline; repeatable onboarding', fit_score: 71, recent_activity: 'Illustrative category' },
    { name: 'Regional ecosystem champions', thesis_fit: 'Localized compliance and partner channels', fit_score: 62, recent_activity: 'Illustrative category' },
    { name: 'Growth crossover (later stage)', thesis_fit: 'After core ICP repeatability is proven', fit_score: 61, recent_activity: 'Stage-dependent' }
  ];
}

function buildSyntheticIntelQuotes(searchKw, narrativeIdea, isUrlMode) {
  const spine = String(searchKw || 'this market').slice(0, 100);
  const ctx = String(narrativeIdea || '').slice(0, 200);
  return [
    {
      source: 'qualitative_context',
      text: `Illustrative signal: teams searching “${spine}” typically benchmark incumbents on setup time, integrations, and how fast value shows up in a pilot — confirm with your own discovery calls.`,
      url: null,
      image: null
    },
    {
      source: 'qualitative_context',
      text: 'Illustrative signal: buyers often anchor on SLA backlog, ticket volume, and cost per resolved case — useful lenses when you shape the wedge metric.',
      url: null,
      image: null
    },
    {
      source: 'qualitative_context',
      text: `Illustrative signal: urgency rises when revenue and support leadership share one operational view of customer pain — align your narrative to that joint buyer.${ctx ? ` Context hint: ${ctx}` : ''}`,
      url: null,
      image: null
    },
    {
      source: 'qualitative_context',
      text: isUrlMode
        ? 'Illustrative signal: positioning on the site should match the workflow moment you own — reconcile crawl text with how you describe the job-to-be-done in meetings.'
        : 'Illustrative signal: category noise is high — narrow ICP and one flagship outcome beat broad “platform” language early on.',
      url: null,
      image: null
    },
    {
      source: 'qualitative_context',
      text: 'Live Reddit / Product Hunt / TechCrunch pulls were empty or blocked — these rows keep the narrative UI populated until Apify collectors succeed.',
      url: null,
      image: null
    },
    {
      source: 'qualitative_context',
      text: 'Replace this block by fixing collector errors (rent actors, memory limits) or widening keywords; the pipeline will then ground copy in real excerpts.',
      url: null,
      image: null
    }
  ];
}

function applyIntelFallbackIfEmpty(phase1, searchKw, narrativeIdea, isUrlMode) {
  if ((phase1.quotes || []).length > 0) return phase1;
  return {
    ...phase1,
    intel_fallback: true,
    demand_score: Math.min(phase1.demand_score || 55, 62),
    summary:
      `Intel fallback (no live rows): Apify collectors returned nothing quotable for “${searchKw}”. Below is qualitative context only — not scraped proof.\n\n${phase1.summary}`,
    quotes: buildSyntheticIntelQuotes(searchKw, narrativeIdea, isUrlMode)
  };
}

function defaultStoryboardPanels(seedText) {
  const s = String(seedText || 'this venture').slice(0, 160);
  return [
    { title: 'Hook & problem', caption: `Buyers feel acute pain around workflows tied to ${s}. Public discussions and news reinforce urgency.`, visual_prompt: 'minimal vector office workers overwhelmed by notifications' },
    { title: 'Your solution', caption: 'A crisp wedge product that delivers measurable outcomes in the first pilot.', visual_prompt: 'clean product UI dashboard soft teal accent' },
    { title: 'Why now', caption: 'Market tailwinds: tooling budgets shifting, buyer expectations rising, distribution channels mature.', visual_prompt: 'abstract upward trend lines sunrise palette' },
    { title: 'Market wedge', caption: 'Initial ICP is narrow enough to win references; expansion follows shared workflow primitives.', visual_prompt: 'minimal map expanding from one city' },
    { title: 'Moat & differentiation', caption: 'Data loops, integrations, and workflow depth compound; switching costs rise with usage.', visual_prompt: 'abstract interconnected nodes glowing network' },
    { title: 'The ask', caption: 'Raise to accelerate GTM and ship the roadmap that converts pilots to multi-year contracts.', visual_prompt: 'minimal handshake silhouette modern flat' }
  ];
}

async function buildStoryboardPanels(narrativeIdea, phase1, phase2, phase3) {
  let panels = [];
  if (process.env.OPENAI_API_KEY) {
    try {
      const raw = await openAiChat({
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: openAiBase(),
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.38,
        messages: [{
          role: 'user',
          content: `Return JSON only (no markdown). Shape: {"panels":[{"title":"","caption":"","visual_prompt":""}]}
Exactly 6 panels for an investor storyboard: (1) Hook & problem (2) Solution (3) Why now (4) Market wedge (5) Moat (6) The ask.
Rules:
- title: short headline, Title Case, no hashtags.
- caption: 3–5 sentences each — sharp buyer/investor voice (YC-style clarity). NO markdown, hashtags, or bullet glyphs — flowing prose only.
- visual_prompt: short English illustration brief, no readable text in the scene.

Context:
${narrativeIdea}

Market intel: ${phase1.summary}
Signal excerpts: ${(phase1.quotes || []).slice(0, 6).map((q) => q.text).join(' | ')}
VC viability score: ${phase2.vc_viability_score}
Narrative draft:\n${String(phase3.one_pager || '').slice(0, 3800)}`
        }]
      });
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const obj = JSON.parse(cleaned);
      if (Array.isArray(obj.panels) && obj.panels.length >= 4) panels = obj.panels;
    } catch { /* template fallback */ }
  }
  if (panels.length < 6) panels = defaultStoryboardPanels(narrativeIdea);
  const normalized = panels.slice(0, 8).map((p, i) => {
    const title = proseStripMarkdown(p.title || `Panel ${i + 1}`);
    const vp = p.visual_prompt || p.title || narrativeIdea;
    const poll = pollinationsImageUrl(vp);
    return {
      order: i + 1,
      title,
      caption: proseStripMarkdown(p.caption || ''),
      image_url: poll,
      image_fallback: picsumStoryboardUrl(title, vp)
    };
  });
  return { panels: normalized, image_engine: 'pollinations+picsum' };
}

function openAiBase() {
  return (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

async function openAiChat({ apiKey, baseUrl, model, messages, temperature = 0.2 }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function runLaunchpad({ idea, company_url, input_mode }) {
  const run_id = rid('launchpad');
  const isUrlMode = input_mode === 'company_url';
  let companyUrlNormalized = '';
  if (isUrlMode) {
    try {
      const u = new URL(company_url);
      if (!/^https?:$/i.test(u.protocol)) throw new Error('bad protocol');
      companyUrlNormalized = u.href;
    } catch {
      const err = new Error('company_url must be a valid http(s) URL');
      err.statusCode = 400;
      throw err;
    }
  } else if (String(idea || '').trim().length < 3) {
    const err = new Error('idea must be at least 3 characters');
    err.statusCode = 400;
    throw err;
  }

  if (!process.env.APIFY_API_TOKEN?.trim()) {
    const err = new Error(
      'APIFY_API_TOKEN is required. Market intel uses live Apify actors only (no stub demo data).'
    );
    err.statusCode = 400;
    throw err;
  }

  const kw = isUrlMode
    ? keywordize(new URL(companyUrlNormalized).hostname.replace(/^www\./, '').replace(/\./g, ' '))
    : keywordize(idea);
  const searchKw = broadenKeyword(kw);
  const narrativeIdea = isUrlMode
    ? `Analyze and build an investor narrative for the company at ${companyUrlNormalized}. Extra notes from user: ${String(idea || '').trim() || '(none)'}`
    : String(idea || '').trim();

  const modes = {
    apify: 'live',
    minds: process.env.MINDS_AI_API_KEY && process.env.MINDS_AI_BASE_URL ? 'live' : 'stub',
    narrative: process.env.OPENAI_API_KEY ? 'live' : 'stub',
    storyboard: process.env.OPENAI_API_KEY ? 'generated' : 'template'
  };

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  const ymd = (d) => d.toISOString().slice(0, 10);
  const producthuntInput = {
    startUrls: 'https://www.producthunt.com/\nhttps://www.producthunt.com/leaderboard',
    startDate: ymd(start),
    endDate: ymd(end),
    getDetails: false,
    maxResults: 45,
    timeoutSecs: 900,
    maxRequestRetries: 5,
    maxConcurrency: 3,
    maxRequestsPerCrawl: 700,
    useApifyProxy: true,
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: [] },
    maxCommentPages: 0
  };

  const p1Start = Date.now();
  const useProductHunt = /^1|true|yes$/i.test(String(process.env.LAUNCHPAD_USE_PRODUCTHUNT || '').trim());
  const skipPh = !useProductHunt;
  const skipAllTechcrunch = /^1|true|yes$/i.test(String(process.env.LAUNCHPAD_SKIP_TECHCRUNCH || '').trim());
  const runBothTechcrunch = /^1|true|yes$/i.test(String(process.env.LAUNCHPAD_TECHCRUNCH_BOTH || '').trim());

  async function runCoreCollectors() {
    let phRun = {
      actor: { key: 'producthunt_runtime' },
      items: [],
      error: skipPh
        ? 'skipped by default — set LAUNCHPAD_USE_PRODUCTHUNT=1 and rent the actor on Apify to enable'
        : null
    };
    if (!skipPh) {
      phRun = await runApifyActor('producthunt_runtime', producthuntInput, 300, 50).catch((e) => ({
        actor: { key: 'producthunt_runtime' },
        error: String(e),
        items: []
      }));
    }

    const tcPosts = Math.min(45, Math.max(8, Number(process.env.APIFY_TECHCRUNCH_MAX_POSTS || 12)));

    let tcAi = {
      actor: { key: 'techcrunch', variant: 'AI' },
      items: [],
      error: skipAllTechcrunch ? 'skipped (LAUNCHPAD_SKIP_TECHCRUNCH=1)' : null
    };
    if (!skipAllTechcrunch) {
      tcAi = await runApifyActor(
        'techcrunch',
        { category: 'AI', max_posts: tcPosts },
        300,
        Math.min(tcPosts + 15, 80)
      ).catch((e) => ({
        actor: { key: 'techcrunch' },
        error: String(e),
        items: []
      }));
      if (tcAi.actor) tcAi.actor = { ...tcAi.actor, variant: 'AI' };
    }

    const memHit = (err) =>
      String(err || '').includes('memory') ||
      String(err || '').includes('8192') ||
      String(err || '').includes('Memory');

    let tcSu = {
      actor: { key: 'techcrunch', variant: 'Startups' },
      items: [],
      error: null
    };
    if (skipAllTechcrunch) {
      tcSu = {
        actor: { key: 'techcrunch', variant: 'Startups' },
        items: [],
        error: 'skipped (LAUNCHPAD_SKIP_TECHCRUNCH=1)'
      };
    } else if (!runBothTechcrunch || memHit(tcAi.error)) {
      tcSu = {
        actor: { key: 'techcrunch', variant: 'Startups' },
        items: [],
        error: memHit(tcAi.error)
          ? 'skipped (first TechCrunch run hit platform memory limit — only one category attempted)'
          : 'skipped by default — set LAUNCHPAD_TECHCRUNCH_BOTH=1 for Startups category (uses more Apify memory)'
      };
    } else {
      await sleep(2000);
      tcSu = await runApifyActor(
        'techcrunch',
        { category: 'Startups', max_posts: tcPosts },
        300,
        Math.min(tcPosts + 15, 80)
      ).catch((e) => ({
        actor: { key: 'techcrunch' },
        error: String(e),
        items: []
      }));
      if (tcSu.actor) tcSu.actor = { ...tcSu.actor, variant: 'Startups' };
    }

    return [phRun, tcAi, tcSu];
  }

  const [redditRun, coreTasks, vibestartScout] = await Promise.all([
    runRedditWithFallbacks(searchKw),
    runCoreCollectors(),
    isUrlMode ? vibestartDirectScrape(companyUrlNormalized) : Promise.resolve({ ok: false, error: 'idea_mode' })
  ]);
  const websiteTask = isUrlMode
    ? await runApifyActor(
        'website_content_crawler',
        {
          startUrls: [{ url: companyUrlNormalized }],
          maxCrawlDepth: 1,
          maxCrawlPages: 18,
          maxConcurrency: 2
        },
        300,
        35
      ).catch((e) => ({ actor: { key: 'website_content_crawler' }, error: String(e), items: [] }))
    : null;

  const vibestartRun = {
    actor: { key: 'vibestart_site_scout' },
    items: vibestartScout?.ok ? vibestartScout.items || [] : [],
    error: vibestartScout?.ok ? null : String(vibestartScout?.error || '')
  };

  const apify_runs = [
    redditRun,
    ...coreTasks,
    ...(isUrlMode ? [vibestartRun] : []),
    ...(websiteTask ? [websiteTask] : [])
  ];
  const quotes = [];
  for (const r of apify_runs) {
    const src = r.actor?.variant ? `${r.actor.key || 'source'} (${r.actor.variant})` : r.actor?.key || r.actor?.name || 'source';
    for (const item of r.items || []) {
      const ex = extractFromItem(item);
      if (!ex.text && !ex.url && !ex.image) continue;
      quotes.push({
        source: String(src),
        text: ex.text || '(media or link)',
        url: ex.url,
        image: ex.image
      });
    }
  }

  const quotesDeduped = dedupeQuotes(quotes, 24);
  const totalItems = apify_runs.reduce((sum, x) => sum + (x.items || []).length, 0);
  const collector_report = buildCollectorReport(apify_runs);
  let phase1 = {
    demand_score: Math.min(100, Math.round(18 + Math.min(totalItems, 120) * 0.65 + quotesDeduped.length * 1.5)),
    summary: `Orchestrated ${apify_runs.length} collector leg(s) (Apify${isUrlMode ? ' + VibeStart HTML scout' : ''}), ${totalItems} raw rows → ${quotesDeduped.length} deduped signals (search spine: “${searchKw}”).`,
    quotes: quotesDeduped,
    collector_report,
    input_mode: isUrlMode ? 'company_url' : 'idea',
    company_url: isUrlMode ? companyUrlNormalized : null,
    keyword_query: searchKw,
    x_twitter_note: 'Optional: add an X/Twitter actor in apifyCatalog for extra social proof.'
  };
  phase1 = applyIntelFallbackIfEmpty(phase1, searchKw, narrativeIdea, isUrlMode);
  const p1Dur = (Date.now() - p1Start) / 1000;

  const p2Start = Date.now();
  let phase2;
  if (modes.minds === 'live') {
    try {
      const raw = await openAiChat({
        apiKey: process.env.MINDS_AI_API_KEY,
        baseUrl: String(process.env.MINDS_AI_BASE_URL || '').replace(/\/$/, ''),
        model: process.env.MINDS_AI_MODEL || 'gpt-4o-mini',
        temperature: 0.15,
        messages: [{ role: 'user', content: `Return JSON only with keys vc_viability_score (0-100), breakdown (market,timing,differentiation,team_signal), top_vcs (10 items: name, thesis_fit, fit_score, recent_activity). Startup context: ${narrativeIdea}. Market: ${phase1.summary}` }]
      });
      let obj;
      try { obj = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch { obj = {}; }
      const qual = qualitativeVcLandscape();
      const top = Array.isArray(obj.top_vcs) ? obj.top_vcs.slice(0, 10) : [];
      for (let j = top.length; j < 10; j++) top.push(qual[j] || qual[9]);
      phase2 = {
        vc_viability_score: Number(obj.vc_viability_score || 70),
        breakdown: obj.breakdown || { market: 20, timing: 18, differentiation: 17, team_signal: 15 },
        top_vcs: top.slice(0, 10)
      };
    } catch (e) {
      phase2 = {
        vc_viability_score: 70,
        breakdown: { market: 20, timing: 18, differentiation: 17, team_signal: 15 },
        top_vcs: qualitativeVcLandscape(),
        vc_stub_note: 'Illustrative thesis categories — MINDS AI call failed; configure MINDS_AI_* for live rankings.'
      };
    }
  } else {
    phase2 = {
      vc_viability_score: 72,
      breakdown: { market: 22, timing: 18, differentiation: 17, team_signal: 15 },
      top_vcs: qualitativeVcLandscape(),
      vc_stub_note: 'Illustrative thesis categories — set MINDS_AI_API_KEY + MINDS_AI_BASE_URL for scored fund lists.'
    };
  }
  const p2Dur = (Date.now() - p2Start) / 1000;

  const p3Start = Date.now();
  let phase3;
  if (process.env.OPENAI_API_KEY) {
    try {
      const narrative = await openAiChat({
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: openAiBase(),
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.42,
        messages: [{ role: 'user', content: `You are a principal GTM + product marketing partner at a top-tier B2B venture firm. Write ONE market pitch document a founder could send to a sharp seed investor or an enterprise champion.

Length: 380–520 words. Plain business English only.

FORMAT RULES (strict):
- NO markdown: no #, ##, **, bullet lists with - or *, numbered lists, or code fences.
- Use paragraphs only. Optional short lead-ins like "The pain." or "The wedge." as plain sentences — not headings.

CONTENT (cover all in order, woven as prose):
1) Tension — who suffers, in what workflow moment, and why incumbents leave money on the table.
2) Wedge — what you ship first, for whom, and the measurable outcome in a pilot (no fake metrics).
3) Why now — buying triggers and market shift (directional; no invented CAGR unless in evidence).
4) Proof — tie 2–4 themes directly to the evidence summary below (paraphrase language from buyers/press; never invent customer names or revenue).
5) Differentiation — sharp contrast vs. how teams solve this today (categories, not buzzwords).
6) Motion — how you land and expand (sales motion, activation, success).
7) Ask — capital or milestone that matches stage; keep it one tight paragraph.

Voice: confident, concrete nouns, zero filler ("revolutionize", "leverage AI", "synergies"). VC viability hint: ${phase2.vc_viability_score}/100.

Startup context:\n${narrativeIdea}

Evidence summary (ground truth for themes):\n${phase1.summary}` }]
      });
      const prose = proseStripMarkdown(narrative);
      phase3 = { one_pager: prose, sections: { full: prose } };
    } catch (e) {
      phase3 = { one_pager: `Narrative could not be generated: ${String(e)}`, sections: { full: `Narrative could not be generated: ${String(e)}` } };
    }
  } else {
    const stub = proseStripMarkdown(
      `The pain. Teams still lose hours to workflows this product category should own end-to-end. Buyers are ready for a wedge that proves value in one pilot before you scale distribution.\n\nThe wedge. Ship a narrow slice that nails one measurable job-to-be-done for a named ICP; expand once repeatability shows up in usage.\n\nWhy now. Budget scrutiny is higher, but teams still pay for tools that reclaim productivity — especially where support and operations data already lives in SaaS.\n\nProof signals. ${phase1.summary}\n\nDifferentiation. Win on workflow depth and time-to-value versus generic horizontal tools or manual glue code.\n\nMotion. Land with a focused pilot, prove ROI, then broaden seats and integrations.\n\nThe ask. Raise or ship to the milestone that turns pilots into predictable revenue — details once OpenAI narrative is enabled.`
    );
    phase3 = { one_pager: stub, sections: { full: stub } };
  }
  const p3Dur = (Date.now() - p3Start) / 1000;

  const p4Start = Date.now();
  let phase4;
  try {
    phase4 = await buildStoryboardPanels(narrativeIdea, phase1, phase2, phase3);
  } catch {
    phase4 = {
      panels: defaultStoryboardPanels(narrativeIdea).map((p, i) => {
        const title = proseStripMarkdown(p.title);
        const vp = p.visual_prompt || p.title || narrativeIdea;
        return {
          order: i + 1,
          title,
          caption: proseStripMarkdown(p.caption),
          image_url: pollinationsImageUrl(vp),
          image_fallback: picsumStoryboardUrl(title, vp)
        };
      }),
      image_engine: 'pollinations+picsum'
    };
  }
  const p4Dur = (Date.now() - p4Start) / 1000;

  const timings_sec = {
    phase1_market_intel: p1Dur,
    phase2_minds: p2Dur,
    phase3_openai_narrative: p3Dur,
    phase4_storyboard: p4Dur
  };

  const marketing_agents = buildMarketingAgentsBundle({
    kw: searchKw,
    narrativeIdea,
    phase1,
    phase2,
    phase3,
    collector_report,
    modes,
    timings_sec
  });

  const pipeline_complexity = buildPipelineComplexity({
    apify_run_count: apify_runs.length,
    deduped_quote_count: quotesDeduped.length,
    timings_sec,
    modes,
    isUrlMode,
    actor_catalog_size: APIFY_ACTORS.length,
    skip_producthunt: skipPh,
    skip_all_techcrunch: skipAllTechcrunch,
    run_both_techcrunch: runBothTechcrunch
  });

  const result = {
    run_id,
    input_mode: isUrlMode ? 'company_url' : 'idea',
    idea: String(idea || '').trim(),
    company_url: isUrlMode ? companyUrlNormalized : null,
    created_at: nowIso(),
    phase1,
    phase2,
    phase3,
    phase4,
    marketing_agents,
    pipeline_complexity,
    timings_sec,
    mode: modes
  };
  state.launchpadRuns[run_id] = result;
  writeState(state);
  return result;
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    llm: process.env.OPENAI_API_KEY ? 'openai' : 'stub',
    launchpad: {
      phase1_apify: process.env.APIFY_API_TOKEN ? 'ready' : 'missing_token',
      phase2_minds: process.env.MINDS_AI_API_KEY && process.env.MINDS_AI_BASE_URL ? 'ready' : 'stub',
      phase3_openai: process.env.OPENAI_API_KEY ? 'ready' : 'stub',
      phase4_storyboard: process.env.OPENAI_API_KEY ? 'panels_openai' : 'panels_template'
    }
  });
});

app.get('/apify/actors', (_req, res) => res.json({ actors: APIFY_ACTORS }));
app.post('/apify/run', async (req, res) => {
  try {
    const { actor, input = null, wait_for_finish = 120, max_items = 25 } = req.body || {};
    if (!actor) return res.status(400).json({ error: 'actor is required' });
    const out = await runApifyActor(actor, input, wait_for_finish, max_items);
    res.json(out);
  } catch (e) {
    const msg = String(e.message || e);
    const code = msg.includes('missing') ? 400 : msg.includes('Unknown actor') ? 404 : 502;
    res.status(code).json({ error: msg });
  }
});

app.post('/launchpad/run', async (req, res) => {
  const input_mode = req.body?.input_mode === 'company_url' ? 'company_url' : 'idea';
  const company_url = String(req.body?.company_url || '').trim();
  const idea = String(req.body?.idea || '').trim();
  if (input_mode === 'company_url') {
    if (!company_url) return res.status(400).json({ error: 'company_url is required when input_mode is company_url' });
    try {
      new URL(company_url);
    } catch {
      return res.status(400).json({ error: 'company_url must be a valid http(s) URL' });
    }
  } else if (idea.length < 3) {
    return res.status(400).json({ error: 'idea must be at least 3 characters (or switch to company URL mode)' });
  }
  try {
    res.json(await runLaunchpad({ idea, company_url, input_mode }));
  } catch (e) {
    const code = e.statusCode && Number(e.statusCode) >= 400 && Number(e.statusCode) < 500 ? e.statusCode : 500;
    res.status(code).json({ error: String(e.message || e) });
  }
});
app.get('/launchpad/:runId', (req, res) => {
  const hit = state.launchpadRuns[req.params.runId];
  if (!hit) return res.status(404).json({ error: 'Run not found' });
  res.json(hit);
});

app.post('/dev/seed', (_req, res) => {
  const demoId = rid('launchpad');
  const demoPanels = defaultStoryboardPanels('demo startup').map((p, i) => {
    const title = p.title;
    const vp = p.visual_prompt || p.title;
    return {
      order: i + 1,
      title,
      caption: p.caption,
      image_url: pollinationsImageUrl(vp),
      image_fallback: picsumStoryboardUrl(title, vp)
    };
  });
  state.launchpadRuns[demoId] = {
    run_id: demoId,
    input_mode: 'idea',
    idea: 'Demo: AI-native CRM for indie hackers (static seed — run pipeline with APIFY_API_TOKEN for live data)',
    company_url: null,
    created_at: nowIso(),
    phase1: {
      demand_score: 58,
      summary: 'Static seed — POST /launchpad/run with APIFY_API_TOKEN set loads live Apify actors.',
      quotes: [{ source: 'demo', text: 'Example signal for layout.', url: null, image: null }],
      collector_report: [],
      keyword_query: 'demo',
      input_mode: 'idea',
      company_url: null,
      x_twitter_note: 'Optional X/Twitter actor.'
    },
    phase2: {
      vc_viability_score: 68,
      breakdown: { market: 18, timing: 17, differentiation: 16, team_signal: 17 },
      top_vcs: qualitativeVcLandscape(),
      vc_stub_note: 'Illustrative thesis categories — layout seed only.'
    },
    phase3: {
      one_pager:
        'This is placeholder seed copy for layout only. Run the pipeline with your keys to generate a polished narrative in plain paragraphs.',
      sections: { full: 'demo' }
    },
    phase4: {
      panels: demoPanels,
      image_engine: 'pollinations+picsum'
    },
    marketing_agents: [],
    pipeline_complexity: {
      headline: 'Evidence-first orchestration — demo seed',
      stats: [{ label: 'Demo', value: 'run pipeline for live counters' }],
      mechanisms: ['Seed snapshot only — execute POST /launchpad/run for full complexity payload.']
    },
    timings_sec: { phase1_market_intel: 0.01, phase2_minds: 0.01, phase3_openai_narrative: 0.01, phase4_storyboard: 0.01 },
    mode: { apify: 'stub', minds: 'stub', narrative: 'stub', storyboard: 'template' }
  };
  writeState(state);
  res.json({ ok: true, run_id: demoId });
});
app.post('/dev/clear', (_req, res) => {
  state = { launchpadRuns: {} };
  writeState(state);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Node API listening on http://127.0.0.1:${PORT}`));
