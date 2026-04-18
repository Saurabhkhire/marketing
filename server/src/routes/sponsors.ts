import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const sponsorsRouter = Router();

const createBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  tier: z.enum(["PLATINUM", "GOLD", "SILVER", "BRONZE", "COMMUNITY"]),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().url(),
  description: z.string().min(1),
  fundsApifyLab: z.boolean().optional(),
  monthlyBudgetUsd: z.number().int().nonnegative().optional().nullable(),
  active: z.boolean().optional(),
});

sponsorsRouter.get("/", async (_req, res, next) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: [{ tier: "asc" }, { name: "asc" }],
      include: { _count: { select: { campaigns: true } } },
    });
    res.json(sponsors);
  } catch (e) {
    next(e);
  }
});

sponsorsRouter.get("/:slug", async (req, res, next) => {
  try {
    const sponsor = await prisma.sponsor.findUnique({
      where: { slug: req.params.slug },
      include: { campaigns: true },
    });
    if (!sponsor) {
      res.status(404).json({ error: "Sponsor not found" });
      return;
    }
    res.json(sponsor);
  } catch (e) {
    next(e);
  }
});

sponsorsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const sponsor = await prisma.sponsor.create({ data: parsed.data });
    res.status(201).json(sponsor);
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    next(e);
  }
});
