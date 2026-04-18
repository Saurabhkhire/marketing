import { useEffect, useState } from "react";
import { fetchJson } from "../api";

type SponsorRow = {
  id: string;
  name: string;
  slug: string;
  tier: string;
  website: string;
  description: string;
  fundsApifyLab: boolean;
  monthlyBudgetUsd: number | null;
  active: boolean;
  _count?: { campaigns: number };
};

export default function SponsorsPage() {
  const [rows, setRows] = useState<SponsorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<SponsorRow[]>("/api/sponsors")
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="loader">Loading sponsors…</p>;

  return (
    <div>
      <h1>Sponsors</h1>
      <p className="muted">
        Tiers map to visibility on the console; <strong>funds Apify lab</strong> marks sponsors
        underwriting scraping experiments.
      </p>
      <div className="card" style={{ marginTop: "1.5rem", overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tier</th>
              <th>Apify lab</th>
              <th>Budget / mo</th>
              <th>Campaigns</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <a href={s.website} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    {s.description.slice(0, 90)}
                    {s.description.length > 90 ? "…" : ""}
                  </div>
                </td>
                <td>
                  <span className="badge">{s.tier}</span>
                </td>
                <td>{s.fundsApifyLab ? "Yes" : "—"}</td>
                <td>
                  {s.monthlyBudgetUsd != null
                    ? `$${s.monthlyBudgetUsd.toLocaleString()}`
                    : "—"}
                </td>
                <td>{s._count?.campaigns ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
