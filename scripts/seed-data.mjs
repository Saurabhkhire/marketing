const base = 'http://127.0.0.1:8000';
fetch(`${base}/dev/seed`, { method: 'POST' })
  .then((r) => r.json())
  .then((j) => console.log(JSON.stringify(j, null, 2)))
  .catch((e) => { console.error(e); process.exit(1); });
