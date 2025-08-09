// scripts/build-companies.ts

import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient();

interface Company {
  id: string;
}

async function run(): Promise<void> {
  const companies: Company[] = await prisma.companies.findMany({
    select: { id: true },
  });

  for (const company of companies) {
    const companyId = company.id;

    console.log(`\n📦 Building for company: ${companyId}...`);

    const outDir: string = path.resolve("dist", companyId);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    try {
      execSync(`vite build --outDir=dist/${companyId}`, {
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_BASE: companyId,
        },
      });
    } catch (err) {
      console.error(`❌ Failed to build for company ${companyId}`, err);
    }
  }

  await prisma.$disconnect();
}

run();
