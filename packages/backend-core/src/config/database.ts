import dotenv from "dotenv";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

dotenv.config({
    path: path.resolve(process.cwd(), "../api/.env"),
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaPg({
    connectionString,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
