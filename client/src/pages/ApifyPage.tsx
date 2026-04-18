import { useEffect, useState } from "react";
import { fetchJson } from "../api";

type ActorPayload = {
  source: string;
  message?: string;
  actors: {
    id?: string;
    name?: string;
    title?: string;
    website: string;
  }[];
};

export default function ApifyPage() {
  const [data, setData] = useState<ActorPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ActorPayload>("/api/apify/actors")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="loader">Loading Apify catalog…</p>;

  return (
    <div>
      <h1>Apify lab</h1>
      <p className="muted">
        Without <code>APIFY_TOKEN</code>, the API returns a curated Store catalog (actors +{" "}
        websites). With a token, your account actors merge into the response.
      </p>
      {data.message && (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          {data.message}
        </p>
      )}
      <p style={{ marginTop: "0.5rem" }}>
        <span className="badge">{data.source}</span>
      </p>

      <div className="card actor-list" style={{ marginTop: "1.25rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Store / docs</th>
            </tr>
          </thead>
          <tbody>
            {data.actors.map((a, i) => (
              <tr key={a.id ?? a.website ?? i}>
                <td>{a.title ?? a.name ?? a.id ?? "—"}</td>
                <td>
                  <a href={a.website} target="_blank" rel="noreferrer">
                    {a.website.replace("https://", "")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
