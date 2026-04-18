import { useEffect, useState } from "react";

type Health = { ok: boolean; service: string; ts: string };

export default function HomePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setErr("Could not reach API. Run `npm run dev` from the repo root."));
  }, []);

  return (
    <div>
      <h1>Marketing console</h1>
      <p className="muted" style={{ maxWidth: "52ch" }}>
        Demo workspace for sponsor tiers, campaign tracking, and Apify actor discovery.
        SQLite locally; swap to Supabase or Neon for hosted Postgres — see{" "}
        <code style={{ color: "var(--text)" }}>docs/DATABASE.md</code>.
      </p>

      <div className="card-grid two" style={{ marginTop: "2rem" }}>
        <div className="card">
          <span className="badge ok">API</span>
          <h3 style={{ marginTop: "0.75rem" }}>Backend status</h3>
          {err && <p className="error">{err}</p>}
          {!err && !health && <p className="loader">Checking…</p>}
          {health && (
            <p>
              <strong>{health.service}</strong> —{" "}
              <span className="muted">{new Date(health.ts).toLocaleString()}</span>
            </p>
          )}
        </div>
        <div className="card">
          <span className="badge warn">Docs</span>
          <h3 style={{ marginTop: "0.75rem" }}>Ship checklist</h3>
          <ul className="muted" style={{ paddingLeft: "1.2rem", margin: "0.5rem 0 0" }}>
            <li>
              <code>npm run db:migrate</code> then <code>npm run db:seed</code>
            </li>
            <li>
              Optional <code>APIFY_TOKEN</code> for live actors list
            </li>
            <li>See docs for architecture and test matrices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
