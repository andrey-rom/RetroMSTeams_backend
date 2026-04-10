import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

interface TemplateDefinition {
  code: string;
  name: string;
  description: string;
  values: Array<{
    value: string;
    label: string;
    color: string;
    sortOrder: number;
  }>;
}

const templates: TemplateDefinition[] = [
  {
    code: "SSC",
    name: "Start / Stop / Continue",
    description:
      "Identify what the team should start doing, stop doing, and continue doing.",
    values: [
      { value: "START", label: "Start", color: "#6BB700", sortOrder: 0 },
      { value: "STOP", label: "Stop", color: "#E74856", sortOrder: 1 },
      { value: "CONTINUE", label: "Continue", color: "#0078D4", sortOrder: 2 },
    ],
  },
  {
    code: "MSG",
    name: "Mad / Sad / Glad",
    description:
      "Express emotions about recent work: frustrations, disappointments, and positives.",
    values: [
      { value: "MAD", label: "Mad", color: "#E74856", sortOrder: 0 },
      { value: "SAD", label: "Sad", color: "#8764B8", sortOrder: 1 },
      { value: "GLAD", label: "Glad", color: "#6BB700", sortOrder: 2 },
    ],
  },
  {
    code: "4L",
    name: "4Ls (Liked, Learned, Lacked, Longed For)",
    description:
      "Reflect on what was liked, learned, lacked, and longed for during the sprint.",
    values: [
      { value: "LIKED", label: "Liked", color: "#6BB700", sortOrder: 0 },
      { value: "LEARNED", label: "Learned", color: "#0078D4", sortOrder: 1 },
      { value: "LACKED", label: "Lacked", color: "#E74856", sortOrder: 2 },
      { value: "LONGED_FOR", label: "Longed For", color: "#8764B8", sortOrder: 3 },
    ],
  },
];

async function main() {
  console.log("Seeding templates...");

  for (const tpl of templates) {
    const existing = await prisma.templateType.findUnique({
      where: { code: tpl.code },
    });

    if (existing) {
      console.log(`  Template "${tpl.code}" already exists — skipping`);
      continue;
    }

    await prisma.templateType.create({
      data: {
        code: tpl.code,
        name: tpl.name,
        description: tpl.description,
        values: {
          create: tpl.values,
        },
      },
    });

    console.log(`  Created template "${tpl.code}" with ${tpl.values.length} columns`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
