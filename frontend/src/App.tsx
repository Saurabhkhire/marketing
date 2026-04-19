import { useCallback, useEffect, useState } from "react";
import { ComplexitySection, type PipelineComplexity as PipelineComplexityPayload } from "./ComplexitySection";

const API = "http://127.0.0.1:8000";

type Health = {
  llm?: string;
  status?: string;
  launchpad?: {
    phase1_apify?: string;
    phase2_minds?: string;
    phase3_openai?: string;
    phase4_storyboard?: string;
  };
};

type Quote = { source: string; text: string; url: string | null; image?: string | null };

type CollectorRow = {
  actor_key?: string;
  label?: string;
  items_found?: number;
  status?: string;
  message?: string;
};

type MarketingAgentBlock = {
  id: string;
  role: string;
  title: string;
  layers: { name: string; detail: string }[];
  outputs: string[];
  footnote: string;
};

type Panel = { order: number; title: string; caption: string; image_url: string; image_fallback?: string };

type LaunchPadResult = {
  run_id?: string;
  input_mode?: "idea" | "company_url";
  idea?: string;
  company_url?: string | null;
  pipeline_complexity?: PipelineComplexityPayload;
  marketing_agents?: MarketingAgentBlock[];
  phase1?: {
    demand_score?: number;
    summary?: string;
    quotes?: Quote[];
    collector_report?: CollectorRow[];
    keyword_query?: string;
    intel_fallback?: boolean;
  };
  phase2?: {
    vc_viability_score?: number;
    breakdown?: Record<string, number>;
    top_vcs?: { name: string; fit_score: number; thesis_fit: string; recent_activity?: string }[];
    vc_stub_note?: string;
  };
  phase3?: { one_pager?: string };
  phase4?: { panels?: Panel[] };
  timings_sec?: Record<string, number>;
  mode?: Record<string, string>;
};

