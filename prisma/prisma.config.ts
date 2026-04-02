// prisma/prisma.config.ts
// Prisma 7 config — connection URL for Migrate lives here now.

import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  migrate: {
    async resolve({ datasourceUrl }) {
      return {
        url: datasourceUrl ?? process.env.DATABASE_URL ?? "",
      };
    },
  },
});
