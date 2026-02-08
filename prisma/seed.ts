import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default config
  await prisma.config.upsert({
    where: { key: "tradeInterval" },
    update: {},
    create: { key: "tradeInterval", value: "300000" }, // 5 minutes
  });

  await prisma.config.upsert({
    where: { key: "watchedCoins" },
    update: {},
    create: {
      key: "watchedCoins",
      value: JSON.stringify([
        "bitcoin",
        "ethereum",
        "solana",
        "cardano",
        "ripple",
        "dogecoin",
        "polkadot",
        "chainlink",
        "avalanche-2",
        "polygon-ecosystem-token",
      ]),
    },
  });

  // Create first round
  const existingRound = await prisma.round.findFirst({
    where: { status: "active" },
  });

  if (!existingRound) {
    await prisma.round.create({
      data: { startBalance: 1000 },
    });
    console.log("Created first round with €1,000 starting balance");
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