function splitPitchParagraphs(text: string): string[] {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function App() {
  const [inputMode, setInputMode] = useState<"idea" | "company_url">("idea");
  const [idea, setIdea] = useState(
    "AI copilot that turns customer support tickets into prioritized product insights for B2B SaaS teams."
  );
  const [companyUrl, setCompanyUrl] = useState("https://stripe.com");
  const [lpBusy, setLpBusy] = useState(false);
  const [lpResult, setLpResult] = useState<LaunchPadResult | null>(null);
  const [lpError, setLpError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const r = await fetch(`${API}/health`);
      setHealth(await r.json());
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  async function runLaunchPad() {
    if (lpBusy) return;
    if (inputMode === "company_url" && !companyUrl.trim()) {
      setLpError("Enter a company URL, or switch to startup idea mode.");
      return;
    }
    if (inputMode === "idea" && idea.trim().length < 3) {
      setLpError("Describe your idea (at least 3 characters).");
      return;
    }

    setLpBusy(true);
    setLpError("");
    setLpResult(null);
    try {
      const r = await fetch(`${API}/launchpad/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_mode: inputMode,
          idea: idea.trim(),
          company_url: inputMode === "company_url" ? companyUrl.trim() : ""
        })
      });
      const text = await r.text();
      if (!r.ok) {
        try {
          const j = JSON.parse(text) as { error?: string };
          setLpError(j.error || text);
        } catch {
          setLpError(text || `HTTP ${r.status}`);
        }
        return;
      }
      setLpResult(JSON.parse(text) as LaunchPadResult);
      void refreshHealth();
    } catch (e) {
      setLpError(String(e));
    } finally {
      setLpBusy(false);
    }
  }

  const lp = lpResult;
  const totalSec = lp?.timings_sec
    ? Object.values(lp.timings_sec).reduce((a, b) => a + b, 0)
    : 0;

  const pitchParas = lp ? splitPitchParagraphs(lp.phase3?.one_pager || "") : [];

  const apifyOk = health?.launchpad?.phase1_apify === "ready";

  return (
    <div className="shell">
      <div className="bg-grid" aria-hidden />

      <header className="top">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <div>
            <h1>LaunchPad</h1>
            <p className="tagline">
              Multi-agent marketing studio — collectors, VC lens, narrative lead, storyboard director.
            </p>
          </div>
        </div>
        <div className="pill-deck">
          <span className={`pill ${apifyOk ? "pill-live" : "pill-warn"}`}>
            Apify {health?.launchpad?.phase1_apify ?? "—"}
          </span>
          <span className={`pill ${health?.launchpad?.phase2_minds === "ready" ? "pill-live" : ""}`}>
            Minds {health?.launchpad?.phase2_minds ?? "—"}
          </span>
          <span className={`pill ${health?.launchpad?.phase3_openai === "ready" ? "pill-live" : ""}`}>
            OpenAI {health?.launchpad?.phase3_openai ?? "—"}
          </span>
          <span className="pill mono">{API}</span>
        </div>
      </header>

      {!apifyOk ? (
        <div className="banner-warn">
          Set <code>APIFY_API_TOKEN</code> in <code>.env</code> and restart the server. Runs use live Apify collectors
          only.
        </div>
      ) : null}

      <ComplexitySection data={lp?.pipeline_complexity} />

      <section className="panel input-panel">
        <div className="input-panel-head">
          <h2>What are we pitching?</h2>
          <div className="mode-toggle" role="tablist" aria-label="Input mode">
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === "idea"}
              className={inputMode === "idea" ? "active" : ""}
              onClick={() => setInputMode("idea")}
            >
              Startup idea
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === "company_url"}
              className={inputMode === "company_url" ? "active" : ""}
              onClick={() => setInputMode("company_url")}
            >
              Company URL
            </button>
          </div>
        </div>

        {inputMode === "idea" ? (
          <>
            <label className="field-label" htmlFor="idea-field">
              Describe the startup (problem, who buys it, why now)
            </label>
            <textarea
              id="idea-field"
              className="field-text"
              rows={5}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. Vertical SaaS for dental clinics that automates insurance claims…"
            />
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="url-field">
              Company website
            </label>
            <input
              id="url-field"
              className="field-text single"
              type="url"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://acme.com"
            />
            <label className="field-label" htmlFor="notes-field">
              Optional notes (positioning, thesis, or what to emphasize)
            </label>
            <textarea
              id="notes-field"
              className="field-text"
              rows={3}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. Focus on enterprise motion; competitors are Notion and Coda…"
            />
          </>
        )}

        <div className="run-row">
          <button type="button" className="btn-run" onClick={() => void runLaunchPad()} disabled={lpBusy}>
            {lpBusy ? "Running studio…" : "Run full pipeline"}
          </button>
          {totalSec > 0 ? (
            <span className="timing">
              Wall ~{totalSec.toFixed(1)}s · keyword spine <em>{lp?.phase1?.keyword_query || "—"}</em>
            </span>
          ) : null}
        </div>
        {lpError ? <p className="err">{lpError}</p> : null}
      </section>

      {lp && (
        <>
          {lp.marketing_agents && lp.marketing_agents.length > 0 ? (
            <section className="panel agents-panel">
              <h2 className="section-title">How this marketing studio thinks</h2>
              <p className="agents-lead">
                Four coordinated agent roles — each step hands context to the next so messaging stays evidence-led, not
                fabricated.
              </p>
              <div className="agents-grid">
                {lp.marketing_agents.map((agent) => (
                  <article key={agent.id} className="agent-card">
                    <header className="agent-card-head">
                      <span className="agent-role">{agent.role}</span>
                      <h3>{agent.title}</h3>
                    </header>
                    <div className="agent-layers">
                      {agent.layers.map((layer) => (
                        <div key={layer.name} className="agent-layer">
                          <strong>{layer.name}</strong>
                          <p>{layer.detail}</p>
                        </div>
                      ))}
                    </div>
                    <ul className="agent-outputs">
                      {agent.outputs.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                    <p className="agent-foot">{agent.footnote}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {lp.phase1?.collector_report && lp.phase1.collector_report.length > 0 ? (
            <section className="panel collectors-panel">
              <h2 className="section-title">Collector status</h2>
              <p className="collectors-lead">Live Apify runs — what came back before we normalize into quotes.</p>
              <div className="collector-table-wrap">
                <table className="collector-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Rows</th>
                      <th>State</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lp.phase1.collector_report.map((row) => (
                      <tr key={`${row.label}-${row.actor_key}`}>
                        <td>{row.label}</td>
                        <td className="mono">{row.items_found ?? 0}</td>
                        <td>
                          <span className={`state-pill state-${row.status || "ok"}`}>{row.status}</span>
                        </td>
                        <td className="collector-msg">{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="panel">
            <h2 className="section-title">Evidence &amp; VC view</h2>
            <div className="grid-2">
              <article className="card">
                <header className="card-head">
                  <span className="step">01</span>
                  <h3>Market signals</h3>
                  <span className="score-badge">{lp.phase1?.demand_score ?? "—"}</span>
                </header>
                <p className="lead">{lp.phase1?.summary}</p>
                {lp.phase1?.intel_fallback ? (
                  <p className="muted-inline">
                    Live collectors returned no quotable rows — showing qualitative context only until Apify sources succeed.
                  </p>
                ) : null}
                <ul className="signal-list">
                  {(lp.phase1?.quotes || []).slice(0, 14).map((q, i) => (
                    <li key={i}>
                      {q.image ? (
                        <img
                          className="signal-thumb"
                          src={q.image}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}
                      <div className="signal-body">
                        <span className="signal-src">{q.source}</span>
                        <p>{q.text}</p>
                        {q.url ? (
                          <a className="signal-link" href={q.url} target="_blank" rel="noreferrer">
                            Source ↗
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="card">
                <header className="card-head">
                  <span className="step">02</span>
                  <h3>VC viability</h3>
                  <span className="score-badge">{lp.phase2?.vc_viability_score ?? "—"}</span>
                </header>
                {lp.phase2?.breakdown ? (
                  <div className="breakdown">
                    {Object.entries(lp.phase2.breakdown).map(([k, v]) => (
                      <div key={k} className="breakdown-row">
                        <span>{k.replace(/_/g, " ")}</span>
                        <div className="bar">
                          <span style={{ width: `${Math.min(100, Number(v))}%` }} />
                        </div>
                        <span className="breakdown-val">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {lp.phase2?.vc_stub_note ? <p className="muted-inline">{lp.phase2.vc_stub_note}</p> : null}
                <ol className="vc-list">
                  {(lp.phase2?.top_vcs || []).map((v, i) => (
                    <li key={i}>
                      <strong>{v.name}</strong>
                      <span className="vc-fit">{Math.round(v.fit_score)}%</span>
                      <span className="vc-thesis">{v.thesis_fit}</span>
                    </li>
                  ))}
                </ol>
              </article>
            </div>
          </section>

          <section className="panel pitch-panel">
            <h2 className="section-title">Market pitch</h2>
            <p className="pitch-panel-lead">
              Board-style narrative: tension, wedge, proof tied to scraped themes, differentiation, motion, and ask — written
              as prose (no markdown slide soup).
            </p>
            <article className="card prose-card">
              <header className="card-head card-head-plain">
                <span className="step">03</span>
                <h3>One-pager</h3>
              </header>
              <div className="pitch-prose">
                {pitchParas.length ? (
                  pitchParas.map((para, i) => <p key={i}>{para}</p>)
                ) : (
                  <p className="muted-inline">—</p>
                )}
              </div>
            </article>
          </section>

          <section className="panel story-panel">
            <div className="story-head">
              <h2 className="section-title">Storyboard pitch</h2>
              <p className="story-sub">
                Six beats with scene-directed imagery. Captions are written as investor-facing prose — not slide bullets.
              </p>
            </div>
            <div className="story-rail">
              {(lp.phase4?.panels || []).map((p) => (
                <article key={p.order} className="story-card">
                  <div className="story-visual">
                    <span className="story-num">{String(p.order).padStart(2, "0")}</span>
                    <img
                      src={p.image_url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        const fb = p.image_fallback;
                        if (fb && el.src !== fb) {
                          el.src = fb;
                          return;
                        }
                        el.src = "https://placehold.co/960x540/1e293b/94a3b8?text=Image";
                      }}
                    />
                  </div>
                  <div className="story-copy">
                    <h4>{p.title}</h4>
                    <p>{p.caption}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
