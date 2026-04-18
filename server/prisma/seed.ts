import { PrismaClient, CampaignStatus, SponsorTier } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.campaign.deleteMany();
  await prisma.sponsor.deleteMany();

  const sponsors = await prisma.$transaction([
    prisma.sponsor.create({
      data: {
        name: "Northwind Ventures",
        slug: "northwind-ventures",
        tier: SponsorTier.PLATINUM,
        website: "https://northwind.example.com",
        description:
          "Lead sponsor — funds paid acquisition experiments and Apify-powered market intel.",
        fundsApifyLab: true,
        monthlyBudgetUsd: 25000,
        logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=northwind",
      },
    }),
    prisma.sponsor.create({
      data: {
        name: "Blue Ocean Media",
        slug: "blue-ocean-media",
        tier: SponsorTier.GOLD,
        website: "https://blueocean.example.com",
        description: "Creative and programmatic; co-brands flagship product launches.",
        fundsApifyLab: false,
        monthlyBudgetUsd: 12000,
        logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=blueocean",
      },
    }),
    prisma.sponsor.create({
      data: {
        name: "Summit Analytics",
        slug: "summit-analytics",
        tier: SponsorTier.GOLD,
        website: "https://summit-analytics.example.com",
        description: "Attribution modeling and cohort dashboards for growth teams.",
        fundsApifyLab: true,
        monthlyBudgetUsd: 9000,
        logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=summit",
      },
    }),
    prisma.sponsor.create({
      data: {
        name: "Sparkline Studio",
        slug: "sparkline-studio",
        tier: SponsorTier.SILVER,
        website: "https://sparkline.example.com",
        description: "Motion design house for hero videos and paid social cuts.",
        fundsApifyLab: false,
        monthlyBudgetUsd: 4500,
        logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=sparkline",
      },
    }),
    prisma.sponsor.create({
      data: {
        name: "Local Commerce Guild",
        slug: "local-commerce-guild",
        tier: SponsorTier.BRONZE,
        website: "https://lcg.example.org",
        description: "Regional SMB collective — sponsors community webinars.",
        fundsApifyLab: false,
        monthlyBudgetUsd: 1500,
        logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=lcg",
      },
    }),
    prisma.sponsor.create({
      data: {
        name: "Open Source Collective",
        slug: "open-source-collective",
        tier: SponsorTier.COMMUNITY,
        website: "https://opensource.example.org",
        description: "Volunteer-funded mention tier and docs translations.",
        fundsApifyLab: false,
        monthlyBudgetUsd: null,
        logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=osc",
      },
    }),
  ]);

  const [nw, bom, sa] = sponsors;

  await prisma.campaign.createMany({
    data: [
      {
        title: "Q2 Demand Gen — pipeline overlay",
        description:
          "Multi-touch nurture with LinkedIn + email; weekly Apify scrape of competitor pricing pages.",
        status: CampaignStatus.ACTIVE,
        budgetCents: 480_000_00,
        sponsorId: nw.id,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-06-30"),
      },
      {
        title: "Product Hunt launch burst",
        description:
          "72-hour sprint: creators, Reddit, and founder AMA with live leaderboard tracking.",
        status: CampaignStatus.ACTIVE,
        budgetCents: 95_000_00,
        sponsorId: bom.id,
        startDate: new Date("2026-04-15"),
        endDate: new Date("2026-04-18"),
      },
      {
        title: "SMB webinar series",
        description:
          "Four-part analytics bootcamp for operators; recordings gated behind email capture.",
        status: CampaignStatus.DRAFT,
        budgetCents: 32_000_00,
        sponsorId: sa.id,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-05-29"),
      },
      {
        title: "Holiday retargeting bake-off",
        description:
          "Compare Meta vs. programmatic display with shared creative from Sparkline.",
        status: CampaignStatus.PAUSED,
        budgetCents: 210_000_00,
        sponsorId: nw.id,
        startDate: new Date("2025-11-01"),
        endDate: new Date("2026-01-15"),
      },
      {
        title: "Partner co-marketing — integrations hub",
        description:
          "SEO pillar pages + Zapier/Make listings refresh (completed).",
        status: CampaignStatus.COMPLETED,
        budgetCents: 78_000_00,
        sponsorId: bom.id,
        startDate: new Date("2026-01-10"),
        endDate: new Date("2026-03-01"),
      },
    ],
  });

  console.log(`Seeded ${sponsors.length} sponsors and campaigns.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
