import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "test";

const serverDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "marketing-test-"));
const dbPath = join(dir, "test.db").replace(/\\/g, "/");
process.env.DATABASE_URL = `file:${dbPath}`;

execSync("npx prisma migrate deploy", {
  cwd: serverDir,
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  stdio: "pipe",
});

const { app } = await import("./index.js");
const { prisma } = await import("./lib/prisma.js");

beforeAll(async () => {
  await prisma.sponsor.create({
    data: {
      name: "Test Co",
      slug: "test-co",
      tier: "SILVER",
      website: "https://test.example.com",
      description: "Test sponsor",
      fundsApifyLab: false,
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("GET /api/sponsors", () => {
  it("lists sponsors", async () => {
    const res = await request(app).get("/api/sponsors").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("POST /api/sponsors", () => {
  it("rejects invalid body", async () => {
    const res = await request(app)
      .post("/api/sponsors")
      .send({ name: "" })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });

  it("creates sponsor", async () => {
    const res = await request(app)
      .post("/api/sponsors")
      .send({
        name: "New Sponsor",
        slug: "new-sponsor-unique",
        tier: "BRONZE",
        website: "https://new.example.com",
        description: "Hello",
      })
      .expect(201);
    expect(res.body.slug).toBe("new-sponsor-unique");
  });
});

describe("GET /api/apify/actors", () => {
  it("returns catalog without token", async () => {
    const prev = process.env.APIFY_TOKEN;
    delete process.env.APIFY_TOKEN;
    const res = await request(app).get("/api/apify/actors").expect(200);
    expect(res.body.source).toBe("catalog");
    expect(Array.isArray(res.body.actors)).toBe(true);
    if (prev !== undefined) process.env.APIFY_TOKEN = prev;
  });
});
