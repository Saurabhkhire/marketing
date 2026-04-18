import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const campaignsRouter = Router();

const createBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  budgetCents: z.number().int().nonnegative().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  sponsorId: z.string().cuid().optional().nullable(),
});

campaignsRouter.get("/", async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const where =
      status && ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"].includes(status)
        ? { status: status as "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" }
        : {};
    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { sponsor: true },
    });
    res.json(campaigns);
  } catch (e) {
    next(e);
  }
});

campaignsRouter.get("/:id", async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: { sponsor: true },
    });
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    res.json(campaign);
  } catch (e) {
    next(e);
  }
});

campaignsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { startDate, endDate, ...rest } = parsed.data;
    const campaign = await prisma.campaign.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: { sponsor: true },
    });
    res.status(201).json(campaign);
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2003"
    ) {
      res.status(400).json({ error: "Invalid sponsorId" });
      return;
    }
    next(e);
  }
});
