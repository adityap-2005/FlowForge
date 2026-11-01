import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
    path: path.resolve(process.cwd(), "../../apps/api/.env"),
});

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: env("DATABASE_URL"),
    },
});