/**
 * Temporary script to export SQLite data for PostgreSQL import.
 *
 * Usage:
 *   1. Set DATABASE_URL to SQLite: DATABASE_URL="file:./dev.db"
 *   2. Run: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/export-data.ts
 *   3. Creates prisma/export.json with all data
 *   4. Switch DATABASE_URL to PostgreSQL, run migrations, then import:
 *      npx ts-node --compiler-options '{"module":"commonjs"}' prisma/export-data.ts --import
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const exportPath = path.join(__dirname, "export.json");

async function exportData() {
  console.log("Exporting data from current database...");

  const data = {
    rounds: await prisma.round.findMany(),
    holdings: await prisma.holding.findMany(),
    transactions: await prisma.transaction.findMany(),
    snapshots: await prisma.snapshot.findMany(),
    analyses: await prisma.analysis.findMany(),
    configs: await prisma.config.findMany(),
  };

  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
  console.log(`Exported to ${exportPath}`);
  console.log(
    `  Rounds: ${data.rounds.length}, Holdings: ${data.holdings.length}, ` +
    `Transactions: ${data.transactions.length}, Snapshots: ${data.snapshots.length}, ` +
    `Analyses: ${data.analyses.length}, Configs: ${data.configs.length}`
  );
}

async function importData() {
  console.log(`Importing data from ${exportPath}...`);

  if (!fs.existsSync(exportPath)) {
    console.error("No export.json found. Run export first.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(exportPath, "utf-8"));

  // Import in order respecting foreign keys
  for (const round of data.rounds) {
    await prisma.round.create({ data: round });
  }
  console.log(`  Imported ${data.rounds.length} rounds`);

  for (const holding of data.holdings) {
    await prisma.holding.create({ data: holding });
  }
  console.log(`  Imported ${data.holdings.length} holdings`);

  for (const tx of data.transactions) {
    await prisma.transaction.create({ data: tx });
  }
  console.log(`  Imported ${data.transactions.length} transactions`);

  for (const snap of data.snapshots) {
    await prisma.snapshot.create({ data: snap });
  }
  console.log(`  Imported ${data.snapshots.length} snapshots`);

  for (const analysis of data.analyses) {
    await prisma.analysis.create({ data: analysis });
  }
  console.log(`  Imported ${data.analyses.length} analyses`);

  for (const config of data.configs) {
    await prisma.config.create({ data: config });
  }
  console.log(`  Imported ${data.configs.length} configs`);

  console.log("Import complete!");
}

async function main() {
  const isImport = process.argv.includes("--import");

  if (isImport) {
    await importData();
  } else {
    await exportData();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
