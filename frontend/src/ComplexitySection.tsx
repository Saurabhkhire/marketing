type PipelineStat = { label: string; value: string };

export interface PipelineComplexity {
  headline?: string;
  stats?: PipelineStat[];
  mechanisms?: string[];
}

export function ComplexitySection({ data }: { data?: PipelineComplexity | null }) {
  return (
    <section className="panel complexity-panel">
      <h2 className="section-title">Pipeline complexity</h2>
      <p className="complexity-lead">
        This repo is not a single LLM call. It chains <strong>telemetry collection</strong>,{" "}
        <strong>capital-fit heuristics</strong>, <strong>narrative synthesis</strong>, and{" "}
        <strong>visual storyboarding</strong> — each stage consumes structured context from the last.
      </p>

      <div className="complexity-flow" aria-label="Four-phase pipeline">
        <div className="flow-node">
          <span className="flow-step">01</span>
          <strong>Intel mesh</strong>
          <span>Apify actors + optional catalog merge + URL scouts</span>
        </div>
        <span className="flow-arrow" aria-hidden>
          →
        </span>
        <div className="flow-node">
          <span className="flow-step">02</span>
          <strong>VC lens</strong>
          <span>Minds-compatible scoring &amp; thesis fit</span>
        </div>
        <span className="flow-arrow" aria-hidden>
          →
        </span>
        <div className="flow-node">
          <span className="flow-step">03</span>
          <strong>Market pitch</strong>
          <span>OpenAI prose — evidence-grounded ask</span>
        </div>
        <span className="flow-arrow" aria-hidden>
          →
        </span>
        <div className="flow-node">
          <span className="flow-step">04</span>
          <strong>Storyboard</strong>
          <span>Pollinations imagery from scene prompts</span>
        </div>
      </div>

      {!data?.stats?.length ? (
        <p className="complexity-hint muted-inline">
          Run the pipeline to hydrate live counters (collector legs, deduped signals, catalog size, wall time).
        </p>
      ) : (
        <>
          <h3 className="complexity-sub">{data.headline}</h3>
          <div className="complexity-stats">
            {(data.stats || []).map((s) => (
              <div key={s.label} className="complexity-stat">
                <span className="complexity-stat-val">{s.value}</span>
                <span className="complexity-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
          {(data.mechanisms || []).length ? (
            <div className="complexity-deep">
              <h4 className="complexity-sub2">Engineering behaviors</h4>
              <ul className="complexity-mechanisms">
                {(data.mechanisms || []).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
