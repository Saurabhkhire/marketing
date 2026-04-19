const fs = require('fs');
const path = require('path');

/**
 * Merge optional Apify actor definitions from env + well-known paths (incl. VibeStart repo).
 * Each entry: { key, name?, actorSlug, actorId?, endpoint?, defaultInput }
 */
function readActorArrays(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j;
    if (j && Array.isArray(j.actors)) return j.actors;
  } catch (e) {
    console.warn('[LaunchPad] extra actors file skipped:', filePath, e.message);
  }
  return [];
}

function mergeExtraActorDefinitions(baseActors) {
  const byKey = new Map();
  for (const a of baseActors) {
    if (a && a.key) byKey.set(String(a.key).toLowerCase(), { ...a });
  }

  const candidates = [
    process.env.EXTRA_APIFY_ACTORS_JSON,
    path.join(__dirname, 'vibestart-apify-actors.json'),
    path.join(__dirname, '..', 'config', 'apify-actors.json'),
    'D:\\OpenClaw\\vibestart\\backend\\config\\apify-actors.json',
    'D:\\open Claw\\Vibe start project\\backend\\config\\apify-actors.json'
  ];

  for (const p of candidates) {
    if (!p) continue;
    for (const x of readActorArrays(p)) {
      if (!x || !x.key || !x.actorSlug) continue;
      const k = String(x.key).toLowerCase();
      const prev = byKey.get(k) || {};
      byKey.set(k, {
        ...prev,
        ...x,
        key: k,
        _mergedFrom: path.basename(p)
      });
    }
  }

  return Array.from(byKey.values());
}

module.exports = { mergeExtraActorDefinitions, readActorArrays };
