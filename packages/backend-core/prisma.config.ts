import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path: path.resolve(configDirectory, "../../apps/api/.env"),
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
