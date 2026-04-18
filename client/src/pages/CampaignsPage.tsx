import { useEffect, useState } from "react";
import { fetchJson } from "../api";

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  budgetCents: number;
  sponsor: { name: string } | null;
};

export default function CampaignsPage() {
  const [rows, setRows] = useState<CampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<CampaignRow[]>("/api/campaigns")
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="loader">Loading campaigns…</p>;

  return (
    <div>
      <h1>Campaigns</h1>
      <p className="muted">Budgets stored in cents for precision in the API.</p>
      <div className="card" style={{ marginTop: "1.5rem", overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Budget</th>
              <th>Sponsor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.title}</strong>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    {c.description.slice(0, 100)}
                    {c.description.length > 100 ? "…" : ""}
                  </div>
                </td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>${(c.budgetCents / 100).toLocaleString()}</td>
                <td>{c.sponsor?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
